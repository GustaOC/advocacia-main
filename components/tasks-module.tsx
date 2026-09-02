// components/tasks-module.tsx 
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, CheckCircle, Clock, AlertTriangle, Calendar, ClipboardList, Paperclip, Circle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type Task } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

interface Employee { 
  id: string; 
  name: string; 
  email: string; 
  avatar_url?: string; 
}

// Componente de estatísticas de tarefas
function TasksStats({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((task) => {
    if (task.status === 'Concluída' || !task.due_date) return false;
    return taskDate(task.due_date) < today;
  }).length;

  const stats = [
    { label: "Total", value: tasks.length, icon: ClipboardList, iconClass: "bg-slate-100 text-slate-700" },
    { label: "Pendentes", value: tasks.filter(t => t.status === 'Pendente').length, icon: Clock, iconClass: "bg-amber-50 text-amber-700" },
    { label: "Concluídas", value: tasks.filter(t => t.status === 'Concluída').length, icon: CheckCircle, iconClass: "bg-emerald-50 text-emerald-700" },
    { label: "Vencidas", value: overdue, icon: AlertTriangle, iconClass: "bg-red-50 text-red-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const StatIcon = stat.icon;
        return (
          <Card key={stat.label} className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${stat.iconClass}`}>
                <StatIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Componente de card de tarefa moderno
const TaskCard = ({ 
  task, 
  employees, 
  userRole,
  onEdit,
  onComplete 
}: { task: Task, employees: Employee[], userRole?: string, onEdit?: (task: Task) => void, onComplete?: (taskId: string) => void }) => {
  const assignee = employees.find(e => e.id === task.assigned_to);
  const assigneeName = task.assigned_user?.name || assignee?.name || 'Sem responsável';
  const completed = task.status === 'Concluída';
  const dueDate = task.due_date ? taskDate(task.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = Boolean(dueDate && !completed && dueDate < today);
  
  const priorityConfig = {
    'Alta': { badge: 'border-red-200 bg-red-50 text-red-700', accent: 'bg-red-500', label: 'Alta', icon: AlertTriangle },
    'Média': { badge: 'border-amber-200 bg-amber-50 text-amber-700', accent: 'bg-amber-500', label: 'Média', icon: Clock },
    'Baixa': { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', accent: 'bg-emerald-500', label: 'Baixa', icon: Circle }
  };

  const currentPriority = task.priority || 'Média';
  const PriorityIcon = priorityConfig[currentPriority].icon;
  const priorityLabel = priorityConfig[currentPriority].label;
  const priorityBadge = priorityConfig[currentPriority].badge;
  const priorityAccent = priorityConfig[currentPriority].accent;

  return (
    <Card className={`group rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${completed ? 'opacity-80' : ''}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${completed ? 'bg-emerald-500' : priorityAccent}`} />
      <CardContent className="p-5 pl-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <h4 className={`font-semibold leading-snug text-slate-900 ${completed ? 'line-through decoration-slate-300' : ''}`}>
                {task.title}
              </h4>
              {completed && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />}
            </div>
            {renderDescription(task.description)}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadge}`}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityLabel}
            </Badge>
            {dueDate && (
              <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                <Calendar className="h-3 w-3" />
                {overdue ? 'Vencida em' : 'Vence em'} {dueDate.toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {assigneeName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-xs font-medium text-slate-600">{assigneeName}</span>
            </div>
            <div className="flex items-center gap-1">
              {!completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 rounded-lg px-2.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={(e) => { e.stopPropagation(); onComplete?.(task.id as string); }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Concluir
                </Button>
              )}
              {userRole === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 rounded-lg px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function taskDate(value: string) {
  return new Date(`${String(value).split('T')[0]}T12:00:00`);
}


const renderDescription = (text?: string | null) => {
  if (!text) return null;
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  
  let cleanText = text;
  const images: string[] = [];
  const links: {label: string, url: string}[] = [];
  
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    images.push(match[1]!);
    cleanText = cleanText.replace(match[0], '');
  }
  
  // Now extract links from what's left
  while ((match = linkRegex.exec(cleanText)) !== null) {
    links.push({label: match[1]!, url: match[2]!});
    cleanText = cleanText.replace(match[0], '');
  }
  
  cleanText = cleanText.trim();
  
  return (
    <>
      {cleanText && <p className="line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">{cleanText}</p>}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <a key={i} href={img} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-100">
              <Paperclip className="h-3.5 w-3.5" /> Imagem anexada {images.length > 1 ? i + 1 : ''}
            </a>
          ))}
        </div>
      )}
      {links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {links.map((link, i) => (
            <a key={'link'+i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-100">
              <Paperclip className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{link.label.replace(/^📄\s*/, '')}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
};

export function TasksModule() {
  const { toast } = useToast();
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAllTasksModalOpen, setAllTasksModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
            const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'task-attachments');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const { url: publicUrl } = await response.json();
        
      const isImage = file.type.startsWith('image/');
      const fileName = file.name;
      const fileMarkdown = isImage ? ` \n![Anexo](${publicUrl})` : ` \n[📄 Anexo - ${fileName}](${publicUrl})`;
      
      if (isEditing && editingTask) {
        setEditingTask({...editingTask, description: (editingTask.description || '') + fileMarkdown});
      } else {
        setNewTask({...newTask, description: (newTask.description || '') + fileMarkdown});
      }
      
      toast({
        title: "Imagem enviada!",
        description: "A imagem foi adicionada à descrição."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const [filterAssigned, setFilterAssigned] = useState("all");
  const [filterCreatedByAdmin, setFilterCreatedByAdmin] = useState(false);
  
  const [newTask, setNewTask] = useState({ 
    title: '', 
    assigneeId: user?.id || '', 
    priority: 'Média' as Task['priority'],
    dueDate: '',
    description: ''
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiClient.getEmployees(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiClient.getTasks(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: Partial<Task>) => apiClient.createTask(taskData),
    onSuccess: () => {
      toast({title: "Sucesso!", description: "Tarefa criada e atribuída."});
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setModalOpen(false);
      setNewTask({ title: '', assigneeId: user?.id || '', priority: 'Média', dueDate: '', description: '' });
    },
    onError: (error: any) => {
      toast({title: "Erro", description: error.message, variant: "destructive"});
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task> & { id: any }) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!res.ok) throw new Error("Falha ao atualizar tarefa");
      return res.json();
    },
    onSuccess: () => {
      toast({title: "Sucesso!", description: "Tarefa atualizada."});
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["publications"] });
      setEditingTask(null);
    },
    onError: (error: any) => {
      toast({title: "Erro", description: error.message, variant: "destructive"});
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: any) => {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Falha ao excluir tarefa");
      return res.json();
    },
    onSuccess: () => {
      toast({title: "Sucesso!", description: "Tarefa excluída."});
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    },
    onError: (error: any) => {
      toast({title: "Erro", description: error.message, variant: "destructive"});
    }
  });

  const handleCompleteTask = (id: string) => {
    updateTaskMutation.mutate({ id, status: 'Concluída' });
  };

  const handleCreateTask = () => {
    if(!newTask.title) {
      toast({title: "Erro", description: "Título é obrigatório.", variant: "destructive"});
      return;
    }
    createTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'Pendente',
      assigned_to: newTask.assigneeId || user?.id,
      due_date: newTask.dueDate || null,
    });
  };

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => task.assigned_to === user?.id);
  }, [tasks, user]);

  const activeTasks = useMemo(() => {
    return visibleTasks.filter(task => task.status === 'Pendente' || task.status === 'Concluída');
  }, [visibleTasks]);

  const columns = [
    { id: 'Pendente', title: 'Pendentes', description: 'Tarefas que ainda precisam ser concluídas', icon: Clock, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
    { id: 'Concluída', title: 'Concluídas', description: 'Tarefas finalizadas pela equipe', icon: CheckCircle, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 bg-brand-black rounded-2xl">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-sage mx-auto" />
          <p className="text-brand-gray font-medium">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand">
            <ClipboardList className="h-4 w-4" /> Organização da equipe
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tarefas</h2>
          <p className="mt-1 text-sm text-slate-500">Acompanhe o que está pendente e o que já foi concluído.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setAllTasksModalOpen(true)}
              variant="outline"
              className="rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              size="lg"
            >
              Todas as tarefas
            </Button>
          )}
          {can && can('tasks_create') && (
            <Button 
              onClick={() => setModalOpen(true)} 
              className="rounded-xl bg-brand text-white shadow-sm hover:bg-brand-dark"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" /> 
              Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      <TasksStats tasks={activeTasks} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {columns.map(column => {
          const ColumnIcon = column.icon;
          const columnTasks = activeTasks.filter(task => task.status === column.id);
          return (
          <section key={column.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${column.tone}`}>
                  <ColumnIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{column.title}</h3>
                  <p className="truncate text-xs text-slate-500">{column.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 text-slate-700">
                {columnTasks.length}
              </Badge>
            </div>
            <div className="min-h-[220px] space-y-3 p-4">
              {columnTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    employees={employees}
                    userRole={user?.role}
                    onEdit={(task) => setEditingTask(task)}
                    onComplete={handleCompleteTask}
                  />
                ))}
              
              {columnTasks.length === 0 && (
                <div className="grid min-h-[190px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-center text-slate-400">
                  <div>
                    <ColumnIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">Nenhuma tarefa</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )})}
      </div>

      {/* Modal de Nova Tarefa Moderno */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-brand-black">Criar Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-brand font-semibold">Título da Tarefa *</Label>
              <Input 
                value={newTask.title} 
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="bg-white border-2 border-brand-gray focus:border-brand-gray"
                placeholder="Digite o título da tarefa..."
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-brand font-semibold">Descrição</Label>
              <Input 
                value={newTask.description} 
                onChange={e => setNewTask({...newTask, description: e.target.value})}
                className="bg-white border-2 border-brand-gray focus:border-brand-gray"
                placeholder="Descrição opcional..."
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-brand font-semibold">Anexar Imagem</Label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleImageUpload(e, false)}
                disabled={isUploading}
                className="bg-white border-2 border-brand-gray file:text-brand file:font-semibold file:bg-brand-light/20 file:border-0 file:rounded-md file:mr-4 file:px-3 file:py-1 cursor-pointer"
              />
              {isUploading && <p className="text-xs text-brand-gray">Enviando arquivo...</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-brand font-semibold">Responsável</Label>
                <Select value={newTask.assigneeId} onValueChange={id => setNewTask({...newTask, assigneeId: id})}>
                  <SelectTrigger className="bg-white border-2 border-brand-gray focus:border-brand-gray">
                    <SelectValue placeholder="Atribuir a um membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {user && (
                      <SelectItem value={user.id}>Atribuir a mim mesmo</SelectItem>
                    )}
                    {employees.filter((emp: any) => emp.id !== user?.id).map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-brand font-semibold">Prioridade</Label>
                <Select value={newTask.priority} onValueChange={(value: Task['priority']) => setNewTask({...newTask, priority: value})}>
                  <SelectTrigger className="bg-white border-2 border-brand-gray focus:border-brand-gray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-brand font-semibold">Data de Vencimento</Label>
              <Input 
                type="date" 
                value={newTask.dueDate} 
                onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                className="bg-white border-2 border-brand-gray focus:border-brand-gray"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-2 border-brand-gray">
              Cancelar
            </Button>
            <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg">
              {createTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Tarefa */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-brand-black">Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-brand font-semibold">Título da Tarefa *</Label>
                <Input 
                  value={editingTask.title} 
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="bg-white border-2 border-brand-gray focus:border-brand-gray"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-brand font-semibold">Descrição</Label>
                <Input 
                  value={editingTask.description || ''} 
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="bg-white border-2 border-brand-gray focus:border-brand-gray"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-brand font-semibold">Anexar Imagem</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  disabled={isUploading}
                  className="bg-white border-2 border-brand-gray file:text-brand file:font-semibold file:bg-brand-light/20 file:border-0 file:rounded-md file:mr-4 file:px-3 file:py-1 cursor-pointer"
                />
                {isUploading && <p className="text-xs text-brand-gray">Enviando arquivo...</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-brand font-semibold">Responsável</Label>
                  <Select value={editingTask.assigned_to || ''} onValueChange={id => setEditingTask({...editingTask, assigned_to: id})}>
                    <SelectTrigger className="bg-white border-2 border-brand-gray focus:border-brand-gray">
                      <SelectValue placeholder="Atribuir a um membro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {user && <SelectItem value={user.id}>Atribuir a mim mesmo</SelectItem>}
                      {employees.filter((emp: any) => emp.id !== user?.id).map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-brand font-semibold">Status</Label>
                  <Select value={editingTask.status} onValueChange={(value: any) => setEditingTask({...editingTask, status: value})}>
                    <SelectTrigger className="bg-white border-2 border-brand-gray focus:border-brand-gray">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between w-full">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                  deleteTaskMutation.mutate(editingTask?.id);
                }
              }}
              disabled={deleteTaskMutation.isPending}
            >
              Excluir Tarefa
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancelar</Button>
              <Button 
                onClick={() => updateTaskMutation.mutate(editingTask!)} 
                disabled={updateTaskMutation.isPending}
                className="bg-brand-gray hover:bg-brand-gray"
              >
                {updateTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ver Todas as Tarefas */}
      <Dialog open={isAllTasksModalOpen} onOpenChange={setAllTasksModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-4xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-brand-black">Todas as Tarefas</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 py-4 border-b">
            <div className="flex-1 space-y-2">
              <Label>Feitas por (Responsável)</Label>
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-2">
              <Label>Criadas por</Label>
              <Select value={filterCreatedByAdmin ? 'admin' : 'all'} onValueChange={(v) => setFilterCreatedByAdmin(v === 'admin')}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mt-4">
             {tasks.filter(t => {
                if (filterAssigned !== 'all' && t.assigned_to !== filterAssigned) return false;
                return true;
             }).sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
             }).map(task => (
                <div key={task.id as string} className="p-4 border rounded-lg shadow-sm bg-brand-light/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-brand">{task.title}</h4>
                    {renderDescription(task.description)}
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{task.status}</Badge>
                      <Badge variant="outline">{new Date((task as any).created_at || '').toLocaleDateString('pt-BR')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     {user?.role === 'admin' && (
                        <Button variant="ghost" className="text-brand hover:bg-brand-light/50" onClick={() => { setAllTasksModalOpen(false); setEditingTask(task); }}>
                          Editar
                        </Button>
                     )}
                  </div>
                </div>
             ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
