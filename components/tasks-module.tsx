// components/tasks-module.tsx 
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, CheckCircle, Clock, AlertTriangle, User, Calendar, Filter, Star, TrendingUp } from "lucide-react";
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
  const stats = [
    { 
      label: "Total de Tarefas", 
      value: tasks.length.toString(), 
      icon: CheckCircle, 
      color: "text-brand",
      bg: "from-brand-light/50 to-brand-light/20",
      trend: "+5%"
    },
    { 
      label: "Em Andamento", 
      value: tasks.filter(t => t.status === 'Em Andamento').length.toString(), 
      icon: Clock, 
      color: "text-brand-sage",
      bg: "from-brand-sage/30 to-brand-sage/10",
      trend: "+12%"
    },
    { 
      label: "Concluídas", 
      value: tasks.filter(t => t.status === 'Concluída').length.toString(), 
      icon: CheckCircle, 
      color: "text-brand",
      bg: "from-brand-beige/50 to-brand-beige/20",
      trend: "+8%"
    },
    { 
      label: "Alta Prioridade", 
      value: tasks.filter(t => t.priority === 'Alta').length.toString(), 
      icon: AlertTriangle, 
      color: "text-brand",
      bg: "from-brand-gray/30 to-brand-gray/10",
      trend: "-3%"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        // Correção: Extrair o ícone corretamente
        const StatIcon = stat.icon;
        
        return (
          <Card key={index} className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-serif text-brand-black">{stat.value}</p>
                  <div className="flex items-center space-x-1 pt-1">
                    <TrendingUp className="w-4 h-4 text-brand-sage" />
                    <span className="text-sm text-brand-sage font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                  <StatIcon className="w-5 h-5 text-brand" />
                </div>
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
  
  const priorityConfig = {
    'Alta': { color: 'from-red-500 to-red-600', label: 'Alta', icon: AlertTriangle },
    'Média': { color: 'from-yellow-500 to-orange-500', label: 'Média', icon: Clock },
    'Baixa': { color: 'from-green-500 to-green-600', label: 'Baixa', icon: CheckCircle }
  };

  const statusConfig: Record<string, { bg: string, border: string }> = {
    'Pendente': { bg: 'bg-brand-light/50', border: 'border-brand-gray' },
    'Em Andamento': { bg: 'bg-brand-light/50', border: 'border-brand-light' },
    'Concluída': { bg: 'bg-green-50', border: 'border-green-200' },
    'Cancelada': { bg: 'bg-red-50', border: 'border-red-200' },
    'Audiência': { bg: 'bg-amber-50', border: 'border-amber-200' },
    'Transferido': { bg: 'bg-blue-50', border: 'border-blue-200' },
  };

  const currentPriority = task.priority || 'Média';
  const PriorityIcon = priorityConfig[currentPriority].icon;
  const priorityLabel = priorityConfig[currentPriority].label;
  const priorityColor = priorityConfig[currentPriority].color;
  
  const currentStatus = task.status || 'Pendente';
  const currentStatusConfig = (statusConfig[currentStatus] || statusConfig['Pendente']) as { bg: string, border: string };

  return (
    <Card className={`group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 ${currentStatusConfig.border} ${currentStatusConfig.bg} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
      
      <CardContent className="p-4 relative z-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-brand-black line-clamp-2 group-hover:text-brand transition-colors">
              {task.title}
            </h4>
            {renderDescription(task.description)}
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`bg-gradient-to-r ${priorityColor} text-white border-0 px-3 py-1 font-semibold shadow-lg`}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityLabel}
            </Badge>
            
            {task.due_date && (
              <div className="flex items-center text-xs text-brand-sage">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(task.due_date).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-brand-gray/50">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-brand-black rounded-full flex items-center justify-center text-white text-xs font-bold">
                {task.assigned_user?.name?.charAt(0) || assignee?.name?.charAt(0) || '?'}
              </div>
              <span className="text-xs text-brand-gray">{task.assigned_user?.name || assignee?.name || 'N/A'}</span>
            </div>
            
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status !== 'Concluída' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-brand-sage hover:text-brand hover:bg-brand-light/50 h-8 px-2"
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
                  className="text-brand hover:text-brand hover:bg-brand-light/50 h-8 px-2"
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


const renderDescription = (text?: string | null) => {
  if (!text) return null;
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  let cleanText = text;
  const images = [];
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    images.push(match[1]);
    cleanText = cleanText.replace(match[0], '');
  }
  cleanText = cleanText.trim();
  return (
    <>
      {cleanText && <p className="text-sm text-brand-gray line-clamp-1">{cleanText}</p>}
      {images.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
              <img src={img} alt="Anexo" className="w-12 h-12 object-cover rounded-md border border-brand-gray/30 hover:opacity-80 transition-opacity" />
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
      const supabase = createClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);
        
      const imageMarkdown = ` \n![Anexo](${publicUrl})`;
      
      if (isEditing && editingTask) {
        setEditingTask({...editingTask, description: (editingTask.description || '') + imageMarkdown});
      } else {
        setNewTask({...newTask, description: (newTask.description || '') + imageMarkdown});
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

  // Mostrar todas as tarefas atribuídas ao usuário no Kanban
  const activeTasks = useMemo(() => {
    return visibleTasks.filter(task => {
      // Opcional: Se quisermos esconder tarefas concluídas antigas, poderíamos fazer aqui.
      // Mas como é um Kanban, vamos deixar o usuário ver o fluxo completo.
      // Se houver muitas tarefas concluídas, podemos limitar depois.
      return true;
    });
  }, [visibleTasks]);

  const columns = [
    { id: 'Pendente', title: 'Pendente', color: 'from-brand-black to-brand-black/90 text-white' },
    { id: 'Em Andamento', title: 'Em Andamento', color: 'from-blue-100 to-blue-200' },
    { id: 'Concluída', title: 'Concluída', color: 'from-green-100 to-green-200' },
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
    <div className="space-y-8">
      <div className="flex justify-between items-end mb-8">
        <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
          <h2 className="text-3xl font-serif text-brand-black tracking-tight">Gestão de Tarefas</h2>
          <p className="text-brand-gray mt-2 font-medium">Controle de delegações, andamentos e produtividade da equipe.</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setAllTasksModalOpen(true)}
              variant="outline"
              className="border-brand text-brand hover:bg-brand-50"
              size="lg"
            >
              Ver Todas as Tarefas
            </Button>
          )}
          {can && can('tasks_create') && (
            <Button 
              onClick={() => setModalOpen(true)} 
              className="bg-brand text-white hover:bg-brand-dark shadow-sm rounded-none"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" /> 
              Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <TasksStats tasks={activeTasks} />

      {/* Kanban Board Moderno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {columns.map(column => (
          <div key={column.id} className="space-y-4">
            {/* Header da coluna */}
            <Card className={`bg-gradient-to-r ${column.color} border-0 shadow-lg`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-lg ${column.color.includes("brand-black") ? "text-white" : "text-brand"}`}>{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/80 text-brand font-semibold shadow-sm">
                    {activeTasks.filter(task => task.status === column.id).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Tarefas da coluna */}
            <div className="space-y-4 min-h-[500px]">
              {activeTasks
                .filter(task => task.status === column.id)
                .map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    employees={employees}
                    userRole={user?.role}
                    onEdit={(task) => setEditingTask(task)}
                    onComplete={handleCompleteTask}
                  />
                ))}
              
              {activeTasks.filter(task => task.status === column.id).length === 0 && (
                <div className="text-center py-12 text-brand-gray">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma tarefa</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
              {isUploading && <p className="text-xs text-brand-gray">Enviando imagem...</p>}
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
                {isUploading && <p className="text-xs text-brand-gray">Enviando imagem...</p>}
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
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
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