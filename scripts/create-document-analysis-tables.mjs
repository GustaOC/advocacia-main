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
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  suggested_name TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_analysis_sessions_updated_at'
    ) THEN
        CREATE TRIGGER set_analysis_sessions_updated_at
        BEFORE UPDATE ON analysis_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
`;

async function run() {
  console.log("Nota: O cliente Supabase JS (via REST) não suporta a execução de comandos DDL (CREATE TABLE) diretamente.");
  console.log("Para criar as tabelas, copie o SQL abaixo e execute no SQL Editor do Supabase (Dashboard):\\n");
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

  // Create bucket
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('analysis-documents', {
    public: true
  });
  if (bucketError) {
      if (bucketError.message.includes('already exists') || bucketError.message.includes('Duplicate')) {
          console.log("Bucket 'analysis-documents' já existe.");
      } else {
        console.error("Erro ao criar bucket:", bucketError);
      }
  } else {
      console.log("Bucket 'analysis-documents' criado com sucesso.");
  }
}

run();
