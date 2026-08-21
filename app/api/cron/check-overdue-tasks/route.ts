import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Para segurança, podemos verificar um header de Auth se a Vercel chamar, 
    // mas vamos permitir o GET para facilitar o Vercel Cron
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ID do Dr. Cássio
    const CASSIO_ID = '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1';

    // Data de hoje (início do dia para comparar)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar tarefas atrasadas atribuídas por Cássio para outras pessoas
    const { data: overdueTasks, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assignee:user_profiles!tasks_assigned_to_fkey(name),
        case:cases(title)
      `)
      .neq("status", "Concluída")
      .not("due_date", "is", null)
      .eq("created_by", CASSIO_ID) // considerando que ele criou/atribuiu
      .neq("assigned_to", CASSIO_ID); // que não seja para ele mesmo

    if (error) throw error;

    // Filtra apenas as que o prazo venceu ANTES de hoje
    const missedTasks = overdueTasks.filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate < today;
    });

    if (missedTasks.length === 0) {
      return NextResponse.json({ message: "Nenhuma tarefa atrasada para alertar." });
    }

    // Pega os dados do Dr. Cássio
    const { data: cassioProfile } = await supabase
      .from("user_profiles")
      .select("name, full_name, phone")
      .eq("id", CASSIO_ID)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(CASSIO_ID);
    const cassioEmail = authUser?.user?.email;

    // Cria as notificações no sistema
    const notificationsToInsert = missedTasks.map(task => ({
      user_id: CASSIO_ID,
      title: "Tarefa em Atraso!",
      message: `A tarefa "${task.title}" atribuída a ${task.assignee?.name || 'alguém'} está atrasada (Prazo: ${new Date(task.due_date).toLocaleDateString('pt-BR')}).`,
      type: "warning",
      is_read: false
    }));

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    // Se tiver muitas, mandar um email / SMS resumido
    if (cassioEmail) {
      const tasksListHtml = missedTasks.map(t => 
        `<li><strong>\${t.title}</strong> - Atribuída a: \${t.assignee?.name || 'Desconhecido'} (Prazo era: \${new Date(t.due_date).toLocaleDateString('pt-BR')})</li>`
      ).join('');

      const emailHtml = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Relatório de Tarefas Atrasadas</h2>
          <p>Dr. Cássio, as seguintes tarefas que você delegou não foram concluídas no prazo:</p>
          <ul>\${tasksListHtml}</ul>
          <p>Acesse o sistema para cobrar os responsáveis.</p>
        </div>
      `;
      await sendEmail(cassioEmail, `Alerta: \${missedTasks.length} tarefa(s) atrasada(s)`, emailHtml);
    }

    if (cassioProfile?.phone) {
      const smsMsg = `FAZ ADV: Dr. Cassio, existem \${missedTasks.length} tarefas que voce delegou que estao ATRASADAS. Acesse o sistema para verificar.`;
      await sendSMS(cassioProfile.phone, smsMsg);
    }

    return NextResponse.json({ 
      message: "Alertas enviados com sucesso", 
      count: missedTasks.length 
    });

  } catch (error: any) {
    console.error("Erro cron check-overdue-tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
