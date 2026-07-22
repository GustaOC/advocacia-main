import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão expirada ou não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .eq("user_id", user.id);

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error: any) {
    // Se a tabela não existir, retornamos vazio para o front-end não quebrar
    return NextResponse.json({ notifications: [] });
  }
}