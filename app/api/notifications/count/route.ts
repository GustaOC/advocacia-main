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
      .select("*", { count: 'exact', head: true })
      .eq("is_read", false)
      .eq("user_id", user.id);

    const { count, error } = await query;

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ count: 0 });
  }
}