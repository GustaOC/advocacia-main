import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: task } = await supabase.from('tasks').select('*').eq('id', '196b3492-53ab-4d20-a8b6-e9f2ec02c5e7').single();
  console.log(task);
}
run();
