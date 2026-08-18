import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("petition_workflows")
      .select(`
        *,
        steps:petition_workflow_steps(
          *,
          assigned_user:user_profiles!petition_workflow_steps_assigned_to_fkey(id, name)
        ),
        created_user:user_profiles!petition_workflows_created_by_fkey(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Erro GET /api/petition-workflows:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar workflows." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { data: workflow, error: workflowError } = await supabase
      .from("petition_workflows")
      .insert([
        {
          title: body.title,
          case_id: body.case_id || null,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (workflowError) throw workflowError;

    const stepNames = [
      "Triagem, organização dos documentos (renomear) e resumo NotebookLM",
      "Claude + NotebookLM: descrever problema, anexar resumo/docs, solicitar teses + docs pendentes",
      "Fechamento de acordo",
      "Procuração",
      "Agente ChatGPT: elaborar petição inicial",
      "Claude Skill Auditoria (contestar a petição)",
      "Avaliar resultado da auditoria",
      "Formatação da petição",
      "Análise final do documento",
      "Protocolo"
    ];

    const stepsToInsert = stepNames.map((name, index) => ({
      workflow_id: workflow.id,
      step_number: index + 1,
      step_name: name,
      status: "Pendente",
    }));

    const { data: steps, error: stepsError } = await supabase
      .from("petition_workflow_steps")
      .insert(stepsToInsert)
      .select();

    if (stepsError) throw stepsError;

    return NextResponse.json({ ...workflow, steps });
  } catch (error: any) {
    console.error("Erro POST /api/petition-workflows:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar workflow." },
      { status: 500 }
    );
  }
}
