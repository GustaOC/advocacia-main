import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Instancia o cliente diretamente com as variáveis de ambiente
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Busca as tarefas ordenando das mais recentes para as mais antigas.
    // O "assigned_user:user_profiles(...)" é para trazer o nome do funcionário 
    // atribuído à tarefa (como esperado pelo seu tasks-module.tsx).
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_user:user_profiles!tasks_assigned_to_fkey(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Erro GET /api/tasks:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar tarefas." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    
    // Extrai o ID e o restante dos dados a serem atualizados, removendo campos de join
    const { id, assigned_user, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID da tarefa é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Se a tarefa mudou de status, atualiza também a publicação associada (se existir)
    if (updates.status) {
      const { data: pubData } = await supabase
        .from("publications")
        .select("id")
        .eq("task_id", id)
        .maybeSingle();

      if (pubData) {
        let pubStatus = updates.status;
        if (pubStatus === 'Em Andamento') {
          pubStatus = 'Pendente';
        }

        await supabase
          .from("publications")
          .update({ status: pubStatus, updated_at: new Date().toISOString() })
          .eq("id", pubData.id);
      }
    }

    if (updates.assigned_to) {
      const { data: assigneeProfile } = await supabase.from('user_profiles').select('name, full_name, phone').eq('id', updates.assigned_to).single();
      const assigneeName = assigneeProfile?.name || assigneeProfile?.full_name || 'você';

      await supabase.from("notifications").insert([{
        user_id: updates.assigned_to,
        title: "Nova tarefa atribuída",
        message: `A tarefa "${data.title}" foi atribuída a ${assigneeName}.`,
        type: "info",
        is_read: false
      }]);

      if (assigneeProfile?.phone) {
        const currentUser = await getSessionUser();
        const assignerName = currentUser?.name || 'Alguém';
        const dueDateStr = data.due_date ? new Date(data.due_date).toLocaleDateString('pt-BR') : 'Sem prazo';
        const smsMessage = `Cássio Miguel Advogados: ${assignerName} atribuiu a tarefa "${data.title}" para você. Prazo: ${dueDateStr}. Para mais detalhes, cheque o sistema.`;
        sendSMS(assigneeProfile.phone, smsMessage).catch(console.error);
      }

      // Envia E-mail de notificação
      const { data: authUser } = await supabase.auth.admin.getUserById(updates.assigned_to);
      const assigneeEmail = authUser?.user?.email;
      if (assigneeEmail) {
        const currentUser = await getSessionUser();
        const assignerName = currentUser?.name || 'Alguém';
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Olá, ${assigneeName}!</h2>
            <p><strong>${assignerName}</strong> acabou de atribuir uma tarefa para você no sistema Cássio Miguel Advogados.</p>
            <div style="padding: 15px; border-left: 4px solid #007bff; background: #f9f9f9; margin: 15px 0;">
              <h3 style="margin-top: 0;">${data.title}</h3>
              ${data.description ? `<p>${data.description}</p>` : '<p><em>Sem descrição detalhada.</em></p>'}
            </div>
            <p><a href="https://app.faz.adv.br/tarefas" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Tarefas</a></p>
          </div>
        `;
        sendEmail(assigneeEmail, `Nova Tarefa: ${data.title}`, emailHtml).catch(console.error);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro PATCH /api/tasks:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar tarefa." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID da tarefa é obrigatório." }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro DELETE /api/tasks:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir tarefa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();

    // Insere a nova tarefa usando os dados enviados pelo tasks-module.tsx
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: body.title,
          description: body.description,
          priority: body.priority || "Média",
          status: body.status || "Pendente",
          assigned_to: body.assigned_to || null,
          due_date: body.due_date || null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (body.assigned_to) {
      const { data: assigneeProfile } = await supabase.from('user_profiles').select('name, full_name, phone').eq('id', body.assigned_to).single();
      const assigneeName = assigneeProfile?.name || assigneeProfile?.full_name || 'você';

      await supabase.from("notifications").insert([{
        user_id: body.assigned_to,
        title: "Nova tarefa",
        message: `Uma nova tarefa "${body.title}" foi atribuída a ${assigneeName}.`,
        type: "info",
        is_read: false
      }]);

      if (assigneeProfile?.phone) {
        const currentUser = await getSessionUser();
        const assignerName = currentUser?.name || 'Alguém';
        const dueDateStr = body.due_date ? new Date(body.due_date).toLocaleDateString('pt-BR') : 'Sem prazo';
        const smsMessage = `Cássio Miguel Advogados: ${assignerName} atribuiu a tarefa "${body.title}" para você. Prazo: ${dueDateStr}. Para mais detalhes, cheque o sistema.`;
        sendSMS(assigneeProfile.phone, smsMessage).catch(console.error);
      }

      // Envia E-mail de notificação
      const { data: authUser } = await supabase.auth.admin.getUserById(body.assigned_to);
      const assigneeEmail = authUser?.user?.email;
      if (assigneeEmail) {
        const currentUser = await getSessionUser();
        const assignerName = currentUser?.name || 'Alguém';
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Olá, ${assigneeName}!</h2>
            <p><strong>${assignerName}</strong> acabou de criar e atribuir uma tarefa para você no sistema Cássio Miguel Advogados.</p>
            <div style="padding: 15px; border-left: 4px solid #007bff; background: #f9f9f9; margin: 15px 0;">
              <h3 style="margin-top: 0;">${body.title}</h3>
              ${body.description ? `<p>${body.description}</p>` : '<p><em>Sem descrição detalhada.</em></p>'}
            </div>
            <p><a href="https://app.faz.adv.br/tarefas" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Tarefas</a></p>
          </div>
        `;
        sendEmail(assigneeEmail, `Nova Tarefa: ${body.title}`, emailHtml).catch(console.error);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro POST /api/tasks:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar tarefa." },
      { status: 500 }
    );
  }
}
