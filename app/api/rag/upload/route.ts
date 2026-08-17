import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { requirePermission } from "@/lib/auth";

// Corrige o erro do Webpack na Vercel para módulos CommonJS sem default export
const pdf = require("pdf-parse");

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to split text into chunks of ~1000 characters
function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    // Apenas admins ou permissão específica podem fazer upload
    await requirePermission("admin");

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = "";

    if (ext === 'pdf') {
      const pdfData = await pdf(buffer);
      text = pdfData.text;
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: buffer });
      text = result.value;
    } else if (ext === 'txt') {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: "Apenas arquivos PDF, DOCX e TXT são suportados no momento." }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "O arquivo parece estar vazio ou é uma imagem escaneada." }, { status: 400 });
    }

    // Dividir em chunks (fatias)
    const chunks = chunkText(text, 1000);
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Gerar embeddings na OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Inserir no Supabase (document_chunks)
      const { error } = await supabase.from('document_chunks').insert({
        document_name: file.name,
        chunk_text: chunk,
        chunk_index: i,
        embedding: embedding, // Supabase pgvector entende esse array automaticamente
      });

      if (error) {
        console.error("Erro ao inserir chunk:", error);
      } else {
        insertedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Arquivo ${file.name} processado. ${insertedCount} trechos salvos na memória da IA.` 
    });

  } catch (error: any) {
    console.error("Erro no processamento RAG:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}
