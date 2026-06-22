// middleware.ts - VERSÃO COMPLETA E CORRIGIDA

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lista de rotas que NÃO exigem autenticação
const PUBLIC_PATHS = [
  '/', // Landing page
  '/login',
  '/register', // Adicionado para permitir acesso à página de cadastro
  '/auth/callback',
  '/auth/update-password',
];

// Padrões de rotas de API que podem ser acessadas publicamente
const PUBLIC_API_PATTERNS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/callback',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  // Permite acesso a arquivos estáticos e de imagem
 if (
  pathname.startsWith('/_next/') ||
  pathname.includes('/favicon.ico') ||
  pathname.endsWith('.png') ||
  pathname.endsWith('.svg') ||
  pathname.endsWith('.jpg') ||
  pathname.endsWith('.jpeg') ||
  pathname.endsWith('.webp') ||
  pathname.endsWith('.ico')
) {
  return true;
}
  for (const pattern of PUBLIC_API_PATTERNS) {
    if (pathname.startsWith(pattern)) {
      return true;
    }
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log(`[Middleware] Processando rota: ${pathname}`);
  const res = NextResponse.next();

  // ✅ CORREÇÃO: Aplicando os Headers de Segurança diretamente no middleware
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https: http: i.postimg.cc https://*.supabase.co https://*.googleusercontent.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com https://accounts.google.com http://localhost:* http://127.0.0.1:*;
    frame-ancestors 'none';
    frame-src 'self' https://*.supabase.co https://docs.google.com;
    form-action 'self';
  `.replace(/\s{2,}/g, " ").trim();

  res.headers.set("Content-Security-Policy", cspHeader);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Referrer-Policy", "origin-when-cross-origin");

  // Se a rota for pública, permite o acesso sem verificar a sessão
  if (isPublic(pathname)) {
    return res;
  }

  try {
    const supabase = createSupabaseServerClient(req, res);
    
    // Verifica se há um usuário na sessão
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Se houver erro ou nenhum usuário, redireciona para a página de login
    if (error || !user) {
      console.warn(`[Middleware] Acesso negado para rota protegida: ${pathname}. Redirecionando para login.`);
      
      // CORREÇÃO: Se for uma rota de API, retornamos JSON 401 em vez de redirecionar para o HTML do login
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Sessão expirada ou não autorizado' },
          { status: 401 }
        );
      }

      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Se o usuário estiver autenticado, permite o acesso
    return res;

  } catch (e) {
    console.error('[Middleware] Erro inesperado:', e);
    // Em caso de erro, redireciona para o login como medida de segurança
    const redirectUrl = new URL('/login?error=middleware_failed', req.url);
    return NextResponse.redirect(redirectUrl);
  }
}

// Configuração do matcher para definir quais rotas o middleware deve interceptar
export const config = {
  matcher: [
    /*
     * Faz o matching de todas as rotas, exceto as que começam com:
     * - _next/static (arquivos estáticos)
     * - _next/image (imagens otimizadas)
     * - favicon.ico (ícone do site)
     * O lookahead negativo `(?!...)` garante que essas rotas sejam ignoradas.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};