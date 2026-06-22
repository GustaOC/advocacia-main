import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: "user_id é obrigatório" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ count: 0 });
  }
}