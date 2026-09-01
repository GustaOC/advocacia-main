import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão expirada ou não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch standard notifications
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .eq("user_id", user.id)
      .neq("title", "Novo Processo");

    const { data: notificationsData, error } = await query;
    if (error) throw error;
    
    let allNotifications = notificationsData || [];

    // 2. Fetch Tasks as notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0] as string;

    let tasksQuery = supabase
      .from("tasks")
      .select("*, employees:assigned_to(name)")
      .neq("status", "Concluída");

    if (user.role === 'admin') {
      // For Admin: Urgent tasks (due today or overdue) from ALL users
      tasksQuery = tasksQuery.lte("due_date", todayStr);
    } else {
      // For non-admin: All pending tasks assigned to THEM
      tasksQuery = tasksQuery.eq("assigned_to", user.id);
    }

    const { data: tasksData, error: tasksError } = await tasksQuery;
    
    if (!tasksError && tasksData) {
      const taskNotifications = tasksData.map((task: any) => {
        const isOverdue = task.due_date < todayStr;
        const isToday = task.due_date === todayStr;
        
        let msg = `Tarefa: ${task.title}`;
        let type = "warning";
        
        if (user.role === 'admin') {
           const assignee = task.employees?.name || "Sem responsável";
           if (isOverdue) {
             msg = `ATRASADA: Tarefa '${task.title}' de ${assignee} (Venceu em ${new Date(task.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
             type = "error";
           } else {
             msg = `VENCE HOJE: Tarefa '${task.title}' de ${assignee}`;
             type = "warning";
           }
        } else {
           if (isOverdue) {
             msg = `ATRASADA: Tarefa '${task.title}' (Venceu em ${new Date(task.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
             type = "error";
           } else if (isToday) {
             msg = `VENCE HOJE: Tarefa '${task.title}'`;
             type = "warning";
           } else {
             msg = `Tarefa Pendente: '${task.title}' (Prazo: ${new Date(task.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
             type = "info";
           }
        }
        
        return {
          id: task.id,
          user_id: user.id,
          title: user.role === 'admin' ? "Atenção: Tarefa Crítica" : "Sua Tarefa",
          message: msg,
          type: type,
          is_read: false,
          created_at: task.created_at || new Date().toISOString()
        };
      });

      // Merge and sort
      allNotifications = [...taskNotifications, ...allNotifications].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return NextResponse.json({ notifications: allNotifications });
  } catch (error: any) {
    // Se a tabela não existir, retornamos vazio para o front-end não quebrar
    return NextResponse.json({ notifications: [] });
  }
}
