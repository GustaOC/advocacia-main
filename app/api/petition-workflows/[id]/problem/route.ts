import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    const user = await getSessionUser();
    const { id: workflowId } = params;
    const body = await request.json();
    const { title, description, current_step } = body;

    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    
    // CASSIO_ID
    const CASSIO_ID = '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1';

    // 1. Pegar todas as steps desse workflow
    const { data: steps, error: fetchError } = await supabase
      .from("petition_workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("step_number", { ascending: false });

    if (fetchError) throw fetchError;

    const maxStep = steps.length > 0 ? steps[0].step_number : current_step;

    // 2. Mover as steps pra frente (de maxStep até current_step)
    for (let i = maxStep; i >= current_step; i--) {
      await supabase
        .from("petition_workflow_steps")
        .update({ step_number: i + 1 })
        .eq("workflow_id", workflowId)
        .eq("step_number", i);
    }

    // 3. Inserir a nova etapa de problemática na posição current_step
    const { data: newStep, error: insertError } = await supabase
      .from("petition_workflow_steps")
      .insert([{
        workflow_id: workflowId,
        step_number: current_step,
        step_name: `Problemática: ${title}`,
        assigned_to: CASSIO_ID,
        notes: description,
        status: "Pendente"
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao inserir problem step:", insertError);
      throw insertError;
    }

    // Enviar email para o Dr. Cassio
    const { data: cassioAuth } = await supabase.auth.admin.getUserById(CASSIO_ID);
    if (cassioAuth?.user?.email) {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Nova Problemática Reportada</h2>
            <p>O usuário <strong>${user.name}</strong> reportou uma problemática na etapa atual e o fluxo de petição foi bloqueado aguardando sua resolução.</p>
            <div style="padding: 15px; border-left: 4px solid #ffaa00; background: #f9f9f9; margin: 15px 0;">
              <h3 style="margin-top: 0;">${title}</h3>
              <p>${description}</p>
            </div>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cassiomiguel.com.br'}/dashboard?tab=petitions" style="display:inline-block; padding:10px 15px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Acessar Workflows</a></p>
          </div>
        `;
        await sendEmail(cassioAuth.user.email, `Problemática Reportada: ${title}`, emailHtml).catch(console.error);
    }

    return NextResponse.json({ success: true, newStep });

  } catch (error: any) {
    console.error("Erro POST problem:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
