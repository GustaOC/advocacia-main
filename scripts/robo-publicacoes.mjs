import puppeteer from 'puppeteer';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Verifica dependências críticas
if (!process.env.FAZ_ADV_USER || !process.env.FAZ_ADV_PASS) {
  console.error("❌ ERRO: FAZ_ADV_USER ou FAZ_ADV_PASS não definidos no arquivo .env.local");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERRO: OPENAI_API_KEY não definida no arquivo .env.local");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERRO: Credenciais do Supabase não encontradas no .env.local");
  process.exit(1);
}

// Inicializa as APIs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function runScraper() {
  console.log("🤖 Iniciando Robô de Publicações...");
  let executablePath = null;
  const fs = await import('fs');
  const path = await import('path');
  
  // O wrapper resolve o problema do Flatpak não rodar com o binário direto
  const wrapperPath = path.resolve('./scripts/chrome-wrapper.sh');
  if (fs.existsSync(wrapperPath)) {
    executablePath = wrapperPath;
  }

  if (!executablePath) {
    const browserPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];
    for (const p of browserPaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }
  }

  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: executablePath, // Usa o wrapper para o Chromium do Zorin OS
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log("🌐 Acessando página de login do FAZ Adv...");
    await page.goto('https://app.faz.adv.br/#/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Tenta encontrar os campos de login
    console.log("🔑 Inserindo credenciais...");
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[type="text"]');
    const passInput = await page.$('input[type="password"]');
    
    if (emailInput && passInput) {
      await emailInput.type(process.env.FAZ_ADV_USER);
      await passInput.type(process.env.FAZ_ADV_PASS);
      
      console.log("⏳ Logando...");
      await passInput.press('Enter');
      
      // Aguarda 10 segundos ou até a navegação terminar
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    } else {
      console.log("⚠️ Campos de login não encontrados. Tentando prosseguir...");
    }
    
    console.log("📂 Navegando para as publicações de hoje...");
    await page.goto('https://app.faz.adv.br/#/publicacoes/hoje', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Aguarda um tempo fixo extra para garantir que tabelas/APIs da página carreguem
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log("📄 Extraindo texto da página...");
    const rawText = await page.evaluate(() => document.body.innerText);
    
    console.log(`🧠 Texto extraído (${rawText.length} caracteres). Enviando para análise da IA (OpenAI)...`);
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo rápido, inteligente e barato
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um assistente jurídico de elite. O usuário colou o texto bruto de uma página web de controle de publicações e intimações.
Sua missão é ignorar cabeçalhos, menus e lixo da página, focar apenas nos blocos que parecem ser "Publicações", "Andamentos" ou "Intimações".
Para cada uma, extraia:
1. "title": O assunto principal, nome da ação, vara ou nº do processo (máx 150 caracteres).
2. "description": O texto completo do andamento (ou um resumo rico se for gigantesco).
3. "status": Defina o status dessa publicação. Escolha OBRIGATORIAMENTE um destes: "Pendente", "Audiência", "Concluída", "Cancelada" ou "Transferido".

Responda SOMENTE com um JSON no seguinte formato:
{
  "publicacoes": [
    { "title": "...", "description": "...", "status": "..." }
  ]
}`
        },
        {
          role: "user",
          content: rawText.substring(0, 30000) // Limita o texto para não estourar os tokens
        }
      ]
    });

    const aiResultStr = aiResponse.choices[0].message.content;
    const aiResult = JSON.parse(aiResultStr);
    const publicacoes = aiResult.publicacoes || [];
    
    console.log(`✅ A IA encontrou e interpretou ${publicacoes.length} publicações.`);
    
    if (publicacoes.length > 0) {
      console.log("💾 Salvando no banco de dados (Supabase)...");
      const pubDateStr = new Date().toISOString().split('T')[0];
      
      const inserts = publicacoes.map(pub => ({
        title: pub.title,
        description: pub.description,
        status: pub.status,
        publication_date: pubDateStr,
        assigned_by: null // "Robô"
      }));

      const { error } = await supabase.from('publications').insert(inserts);
      
      if (error) {
        console.error("❌ Erro ao salvar no Supabase:", error);
      } else {
        console.log("🎉 Sucesso! Todas as publicações foram salvas no sistema.");
      }
    } else {
      console.log("Nenhuma publicação encontrada para hoje.");
    }
    
  } catch (err) {
    console.error("❌ Ocorreu um erro fatal na automação:", err);
  } finally {
    await browser.close();
    console.log("🛑 Robô finalizado e navegador fechado.");
  }
}

runScraper();
