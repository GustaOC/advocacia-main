import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser, clearAuthCache } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, email } = await req.json();
    const supabase = createAdminClient();

    // 1. Atualizar o e-mail de acesso de forma segura via Auth Admin
    if (email && email !== user.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
        email: email,
      });
      if (authError) throw new Error(`Erro ao atualizar e-mail de login: ${authError.message}`);
    }

    // 2. Atualizar tabela user_profiles dinamicamente (evitando erros de coluna inexistente)
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!fetchError && currentProfile) {
      const updateData: Record<string, any> = {};
      if (name && 'name' in currentProfile) updateData.name = name;
      if (name && 'full_name' in currentProfile) updateData.full_name = name;
      if (email && 'email' in currentProfile) updateData.email = email;

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id);
        if (profileError) throw profileError;
      }
    }

    // Limpa o cache para que a alteração do nome apareça na tela imediatamente
    clearAuthCache(user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}