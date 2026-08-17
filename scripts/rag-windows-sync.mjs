import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente (necessário criar um .env na mesma pasta do script no Windows)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
  console.error("❌ ERRO: Faltam variáveis de ambiente (Supabase URL, Service Key ou OpenAI Key).");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// A pasta do Windows que será monitorada. Pode ser uma unidade de rede mapeada (ex: "Z:\\Documentos" ou "\\\\Servidor\\Processos")
// Para testar localmente, coloque o caminho completo de uma pasta na sua máquina
const WATCH_DIR = process.env.RAG_WATCH_DIR || './documentos_escritorio';

// Cria a pasta de teste local caso não exista (apenas para fallback)
try {
  await fs.access(WATCH_DIR);
} catch {
  await fs.mkdir(WATCH_DIR, { recursive: true });
}

function chunkText(text, chunkSize = 1000) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  if (!['.pdf', '.docx', '.txt'].includes(ext)) {
    return; // Ignora outros tipos de arquivo
  }

  console.log(`\n⏳ Processando novo arquivo: ${fileName}`);

  try {
    const buffer = await fs.readFile(filePath);
    let text = "";

    if (ext === '.pdf') {
      const pdfData = await pdf(buffer);
      text = pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: buffer });
      text = result.value;
    } else if (ext === '.txt') {
      text = buffer.toString('utf-8');
    }

    if (!text || text.trim().length === 0) {
      console.warn(`⚠️ O arquivo ${fileName} está vazio ou é uma imagem escaneada.`);
      return;
    }

    console.log(`✅ Texto extraído de ${fileName} (${text.length} caracteres). Gerando vetores...`);

    // Prevenção de duplicatas: deleta os chunks antigos deste arquivo antes de inserir novos
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_name', fileName);

    const chunks = chunkText(text, 1000);
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error } = await supabase.from('document_chunks').insert({
        document_name: fileName,
        chunk_text: chunk,
        chunk_index: i,
        embedding: embedding,
      });

      if (error) {
        console.error(`❌ Erro ao salvar fatia ${i} de ${fileName}:`, error);
      } else {
        insertedCount++;
      }
    }

    console.log(`🎉 Sucesso! ${insertedCount} trechos de ${fileName} foram sincronizados com o cérebro da IA na nuvem.`);
  } catch (error) {
    console.error(`❌ Erro ao processar o arquivo ${fileName}:`, error);
  }
}

// Inicializa o vigilante de pastas
console.log(`\n👁️  Iniciando RAG Watcher...`);
console.log(`📂 Vigiando a rede/pasta: ${path.resolve(WATCH_DIR)}`);
console.log(`(Aperte Ctrl+C para desligar o sincronizador)\n`);

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\../, // ignora arquivos ocultos
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000, // Espera o arquivo terminar de ser copiado pela rede (2 segundos sem mudança de tamanho)
    pollInterval: 100
  }
});

watcher
  .on('add', filePath => processFile(filePath))
  .on('change', filePath => {
    console.log(`\n🔄 Arquivo modificado detectado: ${path.basename(filePath)}. Atualizando IA...`);
    processFile(filePath);
  })
  .on('unlink', async filePath => {
    const fileName = path.basename(filePath);
    console.log(`\n🗑️  Arquivo deletado na rede: ${fileName}. Removendo da memória da IA...`);
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_name', fileName);
    console.log(`✅ Memória apagada para ${fileName}.`);
  });
