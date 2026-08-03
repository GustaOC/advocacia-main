import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
            assigned_to: body.assigned_to
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
              due_date: body.publication_date || originalPub.publication_date,
            }])
            .select()
            .single();
          if (taskError) throw taskError;
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

      } else {
        // Se removeu o assigned_to, cancela ou remove a tarefa
        if (taskId) {
          await supabase.from("tasks").delete().eq("id", taskId);
          taskId = null;
        }
      }
    }

    // Atualiza status da tarefa caso a publicação seja concluída/cancelada
    if (body.status && body.status !== originalPub.status && taskId) {
      await supabase.from("tasks").update({ status: body.status }).eq("id", taskId);
    }

    // Atualiza a publicação
    const { data, error } = await supabase
      .from("publications")
      .update({
        title: body.title,
        description: body.description,
        publication_date: body.publication_date,
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
