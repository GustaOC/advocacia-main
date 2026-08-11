import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: getTask } = await supabase.from('tasks').select('*').limit(1);
  const id = getTask[0].id;
  
  // mock that this task is associated with a publication by inserting a publication
  const { data: pubData } = await supabase.from('publications').insert({
    title: 'Test Pub',
    publication_date: new Date().toISOString(),
    task_id: id,
    status: 'Pendente'
  }).select().single();
  
  const updates = { status: 'Em Andamento' };
  
  const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

  if (error) {
     console.error("Task Update Error:", error);
  }
  
  // Now simulate the publication update that happens in route.ts
  const { error: pubError } = await supabase
          .from("publications")
          .update({ status: updates.status, updated_at: new Date().toISOString() })
          .eq("id", pubData.id);
          
  if (pubError) {
      console.error("Publication Update Error:", pubError);
  }
  
  // clean up
  await supabase.from('publications').delete().eq('id', pubData.id);
  console.log("Finished test");
}
run();
