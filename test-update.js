import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: pub, error: err1 } = await supabase.from('publications').select('*').limit(1).single();
  if (!pub) return console.error("No pub");
  
  console.log("Before:", pub.task_id);
  
  const payload = {
    title: undefined,
    task_id: "test-id-" + Date.now()
  };
  
  const { data: updated, error: err2 } = await supabase
    .from('publications')
    .update(payload)
    .eq('id', pub.id)
    .select()
    .single();
    
  if (err2) {
    console.error("Update error:", err2);
  } else {
    console.log("After:", updated.task_id);
  }
}
run();
