import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const res = NextResponse.next()
    const supabase = createSupabaseServerClient(request, res)
    
    // Troca o código temporário por uma sessão real
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const user = data?.session?.user
      if (user) {
        const createdAt = new Date(user.created_at)
        const now = new Date()
        // Calcula a diferença em segundos desde a criação
        const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000

        if (diffInSeconds < 10) {
          // IDENTIFICOU UM NOVO CADASTRO VIA GOOGLE!
          console.log("[Novo Cadastro] Enviar email de aprovação para admin sobre:", user.email)
          
          // TODO: Coloque aqui a chamada para sua API de envio de email
          // Ex: await fetch('sua-api/enviar-email-admin', { body: { email: user.email } })
        }
      }

      const redirectResponse = NextResponse.redirect(
        new URL(next, origin)
      )

      res.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
      })

      // SALVA OS TOKENS DO GOOGLE PARA USO FUTURO NA API DO GMAIL
      if (data.session?.provider_token) {
        redirectResponse.cookies.set({
          name: 'google_access_token',
          value: data.session.provider_token,
          path: '/',
          maxAge: 3500, // Expira um pouco antes de 1 hora para evitar falhas
          httpOnly: true,
        })
      }
      
      // Salva o Refresh Token se o Google enviar (dura meses/anos)
      if (data.session?.provider_refresh_token) {
        redirectResponse.cookies.set({
          name: 'google_refresh_token',
          value: data.session.provider_refresh_token,
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 ano de duração
          httpOnly: true,
        })
      }

      return redirectResponse
    }
  }

  // Em caso de erro, volta para o login
  console.error("[Auth Callback] Erro na troca de código")
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}