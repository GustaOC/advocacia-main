import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('publications').insert([{
    title: "Test Due Date",
    due_date: new Date().toISOString(),
    publication_date: new Date().toISOString()
  }]).select('*');
  
  console.log("Error:", error);
}
test();
