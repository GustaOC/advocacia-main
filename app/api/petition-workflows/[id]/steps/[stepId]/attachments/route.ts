import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

const BUCKET = "petition-attachments";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const supabase = createAdminClient();
    const { data: step, error: stepError } = await supabase
      .from("petition_workflow_steps")
      .select("id, assigned_to")
      .eq("id", params.stepId)
      .eq("workflow_id", params.id)
      .single();

    if (stepError || !step) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    if (step.assigned_to !== user.id) {
      return NextResponse.json({ error: "Somente o responsável pode anexar arquivos nesta etapa." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `O arquivo ${file.name} ultrapassa o limite de 25 MB.` }, { status: 400 });
    }

    const rawExtension = file.name.includes(".") ? file.name.split(".").pop() || "bin" : "bin";
    const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${params.id}/${params.stepId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) throw error;

    const url = `/api/petition-workflows/${params.id}/steps/${params.stepId}/attachments?path=${encodeURIComponent(data.path)}`;
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erro ao anexar arquivo à etapa:", error);
    return NextResponse.json({ error: error.message || "Falha ao enviar anexo." }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const path = new URL(request.url).searchParams.get("path");
    const expectedPrefix = `${params.id}/${params.stepId}/`;
    if (!path || !path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Caminho de anexo inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw error || new Error("Anexo não encontrado.");

    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    console.error("Erro ao abrir anexo da etapa:", error);
    return NextResponse.json({ error: error.message || "Falha ao abrir anexo." }, { status: 500 });
  }
}
