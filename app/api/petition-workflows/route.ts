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

    
    const USERS = {
      GUSTAVO: 'f17e2449-612b-4159-bf39-31f3109d6755',
      CASSIO: '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1',
      AMABILLIN: 'c766d4cf-1f79-497c-92a3-4378905aafe9'
    };

    const stepConfigs = [
      { name: "Triagem inicial", assign: USERS.GUSTAVO },
      { name: "Organização e nomeação dos documentos", assign: USERS.GUSTAVO },
      { name: "Análise documental e Resumo", assign: USERS.GUSTAVO },
      { name: "Tese jurídica", assign: USERS.CASSIO },
      { name: "Viabilidade e proposta honorários", assign: USERS.CASSIO },
      { name: "Formatar proposta de honorários", assign: USERS.GUSTAVO },
      { name: "Preparação dos insumos. ( documentos necessários) e contrato de honorários", assign: USERS.GUSTAVO },
      { name: "Elaborar petição", assign: USERS.AMABILLIN },
      { name: "Formatar word", assign: USERS.AMABILLIN },
      { name: "Revisão final", assign: USERS.CASSIO },
      { name: "protocolo", assign: USERS.GUSTAVO },
      { name: "Acompanhamento pós protocolo", assign: USERS.CASSIO }
    ];

    const stepsToInsert = stepConfigs.map((cfg, index) => ({
      workflow_id: workflow.id,
      step_number: index + 1,
      step_name: cfg.name,
      assigned_to: cfg.assign,
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
