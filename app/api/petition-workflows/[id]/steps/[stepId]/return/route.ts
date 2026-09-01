import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

const STEP_RETURN_PREFIX = "__WORKFLOW_RETURN__:";

export async function POST(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const observations = typeof body.observations === "string" ? body.observations.trim() : "";

    if (!reason) {
      return NextResponse.json({ error: "O motivo do retorno é obrigatório." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: workflow, error: workflowError } = await supabase
      .from("petition_workflows")
      .select("id, title, current_step, status")
      .eq("id", params.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Petição não encontrada." }, { status: 404 });
    }

    const { data: currentStep, error: currentStepError } = await supabase
      .from("petition_workflow_steps")
      .select("*")
      .eq("id", params.stepId)
      .eq("workflow_id", params.id)
      .single();

    if (currentStepError || !currentStep) {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    if (currentStep.step_number !== workflow.current_step || workflow.status === "Concluída") {
      return NextResponse.json({ error: "Somente a etapa atual pode ser devolvida." }, { status: 400 });
    }

    if (currentStep.assigned_to !== user.id) {
      return NextResponse.json({ error: "Somente o responsável atual pode voltar a etapa." }, { status: 403 });
    }

    if (currentStep.step_number <= 1) {
      return NextResponse.json({ error: "A primeira etapa não pode ser devolvida." }, { status: 400 });
    }

    const previousStepNumber = currentStep.step_number - 1;
    const { data: previousStep, error: previousStepError } = await supabase
      .from("petition_workflow_steps")
      .select("*")
      .eq("workflow_id", params.id)
      .eq("step_number", previousStepNumber)
      .single();

    if (previousStepError || !previousStep) {
      return NextResponse.json({ error: "Etapa anterior não encontrada." }, { status: 404 });
    }

    const returnInfo = STEP_RETURN_PREFIX + JSON.stringify({
      reason,
      observations: observations || undefined,
      fromStepNumber: currentStep.step_number,
      fromStepName: currentStep.step_name,
      returnedBy: user.name || "Usuário",
      returnedAt: new Date().toISOString()
    });

    const { error: currentUpdateError } = await supabase
      .from("petition_workflow_steps")
      .update({ status: "Pendente", notes: null })
      .eq("id", currentStep.id);
    if (currentUpdateError) throw currentUpdateError;

    const { error: previousUpdateError } = await supabase
      .from("petition_workflow_steps")
      .update({
        status: "Em andamento",
        notes: returnInfo,
        completed_at: null,
        completed_by: null
      })
      .eq("id", previousStep.id);

    if (previousUpdateError) {
      await supabase.from("petition_workflow_steps").update(currentStep).eq("id", currentStep.id);
      throw previousUpdateError;
    }

    const { error: workflowUpdateError } = await supabase
      .from("petition_workflows")
      .update({ current_step: previousStepNumber, status: "Em andamento" })
      .eq("id", params.id);

    if (workflowUpdateError) {
      await supabase.from("petition_workflow_steps").update(previousStep).eq("id", previousStep.id);
      await supabase.from("petition_workflow_steps").update(currentStep).eq("id", currentStep.id);
      throw workflowUpdateError;
    }

    if (previousStep.assigned_to) {
      await supabase.from("notifications").insert({
        user_id: previousStep.assigned_to,
        title: "Etapa devolvida para correção",
        message: `A etapa "${previousStep.step_name}" da petição "${workflow.title}" foi reaberta. Motivo: ${reason}`,
        type: "warning",
        is_read: false
      });
    }

    return NextResponse.json({ success: true, current_step: previousStepNumber });
  } catch (error: any) {
    console.error("Erro ao voltar etapa:", error);
    return NextResponse.json({ error: error.message || "Falha ao voltar etapa." }, { status: 500 });
  }
}
