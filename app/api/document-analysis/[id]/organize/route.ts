import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave da API do Gemini não configurada (GEMINI_API_KEY).' }, { status: 500 });
    }

    const { id } = params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: documents, error: docsError } = await supabase
      .from('analysis_documents')
      .select('id, original_name, extracted_text')
      .eq('session_id', id);

    if (docsError) throw docsError;
    if (!documents || documents.length === 0) {
      return NextResponse.json([]);
    }

    const docsContext = documents.map(doc => {
      const textPreview = doc.extracted_text ? doc.extracted_text.substring(0, 500) : 'Sem texto extraído';
      return `ID: ${doc.id}\nNome Original: ${doc.original_name}\nConteúdo Inicial: ${textPreview}\n---`;
    }).join('\n');

    const systemPrompt = `Você é um assistente jurídico especialista em organização de documentos. Dado a lista de documentos abaixo com seus nomes originais e primeiros parágrafos, sugira nomes organizados e padronizados seguindo o formato: 'Doc XX - [Tipo do Documento]'. Retorne EXATAMENTE um array JSON: [{"id": "document-uuid", "suggestedName": "Doc 01 - Procuração"}]. Não adicione markdown \`\`\`json, apenas o array cru.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + docsContext }] }],
      config: {
        temperature: 0.2,
      }
    });

    let resultText = response.text || '[]';
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    let suggestions = [];
    try {
      suggestions = JSON.parse(resultText);
    } catch (e) {
      console.error("Erro ao parsear JSON da IA:", resultText);
      return NextResponse.json({ error: 'Falha ao processar as sugestões de organização.' }, { status: 500 });
    }

    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error("Erro em /api/document-analysis/[id]/organize:", error);
    return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 });
  }
}
