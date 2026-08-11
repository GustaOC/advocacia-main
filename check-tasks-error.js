import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_user:user_profiles!tasks_assigned_to_fkey(name)
      `)
      .order("created_at", { ascending: false });

  if (error) {
     console.error("Error from Supabase:", error);
  } else {
     console.log("Success:", data.length);
  }
}
run();
