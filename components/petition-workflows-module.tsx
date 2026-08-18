"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { FileText, CheckCircle, Clock, Plus, Loader2, ChevronRight, ChevronDown, User } from 'lucide-react';

export function PetitionWorkflowsModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseId, setNewCaseId] = useState<string>('none');
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['petition-workflows'],
    queryFn: () => apiClient.getPetitionWorkflows()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.getEmployees()
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases()
  });
  const cases = casesData?.cases || casesData || [];

  const createMutation = useMutation({
    mutationFn: (data: { title: string; case_id?: number }) => apiClient.createPetitionWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewCaseId('none');
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ workflowId, stepId, data }: { workflowId: string, stepId: string, data: any }) => 
      apiClient.updateWorkflowStep(workflowId, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
    }
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      case_id: newCaseId !== 'none' ? parseInt(newCaseId) : undefined
    });
  };

  const handleAssignToMe = (workflowId: string, stepId: string) => {
    if (!user?.id) return;
    updateStepMutation.mutate({
      workflowId,
      stepId,
      data: { assigned_to: user.id }
    });
  };

  const handleAssignTo = (workflowId: string, stepId: string, employeeId: string) => {
    updateStepMutation.mutate({
      workflowId,
      stepId,
      data: { assigned_to: employeeId === 'none' ? null : employeeId }
    });
  };

  const handleCompleteStep = (workflowId: string, stepId: string) => {
    updateStepMutation.mutate({
      workflowId,
      stepId,
      data: { status: 'Concluída' }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkflowId(prev => prev === id ? null : id);
  };

  const totalPeticoes = workflows.length;
  const emAndamento = workflows.filter((w: any) => w.status === 'Em andamento').length;
  const concluidas = workflows.filter((w: any) => w.status === 'Concluída').length;
  
  let minhasEtapas = 0;
  workflows.forEach((w: any) => {
    w.steps?.forEach((step: any) => {
      if (step.status === 'Pendente' && step.step_number === w.current_step && step.assigned_to === user?.id) {
        minhasEtapas++;
      }
    });
  });

  if (isLoading) {
    return <div className="p-8 text-center text-brand-gray flex flex-col items-center"><Loader2 className="animate-spin w-8 h-8 mb-4"/> Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border-l-4 border-brand p-8 shadow-sm mb-6 rounded-sm">
        <h2 className="text-3xl font-serif text-brand-black tracking-tight">Petições</h2>
        <p className="text-brand-gray mt-2 font-medium">Gerencie suas petições organizadas por etapas</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Total de Petições</p>
                <p className="text-3xl font-serif text-brand-black">{totalPeticoes}</p>
              </div>
              <div className="p-2 bg-brand-light/20 border border-brand-gray/10 rounded-sm">
                <FileText className="w-5 h-5 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Em Andamento</p>
                <p className="text-3xl font-serif text-brand-black">{emAndamento}</p>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-100 rounded-sm">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Concluídas</p>
                <p className="text-3xl font-serif text-brand-black">{concluidas}</p>
              </div>
              <div className="p-2 bg-green-50 border border-green-100 rounded-sm">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-brand-gray/20 bg-white rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-brand-gray font-semibold uppercase tracking-wider">Minhas Etapas</p>
                <p className="text-3xl font-serif text-brand-black">{minhasEtapas}</p>
              </div>
              <div className="p-2 bg-brand-beige/30 border border-brand-beige rounded-sm">
                <User className="w-5 h-5 text-brand-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-brand text-white hover:bg-brand/90 shadow-sm rounded-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Petição
        </Button>
      </div>

      <Card className="border-0 shadow-sm bg-white overflow-hidden rounded-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-light/20 hover:bg-brand-light/30 border-b border-brand-gray/20">
                <TableHead className="w-12"></TableHead>
                <TableHead className="text-brand-black font-semibold">Título</TableHead>
                <TableHead className="text-brand-black font-semibold">Caso</TableHead>
                <TableHead className="text-brand-black font-semibold">Etapa Atual</TableHead>
                <TableHead className="text-brand-black font-semibold min-w-[200px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-brand-gray">
                    Nenhuma petição encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((workflow: any) => (
                  <React.Fragment key={workflow.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-brand-light/10 transition-colors"
                      onClick={() => toggleExpand(workflow.id)}
                    >
                      <TableCell>
                        {expandedWorkflowId === workflow.id ? (
                          <ChevronDown className="h-5 w-5 text-brand-gray" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-brand-gray" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-brand-black">
                        {workflow.title}
                      </TableCell>
                      <TableCell className="text-brand-gray text-sm">
                        {workflow.case ? `${workflow.case.case_number || ''} - ${workflow.case.title || ''}` : '-'}
                      </TableCell>
                      <TableCell>
                        {workflow.status === 'Concluída' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluída</Badge>
                        ) : (
                          <span className="text-sm font-medium text-brand">Etapa {workflow.current_step}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-brand-light/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand rounded-full transition-all duration-500"
                              style={{ width: `${(workflow.current_step / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-brand-gray font-medium w-8">
                            {workflow.current_step}/10
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* EXPANDED TIMELINE */}
                    {expandedWorkflowId === workflow.id && (
                      <TableRow className="bg-brand-light/5 hover:bg-brand-light/5">
                        <TableCell colSpan={5} className="p-0 border-b border-brand-gray/10">
                          <div className="p-8 max-w-4xl mx-auto">
                            <h4 className="font-serif text-xl text-brand-black mb-6">Linha do Tempo da Petição</h4>
                            <div className="space-y-0">
                              {workflow.steps?.map((step: any, index: number) => {
                                const isCompleted = step.status === 'Concluída';
                                const isCurrent = step.step_number === workflow.current_step && workflow.status !== 'Concluída';
                                const isPending = !isCompleted && !isCurrent;
                                
                                return (
                                  <div key={step.id} className={`relative pl-8 pb-6 border-l-2 ${
                                    isCompleted ? 'border-green-500' :
                                    isCurrent ? 'border-brand' :
                                    'border-brand-gray/30'
                                  }`}>
                                    {/* Circle indicator */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                                      isCompleted ? 'bg-green-500 border-green-500' :
                                      isCurrent ? 'bg-brand border-brand animate-pulse' :
                                      'bg-white border-brand-gray/30'
                                    }`} />
                                    
                                    {/* Step content */}
                                    <div className={`ml-4 p-4 rounded-md shadow-sm transition-all ${
                                      isCompleted ? 'bg-green-50/50 border border-green-100' :
                                      isCurrent ? 'bg-white border border-brand ring-1 ring-brand/10' :
                                      'bg-white border border-brand-gray/20 opacity-70'
                                    }`}>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className={`font-bold ${
                                              isCompleted ? 'text-green-800' :
                                              isCurrent ? 'text-brand' :
                                              'text-brand-gray'
                                            }`}>
                                              Etapa {step.step_number}: {step.step_name}
                                            </span>
                                            {isCompleted && step.completed_at && (
                                              <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                                                ✅ Concluído em {format(new Date(step.completed_at), "dd/MM/yyyy HH:mm")}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="mt-2 text-xs text-brand-gray flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            <span>
                                              Responsável: <span className="font-medium text-brand-black">{step.assigned_user?.name || 'Não atribuído'}</span>
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {isCurrent && (
                                            <>
                                              {step.assigned_to === user?.id ? (
                                                <Button 
                                                  size="sm" 
                                                  onClick={() => handleCompleteStep(workflow.id, step.id)}
                                                  disabled={updateStepMutation.isPending}
                                                  className="bg-brand text-white hover:bg-brand/90"
                                                >
                                                  <CheckCircle className="w-4 h-4 mr-2" />
                                                  Concluir Etapa
                                                </Button>
                                              ) : (
                                                <div className="flex gap-2 items-center">
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleAssignToMe(workflow.id, step.id)}
                                                    className="border-brand text-brand hover:bg-brand-light"
                                                  >
                                                    Atribuir a mim
                                                  </Button>
                                                  <Select value={step.assigned_to || 'none'} onValueChange={(val) => handleAssignTo(workflow.id, step.id, val)}>
                                                    <SelectTrigger className="w-[140px] h-9 text-xs">
                                                      <SelectValue placeholder="Delegar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="none">Ninguém</SelectItem>
                                                      {employees.map((emp: any) => (
                                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                            </>
                                          )}
                                          {isPending && !isCurrent && !isCompleted && (
                                            <Select value={step.assigned_to || 'none'} onValueChange={(val) => handleAssignTo(workflow.id, step.id, val)}>
                                              <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent">
                                                <SelectValue placeholder="Responsável..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">Ninguém</SelectItem>
                                                {employees.map((emp: any) => (
                                                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-brand-black border-b border-brand-gray/20 pb-4">
              Nova Petição
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="Ex: Petição Inicial - João da Silva" 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Vincular a um Caso (Opcional)</Label>
              <Select value={newCaseId} onValueChange={setNewCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um caso..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.case_number ? `${c.case_number} - ` : ''}{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-brand-gray/20 pt-4">
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !newTitle.trim()} className="bg-brand text-white hover:bg-brand/90">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
