import { NextResponse } from 'next/server';

// Adicionando um GET apenas para fins de debug (para testar acessando direto no navegador)
export async function GET(request: Request) {
  return NextResponse.json({ 
    status: "ok", 
    message: "A Rota da API está no ar na Vercel e funcionando!",
    githubTokenConfigured: !!process.env.GITHUB_PAT
  });
}

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
        'User-Agent': 'FAZ-Adv-Robot'
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro do GitHub:", errorText);
      // Alterado para retornar status 200 e passar o erro no corpo, para não confundir o painel da Vercel
      return NextResponse.json({ 
        error: `Falha no GitHub (Status ${response.status}): ${errorText || response.statusText}` 
      }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Robô acionado com sucesso no GitHub Actions!' });
  } catch (error: any) {
    console.error("Erro no gatilho do robô:", error);
    return NextResponse.json({ error: 'Erro interno no servidor ao acionar robô.' }, { status: 500 });
  }
}
