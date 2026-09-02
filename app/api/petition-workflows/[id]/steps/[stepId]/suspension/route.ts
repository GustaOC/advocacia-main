import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import {
  parsePetitionStepSuspension,
  serializePetitionStepSuspension,
} from "@/lib/petition-step-suspension";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string; stepId: string } },
) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const body = await request.json();
    const action = body.action as "suspend" | "resume";

    if (action !== "suspend" && action !== "resume") {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    const [{ data: workflow, error: workflowError }, { data: step, error: stepError }] = await Promise.all([
      supabase.from("petition_workflows").select("id, current_step, status").eq("id", params.id).single(),
      supabase.from("petition_workflow_steps").select("*").eq("id", params.stepId).eq("workflow_id", params.id).single(),
    ]);

    if (workflowError || !workflow || stepError || !step) {
      return NextResponse.json({ error: "Etapa ou petição não encontrada." }, { status: 404 });
    }
    if (step.step_name !== "Questões pendentes") {
      return NextResponse.json({ error: "Somente a etapa Questões pendentes pode suspender o prazo." }, { status: 400 });
    }
    if (step.step_number !== workflow.current_step || step.status === "Concluída" || workflow.status === "Concluída") {
      return NextResponse.json({ error: "A suspensão só pode ser alterada na etapa atual." }, { status: 409 });
    }
    if (step.assigned_to !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Apenas o responsável ou um administrador pode alterar a suspensão." }, { status: 403 });
    }

    const existing = parsePetitionStepSuspension(step.notes);
    const currentlySuspended = Boolean(existing && !existing.resumedAt);
    if ((action === "suspend" && currentlySuspended) || (action === "resume" && !currentlySuspended)) {
      return NextResponse.json({ workflowStatus: workflow.status, step });
    }

    const now = new Date().toISOString();
    const suspension = action === "suspend"
      ? {
          suspendedAt: now,
          suspendedBy: user.id,
          originalNotes: existing?.originalNotes ?? step.notes ?? null,
        }
      : {
          ...existing!,
          resumedAt: now,
          resumedBy: user.id,
        };
    const nextStepStatus = action === "suspend" ? "Suspensa" : "Em andamento";
    const nextWorkflowStatus = action === "suspend" ? "Suspensa" : "Em andamento";

    const { data: updatedStep, error: updateStepError } = await supabase
      .from("petition_workflow_steps")
      .update({ status: nextStepStatus, notes: serializePetitionStepSuspension(suspension) })
      .eq("id", step.id)
      .select()
      .single();
    if (updateStepError) throw updateStepError;

    const { error: updateWorkflowError } = await supabase
      .from("petition_workflows")
      .update({ status: nextWorkflowStatus })
      .eq("id", workflow.id);
    if (updateWorkflowError) {
      await supabase.from("petition_workflow_steps").update({ status: step.status, notes: step.notes }).eq("id", step.id);
      throw updateWorkflowError;
    }

    return NextResponse.json({
      workflowStatus: nextWorkflowStatus,
      step: updatedStep,
      suspendedAt: suspension.suspendedAt,
      resumedAt: "resumedAt" in suspension ? suspension.resumedAt : null,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    console.error("Erro ao alterar suspensão de prazo:", error);
    return NextResponse.json({ error: error.message || "Falha ao alterar suspensão." }, { status: 500 });
  }
}
