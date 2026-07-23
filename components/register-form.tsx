'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`, // URL para onde o usuário será redirecionado após confirmar o email
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        toast({
          title: 'Erro no cadastro',
          description: signUpError.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        toast({
          title: 'Cadastro realizado!',
          description: 'Verifique seu e-mail para confirmar sua conta e fazer login.',
        });
        router.push('/login?message=check_email');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
      toast({
        title: 'Erro no cadastro',
        description: err.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6 p-8 bg-white rounded-xl shadow-2xl border border-slate-200">
      <div className="text-center space-y-2">
        <UserPlus className="mx-auto h-12 w-12 text-brand" />
        <h2 className="text-3xl font-bold text-slate-900">Criar Nova Conta</h2>
        <p className="text-slate-600">Preencha seus dados para acessar a área administrativa.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div><Label htmlFor="name">Nome Completo</Label><Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} /></div>
        <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} /></div>
        <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} /></div>
        <div><Label htmlFor="confirmPassword">Confirmar Senha</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} /></div>
      </div>

      <Button type="submit" className="w-full bg-brand hover:bg-brand-700 text-white font-semibold py-2 rounded-lg transition-colors" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
        {isLoading ? 'Cadastrando...' : 'Cadastrar'}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Faça login aqui
        </Link>
      </p>
    </form>
  );
}