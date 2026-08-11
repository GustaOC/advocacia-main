import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data } = await supabase.from('tasks').select('*, assigned_user:user_profiles!tasks_assigned_to_fkey(name)').limit(1);
  console.log(JSON.stringify(data[0], null, 2));
}
run();
