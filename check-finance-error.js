import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error, count } = await supabase
      .from("financial_agreements")
      .select(`
        *,
        client:entities!financial_agreements_client_id_fkey(name),
        process:processes!financial_agreements_process_id_fkey(process_number),
        installments(*)
      `, { count: "exact" })
      .range(0, 999)
      .order("created_at", { ascending: false });

  if (error) {
     console.error("Error from Supabase:", error);
  } else {
     console.log("Success:", data.length);
  }
}
run();
