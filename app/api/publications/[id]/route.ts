import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "ID da publicação é obrigatório." }, { status: 400 });
    }

    // Busca a publicação original para saber se o assigned_to mudou
    const { data: originalPub, error: fetchError } = await supabase
      .from("publications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    let taskId = originalPub.task_id;

    // Se o assigned_to mudou
    if (body.assigned_to !== undefined && body.assigned_to !== originalPub.assigned_to) {
      if (body.assigned_to) {
        // Se tinha tarefa antes, atualiza
        if (taskId) {
          await supabase.from("tasks").update({
            assigned_to: body.assigned_to,
            due_date: body.due_date !== undefined ? body.due_date : originalPub.due_date || originalPub.publication_date
          }).eq("id", taskId);
        } else {
          // Se não tinha tarefa, cria
          const { data: taskData, error: taskError } = await supabase
            .from("tasks")
            .insert([{
              title: `Realizar publicação: ${body.title || originalPub.title}`,
              description: body.description || originalPub.description || "Criada automaticamente pelo módulo de Publicações.",
              priority: "Média",
              status: "Pendente",
              assigned_to: body.assigned_to,
              due_date: body.due_date !== undefined ? body.due_date : originalPub.due_date || originalPub.publication_date,
            }])
            .select()
            .single();
          if (taskError) {
            console.error("ERRO AO CRIAR TAREFA:", taskError);
            throw taskError;
          }
          taskId = taskData.id;
        }

        // Envia notificação
        await supabase.from("notifications").insert([{
          user_id: body.assigned_to,
          title: "Publicação atribuída",
          message: `Uma publicação "${body.title || originalPub.title}" foi atribuída a você.`,
          type: "info",
          is_read: false
        }]);

        // Busca perfil
        const { data: assigneeProfile } = await supabase.from('user_profiles').select('name, phone').eq('id', body.assigned_to).single();
        const assigneeName = assigneeProfile?.name || 'você';

        // Envia E-mail de notificação
        const { data: authUser } = await supabase.auth.admin.getUserById(body.assigned_to);
        const assigneeEmail = authUser?.user?.email;
        if (assigneeEmail) {
          const currentUser = await getSessionUser();
          const assignerName = currentUser?.name || 'Alguém';
          
                    const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2>Olá, ${assigneeName}!</h2>
              <p><strong>${assignerName}</strong> acabou de atribuir uma publicação para você no Cássio Miguel Advogados.</p>
              <div style="padding: 15px; border-left: 4px solid #007bff; background: #f9f9f9; margin: 15px 0;">
                <h3 style="margin-top: 0;">${body.title || originalPub.title}</h3>
                ${body.description || originalPub.description ? `<p>${body.description || originalPub.description}</p>` : '<p><em>Sem descrição detalhada.</em></p>'}
              </div>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cassiomiguel.com.br'}/dashboard?tab=publications" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Publicações</a></p>
            </div>
          `;
          await sendEmail(assigneeEmail, `Nova Publicação: ${body.title || originalPub.title}`, emailHtml).catch(console.error);
        }

      } else {
        // Se removeu o assigned_to, cancela ou remove a tarefa
        if (taskId) {
          await supabase.from("tasks").delete().eq("id", taskId);
          taskId = null;
        }
      }
    }

    
    // Atualiza status e prazo da tarefa caso a publicação seja alterada
    if (taskId) {
      const taskUpdates: any = {};
      if (body.status && body.status !== originalPub.status) taskUpdates.status = body.status;
      if (body.due_date !== undefined && body.due_date !== originalPub.due_date) taskUpdates.due_date = body.due_date;
      
      if (Object.keys(taskUpdates).length > 0) {
        await supabase.from("tasks").update(taskUpdates).eq("id", taskId);
      }
    }

    // Se o status mudou para Transferido
    if (body.status === "Transferido" && originalPub.status !== "Transferido") {
      const currentUser = await getSessionUser();
      const userName = currentUser?.name || 'Alguém';
      const CASSIO_ID = '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1';
      
      // Notificação no sistema
      await supabase.from("notifications").insert([{
        user_id: CASSIO_ID,
        title: "Publicação Transferida",
        message: `A publicação "${body.title || originalPub.title}" foi transferida por ${userName}.`,
        type: "warning",
        is_read: false
      }]);

      // Email para Dr. Cassio
      const { data: cassioAuth } = await supabase.auth.admin.getUserById(CASSIO_ID);
      if (cassioAuth?.user?.email) {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Publicação Transferida</h2>
            <p>O usuário <strong>${userName}</strong> marcou a seguinte publicação como TRANSFERIDO:</p>
            <div style="padding: 15px; border-left: 4px solid #ffaa00; background: #f9f9f9; margin: 15px 0;">
              <h3 style="margin-top: 0;">${body.title || originalPub.title}</h3>
            </div>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cassiomiguel.com.br'}/dashboard?tab=publications" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Publicações</a></p>
          </div>
        `;
        await sendEmail(cassioAuth.user.email, `Publicação TRANSFERIDA: ${body.title || originalPub.title}`, emailHtml).catch(console.error);
      }
    }


    // Atualiza a publicação
    const { data, error } = await supabase
      .from("publications")
      .update({
        title: body.title,
        description: body.description,
        publication_date: body.publication_date,
        due_date: body.due_date !== undefined ? body.due_date : originalPub.due_date,
        assigned_to: body.assigned_to,
        status: body.status,
        task_id: taskId,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        assigned_user:user_profiles!publications_assigned_to_fkey(name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro PUT /api/publications/[id]:", error);
    return NextResponse.json({ error: error.message || "Falha ao atualizar publicação." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID da publicação é obrigatório." }, { status: 400 });
    }

    // Buscar para saber se tem tarefa atrelada
    const { data: originalPub } = await supabase
      .from("publications")
      .select("task_id")
      .eq("id", id)
      .single();

    if (originalPub?.task_id) {
      await supabase.from("tasks").delete().eq("id", originalPub.task_id);
    }

    const { error } = await supabase.from("publications").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro DELETE /api/publications/[id]:", error);
    return NextResponse.json({ error: error.message || "Falha ao excluir publicação." }, { status: 500 });
  }
}
