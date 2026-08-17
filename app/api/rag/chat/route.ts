import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { requirePermission } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Requer usuário logado
    const user = await requirePermission("cases_view"); // Permissão genérica para ler
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    // 1. Converter a pergunta do usuário em Embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Buscar documentos relevantes no Supabase (match_documents RPC)
    const { data: documents, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Limite de similaridade (0 = aceita qualquer lixo, 1 = idêntico)
      match_count: 5 // Traz os 5 parágrafos mais relevantes
    });

    if (matchError) {
      console.error("Erro na busca vetorial:", matchError);
      return NextResponse.json({ error: "Erro ao buscar na base de conhecimento." }, { status: 500 });
    }

    // 3. Construir o Prompt com Contexto para o Claude
    let contextText = "";
    if (documents && documents.length > 0) {
      contextText = "=== CONTEXTO DO ESCRITÓRIO ===\n";
      documents.forEach((doc: any, index: number) => {
        contextText += `[Documento: ${doc.document_name} | Relevância: ${(doc.similarity * 100).toFixed(1)}%]\n`;
        contextText += `Trecho: ${doc.chunk_text}\n\n`;
      });
      contextText += "==================================\n";
    }

    const systemPrompt = `Você é o "Claude Jurídico", um assistente de IA exclusivo para o escritório.
Você responde perguntas dos advogados.
Sempre que o usuário fizer uma pergunta, eu lhe fornecerei os documentos mais relevantes do nosso próprio acervo como contexto.
Baseie sua resposta ESTRITAMENTE no contexto fornecido, se ele for útil.
Se o contexto não ajudar a responder, diga claramente: "Não encontrei essa informação nos documentos do escritório, mas com base no meu conhecimento geral...".
Seja cortês, profissional e extremamente preciso juridicamente.`;

    const finalPrompt = `${contextText}\n\nPergunta do Advogado: ${message}`;

    // 4. Chamar a API da Anthropic (Claude 3.5 Sonnet)
    const claudeResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: "user", content: finalPrompt }
      ]
    });

    // O retorno da Anthropic tem o texto no primeiro bloco do array 'content'
    const replyText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';

    return NextResponse.json({ 
      reply: replyText,
      sources: documents || []
    });

  } catch (error: any) {
    console.error("Erro no Chat RAG:", error);
    return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 });
  }
}
