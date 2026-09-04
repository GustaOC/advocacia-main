/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { FileText, CheckCircle, AlertCircle, Clock, Plus, Loader2, ChevronRight, ChevronDown, User, Sparkles, Copy, Eye, Undo2, MessageSquareWarning, Paperclip, X, Download, Pause, Play, Pencil } from 'lucide-react';
import { parsePetitionStepData, serializePetitionStepData, type PetitionStepAttachment } from '@/lib/petition-step-data';
import { getVisiblePetitionStepNotes, isPetitionStepSuspended, parsePetitionStepSuspension } from '@/lib/petition-step-suspension';

const PETITION_DESCRIPTION_TEMPLATE = `Representamos:
Objetivo processual:
Possível tema:`;
const BASE_WORKFLOW_STEPS = 17;
const STEP_RETURN_PREFIX = "__WORKFLOW_RETURN__:";

interface StepReturnInfo {
  reason: string;
  observations?: string;
  fromStepNumber: number;
  fromStepName: string;
  returnedBy: string;
  returnedAt: string;
}

const parseStepReturnInfo = (notes?: string | null): StepReturnInfo | null => {
  if (!notes?.startsWith(STEP_RETURN_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(STEP_RETURN_PREFIX.length)) as StepReturnInfo;
  } catch {
    return null;
  }
};

const isGptPromptStep = (stepName?: string | null) => Boolean(
  stepName && (
    stepName.includes("[GPT]") ||
    stepName.includes("(GPT)") ||
    stepName === "Proposta de honorários" ||
    stepName === "Elaborar contrato, procuração e declaração"
  )
);

export function PetitionWorkflowsModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDesc, setProblemDesc] = useState("");
  const [problemWorkflowId, setProblemWorkflowId] = useState<string | null>(null);
  const [problemStepNumber, setProblemStepNumber] = useState<number | null>(null);

  const reportProblemMutation = useMutation({
    mutationFn: async () => {
      if (!problemWorkflowId || !problemStepNumber) return;
      const res = await fetch(`/api/petition-workflows/${problemWorkflowId}/problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: problemTitle,
          description: problemDesc,
          current_step: problemStepNumber
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Problemática reportada", description: "O fluxo foi atualizado e enviado para o Dr. Cássio." });
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      setIsProblemModalOpen(false);
      setProblemTitle("");
      setProblemDesc("");
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const [selectedPromptStep, setSelectedPromptStep] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState(PETITION_DESCRIPTION_TEMPLATE);
  const [selectedPetition, setSelectedPetition] = useState<any | null>(null);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);
  const [completingStep, setCompletingStep] = useState<{workflowId: string, stepId: string, stepName: string, workflowTitle: string} | null>(null);
  const [returningStep, setReturningStep] = useState<{workflowId: string, stepId: string, stepNumber: number, stepName: string} | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnObservations, setReturnObservations] = useState("");
  const [viewingReturnInfo, setViewingReturnInfo] = useState<StepReturnInfo | null>(null);
  const [processNumber, setProcessNumber] = useState("");
  const [stepNotes, setStepNotes] = useState("");
  const [stepFiles, setStepFiles] = useState<File[]>([]);
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  const [pendingAssignees, setPendingAssignees] = useState<Record<string, string>>({});

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['petition-workflows'],
    queryFn: () => apiClient.getPetitionWorkflows(),
    staleTime: 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.getEmployees()
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) => apiClient.createPetitionWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewDescription(PETITION_DESCRIPTION_TEMPLATE);
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ workflowId, stepId, data }: { workflowId: string, stepId: string, data: any }) => 
      apiClient.updateWorkflowStep(workflowId, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
    }
  });

  const [editingPetition, setEditingPetition] = useState<{ id: string; title: string; description: string } | null>(null);

  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string } }) =>
      apiClient.updatePetitionWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      toast({ title: 'Sucesso', description: 'Descrição da petição atualizada com sucesso.' });
      setEditingPetition(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar petição.', variant: 'destructive' });
    },
  });

  const handleSaveDescription = () => {
    if (!editingPetition) return;
    updateWorkflowMutation.mutate({
      id: editingPetition.id,
      data: { description: editingPetition.description }
    });
  };

  const returnStepMutation = useMutation({
    mutationFn: ({ workflowId, stepId, reason, observations }: { workflowId: string, stepId: string, reason: string, observations?: string }) =>
      apiClient.returnWorkflowStep(workflowId, stepId, { reason, observations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      setReturningStep(null);
      setReturnReason("");
      setReturnObservations("");
      toast({ title: "Etapa devolvida", description: "A etapa anterior foi reaberta com o motivo informado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao voltar etapa", description: error.message, variant: "destructive" });
    }
  });

  const suspensionMutation = useMutation({
    mutationFn: async ({ workflowId, stepId, action }: { workflowId: string; stepId: string; action: 'suspend' | 'resume' }) => {
      const response = await fetch(`/api/petition-workflows/${workflowId}/steps/${stepId}/suspension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao alterar a suspensão.');
      return { ...result, action };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['petition-workflows'] });
      toast({
        title: result.action === 'suspend' ? 'Prazo suspenso' : 'Prazo retomado',
        description: result.action === 'suspend'
          ? 'Esta etapa não será cobrada enquanto estiver suspensa.'
          : 'A contagem do prazo foi reiniciada a partir de agora.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao alterar prazo', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      description: newDescription
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
    const prompts: Record<string, {
      title: string;
      text: string;
      image?: string;
    }[]> = {
      "Triagem inicial": [],
      "Organização e nomeação dos documentos [Gemini]": [],
      "Análise documental e Resumo [NotebookLM]": [{ title: "Análise Documental Jurídica", text: "**Entrada mínima:**\n```\n/analise-documental-juridica\n\nRepresentamos: [PARTE]\nAnalise todos os documentos deste caso.\nContexto adicional: [SE NECESSÁRIO]\n```" }],
      "Tese temática (Sonnet)": [{"title":"Consumidor e Bancário","text": "**Entrada mínima:**\n```\n/consumidor-e-bancario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Produto/serviço afetado]\n```"},{"title":"Contratual e Obrigações","text": "**Entrada mínima:**\n```\n/contratual-e-obrigacoes\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Contrato analisado]\n```"},{"title":"Direito do Trabalho","text": "**Entrada mínima:**\n```\n/direito-do-trabalho\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Relação de trabalho em questão]\n```"},{"title":"Imobiliário","text": "**Entrada mínima:**\n```\n/imobiliario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Imóvel/Matrícula em questão]\n```"},{"title":"Previdenciário","text": "**Entrada mínima:**\n```\n/previdenciario\n\nRepresentamos: [PARTE]\nObjetivo: [OBJETIVO]\n[Benefício pleiteado]\n```"}],
      "Questões pendentes": [],
      "Tese jurídica (Opus)": [{ title: "Tese Jurídica (Geral)", text: "**Entrada mínima:**\n```\n/tese-juridica\n\nRepresentamos: [PARTE].\nObjetivo material: [OBJETIVO]\nUtilize a análise documental anterior e os documentos originais.\n```" }],
      "Viabilidade (Claude)": [{
        title: "Proposta de honorários",
        text: "**Entrada mínima:**\n```\n/proposta-honorarios\n\nCliente: [CLIENTE]\nObjeto: [SERVIÇO]\nHonorários pretendidos: [VALOR OU MODELO]\n```"
      }],
      "Proposta de honorários": [
  {
    title: "Proposta de honorários",
    text: `### PAPEL

Você é um Especialista em Automação de Documentos Jurídicos, com foco exclusivo no preenchimento fiel de modelos de Proposta de Honorários Advocatícios, Contrato de Honorários Advocatícios ou documentos equivalentes.

Sua função é receber um modelo em DOCX ou PDF e preenchê-lo exclusivamente com os dados fornecidos pelo usuário no chat, preservando integralmente o conteúdo, a estrutura, a formatação e a redação original do documento.

---

### TAREFA/ATIVIDADE

Você deverá:

1. Ler o modelo de honorários anexado pelo usuário, seja ele um arquivo DOCX ou PDF.
2. Identificar os marcadores, campos, espaços em branco ou trechos equivalentes destinados ao preenchimento de informações variáveis, como:
   - Nome do cliente;
   - CPF ou CNPJ;
   - RG;
   - Estado civil;
   - Profissão;
   - Endereço;
   - E-mail;
   - Telefone;
   - Objeto da contratação;
   - Valor dos honorários;
   - Forma de pagamento;
   - Percentual de êxito, se houver;
   - Dados do advogado ou sociedade de advocacia;
   - Local e data;
   - Demais dados expressamente existentes no modelo.
3. Substituir apenas os campos correspondentes pelos dados fornecidos pelo usuário no chat.
4. Gerar um novo arquivo preenchido, mantendo o modelo original intacto.

---

### CONTEXTO

O documento a ser preenchido é um modelo jurídico de honorários advocatícios. Ele pode ter a natureza de proposta, contrato, termo de aceite ou instrumento semelhante.

O usuário fornecerá os dados no chat, por exemplo:

“Vou preencher uma proposta de honorários.  
Nome: João da Silva  
CPF: 000.000.000-00  
Endereço: Rua X, nº 100  
Valor dos honorários: R$ 5.000,00  
Forma de pagamento: 5 parcelas de R$ 1.000,00”

Você deve usar exclusivamente essas informações.

É proibido inventar, complementar, presumir ou corrigir dados não informados.

---

### RACIOCÍNIO

Antes de gerar o arquivo final, analise cuidadosamente o modelo para identificar todos os campos variáveis.

Você deve agir com máxima fidelidade documental. O texto padrão do modelo é imutável.

Regras obrigatórias:

- Não altere cláusulas.
- Não reescreva frases.
- Não resuma trechos.
- Não adicione novas disposições.
- Não remova palavras, pontuação, numeração, títulos, cabeçalhos, rodapés ou assinaturas.
- Não modifique a ordem do documento.
- Não altere a formatação original.
- Não corrija juridicamente o modelo, ainda que encontre trechos que poderiam ser melhorados.
- Não padronize linguagem por iniciativa própria.
- Não substitua dados por aproximação.
- Não crie informações ausentes.

Apenas localize os campos de preenchimento e substitua-os pelos dados correspondentes fornecidos no chat.

Atenção especial deve ser dada a campos de valores, percentuais, datas, forma de pagamento, partes contratantes e objeto dos serviços advocatícios.

Se algum dado necessário para o preenchimento não for fornecido, mantenha o marcador original ou deixe o espaço em branco, conforme o formato do modelo, e informe ao usuário quais dados ficaram pendentes.

Você também deve analisar o documento quanto à padronização de gênero. Caso o modelo contenha expressões como “contratante”, “contratado”, “cliente”, “advogado”, “outorgante” ou similares, verifique se a redação original já contempla masculino e feminino quando aplicável, como “o(a) contratante”. Entretanto, você não deve alterar o texto do modelo por conta própria. Apenas informe ao usuário, na entrega, se identificou inconsistências de gênero no texto original.

---

### FORMATO DE SAÍDA

Após preencher o documento, entregue:

1. Um arquivo final preenchido em formato compatível com o modelo original, preferencialmente:
   - DOCX preenchido quando o modelo original for DOCX;
   - PDF preenchido quando o modelo original for PDF com campos editáveis;
   - DOCX convertido ou reconstruído apenas se tecnicamente necessário e sem alteração voluntária do conteúdo.
2. Um link ou botão para download do arquivo final.
3. Um breve relatório de preenchimento contendo:
   - Campos preenchidos;
   - Campos ausentes ou mantidos em branco;
   - Observação sobre padronização de gênero, se houver;
   - Confirmação de que nenhuma cláusula foi alterada.

Sempre que possível, utilize Python e bibliotecas apropriadas, como \`python-docx\` para arquivos DOCX e \`pypdf\` ou equivalente para PDFs com campos preenchíveis.

Todo texto inserido deve manter a mesma fonte, tamanho, estilo e formatação do trecho substituído no modelo original.

---

### CONDIÇÕES FINAIS

A resposta será considerada adequada somente se:

- O documento final preservar fielmente o modelo original.
- Apenas os campos indicados forem preenchidos.
- Nenhuma cláusula, palavra, pontuação ou formatação do modelo for alterada indevidamente.
- Nenhum dado for inventado.
- Os dados fornecidos pelo usuário forem inseridos corretamente.
- Os campos sem informação forem mantidos em branco ou preservados no formato original.
- O arquivo final for disponibilizado para download.
- Eventuais pendências forem informadas de forma objetiva.`
  }],
      "Elaborar contrato, procuração e declaração": [
  {
    title: "Procuração",
    text: `### PAPEL

Você é um Especialista em Automação de Documentos Jurídicos, com atuação exclusiva no preenchimento fiel de modelos de Procuração, sejam eles judiciais, extrajudiciais, ad judicia, ad judicia et extra ou instrumentos semelhantes.

Sua função é receber um modelo de procuração em DOCX ou PDF e preenchê-lo exclusivamente com os dados fornecidos pelo usuário no chat, sem alterar qualquer outra parte do documento.

---

### TAREFA/ATIVIDADE

Você deverá:

1. Ler integralmente o modelo de procuração anexado pelo usuário.
2. Identificar os marcadores, campos ou espaços destinados ao preenchimento de dados variáveis, tais como:
   - Nome do outorgante;
   - Nacionalidade;
   - Estado civil;
   - Profissão;
   - RG;
   - CPF;
   - CNPJ, se pessoa jurídica;
   - Endereço completo;
   - E-mail;
   - Telefone;
   - Nome do representante legal, quando aplicável;
   - Nome do advogado ou procurador;
   - OAB;
   - Endereço profissional;
   - Poderes específicos;
   - Finalidade da procuração;
   - Foro, processo ou órgão de destino, quando houver;
   - Local e data.
3. Substituir somente os campos correspondentes pelas informações expressamente fornecidas pelo usuário.
4. Gerar o arquivo final preenchido, preservando o modelo original.

---

### CONTEXTO

O documento a ser preenchido é uma procuração jurídica. A procuração pode conter poderes gerais ou específicos, cláusulas de representação judicial ou extrajudicial, dados de outorgante e outorgado, poderes para foro em geral, poderes especiais e campos de assinatura.

O usuário fornecerá os dados no chat, por exemplo:

“Vou preencher uma procuração.  
Outorgante: Maria de Souza  
CPF: 000.000.000-00  
RG: 00.000.000  
Estado civil: solteira  
Profissão: empresária  
Endereço: Rua X, nº 100  
Advogado: Dr. João Pereira  
OAB: 00000/UF”

Você deve utilizar exclusivamente os dados fornecidos pelo usuário.

É proibido presumir poderes, complementar qualificações ou inserir dados não enviados.

---

### RACIOCÍNIO

Antes de preencher o arquivo, analise o modelo para localizar todos os campos variáveis.

O texto padrão da procuração é imutável.

Regras obrigatórias:

- Não altere os poderes previstos no modelo.
- Não adicione poderes especiais não existentes.
- Não remova poderes.
- Não reescreva cláusulas.
- Não modifique expressões jurídicas.
- Não altere pontuação, numeração, títulos, cabeçalhos, rodapés ou assinaturas.
- Não corrija o texto da procuração por iniciativa própria.
- Não acrescente qualificações não informadas.
- Não invente dados de advogado, OAB, parte, processo, órgão ou endereço.

Apenas substitua os campos existentes pelos dados enviados.

Se algum dado necessário estiver ausente, mantenha o marcador original ou o campo em branco e informe a pendência ao usuário ao entregar o arquivo.

Atenção especial deve ser dada à coerência entre outorgante, outorgado, poderes, dados de identificação, gênero gramatical e campos de assinatura.

Você deve analisar a padronização de gênero no documento. Caso o modelo contenha expressões como “outorgante”, “outorgado”, “procurador”, “advogado”, “representante” ou equivalentes, verifique se a redação original contempla masculino e feminino quando necessário, como “outorgante” em forma neutra ou “o(a) outorgante”. Entretanto, não altere o texto original do modelo. Apenas informe eventual inconsistência na entrega.

---

### FORMATO DE SAÍDA

Após o preenchimento, entregue:

1. O arquivo final preenchido para download.
2. Um breve relatório contendo:
   - Dados inseridos;
   - Campos que permaneceram em branco ou sem alteração por falta de informação;
   - Observação sobre padronização de gênero, se aplicável;
   - Confirmação de que os poderes e demais cláusulas foram preservados sem alteração.

Utilize Python e bibliotecas adequadas, como \`python-docx\` para DOCX e \`pypdf\` ou equivalente para PDF preenchível.

Todo texto inserido deve manter a fonte, tamanho, estilo, espaçamento e formatação do trecho original substituído.

---

### CONDIÇÕES FINAIS

A resposta será considerada correta somente se:

- A procuração final estiver preenchida exclusivamente com os dados enviados pelo usuário.
- Nenhum poder tiver sido criado, removido ou modificado.
- O modelo original tiver sido preservado integralmente.
- Nenhuma informação tiver sido inventada.
- Os campos pendentes forem claramente informados.
- O arquivo final estiver disponível para download.`
  },
  {
    title: "Contrato",
    text: `### PAPEL

Você é um Especialista em Automação de Documentos Jurídicos, com foco exclusivo no preenchimento fiel de modelos de Contrato.

Sua função é receber um contrato modelo em DOCX ou PDF e preenchê-lo apenas com os dados fornecidos pelo usuário no chat, preservando integralmente o conteúdo jurídico, a redação, a estrutura e a formatação original do documento.

---

### TAREFA/ATIVIDADE

Você deverá:

1. Ler integralmente o modelo de contrato anexado pelo usuário.
2. Identificar os marcadores, campos ou espaços destinados a informações variáveis, como:
   - Nome das partes;
   - CPF ou CNPJ;
   - RG;
   - Nacionalidade;
   - Estado civil;
   - Profissão;
   - Endereço;
   - E-mail;
   - Telefone;
   - Objeto do contrato;
   - Valor;
   - Forma de pagamento;
   - Prazos;
   - Datas;
   - Foro;
   - Dados de representantes legais;
   - Dados de testemunhas;
   - Local e data de assinatura;
   - Demais campos expressamente existentes no modelo.
3. Substituir exclusivamente os campos correspondentes pelos dados informados no chat.
4. Gerar o arquivo final preenchido, mantendo o modelo original intacto.

---

### CONTEXTO

O documento a ser preenchido é um contrato jurídico. Ele pode envolver prestação de serviços, honorários, compra e venda, parceria, consultoria, locação ou qualquer outra relação contratual.

O usuário fornecerá os dados necessários no chat, por exemplo:

“Vou preencher um contrato.  
Contratante: João da Silva  
CPF: 000.000.000-00  
Endereço: Rua X, nº 100  
Contratada: Empresa Y Ltda.  
CNPJ: 00.000.000/0001-00  
Objeto: prestação de serviços jurídicos  
Valor: R$ 10.000,00  
Foro: Comarca de São Paulo/SP”

Você deve utilizar exclusivamente os dados fornecidos.

É proibido interpretar a intenção das partes para alterar cláusulas, complementar obrigações ou inserir previsões não existentes no modelo.

---

### RACIOCÍNIO

Antes de preencher, analise o contrato completo para localizar todos os campos variáveis.

O texto padrão do contrato é imutável.

Regras obrigatórias:

- Não altere cláusulas contratuais.
- Não reescreva obrigações.
- Não adicione direitos, deveres, penalidades ou condições.
- Não remova trechos.
- Não modifique valores por cálculo próprio.
- Não altere prazos.
- Não corrija redação jurídica.
- Não mude foro, objeto, qualificação ou forma de pagamento sem dado expresso do usuário.
- Não altere cabeçalhos, rodapés, numeração, títulos, assinaturas ou testemunhas.
- Não modifique pontuação ou formatação.
- Não invente dados ausentes.

Apenas substitua os marcadores ou espaços correspondentes pelos dados fornecidos.

Se algum dado necessário ao preenchimento não for informado, mantenha o marcador original ou deixe o campo em branco, conforme o formato do modelo, e comunique a pendência na entrega.

Atenção especial deve ser dada à correspondência correta entre as partes, como contratante, contratado, contratada, prestador, tomador, comprador, vendedor, cliente, advogado, empresa ou representante legal.

Você deve analisar a padronização de gênero do contrato. Caso o texto original use expressões como “contratante”, “contratado”, “contratada”, “prestador”, “cliente” ou similares, verifique se o documento trata adequadamente masculino e feminino, como “o(a) contratante” quando necessário. Contudo, não altere o texto original por conta própria. Apenas informe eventual inconsistência ao usuário.

---

### FORMATO DE SAÍDA

Após o preenchimento, entregue:

1. O arquivo final preenchido para download.
2. Um breve relatório de conferência contendo:
   - Campos preenchidos;
   - Campos não preenchidos por ausência de dados;
   - Observação sobre gênero, quando houver;
   - Confirmação de que nenhuma cláusula contratual foi alterada;
   - Confirmação de que nenhum dado foi inventado.

Utilize Python e bibliotecas adequadas, como \`python-docx\` para arquivos DOCX e \`pypdf\` ou equivalente para PDFs com campos editáveis.

Todo texto inserido deve manter a mesma fonte, tamanho, estilo, espaçamento e formatação do trecho substituído no modelo original.

---

### CONDIÇÕES FINAIS

A resposta será considerada de alta qualidade somente se:

- O contrato preenchido estiver fiel ao modelo original.
- Apenas os campos variáveis tiverem sido substituídos.
- Nenhuma cláusula tiver sido alterada.
- Nenhum dado tiver sido presumido ou inventado.
- A formatação original tiver sido preservada.
- Campos ausentes forem informados objetivamente.
- O arquivo final estiver disponível para download.`
  },
  {
    title: "Declaração de hipossuficiência",
    text: `### PAPEL

Você é um Especialista em Automação de Documentos Jurídicos, com foco exclusivo no preenchimento fiel de modelos de Declaração de Hipossuficiência, Declaração de Pobreza, Declaração de Insuficiência Econômica ou documentos equivalentes.

Sua função é receber um modelo em DOCX ou PDF e preenchê-lo exclusivamente com os dados fornecidos pelo usuário no chat, sem alterar o conteúdo jurídico, a redação, a estrutura ou a formatação original do documento.

---

### TAREFA/ATIVIDADE

Você deverá:

1. Ler integralmente o modelo de Declaração de Hipossuficiência anexado pelo usuário.
2. Identificar os marcadores, campos ou espaços destinados ao preenchimento de informações variáveis, como:
   - Nome do declarante;
   - Nacionalidade;
   - Estado civil;
   - Profissão;
   - RG;
   - CPF;
   - Endereço completo;
   - E-mail;
   - Telefone;
   - Número do processo, se houver;
   - Vara, comarca ou órgão, se houver;
   - Nome da parte contrária, se houver;
   - Local e data;
   - Assinatura ou campo correspondente.
3. Substituir apenas os campos correspondentes pelos dados fornecidos pelo usuário.
4. Gerar o arquivo final preenchido, mantendo o modelo original intacto.

---

### CONTEXTO

O documento a ser preenchido é uma declaração de hipossuficiência econômica. Ele pode ser utilizado para instruir pedido de gratuidade da justiça ou finalidade semelhante.

O usuário fornecerá os dados no chat, por exemplo:

“Vou preencher uma declaração de hipossuficiência.  
Nome: Maria da Silva  
CPF: 000.000.000-00  
RG: 00.000.000  
Estado civil: solteira  
Profissão: autônoma  
Endereço: Rua X, nº 100  
Processo: 0000000-00.0000.0.00.0000  
Comarca: Campo Grande/MS”

Você deve utilizar exclusivamente as informações fornecidas.

É proibido presumir condição econômica, renda, dependentes, despesas, situação familiar, número de processo, comarca ou qualquer outro dado não informado.

---

### RACIOCÍNIO

Antes de preencher o arquivo, analise cuidadosamente o modelo para identificar todos os campos variáveis.

O texto padrão da declaração é imutável.

Regras obrigatórias:

- Não altere o teor da declaração.
- Não acrescente justificativas econômicas.
- Não insira informações sobre renda, bens, despesas ou dependentes se o usuário não tiver fornecido expressamente.
- Não modifique a fundamentação jurídica, se houver.
- Não reescreva frases.
- Não resuma o documento.
- Não remova trechos.
- Não altere pontuação, títulos, cabeçalhos, rodapés, assinaturas ou formatação.
- Não corrija juridicamente o modelo.
- Não invente dados ausentes.

Apenas substitua os campos existentes pelos dados enviados no chat.

Se algum dado necessário estiver ausente, mantenha o marcador original ou deixe o espaço em branco, conforme o modelo, e informe a pendência na entrega.

Atenção especial deve ser dada aos dados pessoais do declarante, local, data, processo, comarca e órgão judicial, quando existirem no modelo.

Você deve analisar a padronização de gênero no documento. Caso o texto original contenha expressões como “declarante”, “autor”, “requerente”, “beneficiário”, “hipossuficiente” ou equivalentes, verifique se há coerência com os dados fornecidos e se o modelo contempla masculino e feminino quando necessário. Contudo, não altere o texto original por conta própria. Apenas informe eventual inconsistência ao usuário.

---

### FORMATO DE SAÍDA

Após o preenchimento, entregue:

1. O arquivo final preenchido para download.
2. Um breve relatório contendo:
   - Campos preenchidos;
   - Campos mantidos em branco ou com marcador original por falta de informação;
   - Observação sobre padronização de gênero, se houver;
   - Confirmação de que o texto padrão da declaração foi preservado;
   - Confirmação de que nenhum dado foi inventado.

Utilize Python e bibliotecas adequadas, como \`python-docx\` para DOCX e \`pypdf\` ou equivalente para PDF preenchível.

Todo texto inserido deve manter a mesma fonte, tamanho, estilo, espaçamento e formatação do trecho substituído no modelo original.

---

### CONDIÇÕES FINAIS

A resposta será considerada adequada somente se:

- A declaração estiver preenchida exclusivamente com os dados fornecidos.
- O texto original tiver sido integralmente preservado.
- Nenhuma informação econômica tiver sido presumida.
- Nenhum dado ausente tiver sido inventado.
- A formatação original tiver sido mantida.
- As pendências forem informadas de forma clara.
- O arquivo final estiver disponível para download.`
  }
],
                  "Elaborar petição (Claude)": [{ title: "Petição Inicial", image: "/objetivo-processual.png", text: "**Entrada mínima:**\n```\n/peticao-inicial\n\nContratação formalizada.\n\nRepresentamos: [NOME DA PARTE AUTORA].\n\nObjetivo processual:\n[INFORMAR O PROVIMENTO JURISDICIONAL PRETENDIDO].\n\nUtilize automaticamente a tese jurídica consolidada, os relatórios, resumos, documentos e demais informações deste caso já disponíveis no contexto.\n\nElabore a versão final completa da petição inicial conforme a Skill, preservando integralmente a estratégia jurídica previamente definida.\n\nSe houver informação realmente impeditiva ou questão bloqueante ainda não definida pelo advogado, não crie solução jurídica autônoma. Prossiga até onde for possível e indique o ponto no controle interno antes do protocolo.\n\nContexto adicional:\n[INCLUIR SOMENTE SE HOUVER ORIENTAÇÃO ESPECÍFICA PARA ESTE CASO].\n\n```\n\n" }, { title: "Mandado de Segurança", text: "**Entrada mínima:**\n```\n/mandado-de-seguranca\n\nContratação formalizada.\nImpetrante: [PARTE]\nObjetivo: [OBJETIVO]\nNatureza do ato: [ADMINISTRATIVO / OMISSÃO / JUDICIAL]\n```\nPara ato judicial, acrescentar: `Aplique o protocolo reforçado de excepcionalidade.`\n\n" }, { title: "Execução e Cumprimento", text: "**Entrada mínima:**\n```\n/execucao-e-cumprimento\n\nRepresentamos: [EXEQUENTE / EXECUTADO]\nProcedimento: [cumprimento de sentença / execução de título extrajudicial]\nObjetivo: [OBJETIVO]\n```\nPara pedir apenas auditoria, sem peça: `Modo: auditoria de título e cálculo. Não elabore peça.`\n\n" }],
      "Auditoria (GPT)": [{ title: "Auditoria Pré-Protocolo", text: "**Entrada mínima:**\n```\n/auditoria-pre-protocolo\n\nAudite a versão final desta peça antes do protocolo.\nUtilize os documentos, a tese e as decisões do advogado disponíveis no contexto.\n```\n\n" }]
                            };
    return prompts[stepName] || [];
  };

  const handleOpenPromptModal = (stepName: string) => {
    setSelectedPromptStep(stepName);
    setIsPromptModalOpen(true);
  };

  const handleCompleteStep = (workflowId: string, stepId: string, stepName: string, workflowTitle: string) => {
    setStepNotes("");
    setStepFiles([]);
    setCompletingStep({ workflowId, stepId, stepName, workflowTitle });
  };
  
  const confirmCompleteStep = async () => {
    if (!completingStep) return;

    try {
      setIsCompletingStep(true);
      const attachments: PetitionStepAttachment[] = await Promise.all(stepFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(
          `/api/petition-workflows/${completingStep.workflowId}/steps/${completingStep.stepId}/attachments`,
          { method: 'POST', body: formData }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Falha ao enviar ${file.name}`);
        return { name: file.name, url: result.url, type: file.type || 'application/octet-stream', size: file.size };
      }));

      if (processNumber && completingStep.stepName.includes("Protocolo")) {
        await apiClient.updatePetitionWorkflow(completingStep.workflowId, { title: `${completingStep.workflowTitle} - Proc: ${processNumber}` });
      }

      await updateStepMutation.mutateAsync({
        workflowId: completingStep.workflowId,
        stepId: completingStep.stepId,
        data: {
          status: 'Concluída',
          notes: serializePetitionStepData({ observations: stepNotes, attachments })
        }
      });
      setCompletingStep(null);
      setProcessNumber("");
      setStepFiles([]);
    } catch (error: any) {
      toast({ title: "Erro ao concluir etapa", description: error.message, variant: "destructive" });
    } finally {
      setIsCompletingStep(false);
    }
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="flex items-center gap-1.5 text-xs text-brand-gray">
          <Clock className="h-3.5 w-3.5" /> Atualização automática a cada 5 segundos
        </span>
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
                <TableHead className="text-brand-black font-semibold">Etapa Atual</TableHead>
                <TableHead className="text-brand-black font-semibold min-w-[200px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-brand-gray">
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
                      <TableCell className="font-semibold text-brand-black relative group">
                        <div>
                          <div className="flex items-center gap-2">
                            {workflow.title}
                            {workflow.title.includes(' - Proc: ') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copiar número do processo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const parts = workflow.title.split(' - Proc: ');
                                  if (parts.length > 1) {
                                    navigator.clipboard.writeText(parts[1].trim());
                                    toast({ title: "Copiado!", description: "Número do processo copiado para a área de transferência." });
                                  }
                                }}
                              >
                                <Copy className="w-3 h-3 text-brand-gray" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-brand-gray hover:bg-brand-light/50 hover:text-brand"
                              title="Ver descrição completa"
                              aria-label={`Ver detalhes da petição ${workflow.title}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPetition(workflow);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-brand-gray hover:bg-brand-light/50 hover:text-brand"
                              title="Editar descrição da petição"
                              aria-label={`Editar descrição da petição ${workflow.title}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingPetition({
                                  id: workflow.id,
                                  title: workflow.title,
                                  description: workflow.description || ''
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                          {workflow.description && (
                            <p className="mt-1 max-w-md whitespace-pre-line text-xs font-normal text-brand-gray line-clamp-3">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {workflow.status === 'Concluída' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluída</Badge>
                        ) : workflow.status === 'Suspensa' ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                            <Pause className="mr-1 h-3.5 w-3.5" /> Prazo suspenso
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium text-brand">Etapa {workflow.current_step}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-brand-light/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (workflow.current_step / Math.max(...(workflow.steps || []).map((step: any) => step.step_number), BASE_WORKFLOW_STEPS)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-brand-gray font-medium w-8">
                            {workflow.current_step}/{Math.max(...(workflow.steps || []).map((step: any) => step.step_number), BASE_WORKFLOW_STEPS)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* EXPANDED TIMELINE */}
                    {expandedWorkflowId === workflow.id && (
                      <TableRow className="bg-brand-light/5 hover:bg-brand-light/5">
                        <TableCell colSpan={4} className="p-0 border-b border-brand-gray/10">
                          <div className="p-8 max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-brand-gray/15">
                              <div className="space-y-1">
                                <h4 className="font-serif text-xl text-brand-black">Linha do Tempo da Petição</h4>
                                {workflow.description ? (
                                  <p className="text-xs text-brand-gray whitespace-pre-wrap max-w-2xl leading-relaxed">
                                    {workflow.description}
                                  </p>
                                ) : (
                                  <p className="text-xs text-brand-gray/60 italic">
                                    Nenhuma descrição cadastrada.
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPetition({
                                  id: workflow.id,
                                  title: workflow.title,
                                  description: workflow.description || ''
                                })}
                                className="border-brand-gray/30 text-brand hover:bg-brand-light/50 shrink-0 self-start text-xs h-8"
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar Descrição
                              </Button>
                            </div>
                            <div className="space-y-0">
                              {(workflow.steps ? [...workflow.steps].sort((a: any, b: any) => a.step_number - b.step_number) : []).map((step: any, index: number) => {
                                const isCompleted = step.status === 'Concluída';
                                const isCurrent = step.step_number === workflow.current_step && workflow.status !== 'Concluída';
                                const isPending = !isCompleted && !isCurrent;
                                const suspensionInfo = parsePetitionStepSuspension(step.notes);
                                const isSuspended = isPetitionStepSuspended(step.notes);
                                const visibleStepNotes = getVisiblePetitionStepNotes(step.notes);
                                const returnInfo = parseStepReturnInfo(visibleStepNotes);
                                const stepData = parsePetitionStepData(returnInfo ? null : visibleStepNotes);
                                
                                return (
                                  <div key={step.id} className={`relative pl-8 pb-6 border-l-2 ${
                                    isCompleted ? 'border-green-500' :
                                    isSuspended ? 'border-amber-500' :
                                    isCurrent ? 'border-brand' :
                                    'border-brand-gray/30'
                                  }`}>
                                    {/* Circle indicator */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                                      isCompleted ? 'bg-green-500 border-green-500' :
                                      isSuspended ? 'bg-amber-500 border-amber-500' :
                                      isCurrent ? 'bg-brand border-brand animate-pulse' :
                                      'bg-white border-brand-gray/30'
                                    }`} />
                                    
                                    {/* Step content */}
                                    <div className={`ml-4 p-4 rounded-md shadow-sm transition-all ${
                                      isCompleted ? 'bg-green-50/50 border border-green-100' :
                                      isSuspended ? 'border border-amber-300 bg-amber-50/60 ring-1 ring-amber-100' :
                                      isCurrent ? 'bg-white border border-brand ring-1 ring-brand/10' :
                                      'bg-white border border-brand-gray/20 opacity-70'
                                    }`}>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className={`font-bold ${
                                              isCompleted ? 'text-green-800' :
                                              isSuspended ? 'text-amber-900' :
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
                                            {isSuspended && suspensionInfo && (
                                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                                <Pause className="mr-1 h-3 w-3" /> Prazo suspenso
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="mt-2 text-xs text-brand-gray flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            <span>
                                              Responsável: <span className="font-medium text-brand-black">{step.assigned_user?.name || 'Não atribuído'}</span>
                                            </span>
                                          </div>
                                          {isSuspended && suspensionInfo && (
                                            <p className="mt-2 text-xs font-medium text-amber-800">
                                              Suspenso em {format(new Date(suspensionInfo.suspendedAt), "dd/MM/yyyy HH:mm")}. O prazo não será cobrado até a retomada.
                                            </p>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          {isCurrent && !isSuspended && returnInfo && step.assigned_to === user?.id && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 border-orange-200 bg-orange-50/50 px-2 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                              onClick={() => setViewingReturnInfo(returnInfo)}
                                            >
                                              <MessageSquareWarning className="mr-1.5 h-4 w-4" />
                                              Ver retorno
                                            </Button>
                                          )}

                                          {getClaudePrompts(step.step_name).length > 0 && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 bg-blue-50/50"
                                            onClick={() => handleOpenPromptModal(step.step_name)}
                                          >
                                            {isGptPromptStep(step.step_name) ? "Comando GPT" : "Comando skill"}
                                          </Button>
                                          )}

                                          {isCurrent && !isSuspended && step.assigned_to === user?.id && step.step_number > 1 && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 w-8 p-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 bg-red-50/50"
                                              title="Voltar para a etapa anterior"
                                              aria-label={`Voltar da etapa ${step.step_number} para a etapa anterior`}
                                              onClick={() => {
                                                setReturningStep({
                                                  workflowId: workflow.id,
                                                  stepId: step.id,
                                                  stepNumber: step.step_number,
                                                  stepName: step.step_name
                                                });
                                                setReturnReason("");
                                                setReturnObservations("");
                                              }}
                                            >
                                              <Undo2 className="h-4 w-4" />
                                            </Button>
                                          )}

                                          {isCurrent && !isSuspended && (
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="h-8 w-8 p-0 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 bg-amber-50/50"
                                              title="Reportar problemática"
                                              aria-label={`Reportar problemática na etapa ${step.step_number}: ${step.step_name}`}
                                              onClick={() => {
                                                setProblemWorkflowId(workflow.id);
                                                setProblemStepNumber(step.step_number);
                                                setIsProblemModalOpen(true);
                                              }}
                                            >
                                              <AlertCircle className="h-4 w-4" />
                                            </Button>
                                          )}

                                          {isCurrent && step.step_name === 'Questões pendentes' && (step.assigned_to === user?.id || user?.role === 'admin') && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={suspensionMutation.isPending}
                                              className={isSuspended
                                                ? "h-8 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                                : "h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                                              }
                                              onClick={() => suspensionMutation.mutate({
                                                workflowId: workflow.id,
                                                stepId: step.id,
                                                action: isSuspended ? 'resume' : 'suspend',
                                              })}
                                            >
                                              {suspensionMutation.isPending ? (
                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                              ) : isSuspended ? (
                                                <Play className="mr-1.5 h-4 w-4" />
                                              ) : (
                                                <Pause className="mr-1.5 h-4 w-4" />
                                              )}
                                              {isSuspended ? 'Retomar prazo' : 'Suspender prazo'}
                                            </Button>
                                          )}

                                          
                                          {isCurrent && !isSuspended && step.assigned_to === user?.id && (
                                            <Button 
                                              size="sm" 
                                              onClick={() => handleCompleteStep(workflow.id, step.id, step.step_name, workflow.title)}
                                              disabled={updateStepMutation.isPending}
                                              className="bg-brand text-white hover:bg-brand/90"
                                            >
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              Concluir Etapa
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {!returnInfo && (stepData.observations || stepData.attachments.length > 0) && (
                                        <div className="mt-3 space-y-3 rounded-md border border-brand-gray/20 bg-brand-light/20 p-3 text-sm text-brand-black">
                                          {stepData.observations && (
                                            <div>
                                              <span className="mb-1 block font-semibold text-brand-sage">Observação:</span>
                                              <p className="whitespace-pre-wrap">{stepData.observations}</p>
                                            </div>
                                          )}
                                          {stepData.attachments.length > 0 && (
                                            <div>
                                              <span className="mb-2 block font-semibold text-brand-sage">Anexos:</span>
                                              <div className="flex flex-wrap gap-2">
                                                {stepData.attachments.map((attachment, attachmentIndex) => (
                                                  <a
                                                    key={`${attachment.url}-${attachmentIndex}`}
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded border border-brand-gray/20 bg-white px-2.5 py-1.5 text-xs text-brand hover:border-brand hover:underline"
                                                  >
                                                    <Download className="h-3.5 w-3.5" />
                                                    {attachment.name}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
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

      <Dialog open={!!selectedPetition} onOpenChange={(open) => !open && setSelectedPetition(null)}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-brand-black border-b border-brand-gray/20 pb-4">
              Detalhes da Petição
            </DialogTitle>
          </DialogHeader>
          {selectedPetition && (
            <div className="space-y-5 py-3">
              <div className="space-y-1">
                <Label className="text-brand-gray">Nome</Label>
                <p className="font-semibold text-brand-black">{selectedPetition.title}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-brand-gray">Descrição</Label>
                <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-brand-gray/20 bg-brand-light/10 p-4 text-sm leading-relaxed text-brand-black">
                  {selectedPetition.description || 'Nenhuma descrição fornecida.'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {selectedPetition && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPetition({
                    id: selectedPetition.id,
                    title: selectedPetition.title,
                    description: selectedPetition.description || ''
                  });
                  setSelectedPetition(null);
                }}
                className="border-brand text-brand hover:bg-brand/10"
              >
                <Pencil className="mr-2 h-4 w-4" /> Editar Descrição
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedPetition(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Descrição da Petição */}
      <Dialog open={!!editingPetition} onOpenChange={(open) => !open && setEditingPetition(null)}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-brand-black border-b border-brand-gray/20 pb-4">
              Editar Descrição da Petição
            </DialogTitle>
          </DialogHeader>
          {editingPetition && (
            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <Label className="text-brand-gray text-xs">Petições / Workflow</Label>
                <p className="font-semibold text-brand-black text-sm">{editingPetition.title}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-petition-description">Descrição</Label>
                <Textarea
                  id="edit-petition-description"
                  value={editingPetition.description}
                  onChange={(e) => setEditingPetition({ ...editingPetition, description: e.target.value })}
                  placeholder="Insira a descrição ou orientações sobre esta petição..."
                  className="min-h-[200px] resize-y font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-brand-gray/20 pt-4">
            <Button variant="outline" onClick={() => setEditingPetition(null)}>Cancelar</Button>
            <Button
              onClick={handleSaveDescription}
              disabled={updateWorkflowMutation.isPending}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {updateWorkflowMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="petition-description">Descrição</Label>
              <Textarea
                id="petition-description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="min-h-[130px] resize-y"
              />
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

      <Dialog open={!!completingStep} onOpenChange={(open) => {
        if (!open && !isCompletingStep) {
          setCompletingStep(null);
          setStepFiles([]);
        }
      }}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-brand-black">Concluir Etapa</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Tabs defaultValue="observations" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="observations">Observações</TabsTrigger>
                <TabsTrigger value="attachments" className="gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos {stepFiles.length > 0 && `(${stepFiles.length})`}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="observations" className="mt-4 space-y-2">
                <Label htmlFor="step-observations">Observações (opcional)</Label>
                <Textarea
                  id="step-observations"
                  className="min-h-32 resize-y"
                  placeholder="Deixe uma observação para a próxima pessoa..."
                  value={stepNotes}
                  onChange={(event) => setStepNotes(event.target.value)}
                />
              </TabsContent>
              <TabsContent value="attachments" className="mt-4 space-y-4">
                <div className="rounded-md border-2 border-dashed border-brand-gray/30 p-4 text-center">
                  <Paperclip className="mx-auto mb-2 h-6 w-6 text-brand-gray" />
                  <Label htmlFor="step-attachments" className="cursor-pointer text-sm text-brand hover:underline">
                    Selecionar arquivos
                  </Label>
                  <Input
                    id="step-attachments"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const selectedFiles = Array.from(event.target.files || []);
                      setStepFiles(current => [...current, ...selectedFiles]);
                      event.target.value = '';
                    }}
                  />
                  <p className="mt-1 text-xs text-brand-gray">Até 25 MB por arquivo.</p>
                </div>
                {stepFiles.length > 0 && (
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {stepFiles.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded border border-brand-gray/20 bg-brand-light/10 p-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-brand-black">{file.name}</p>
                          <p className="text-xs text-brand-gray">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0 text-red-600"
                          onClick={() => setStepFiles(current => current.filter((_, fileIndex) => fileIndex !== index))}
                          aria-label={`Remover ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCompletingStep(null)} disabled={isCompletingStep} className="border-brand-gray text-brand-gray hover:bg-brand-gray/10">
                Cancelar
              </Button>
              <Button onClick={confirmCompleteStep} disabled={isCompletingStep} className="bg-brand text-white hover:bg-brand/90">
                {isCompletingStep && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCompletingStep ? 'Enviando anexos...' : 'Confirmar e Avançar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returningStep} onOpenChange={(open) => !open && setReturningStep(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-serif text-red-700">
              <Undo2 className="h-5 w-5" />
              Voltar etapa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {returningStep && (
              <p className="text-sm text-brand-gray">
                A etapa {returningStep.stepNumber - 1} será reaberta e devolvida ao responsável anterior.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="return-reason">Motivo *</Label>
              <Input
                id="return-reason"
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                placeholder="Ex: Informação incompleta, documento incorreto..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-observations">Observações</Label>
              <Textarea
                id="return-observations"
                value={returnObservations}
                onChange={(event) => setReturnObservations(event.target.value)}
                rows={4}
                placeholder="Detalhe o que precisa ser corrigido ou complementado..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturningStep(null)}>Cancelar</Button>
            <Button
              className="bg-red-700 text-white hover:bg-red-800"
              disabled={!returnReason.trim() || returnStepMutation.isPending}
              onClick={() => returningStep && returnStepMutation.mutate({
                workflowId: returningStep.workflowId,
                stepId: returningStep.stepId,
                reason: returnReason.trim(),
                observations: returnObservations.trim() || undefined
              })}
            >
              {returnStepMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar retorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReturnInfo} onOpenChange={(open) => !open && setViewingReturnInfo(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-serif text-orange-700">
              <MessageSquareWarning className="h-5 w-5" />
              Motivo do retorno
            </DialogTitle>
          </DialogHeader>
          {viewingReturnInfo && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-brand-gray">Etapa que devolveu</Label>
                <p className="mt-1 text-sm font-medium text-brand-black">
                  Etapa {viewingReturnInfo.fromStepNumber}: {viewingReturnInfo.fromStepName}
                </p>
              </div>
              <div>
                <Label className="text-brand-gray">Motivo</Label>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-orange-200 bg-orange-50/50 p-3 text-sm text-brand-black">
                  {viewingReturnInfo.reason}
                </p>
              </div>
              <div>
                <Label className="text-brand-gray">Observações</Label>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-brand-gray/20 bg-brand-light/10 p-3 text-sm text-brand-black">
                  {viewingReturnInfo.observations || 'Nenhuma observação informada.'}
                </p>
              </div>
              <p className="text-xs text-brand-gray">
                Devolvido por {viewingReturnInfo.returnedBy} em {format(new Date(viewingReturnInfo.returnedAt), "dd/MM/yyyy HH:mm")}.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingReturnInfo(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGptPromptStep(selectedPromptStep) ? "Comandos GPT: " : "Comandos Skill: "}
              {selectedPromptStep?.replace(" [GPT]", "").replace(" [Sonnet]", "").replace(" [NotebookLM]", "")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            {selectedPromptStep && getClaudePrompts(selectedPromptStep).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6 italic">Nenhum comando cadastrado para esta etapa.</p>
            )}
            {selectedPromptStep && getClaudePrompts(selectedPromptStep).map((cmd, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-semibold text-sm text-brand-black">{cmd.title}</h4>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
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

      <Dialog open={isProblemModalOpen} onOpenChange={setIsProblemModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-amber-700 border-b border-amber-200 pb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Reportar Problemática
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Isso criará uma etapa de bloqueio e transferirá a responsabilidade imediatamente para o Dr. Cássio. A tese só poderá ser concluída após a resolução desta problemática.
            </p>
            <div className="space-y-2">
              <Label>Título do Problema</Label>
              <Input 
                value={problemTitle} 
                onChange={e => setProblemTitle(e.target.value)} 
                placeholder="Ex: Documento faltando, Divergência de valor..." 
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição / Observações</Label>
              <Textarea 
                value={problemDesc} 
                onChange={e => setProblemDesc(e.target.value)} 
                rows={4} 
                placeholder="Descreva o que aconteceu..." 
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsProblemModalOpen(false)}>Cancelar</Button>
              <Button 
                onClick={() => reportProblemMutation.mutate()} 
                disabled={!problemTitle || reportProblemMutation.isPending}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {reportProblemMutation.isPending ? "Enviando..." : "Reportar Problemática"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
