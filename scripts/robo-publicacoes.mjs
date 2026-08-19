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
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Força o clique na aba "Hoje" pelo menu caso o SPA do site nos redirecione para "Não Lidas" por padrão
    console.log("👉 Forçando o clique na aba 'Hoje'...");
    await page.evaluate(() => {
      // 1. Tenta achar pelo link exato (href)
      const link = document.querySelector('a[href*="/publicacoes/hoje"]');
      if (link) {
        link.click();
        return;
      }
      
      // 2. Se não for tag 'a', procura um item de menu que contenha "Hoje" seguido de um número (o badge 33)
      const elements = Array.from(document.querySelectorAll('div, li, button, a'));
      const hojeElement = elements.find(el => {
         const text = el.innerText ? el.innerText.trim() : '';
         // Verifica se o texto começa com "Hoje" e tem algum número (como "Hoje 33" ou "Hoje\n33")
         return text.startsWith('Hoje') && /\d/.test(text) && el.offsetHeight > 0 && el.children.length > 0;
      });
      if (hojeElement) {
         hojeElement.click();
      }
    });

    // Aguarda um tempo fixo extra para garantir que tabelas/APIs da aba Hoje carreguem
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Tira um screenshot para debug
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

    let hasNextPage = true;
    let currentPage = 1;
    const allPublicacoes = [];

    while (hasNextPage) {
      console.log(`\n📄 Lendo página ${currentPage}...`);
      const rawText = await page.evaluate(() => document.body.innerText);
      
      // Salva o texto bruto da página 1 para a gente investigar
      if (currentPage === 1) {
        fs.writeFileSync('debug-page1.txt', rawText);
      }
      
      console.log(`🧠 Texto extraído (${rawText.length} caracteres). Enviando para análise da IA (OpenAI)...`);
      
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Modelo rápido, inteligente e barato
        response_format: { type: "json_object" },
        max_tokens: 16000,
        messages: [
          {
            role: "system",
            content: `Você é um assistente jurídico de elite. O usuário colou o texto bruto de uma página web de controle de publicações e intimações.
Sua missão é ignorar cabeçalhos, menus e lixo da página, focar apenas nos blocos que parecem ser "Publicações", "Andamentos" ou "Intimações".
Para cada uma, extraia:
1. "title": DEVE SER EXATAMENTE E APENAS O NÚMERO DO PROCESSO (ex: 0001234-56.2023.8.26.0000). Nada de texto a mais. Se não achar, deixe vazio.
2. "description": O texto completo do andamento.

IMPORTANTE: Você DEVE extrair rigorosamente TODAS as publicações presentes no texto. Não omita, resuma ou agrupe nenhuma. Se houver 10 publicações na página, o JSON DEVE conter 10 itens no array.

Responda SOMENTE com um JSON no seguinte formato:
{
  "publicacoes": [
    { "title": "...", "description": "..." }
  ]
}`
          },
          {
            role: "user",
            content: rawText.substring(0, 35000) // Limita o texto para não estourar os tokens
          }
        ]
      });

      const aiResultStr = aiResponse.choices[0].message.content;
      const aiResult = JSON.parse(aiResultStr);
      const publicacoes = aiResult.publicacoes || [];
      
      if (publicacoes.length > 0) {
        allPublicacoes.push(...publicacoes);
        console.log(`✅ A IA encontrou e interpretou ${publicacoes.length} publicações na página ${currentPage}.`);
      } else {
        console.log(`ℹ️ Nenhuma publicação encontrada na página ${currentPage}.`);
      }

      // Procura botão de próxima página e clica
      const foundNext = await page.evaluate(() => {
        // Tenta achar botões de navegação comuns
        const nextSelectors = [
          'button[aria-label="Next page"]',
          'button[aria-label="Próxima página"]',
          'a[aria-label="Next"]',
          '.pagination-next',
          '.next-page',
          'li.next a',
          'button.next',
          'button[title="Próxima Página"]',
          'button[title="Next Page"]',
          '.q-table__bottom .q-btn:last-child', // Padrão Quasar (comum no FAZ Adv se for Vue/Quasar)
          '.v-data-footer__icons-after button' // Padrão Vuetify
        ];
        
        let nextBtn = null;
        for (const sel of nextSelectors) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled && !btn.classList.contains('disabled') && !btn.hasAttribute('disabled')) {
             nextBtn = btn; break;
          }
        }
        
         // Busca textual como plano B
         if (!nextBtn) {
            const elements = Array.from(document.querySelectorAll('button, a, div[role="button"], i, span'));
            nextBtn = elements.find(el => {
               const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
               // Matches exactly to avoid "Próxima marcação"
               const isMatch = text === 'próxima »' || text === 'próxima' || text === 'próximo' || text === 'next' || text === 'próxima página';
               
               const parentLi = el.closest('li');
               const isParentDisabled = parentLi && (parentLi.classList.contains('disabled') || parentLi.classList.contains('q-disabled'));
               
               const isDisabled = el.disabled || el.classList.contains('disabled') || el.classList.contains('q-disabled') || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled') || isParentDisabled;
               const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
               
               return isMatch && !isDisabled && isVisible;
            });
         }
        
        if (nextBtn) {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (foundNext) {
        console.log("➡️ Indo para a próxima página...");
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 8000)); // Aguarda 8s para a próxima página carregar
      } else {
        console.log("🏁 Fim das páginas atingido.");
        hasNextPage = false;
      }
    }
    
    if (allPublicacoes.length > 0) {
      const pubDateStr = new Date().toISOString().split('T')[0];
      const inserts = [];

      for (const pub of allPublicacoes) {
        inserts.push({
          title: pub.title || 'S/N',
          description: pub.description,
          status: 'Pendente',
          publication_date: pubDateStr,
          assigned_by: null // "Robô"
        });
      }
      
      if (inserts.length === 0) {
         console.log("ℹ️ Nenhuma publicação capturada para salvar.");
      } else {
        console.log(`💾 Salvando ${inserts.length} publicações no banco de dados (Supabase)...`);
        const { error } = await supabase.from('publications').insert(inserts);
        
        if (error) {
          console.error("❌ Erro ao salvar no Supabase:", error);
        } else {
          console.log("🎉 Sucesso! Todas as publicações foram salvas no sistema.");
        }
      }
    } else {
      console.log("Nenhuma publicação encontrada para hoje em nenhuma página.");
    }
    
  } catch (err) {
    console.error("❌ Ocorreu um erro fatal na automação:", err);
  } finally {
    await browser.close();
    console.log("🛑 Robô finalizado e navegador fechado.");
  }
}

runScraper();
