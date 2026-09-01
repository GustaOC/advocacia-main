import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Nenhum contexto fornecido.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave da API do Gemini não configurada no servidor (GEMINI_API_KEY).' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Passo 1: Extrair palavras-chave e intenção com IA
    const systemPrompt = `Você é um assistente jurídico especialista em jurisprudência brasileira.
O usuário vai enviar o contexto de um caso ou um comando direto.
Seu objetivo é gerar uma lista de 5 a 10 ementas REAIS e RELEVANTES de tribunais brasileiros (STJ, STF, TJMS, TJSP, etc) que se encaixem no contexto.
Retorne EXATAMENTE um array JSON no formato:
[
  {
    "ementa": "Ementa completa do julgado...",
    "data": "DD/MM/AAAA",
    "resultado": "Provido / Improvido / Concedido",
    "tribunal": "Sigla do Tribunal (ex: STJ - 3ª Turma)",
    "link": "https://www.jusbrasil.com.br/jurisprudencia/busca?q=palavras+chave+especificas"
  }
]
Não invente julgados. Use julgados reais e notórios sobre o tema. Não adicione markdown \`\`\`json, apenas o array cru.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\nContexto do usuário: ' + query }] }],
      config: {
        temperature: 0.2,
      }
    });

    let resultText = response.text || '[]';
    
    // Limpar formatação markdown se a IA colocar acidentalmente
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let results = [];
    try {
      results = JSON.parse(resultText);
    } catch (e) {
      console.error("Erro ao parsear JSON da IA:", resultText);
      return NextResponse.json({ error: 'Falha ao processar os resultados da jurisprudência.' }, { status: 500 });
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error("Erro na busca de jurisprudência:", error);
    const apiError = error?.message || error?.toString() || 'Erro interno ao buscar jurisprudência.';
    return NextResponse.json({ error: `Erro do Google Gemini: ${apiError}` }, { status: 500 });
  }
}
