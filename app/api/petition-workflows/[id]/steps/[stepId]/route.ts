import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id: workflowId, stepId } = params;
    const body = await request.json();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // Busca a etapa atual e o workflow para verificações
    const { data: step, error: stepError } = await supabase
      .from("petition_workflow_steps")
      .select("*")
      .eq("id", stepId)
      .eq("workflow_id", workflowId)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    const { data: workflow, error: workflowError } = await supabase
      .from("petition_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow não encontrado." }, { status: 404 });
    }

    const updates: any = {};
    if (body.notes !== undefined) updates.notes = body.notes;
    
    // Tratamento de conclusão de etapa
    if (body.status === "Concluída") {
      // Bloquear se não for o responsável e não for admin
      if (step.assigned_to !== user.id) {
        return NextResponse.json(
          { error: "Apenas o responsável pela etapa pode concluí-la." },
          { status: 403 }
        );
      }

      updates.status = "Concluída";
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;

      // Lógica de avanço do workflow
      if (step.step_number < 13) {
        const nextStepNumber = step.step_number + 1;
        await supabase
          .from("petition_workflows")
          .update({ current_step: nextStepNumber })
          .eq("id", workflowId);

        // Busca o próximo step para verificar se tem responsável
        const { data: nextStep } = await supabase
          .from("petition_workflow_steps")
          .select("*")
          .eq("workflow_id", workflowId)
          .eq("step_number", nextStepNumber)
          .single();

        if (nextStep && nextStep.assigned_to) {
          // Muda o status da próxima etapa se já tiver responsável
          await supabase
            .from("petition_workflow_steps")
            .update({ status: "Em andamento" })
            .eq("id", nextStep.id);

          // Notificação e E-mail
          const { data: assigneeProfile } = await supabase
            .from("user_profiles")
            .select('name, phone')
            .eq("id", nextStep.assigned_to)
            .single();
            
          const assigneeName = assigneeProfile?.name || "você";

          await supabase.from("notifications").insert([{
            user_id: nextStep.assigned_to,
            title: "Nova etapa disponível",
            message: `A etapa "${nextStep.step_name}" do workflow "${workflow.title}" já está disponível para você.`,
            type: "info",
            is_read: false
          }]);

          const { data: authUser } = await supabase.auth.admin.getUserById(nextStep.assigned_to);
          const assigneeEmail = authUser?.user?.email;
          if (assigneeEmail) {
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2>Olá, ${assigneeName}!</h2>
                <p>A etapa anterior foi concluída e a seguinte etapa do workflow está agora disponível para você iniciar:</p>
                <div style="padding: 15px; border-left: 4px solid #007bff; background: #f9f9f9; margin: 15px 0;">
                  <h3 style="margin-top: 0;">${nextStep.step_name}</h3>
                  <p>Workflow: <strong>${workflow.title}</strong></p>
                </div>
                <p><a href="https://app.faz.adv.br/petition-workflows" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Workflows</a></p>
              </div>
            `;
            await sendEmail(assigneeEmail, `Etapa disponível: ${nextStep.step_name}`, emailHtml).catch(console.error);
          }
          
          if (assigneeProfile?.phone) {
            const smsMessage = `Cássio Miguel Advogados: Olá ${assigneeName.split(' ')[0]}! A etapa "${nextStep.step_name}" do caso ${workflow.title} foi passada para você e está pronta para iniciar.`;
            await sendSMS(assigneeProfile.phone, smsMessage).catch(console.error);
          }
        }
      } else if (step.step_number === 13) {
        // Conclui o workflow inteiro se for a etapa 10
        await supabase
          .from("petition_workflows")
          .update({ status: "Concluída" })
          .eq("id", workflowId);
      }
    } 
    // Tratamento de mudança de responsável
    else if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to;
      
      // Se for a etapa atual do workflow e não estiver concluída, muda para Em andamento
      if (step.step_number === workflow.current_step && step.status !== "Concluída" && body.status !== "Concluída") {
        updates.status = "Em andamento";
      } else if (body.status) {
        updates.status = body.status;
      }
    } else if (body.status !== undefined) {
      updates.status = body.status;
    }

    // Atualiza a etapa
    const { data: updatedStep, error: updateError } = await supabase
      .from("petition_workflow_steps")
      .update(updates)
      .eq("id", stepId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedStep);
  } catch (error: any) {
    console.error(`Erro PUT /api/petition-workflows/.../steps/${params.stepId}:`, error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar etapa." },
      { status: 500 }
    );
  }
}
