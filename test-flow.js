import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Create a new publication
  const { data: pub, error: err1 } = await supabase.from('publications').insert({
    title: "Test Assignment Flow",
    publication_date: new Date().toISOString(),
    status: "Pendente"
  }).select().single();
  
  if (err1) return console.error("Error creating pub:", err1);
  console.log("1. Created Pub:", pub.id, "task_id:", pub.task_id, "status:", pub.status);

  // Quick Assign via PATCH API logic simulation
  // (Assuming we call PUT /api/publications/[id] with { assigned_to: someUserId })
  
  const { data: user } = await supabase.from('user_profiles').select('id').limit(1).single();
  const body = { assigned_to: user.id };
  
  // Step 2. Simulate API logic
  const originalPub = pub;
  let taskId = originalPub.task_id;
  
  if (body.assigned_to) {
    if (taskId) {
      // update task
    } else {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert([{
          title: `Realizar publicação: ${body.title || originalPub.title}`,
          description: body.description || originalPub.description || "Criada automaticamente pelo módulo de Publicações.",
          priority: "Média",
          status: "Pendente",
          assigned_to: body.assigned_to,
          due_date: body.due_date !== undefined ? body.due_date : originalPub.due_date || originalPub.publication_date,
        }])
        .select()
        .single();
      if (taskError) return console.error("Task error:", taskError);
      taskId = taskData.id;
    }
  }
  
  console.log("2. Created Task:", taskId);
  
  const { data: updatedPub, error: err2 } = await supabase
    .from("publications")
    .update({
      title: body.title,
      description: body.description,
      publication_date: body.publication_date,
      due_date: body.due_date !== undefined ? body.due_date : originalPub.due_date,
      assigned_to: body.assigned_to,
      status: body.status,
      task_id: taskId,
      updated_at: new Date().toISOString()
    })
    .eq("id", pub.id)
    .select().single();
    
  if (err2) return console.error("Update pub error:", err2);
  
  console.log("3. Updated Pub:", updatedPub.id, "task_id:", updatedPub.task_id);
  
  // Step 3. Complete task via PATCH /api/tasks logic
  const updates = { status: "Concluída" };
  const { data: taskUpdate, error: err3 } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select().single();
    
  if (err3) return console.error("Update task error:", err3);
  console.log("4. Updated Task status:", taskUpdate.status);
  
  if (updates.status) {
    const { data: pubData } = await supabase
      .from("publications")
      .select("id")
      .eq("task_id", taskId)
      .maybeSingle();

    if (pubData) {
      await supabase
        .from("publications")
        .update({ status: updates.status, updated_at: new Date().toISOString() })
        .eq("id", pubData.id);
    }
  }
  
  const { data: finalPub } = await supabase.from('publications').select('*').eq('id', pub.id).single();
  console.log("5. Final Pub status:", finalPub.status);
}
run();
