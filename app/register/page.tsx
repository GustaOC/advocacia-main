'use client';

import { createBrowserClient } from '@supabase/ssr';

export default function RegisterPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleRegister = async () => {
    // Para OAuth, a função de criar ou logar é a mesma.
    // O Supabase se encarrega de criar o usuário caso ele não exista.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Criar uma Conta</h2>
          <p className="mt-2 text-sm text-gray-600">
            Cadastre-se usando o Google. Seu acesso nascerá como pendente e precisará da aprovação do administrador.
          </p>
        </div>

        <button
          onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
        >
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            alt="Google Logo" 
            className="w-5 h-5" 
          />
          Cadastrar com o Google
        </button>

        <p className="text-center text-sm text-gray-500">
          Já possui uma conta?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
}
