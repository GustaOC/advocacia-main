import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const { question, documentIds } = body;

    if (!question) {
      return NextResponse.json({ error: 'Pergunta é obrigatória.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave da API do Gemini não configurada (GEMINI_API_KEY).' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('analysis_documents')
      .select('original_name, suggested_name, extracted_text')
      .eq('session_id', id);

    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      query = query.in('id', documentIds);
    }

    const { data: documents, error: docsError } = await query;
    if (docsError) throw docsError;

    let context = '';
    if (documents && documents.length > 0) {
      context = documents.map(doc => {
        const name = doc.suggested_name || doc.original_name;
        return `DOCUMENTO: ${name}\nCONTEÚDO:\n${doc.extracted_text || 'Sem conteúdo.'}\n---`;
      }).join('\n');
    } else {
      context = 'Nenhum documento fornecido ou encontrado.';
    }

    const systemPrompt = "Você é um assistente jurídico de alto nível, especialista em análise documental. Você recebeu os seguintes documentos de um caso jurídico. Analise-os cuidadosamente e responda à pergunta do advogado com precisão, citando trechos específicos dos documentos quando relevante. Sempre responda em português brasileiro.";
    const fullText = `${systemPrompt}\n\nCONTEXTO DOS DOCUMENTOS:\n${context}\n\nPERGUNTA DO ADVOGADO:\n${question}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: fullText }] }],
      config: {
        temperature: 0.3,
      }
    });

    const answer = response.text || 'Sem resposta.';

    // Save messages
    const { error: msgError1 } = await supabase.from('analysis_messages').insert({
      session_id: id,
      role: 'user',
      content: question
    });
    if (msgError1) console.error("Error saving user message:", msgError1);

    const { data: assistantMsg, error: msgError2 } = await supabase.from('analysis_messages').insert({
      session_id: id,
      role: 'assistant',
      content: answer
    }).select().single();
    if (msgError2) console.error("Error saving assistant message:", msgError2);

    return NextResponse.json({ 
      answer, 
      messageId: assistantMsg?.id 
    });
  } catch (error: any) {
    console.error("Erro em /api/document-analysis/[id]/chat:", error);
    return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 });
  }
}
