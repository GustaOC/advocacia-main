import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS petition_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS petition_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES petition_workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  assigned_to UUID REFERENCES user_profiles(id),
  status TEXT NOT NULL DEFAULT 'Pendente',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_petition_workflows_updated_at'
    ) THEN
        CREATE TRIGGER set_petition_workflows_updated_at
        BEFORE UPDATE ON petition_workflows
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function run() {
  console.log("Nota: O cliente Supabase JS (via REST) não suporta a execução de comandos DDL (CREATE TABLE) diretamente.");
  console.log("Para criar as tabelas, copie o SQL abaixo e execute no SQL Editor do Supabase (Dashboard):\n");
  console.log(sql);
  
  console.log("--------------------------------------------------");
  console.log("Caso você possua uma função RPC 'exec_sql' no banco, o script tentará utilizá-la agora...");
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error("Falha ao executar via RPC (provavelmente a função não existe):", error.message);
    console.log("Por favor, execute o SQL manualmente no painel do Supabase.");
  } else {
    console.log("Tabelas criadas com sucesso via RPC!");
  }
}

run();
