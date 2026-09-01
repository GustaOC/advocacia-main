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
      .eq("user_id", user.id)
      .neq("title", "Novo Processo");

    const { count: notifCount, error } = await query;
    if (error) throw error;
    
    let totalCount = notifCount || 0;

    // 2. Fetch Tasks count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] as string;

    let tasksQuery = supabase
      .from("tasks")
      .select("*", { count: 'exact', head: true })
      .neq("status", "Concluída");

    if (user.role === 'admin') {
      tasksQuery = tasksQuery.lte("due_date", todayStr);
    } else {
      tasksQuery = tasksQuery.eq("assigned_to", user.id);
    }

    const { count: tasksCount, error: tasksError } = await tasksQuery;
    
    if (!tasksError && tasksCount) {
      totalCount += tasksCount;
    }

    return NextResponse.json({ count: totalCount });
  } catch (error: any) {
    return NextResponse.json({ count: 0 });
  }
}
