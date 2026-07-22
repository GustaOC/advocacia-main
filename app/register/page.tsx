'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');

    if (!invite) {
      setInviteValid(false);
      setErrorMsg("Acesso restrito. Você precisa de um link de convite oficial para se cadastrar.");
      return;
    }

    // Valida o convite no backend
    fetch(`/api/auth/verify-invite?token=${invite}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          // Salva o token no cookie caso precisamos dele no fluxo de login futuro
          document.cookie = `invite_token=${invite}; path=/; max-age=3600`;
          setInviteValid(true);
        } else {
          setInviteValid(false);
          setErrorMsg(data.error || "Convite inválido ou expirado.");
        }
      })
      .catch(() => {
        setInviteValid(false);
        setErrorMsg("Erro ao verificar a validade do convite.");
      });
  }, []);

  const handleGoogleRegister = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border-t-4 border-indigo-600">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Criar uma Conta</h2>
          <p className="mt-2 text-sm text-gray-600">
            Cadastre-se usando sua conta do Google.
          </p>
        </div>

        {inviteValid === null ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm text-slate-500">Validando convite...</p>
          </div>
        ) : inviteValid === false ? (
          <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col items-center text-center">
            <ShieldAlert className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-red-700 font-medium mb-1">Acesso Bloqueado</p>
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        ) : (
          <>
            <p className="text-center text-xs bg-emerald-50 text-emerald-700 p-2 rounded-lg font-medium">
              ✅ Convite validado com sucesso. Você pode prosseguir.
            </p>
            <button
              onClick={handleGoogleRegister}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium shadow-sm"
            >
              <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                alt="Google Logo" 
                className="w-5 h-5" 
              />
              Cadastrar com o Google
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
          Já possui uma conta ativa?{' '}
          <a href="/login" className="text-indigo-600 hover:underline font-medium">
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
}
