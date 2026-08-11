import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  console.log("Today is:", todayStr);

  const { data: adminTasks } = await supabase
      .from("tasks")
      .select("*, employees:assigned_to(name)")
      .neq("status", "Concluída")
      .lte("due_date", todayStr);
      
  console.log("Admin urgent tasks count:", adminTasks?.length);
  if(adminTasks && adminTasks.length > 0) {
      console.log("First urgent task:", adminTasks[0].title, adminTasks[0].due_date);
  }
}
run();
