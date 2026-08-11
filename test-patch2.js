import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: getTask } = await supabase.from('tasks').select('*').limit(1);
  const body = { ...getTask[0], title: "test title", assigned_user: { name: "test" } };
  
  const { id, assigned_user, ...updates } = body;
  
  const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

  if (error) {
     console.error("Task Update Error:", error);
     return;
  }
  
  if (updates.assigned_to) {
      const { error: notifError } = await supabase.from("notifications").insert([{
        user_id: updates.assigned_to,
        title: "Nova tarefa atribuída",
        message: `A tarefa "${data.title}" foi atribuída a você.`,
        type: "info",
        is_read: false
      }]);
      if (notifError) console.error("Notification Error:", notifError);
  }
  console.log("Success");
}
run();
