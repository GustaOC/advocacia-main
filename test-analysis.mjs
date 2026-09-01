import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from("analysis_sessions")
    .select(`
      *,
      documents:analysis_documents(id),
      created_user:user_profiles!analysis_sessions_created_by_fkey(id, name)
    `);
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
