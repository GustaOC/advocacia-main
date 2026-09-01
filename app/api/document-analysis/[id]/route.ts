import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = params;

    const { data, error } = await supabase
      .from("analysis_sessions")
      .select(`
        *,
        documents:analysis_documents(*),
        messages:analysis_messages(*),
        created_user:user_profiles!analysis_sessions_created_by_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // not found
        return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
      }
      throw error;
    }

    // Sort messages ascending by created_at
    if (data.messages && Array.isArray(data.messages)) {
      data.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro GET /api/document-analysis/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar sessão." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    const { id } = params;

    if (body.documentId) {
      // update document
      const { documentId, suggested_name } = body;
      const { data, error } = await supabase
        .from("analysis_documents")
        .update({ suggested_name })
        .eq("id", documentId)
        .eq("session_id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // update session
      const { title, case_id } = body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (case_id !== undefined) updates.case_id = case_id;

      const { data, error } = await supabase
        .from("analysis_sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Erro PUT /api/document-analysis/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = params;

    // Get all documents for the session
    const { data: documents, error: docsError } = await supabase
      .from("analysis_documents")
      .select("file_url")
      .eq("session_id", id);
      
    if (docsError) throw docsError;

    // Extract filenames from URLs and delete from storage
    if (documents && documents.length > 0) {
      const filesToDelete = documents.map(doc => {
        const urlParts = doc.file_url.split('/');
        // Extract everything after bucket name "analysis-documents"
        // typically: https://xxx.supabase.co/storage/v1/object/public/analysis-documents/sessionId/file
        const bucketIndex = urlParts.indexOf('analysis-documents');
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          return urlParts.slice(bucketIndex + 1).join('/');
        }
        return null;
      }).filter(Boolean) as string[];

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('analysis-documents')
          .remove(filesToDelete);
        if (storageError) console.error("Error deleting files from storage:", storageError);
      }
    }

    // Delete session (cascade should handle documents and messages)
    const { error: deleteError } = await supabase
      .from("analysis_sessions")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro DELETE /api/document-analysis/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao excluir." },
      { status: 500 }
    );
  }
}
