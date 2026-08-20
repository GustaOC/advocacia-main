import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro do GitHub:", errorText);
      return NextResponse.json({ error: `Falha ao acionar o GitHub Actions: ${response.statusText}` }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'Robô acionado com sucesso no GitHub Actions!' });
  } catch (error: any) {
    console.error("Erro no gatilho do robô:", error);
    return NextResponse.json({ error: 'Erro interno no servidor ao acionar robô.' }, { status: 500 });
  }
}
