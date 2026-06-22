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
      color: "text-blue-600",
      bg: "from-blue-50 to-blue-100",
      trend: "+5%"
    },
    { 
      label: "Em Andamento", 
      value: tasks.filter(t => t.status === 'Em Andamento').length.toString(), 
      icon: Clock, 
      color: "text-orange-600",
      bg: "from-orange-50 to-orange-100",
      trend: "+12%"
    },
    { 
      label: "Concluídas", 
      value: tasks.filter(t => t.status === 'Concluída').length.toString(), 
      icon: CheckCircle, 
      color: "text-green-600",
      bg: "from-green-50 to-green-100",
      trend: "+8%"
    },
    { 
      label: "Alta Prioridade", 
      value: tasks.filter(t => t.priority === 'Alta').length.toString(), 
      icon: AlertTriangle, 
      color: "text-red-600",
      bg: "from-red-50 to-red-100",
      trend: "-3%"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        // Correção: Extrair o ícone corretamente
        const StatIcon = stat.icon;
        
        return (
          <Card key={index} className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-0 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">{stat.trend}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <StatIcon className={`w-6 h-6 ${stat.color}`} />
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

  const statusConfig = {
    'Pendente': { bg: 'bg-slate-50', border: 'border-slate-200' },
    'Em Andamento': { bg: 'bg-blue-50', border: 'border-blue-200' },
    'Concluída': { bg: 'bg-green-50', border: 'border-green-200' },
    'Cancelada': { bg: 'bg-red-50', border: 'border-red-200' }
  };

  const currentPriority = task.priority || 'Média';
  const PriorityIcon = priorityConfig[currentPriority].icon;
  const priorityLabel = priorityConfig[currentPriority].label;
  const priorityColor = priorityConfig[currentPriority].color;
  
  const currentStatus = task.status || 'Pendente';

  return (
    <Card className={`group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 ${statusConfig[currentStatus].border} ${statusConfig[currentStatus].bg} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
      
      <CardContent className="p-4 relative z-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-slate-700 transition-colors">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-slate-600 line-clamp-1">{task.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`bg-gradient-to-r ${priorityColor} text-white border-0 px-3 py-1 font-semibold shadow-lg`}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityLabel}
            </Badge>
            
            {task.due_date && (
              <div className="flex items-center text-xs text-slate-500">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(task.due_date).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {task.assigned_user?.name?.charAt(0) || assignee?.name?.charAt(0) || '?'}
              </div>
              <span className="text-xs text-slate-600">{task.assigned_user?.name || assignee?.name || 'N/A'}</span>
            </div>
            
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status !== 'Concluída' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
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
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
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

export function TasksModule() {
  const { toast } = useToast();
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAllTasksModalOpen, setAllTasksModalOpen] = useState(false);
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
    if (user?.role === 'admin' || (can && can('tasks_view_all'))) return tasks;
    return tasks.filter(task => task.assigned_to === user?.id);
  }, [tasks, user, can]);

  // Tarefas do dia atual
  const todayTasks = useMemo(() => {
    return visibleTasks.filter(task => {
      const dateString = (task as any).created_at;
      if (!dateString) return true;
      const taskDate = new Date(dateString);
      const today = new Date();
      return taskDate.getDate() === today.getDate() && taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
    });
  }, [visibleTasks]);

  const columns = [
    { id: 'Pendente', title: 'Pendente', color: 'from-slate-100 to-slate-200' },
    { id: 'Em Andamento', title: 'Em Andamento', color: 'from-blue-100 to-blue-200' },
    { id: 'Concluída', title: 'Concluída', color: 'from-green-100 to-green-200' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500 mx-auto" />
          <p className="text-slate-600 font-medium">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Moderno */}
      <div className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%223%22%2F%3E%3Ccircle%20cx%3D%2213%22%20cy%3D%2213%22%20r%3D%221%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-bold mb-3">Gestão de Tarefas</h2>
            <p className="text-purple-100 text-xl">Organize e acompanhe as atividades da sua equipe com eficiência.</p>
          </div>
          
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <Button 
                onClick={() => setAllTasksModalOpen(true)}
                variant="outline"
                className="bg-transparent border-purple-300 text-white hover:bg-purple-800 hover:text-white"
                size="lg"
              >
                Ver Todas as Tarefas
              </Button>
            )}
            {can && can('tasks_create') && (
              <Button 
                onClick={() => setModalOpen(true)} 
                className="bg-white text-purple-900 hover:bg-purple-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" /> 
                Nova Tarefa
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <TasksStats tasks={todayTasks} />

      {/* Kanban Board Moderno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {columns.map(column => (
          <div key={column.id} className="space-y-4">
            {/* Header da coluna */}
            <Card className={`bg-gradient-to-r ${column.color} border-0 shadow-lg`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-lg">{column.title}</h3>
                  <Badge variant="secondary" className="bg-white/80 text-slate-700 font-semibold shadow-sm">
                    {todayTasks.filter(task => task.status === column.id).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Tarefas da coluna */}
            <div className="space-y-4 min-h-[500px]">
              {todayTasks
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
              
              {todayTasks.filter(task => task.status === column.id).length === 0 && (
                <div className="text-center py-12 text-slate-400">
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
        <DialogContent className="sm:max-w-xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">Criar Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Título da Tarefa *</Label>
              <Input 
                value={newTask.title} 
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="bg-white border-2 border-slate-200 focus:border-purple-400"
                placeholder="Digite o título da tarefa..."
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Descrição</Label>
              <Input 
                value={newTask.description} 
                onChange={e => setNewTask({...newTask, description: e.target.value})}
                className="bg-white border-2 border-slate-200 focus:border-purple-400"
                placeholder="Descrição opcional..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Responsável</Label>
                <Select value={newTask.assigneeId} onValueChange={id => setNewTask({...newTask, assigneeId: id})}>
                  <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-purple-400">
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
                <Label className="text-slate-700 font-semibold">Prioridade</Label>
                <Select value={newTask.priority} onValueChange={(value: Task['priority']) => setNewTask({...newTask, priority: value})}>
                  <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-purple-400">
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
              <Label className="text-slate-700 font-semibold">Data de Vencimento</Label>
              <Input 
                type="date" 
                value={newTask.dueDate} 
                onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                className="bg-white border-2 border-slate-200 focus:border-purple-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-2 border-slate-200">
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
            <DialogTitle className="text-2xl font-bold text-slate-900">Editar Tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Título da Tarefa *</Label>
                <Input 
                  value={editingTask.title} 
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="bg-white border-2 border-slate-200 focus:border-purple-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Descrição</Label>
                <Input 
                  value={editingTask.description || ''} 
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="bg-white border-2 border-slate-200 focus:border-purple-400"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Responsável</Label>
                  <Select value={editingTask.assigned_to || ''} onValueChange={id => setEditingTask({...editingTask, assigned_to: id})}>
                    <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-purple-400">
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
                  <Label className="text-slate-700 font-semibold">Status</Label>
                  <Select value={editingTask.status} onValueChange={(value: any) => setEditingTask({...editingTask, status: value})}>
                    <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-purple-400">
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
                className="bg-purple-600 hover:bg-purple-700"
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
        <DialogContent className="sm:max-w-4xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">Todas as Tarefas</DialogTitle>
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
             }).map(task => (
                <div key={task.id as string} className="p-4 border rounded-lg shadow-sm bg-slate-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{task.title}</h4>
                    <p className="text-sm text-slate-600">{task.description}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{task.status}</Badge>
                      <Badge variant="outline">{new Date((task as any).created_at || '').toLocaleDateString('pt-BR')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     {user?.role === 'admin' && (
                        <Button variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => { setAllTasksModalOpen(false); setEditingTask(task); }}>
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