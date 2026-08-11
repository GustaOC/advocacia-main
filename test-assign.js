import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. Get a publication with no assigned_to
  const { data: pub } = await supabase
    .from('publications')
    .select('*')
    .is('assigned_to', null)
    .limit(1)
    .single();

  if (!pub) {
    console.log("No unassigned publications");
    return;
  }
  
  console.log("Original Pub:", pub.id, "task_id:", pub.task_id);

  // 2. Mock a request to PUT /api/publications/[id] just like quickAssign does
  // It only sends assigned_to
  const body = { assigned_to: "0b1d03ce-f369-42b7-bdba-36e7a7970d2b" }; // Some valid user ID, assuming Gustavo or something
  // Wait, I need a valid user ID. Let's get one first.
  const { data: user } = await supabase.from('user_profiles').select('id').limit(1).single();
  body.assigned_to = user.id;

  // Let's manually do what the route does:
  let taskId = pub.task_id;
  if (body.assigned_to !== pub.assigned_to) {
    if (body.assigned_to) {
      if (taskId) {
         console.log("updating existing task");
      } else {
         console.log("creating new task");
         const { data: taskData, error: taskError } = await supabase
            .from("tasks")
            .insert([{
              title: `Realizar publicação: ${pub.title}`,
              description: pub.description || "Criada automaticamente pelo módulo de Publicações.",
              priority: "Média",
              status: "Pendente",
              assigned_to: body.assigned_to,
              due_date: pub.due_date || pub.publication_date,
            }])
            .select()
            .single();
         if (taskError) { console.log(taskError); return; }
         taskId = taskData.id;
      }
    }
  }

  // Update publication
  const updateData = {
    assigned_to: body.assigned_to,
    task_id: taskId,
    updated_at: new Date().toISOString()
  };
  
  // Notice we only put assigned_to and task_id because the rest is undefined.
  // Wait, does the API explicitly put `title: body.title` in the update object?
  // Let's look at the API code!
  
}
run();
