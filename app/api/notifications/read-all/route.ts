import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"

export async function PUT() {
  try {
    const user = await requireAuth()

    const supabase = createAdminClient()

    let query = supabase
      .from("notifications")
      .update({
        is_read: true,
        read: true
      })
      .eq("is_read", false);

    // Se não for admin, atualiza apenas as suas próprias notificações
    if (user.role !== 'admin') {
      query = query.eq("user_id", user.id);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Todas as notificações marcadas como lidas" });

  } catch (error: any) {
    console.error("Erro PUT /api/notifications/read-all:", error);
    
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Não autorizado", success: false }, 
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      )
    }

    return NextResponse.json({ 
      error: "Erro interno do servidor", 
      success: false 
    }, { status: 500 })
  }
}
