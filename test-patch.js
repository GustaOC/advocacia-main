import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: getTask } = await supabase.from('tasks').select('*').limit(1);
  if (!getTask || getTask.length === 0) { console.log('no task'); return; }
  
  const id = getTask[0].id;
  console.log("Updating task:", id);

  const payload = { ...getTask[0], title: "test title", assigned_user: { name: "test" } };
  
  const { id: _, assigned_user, ...updates } = payload;
  console.log("Payload after strip:", Object.keys(updates));
  
  const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

  if (error) {
     console.error("Error:", error);
  } else {
     console.log("Success:", data.id);
  }
}
run();
