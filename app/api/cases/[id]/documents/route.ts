import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";

async function uploadDocumentHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Requer permissão para criar documentos
    const user = await requirePermission("documents_create");
    const caseId = Number(params.id);
    
    if (isNaN(caseId)) {
      return NextResponse.json({ error: "ID do caso inválido." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // Validar tipo do arquivo (PDF e Word apenas)
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = fileExt === 'pdf' || fileExt === 'doc' || fileExt === 'docx';

    if (!allowedMimeTypes.includes(file.type) && !isAllowedExt) {
      return NextResponse.json({ error: "Apenas arquivos PDF e Word são permitidos." }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Verifica se o usuário de fato existe na tabela "profiles" antes de vinculá-lo.
    // Se não existir, o vínculo ficará nulo, evitando o erro de Foreign Key.
    let uploadedByUserId = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
        
      if (profile) {
        uploadedByUserId = user.id;
      }
    }

    // Gera um nome único para o arquivo
    const fileName = `${caseId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Faz o upload para o Storage do Supabase (Bucket: "case_documents")
    const { data: storageData, error: storageError } = await supabase.storage
      .from("case_documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      console.error("[Storage Upload Error]", storageError);
      throw new Error(`Erro no upload para o storage: ${storageError.message}`);
    }

    // Salvar metadados do arquivo na tabela `documents`
    const { data: docData, error: dbError } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        file_name: file.name,
        file_path: storageData.path,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_by_user_id: uploadedByUserId
      })
      .select()
      .single();

    if (dbError) {
      console.error("[DB Insert Error]", dbError);
      // Desfaz o upload no storage caso falhe o insert no banco
      await supabase.storage.from("case_documents").remove([storageData.path]);
      return NextResponse.json({ error: `Erro no BD: ${dbError.message}. Detalhes: ${dbError.details || dbError.hint || 'nenhum'}` }, { status: 500 });
    }

    return NextResponse.json({ message: "Documento enviado com sucesso.", document: docData });
  } catch (error: any) {
    console.error("[API Upload Document]", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}

export const POST = withRateLimit(uploadDocumentHandler);