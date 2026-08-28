-- fix-rls.sql
-- Execute este script no SQL Editor do Supabase para reforçar a segurança do banco
-- Revogando políticas abertas criadas pelo script anterior

-- 1. Tabelas Financeiras (Acesso apenas via Service Role pelas APIs seguras)
-- O frontend usará as rotas /api/* que já foram protegidas.
ALTER TABLE public.financial_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Remove políticas permissivas antigas
DROP POLICY IF EXISTS authenticated_users_select_financial_agreements ON public.financial_agreements;
DROP POLICY IF EXISTS authenticated_users_select_financial_installments ON public.financial_installments;
DROP POLICY IF EXISTS authenticated_users_select_financial_payments ON public.financial_payments;
DROP POLICY IF EXISTS authenticated_users_select_expenses ON public.expenses;

-- Bloqueia acesso direto pela Anon Key
CREATE POLICY block_anon_financial_agreements ON public.financial_agreements FOR ALL TO authenticated USING (false);
CREATE POLICY block_anon_financial_installments ON public.financial_installments FOR ALL TO authenticated USING (false);
CREATE POLICY block_anon_financial_payments ON public.financial_payments FOR ALL TO authenticated USING (false);
CREATE POLICY block_anon_expenses ON public.expenses FOR ALL TO authenticated USING (false);

-- 2. Chat (Correção do RLS do Bucket)
-- Bloquear acesso anônimo ao bucket de chat-files
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';
