import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from("analysis_documents")
    .select("id, original_name, extracted_text");
  if (data) {
    data.forEach(d => {
      console.log(`${d.original_name}: ${d.extracted_text ? d.extracted_text.length : 'NULL'}`);
    });
  }
}
test();
