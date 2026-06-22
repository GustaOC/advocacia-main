import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("*");

    if (error) {
      throw error;
    }

    const mappedProfiles = (profiles || []).map(profile => ({
      ...profile,
      name: profile.name || profile.full_name || profile.email || "Usuário sem nome",
      role: profile.role || "member",
    }));

    return NextResponse.json(mappedProfiles);
  } catch (error: any) {
    console.error("Erro na API de employees:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" }, 
      { status: 500 }
    );
  }
}