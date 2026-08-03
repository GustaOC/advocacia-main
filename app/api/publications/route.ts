import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("publications")
      .select(`
        *,
        assigned_user:user_profiles!publications_assigned_to_fkey(name)
      `)
      .order("publication_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Erro GET /api/publications:", error);
    return NextResponse.json({ error: error.message || "Falha ao buscar publicações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();

    let taskId = null;

    // Se houver um responsável, cria uma tarefa para ele
    if (body.assigned_to) {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert([{
          title: `Realizar publicação: ${body.title}`,
          description: body.description || "Criada automaticamente pelo módulo de Publicações.",
          priority: "Média",
          status: "Pendente",
          assigned_to: body.assigned_to,
          due_date: body.publication_date,
        }])
        .select()
        .single();
      
      if (taskError) throw taskError;
      taskId = taskData.id;

      await supabase.from("notifications").insert([{
        user_id: body.assigned_to,
        title: "Nova publicação atribuída",
        message: `Uma publicação "${body.title}" foi atribuída a você para o dia ${new Date(body.publication_date).toLocaleDateString('pt-BR')}.`,
        type: "info",
        is_read: false
      }]);
    }

    const { data, error } = await supabase
      .from("publications")
      .insert([{
        title: body.title,
        description: body.description || null,
        publication_date: body.publication_date,
        assigned_to: body.assigned_to || null,
        status: body.status || "Pendente",
        task_id: taskId
      }])
      .select(`
        *,
        assigned_user:user_profiles!publications_assigned_to_fkey(name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro POST /api/publications:", error);
    return NextResponse.json({ error: error.message || "Falha ao criar publicação." }, { status: 500 });
  }
}
