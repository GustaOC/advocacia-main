import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    
    // Extrai o ID e o restante dos dados a serem atualizados
    const { id, ...updates } = body;

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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro POST /api/tasks:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar tarefa." },
      { status: 500 }
    );
  }
}
