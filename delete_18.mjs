import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('publications')
    .delete()
    .eq('publication_date', '2026-08-18');
    
  if (error) {
    console.error("Erro:", error);
  } else {
    console.log("Deletados todos do dia 18 com sucesso!");
  }
}
run();
