import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: pubs } = await supabase.from('publications').select('id, title, status, assigned_to, task_id').order('updated_at', { ascending: false }).limit(5);
  console.log("Recent publications:");
  console.table(pubs);
  
  if (pubs.length > 0 && pubs[0].task_id) {
     const { data: task } = await supabase.from('tasks').select('id, status').eq('id', pubs[0].task_id).single();
     console.log("Task for recent pub:", task);
  }
}
run();
