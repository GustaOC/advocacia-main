import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("analysis_sessions")
      .select(`
        *,
        documents:analysis_documents(id),
        created_user:user_profiles!analysis_sessions_created_by_fkey(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Erro GET /api/document-analysis:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar sessões." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("analysis_sessions")
      .insert([
        {
          title: body.title,
          case_id: body.case_id || null,
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro POST /api/document-analysis:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar sessão." },
      { status: 500 }
    );
  }
}
