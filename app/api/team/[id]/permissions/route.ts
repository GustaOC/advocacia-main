import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role, permissions } = await req.json();
    
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, permissions })
      .eq('id', params.id);
      
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar permissões:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}