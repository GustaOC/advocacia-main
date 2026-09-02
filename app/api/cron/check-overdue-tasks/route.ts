import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { parsePetitionStepSuspension } from "@/lib/petition-step-suspension";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const CASSIO_ID = '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    let totalAlerts = 0;
    const notificationsToInsert: any[] = [];
    const smsMessages = [];

    // --- 1. TAREFAS GERAIS (Tasks) ---
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select(`*, assignee:user_profiles!tasks_assigned_to_fkey(name), case:cases(title)`)
      .neq("status", "Concluída")
      .not("due_date", "is", null)
      .eq("created_by", CASSIO_ID)
      .neq("assigned_to", CASSIO_ID);

    const missedTasks = (overdueTasks || []).filter(t => new Date(t.due_date) < today);

    missedTasks.forEach(task => {
      totalAlerts++;
      notificationsToInsert.push({
        user_id: CASSIO_ID,
        title: "Tarefa em Atraso!",
        message: `A tarefa "${task.title}" atribuída a ${task.assignee?.name || 'alguém'} está atrasada.`,
        type: "warning",
        is_read: false
      });
    });

    // --- 2. ETAPAS DE PETIÇÃO (Petition Workflows) ---
    const { data: activeWorkflows } = await supabase
      .from("petition_workflows")
      .select(`
        *,
        steps:petition_workflow_steps(*, assigned_user:user_profiles!petition_workflow_steps_assigned_to_fkey(name))
      `)
      .neq("status", "Concluída")
      .neq("status", "Suspensa");
      
    const missedSteps: any[] = [];

    (activeWorkflows || []).forEach(wf => {
      const currentStepNum = wf.current_step;
      const currentStep = wf.steps?.find((s: any) => s.step_number === currentStepNum);
      const suspension = parsePetitionStepSuspension(currentStep?.notes);
      
      // Se não tem etapa atual, ou já tá concluída, ou é do Cássio, ignora
      if (!currentStep || currentStep.status === "Concluída" || currentStep.status === "Suspensa" || (suspension && !suspension.resumedAt) || currentStep.assigned_to === CASSIO_ID) {
        return;
      }
      
      let activeSince = null;
      if (currentStepNum === 1) {
        activeSince = new Date(wf.created_at);
      } else {
        const prevStep = wf.steps?.find((s: any) => s.step_number === currentStepNum - 1);
        if (prevStep && prevStep.completed_at) {
          activeSince = new Date(prevStep.completed_at);
        }
      }

      // Ao retomar, a contagem de dois dias reinicia na data da retomada.
      if (suspension?.resumedAt) {
        const resumedAt = new Date(suspension.resumedAt);
        if (!activeSince || resumedAt > activeSince) activeSince = resumedAt;
      }
      
      // Se tiver data de inicio e for menor que 2 dias atras
      if (activeSince && activeSince < twoDaysAgo) {
        missedSteps.push({
          workflow: wf,
          step: currentStep
        });
        totalAlerts++;
        
        notificationsToInsert.push({
          user_id: CASSIO_ID,
          title: "Etapa de Petição em Atraso!",
          message: `A etapa "${currentStep.step_name}" da petição "${wf.title}" atribuída a ${currentStep.assigned_user?.name || 'alguém'} passou do prazo de 2 dias.`,
          type: "warning",
          is_read: false
        });
      }
    });

    if (totalAlerts === 0) {
      return NextResponse.json({ message: "Nenhum atraso encontrado." });
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    // Obter celular do Cassio para SMS
    const { data: cassioProfile } = await supabase
      .from("user_profiles")
      .select("phone")
      .eq("id", CASSIO_ID)
      .single();

    if (cassioProfile?.phone) {
      if (missedTasks.length > 0) {
        smsMessages.push(`Cássio Miguel Advogados: Vc tem ${missedTasks.length} tarefas delegadas atrasadas.`);
      }
      if (missedSteps.length > 0) {
        const nomesEtapas = missedSteps.map(m => m.step.assigned_user?.name?.split(' ')[0] || 'alguém').join(', ');
        smsMessages.push(`Cássio Miguel Advogados: ${missedSteps.length} etapas de petição atrasaram o prazo de 2 dias (Com: ${nomesEtapas}). Cheque o sistema.`);
      }
    }

    // Enviar Email para Cassio
    const { data: cassioAuth } = await supabase.auth.admin.getUserById(CASSIO_ID);
    const cassioEmail = cassioAuth?.user?.email;
    if (cassioEmail && smsMessages.length > 0) {
       const emailHtml = `
         <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
           <h2>Relatório de Atrasos Diário</h2>
           <ul>
             ${smsMessages.map(msg => `<li>${msg}</li>`).join('')}
           </ul>
           <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cassiomiguel.com.br'}/dashboard?tab=tasks" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Sistema</a></p>
         </div>
       `;
       await sendEmail(cassioEmail, "Cássio Miguel Advogados - Relatório de Atrasos", emailHtml).catch(console.error);
    }

    return NextResponse.json({ 
      message: "Alertas enviados com sucesso", 
      totalAlerts 
    });

  } catch (error: any) {
    console.error("Erro cron check-overdue-tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
