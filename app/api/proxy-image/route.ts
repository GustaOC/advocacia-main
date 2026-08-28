import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });
  }

  const blockedPatterns = ['127.0.0.1', 'localhost', '169.254.', '10.', '172.16.', '192.168.'];
  if (blockedPatterns.some(pattern => url.includes(pattern))) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 403 });
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.endsWith('supabase.co')) {
      return NextResponse.json({ error: 'Domínio não permitido' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!res.ok) throw new Error('Erro ao buscar imagem');

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar imagem' }, { status: 500 });
  }
}