import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token não fornecido.' }, { status: 400 });
    }

    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!secretKey) {
      return NextResponse.json({ valid: false, error: 'Configuração do servidor ausente.' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(secretKey);

    try {
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.type === 'registration_invite') {
        return NextResponse.json({ valid: true });
      } else {
        return NextResponse.json({ valid: false, error: 'Tipo de convite inválido.' }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ valid: false, error: 'Token inválido ou expirado.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[API Verify Invite]", error);
    return NextResponse.json({ valid: false, error: 'Erro interno ao verificar token.' }, { status: 500 });
  }
}
