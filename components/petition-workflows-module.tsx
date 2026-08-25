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
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { FileText, CheckCircle, Clock, Plus, Loader2, ChevronRight, ChevronDown, User, Sparkles, Copy } from 'lucide-react';

export function PetitionWorkflowsModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [selectedPromptStep, setSelectedPromptStep] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseId, setNewCaseId] = useState<string>('none');
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);
  const [completingStep, setCompletingStep] = useState<{workflowId: string, stepId: string} | null>(null);
  const [stepNotes, setStepNotes] = useState("");
  const [pendingAssignees, setPendingAssignees] = useState<Record<string, string>>({});

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
  const cases: any[] = Array.isArray(casesData) ? casesData : (casesData?.cases || []);

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

  
      const getClaudePrompts = (stepName: string) => {
    const prompts: Record<string, {title: string, text: string, image?: string}[]> = {
      "Triagem inicial": [],
      "Organização e nomeação dos documentos [Gemini]": [{ title: "Organização e Nomenclatura", text: "**Entrada mínima:**\n```\n/organizacao-e-nomenclatura-de-arquivos\n\nOrganize e sugira a nomenclatura dos arquivos deste caso.\nTipo de caso: [SE CONHECIDO]\n```\n\n" }],
      "Análise documental e Resumo [NotebookLM]": [{ title: "Análise Documental Jurídica", text: "**Entrada mínima:**\n```\n/analise-documental-juridica\n\nRepresentamos: [PARTE]\nAnalise todos os documentos deste caso.\nContexto adicional: [SE NECESSÁRIO]\n```" }],
      "Tese jurídica [Sonnet - temática / Opus - tese jurídica]": [{"title":"Consumidor e Bancário","text": "**Entrada mínima:**\n```\n/consumidor-e-bancario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Produto/serviço afetado]\n```"},{"title":"Contratual e Obrigações","text": "**Entrada mínima:**\n```\n/contratual-e-obrigacoes\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Contrato analisado]\n```"},{"title":"Direito do Trabalho","text": "**Entrada mínima:**\n```\n/direito-do-trabalho\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Relação de trabalho em questão]\n```"},{"title":"Imobiliário","text": "**Entrada mínima:**\n```\n/imobiliario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Imóvel/Matrícula em questão]\n```"},{"title":"Previdenciário","text": "**Entrada mínima:**\n```\n/previdenciario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Benefício pleiteado]\n```"},
  { title: "Tese Jurídica (Geral)", text: "**Entrada mínima:**\n```\n/tese-juridica\n\nRepresentamos: [PARTE].\nObjetivo material: [OBJETIVO]\nUtilize a análise documental anterior e os documentos originais.\n```" }
],
      "Viabilidade e proposta e contrato de honorários, proc., decl., doc. pessoais. [GPT]": [{ title: "Proposta de Honorários", text: "**Entrada mínima:**\n```\n/proposta-honorarios\n\nCliente: [SE NÃO ESTIVER NO CONTEXTO]\nObjeto: [SE NÃO ESTIVER NO CONTEXTO]\n```\nA Skill pergunta obrigatoriamente o **modelo de honorários** (fixo, pró-labore + êxito, mensalidade, por etapa, ou combinação) e as **instâncias/fases incluídas**, caso ainda não estejam definidas — e não avança sem essas respostas.\n\n" }],
                  "Elaborar petição": [{ title: "Petição Inicial", image: "/objetivo-processual.png", text: "**Entrada mínima:**\n```\n/peticao-inicial\n\nContratação formalizada.\n\nRepresentamos: [NOME DA PARTE AUTORA].\n\nObjetivo processual:\n[INFORMAR O PROVIMENTO JURISDICIONAL PRETENDIDO].\n\nUtilize automaticamente a tese jurídica consolidada, os relatórios, resumos, documentos e demais informações deste caso já disponíveis no contexto.\n\nElabore a versão final completa da petição inicial conforme a Skill, preservando integralmente a estratégia jurídica previamente definida.\n\nSe houver informação realmente impeditiva ou questão bloqueante ainda não definida pelo advogado, não crie solução jurídica autônoma. Prossiga até onde for possível e indique o ponto no controle interno antes do protocolo.\n\nContexto adicional:\n[INCLUIR SOMENTE SE HOUVER ORIENTAÇÃO ESPECÍFICA PARA ESTE CASO].\n\n```\n\n" }, { title: "Mandado de Segurança", text: "**Entrada mínima:**\n```\n/mandado-de-seguranca\n\nContratação formalizada.\nImpetrante: [PARTE]\nObjetivo: [OBJETIVO]\nNatureza do ato: [ADMINISTRATIVO / OMISSÃO / JUDICIAL]\n```\nPara ato judicial, acrescentar: `Aplique o protocolo reforçado de excepcionalidade.`\n\n" }, { title: "Execução e Cumprimento", text: "**Entrada mínima:**\n```\n/execucao-e-cumprimento\n\nRepresentamos: [EXEQUENTE / EXECUTADO]\nProcedimento: [cumprimento de sentença / execução de título extrajudicial]\nObjetivo: [OBJETIVO]\n```\nPara pedir apenas auditoria, sem peça: `Modo: auditoria de título e cálculo. Não elabore peça.`\n\n" }],
                            };
    return prompts[stepName] || [];
  };

  const handleOpenPromptModal = (stepName: string) => {
    setSelectedPromptStep(stepName);
    setIsPromptModalOpen(true);
  };

  const handleCompleteStep = (workflowId: string, stepId: string) => {
    setStepNotes("");
    setCompletingStep({ workflowId, stepId });
  };
  
  const confirmCompleteStep = () => {
    if (!completingStep) return;
    updateStepMutation.mutate({
      workflowId: completingStep.workflowId,
      stepId: completingStep.stepId,
      data: { status: 'Concluída', notes: stepNotes }
    });
    setCompletingStep(null);
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
                              style={{ width: `${(workflow.current_step / 12) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-brand-gray font-medium w-8">
                            {workflow.current_step}/12
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
                              {(workflow.steps ? [...workflow.steps].sort((a: any, b: any) => a.step_number - b.step_number) : []).map((step: any, index: number) => {
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
                                          {getClaudePrompts(step.step_name).length > 0 && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 bg-blue-50/50"
                                            onClick={() => handleOpenPromptModal(step.step_name)}
                                          >
                                            Comando skill
                                          </Button>
                                          )}
                                          {step.step_name === "Viabilidade e proposta e contrato de honorários, proc., decl., doc. pessoais. [GPT]" && (
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 bg-purple-50/50"
                                              onClick={() => window.open("https://www.canva.com/design/DAHTNOE8X9k/RP4I0cwWZ7FWpO6LIliAEA/edit", "_blank")}
                                            >
                                              Canva
                                            </Button>
                                          )}
                                          {isCurrent && step.assigned_to === user?.id && (
                                            <Button 
                                              size="sm" 
                                              onClick={() => handleCompleteStep(workflow.id, step.id)}
                                              disabled={updateStepMutation.isPending}
                                              className="bg-brand text-white hover:bg-brand/90"
                                            >
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              Concluir Etapa
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {step.notes && (
                                        <div className="mt-3 bg-brand-light/20 p-3 rounded-md border border-brand-gray/20 text-sm text-brand-black w-full">
                                          <span className="font-semibold block mb-1 text-brand-sage">Observação:</span>
                                          {step.notes}
                                        </div>
                                      )}
                                      
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

      <Dialog open={!!completingStep} onOpenChange={(open) => !open && setCompletingStep(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-brand-black">Concluir Etapa</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-brand-black">Alguma observação? (Opcional)</label>
              <textarea
                className="w-full h-24 p-3 border border-brand-gray/30 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-brand-black"
                placeholder="Deixe uma observação para a próxima pessoa..."
                value={stepNotes}
                onChange={(e) => setStepNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCompletingStep(null)} className="border-brand-gray text-brand-gray hover:bg-brand-gray/10">
                Cancelar
              </Button>
              <Button onClick={confirmCompleteStep} className="bg-brand text-white hover:bg-brand/90">
                Confirmar e Avançar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              
              Comandos Skill: {selectedPromptStep}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            {selectedPromptStep && getClaudePrompts(selectedPromptStep).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6 italic">Nenhum comando cadastrado para esta etapa.</p>
            )}
            {selectedPromptStep && getClaudePrompts(selectedPromptStep).map((cmd, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-brand-black">{cmd.title}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      const match = cmd.text.match(/```([\s\S]*?)```/);
                      const textToCopy = match && match[1] ? match[1].trim() : cmd.text;
                      navigator.clipboard.writeText(textToCopy);
                      toast({
                        title: "Copiado!",
                        description: "Comando copiado para a área de transferência.",
                      });
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copiar
                  </Button>
                </div>
                <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-700 border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {cmd.image && (
                    <div className="mb-4">
                      <img src={cmd.image} alt="Dica" className="max-w-full rounded border border-slate-200" />
                    </div>
                  )}
                  {cmd.text}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromptModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
