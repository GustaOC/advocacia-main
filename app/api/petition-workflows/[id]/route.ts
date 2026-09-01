import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID do workflow é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("petition_workflows")
      .select(`
        *,
        steps:petition_workflow_steps(
          *,
          assigned_user:user_profiles!petition_workflow_steps_assigned_to_fkey(id, name)
        ),
        case:cases(id, title, case_number, description),
        created_user:user_profiles!petition_workflows_created_by_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // not found
        return NextResponse.json({ error: "Workflow não encontrado." }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error(`Erro GET /api/petition-workflows/${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar workflow." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID do workflow é obrigatório." }, { status: 400 });
    }

    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) {
      updates.description = typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if (body.case_id !== undefined) updates.case_id = body.case_id;

    const { data, error } = await supabase
      .from("petition_workflows")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error(`Erro PUT /api/petition-workflows/${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar workflow." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID do workflow é obrigatório." }, { status: 400 });
    }

    const { error } = await supabase.from("petition_workflows").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error(`Erro DELETE /api/petition-workflows/${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || "Falha ao excluir workflow." },
      { status: 500 }
    );
  }
}
