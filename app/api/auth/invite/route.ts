import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    
    // Opcional: permitir que roles com permissão gerem convite, mas padronizando admin para mais segurança
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem gerar convites.' }, { status: 403 });
    }

    // Usando a chave de serviço como segredo para assinar o JWT
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Configuração do servidor ausente (Secret Key)' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(secretKey);
    const alg = 'HS256';

    // Gera um token válido por 7 dias
    const jwt = await new SignJWT({ type: 'registration_invite', createdBy: user.id })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return NextResponse.json({ token: jwt });
  } catch (error: any) {
    console.error("[API Invite Generate]", error);
    return NextResponse.json({ error: 'Erro ao gerar link de convite.' }, { status: 500 });
  }
}
