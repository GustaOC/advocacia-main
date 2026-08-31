import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verificação de segurança recomendada pela Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("Tentativa de acionar cron sem token válido");
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const githubUrl = 'https://api.github.com/repos/GustaOC/advocacia-main/actions/workflows/robo-publicacoes.yml/dispatches';
    const githubToken = process.env.GITHUB_PAT;

    if (!githubToken) {
      return NextResponse.json({ error: 'Token do GitHub não configurado no servidor.' }, { status: 500 });
    }

    const response = await fetch(githubUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FAZ-Adv-Robot-Cron'
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro do GitHub:", errorText);
      return NextResponse.json({ error: `Falha no GitHub (Status ${response.status}): ${errorText || response.statusText}` }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Robô acionado pontualmente às 07:00 via Vercel Cron!' });
  } catch (error: any) {
    console.error("Erro no gatilho do robô via cron:", error);
    return NextResponse.json({ error: 'Erro interno no servidor ao acionar robô.' }, { status: 500 });
  }
}
