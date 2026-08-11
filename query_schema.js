import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  if (error) {
     console.log("Fetching raw table info via rest API...");
     // We can just try to run a query without the hint to see if supabase auto-discovers it.
     const { data: d2, error: e2 } = await supabase.from('financial_agreements').select('*, client:entities(name)').limit(1);
     console.log("No hint query:", e2 || d2);
  }
}
run();
