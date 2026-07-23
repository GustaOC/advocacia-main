// components/cases-module.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// ADICIONADO O SWITCH
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Eye, Edit, Trash2, Loader2, Briefcase, Filter, Upload, AlertTriangle, Clock, LayoutGrid, List, Star, TrendingUp, DollarSign, Calendar, FileSignature, Handshake, Store, Scale, FileText } from "lucide-react";
import { apiClient, type Entity, type Case } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentsModule } from "@/components/documents-module";

interface ExtendedCase extends Case {
  status_reason?: string | null;
  court?: string | null;
  client_entity_id?: string | number;
  executed_entity_id?: string | number;
  payment_date?: string | null;
  final_value?: number | null;
  agreement_type?: 'Judicial' | 'Extrajudicial' | 'Em Audiência' | 'Pela Loja' | null;
  agreement_value?: number | null;
  installments?: number | null;
  down_payment?: number | null;
  installment_due_date?: string | null;
  // NOVOS CAMPOS ADICIONADOS
  has_alvara?: boolean | null;
  alvara_value?: number | null;
  financial_agreement_id?: number | null;
}

interface CasesModuleProps {
  initialFilters?: { status: string };
}

function CasesStats({ cases }: { cases: ExtendedCase[] }) {
  const stats = [
    { label: "Total de Casos", value: cases.length.toString(), icon: Briefcase, color: "text-brand", bg: "from-blue-50 to-blue-100", trend: "+5%" },
    { label: "Em Andamento", value: cases.filter(c => c.status === 'Em andamento').length.toString(), icon: Clock, color: "text-brand-beige", bg: "from-orange-50 to-orange-100", trend: "+2%" },
    { label: "Acordos", value: cases.filter(c => c.status === 'Acordo').length.toString(), icon: Star, color: "text-green-600", bg: "from-green-50 to-green-100", trend: "+12%" },
    { label: "Alta Prioridade", value: cases.filter(c => c.priority === 'Alta').length.toString(), icon: AlertTriangle, color: "text-red-600", bg: "from-red-50 to-red-100", trend: "-3%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;
        return (
          <Card key={index} className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-0 bg-white relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
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

export function CasesModule({ initialFilters }: CasesModuleProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState(initialFilters?.status || "all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentCase, setCurrentCase] = useState<Partial<ExtendedCase>>({});
    const [selectedCaseForView, setSelectedCaseForView] = useState<ExtendedCase | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    
    const [draggedCase, setDraggedCase] = useState<ExtendedCase | null>(null);

    const { data: casesData, isLoading: isLoadingCases } = useQuery({
        queryKey: ['cases'],
        queryFn: () => apiClient.getCases(),
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });
    const { data: financialAgreements } = useQuery({
        queryKey: ['financialAgreements'],
        queryFn: () => apiClient.getFinancialAgreements(),
    });

    const { data: entitiesData, isLoading: isLoadingEntities } = useQuery({
        queryKey: ['entities'],
        queryFn: () => apiClient.getEntities(),
    });
    console.log(casesData)
    const cases: ExtendedCase[] = useMemo(() => {
        let baseCases: ExtendedCase[] = [];
        if (!casesData) return [];
        if (Array.isArray(casesData)) baseCases = casesData;
        else if ((casesData as any).data && Array.isArray((casesData as any).data)) baseCases = (casesData as any).data;
        else if ((casesData as any).cases && Array.isArray((casesData as any).cases)) baseCases = (casesData as any).cases;
        
        return baseCases.map(c => {
            // Tenta encontrar um acordo financeiro correspondente a este processo
            const agreement = financialAgreements?.find((ag: any) => Number(ag.case_id) === Number(c.id));
            if (agreement && (c.status === 'Acordo' || c.status === 'Pago')) {
                return {
                    ...c,
                    agreement_type: agreement.agreement_type as any,
                    agreement_value: agreement.total_amount,
                    down_payment: agreement.down_payment,
                    installments: agreement.number_of_installments,
                    installment_due_date: agreement.start_date ? String(agreement.start_date).split('T')[0] : null,
                    financial_agreement_id: agreement.id,
                } as ExtendedCase;
            }
            return c;
        });
    }, [casesData, financialAgreements]);

    const allEntities: Entity[] = entitiesData ?? [];
    const isLoading = isLoadingCases || isLoadingEntities;

    const getEntityName = (id: number | string | undefined) => {
        if (!id) return 'Não selecionado';
        const target = String(id);
        const found = allEntities.find(e => String(e.id) === target);
        return found?.name ?? 'Entidade não localizada';
    }

    // CORREÇÃO: A mutação de salvar o caso foi separada da criação do acordo.
    // Esta mutação agora lida apenas com os dados do caso.
    const saveCaseMutation = useMutation({
        mutationFn: (caseData: Partial<ExtendedCase>) => {
            // Remove campos específicos do acordo para não enviá-los para a rota de casos
            const {
                agreement_type, agreement_value, installments, down_payment, installment_due_date,
                ...caseFields
            } = caseData;

            const dataToSave = {
                ...caseFields,
                client_entity_id: caseFields.client_entity_id != null ? String(caseFields.client_entity_id) : undefined,
                executed_entity_id: caseFields.executed_entity_id != null ? String(caseFields.executed_entity_id) : undefined,
                value: caseFields.value ? parseFloat(String(caseFields.value)) : null,
                alvara_value: caseFields.alvara_value ? parseFloat(String(caseFields.alvara_value)) : null,
            };

            return isEditMode
                ? apiClient.updateCase(String(dataToSave.id!), dataToSave)
                : apiClient.createCase(dataToSave);
        },
        // onSuccess e onError são tratados no handleSaveCase para orquestrar as chamadas
    });

    // CORREÇÃO: Nova mutação para criar o acordo financeiro separadamente.
    const createAgreementMutation = useMutation({
        mutationFn: (agreementData: any) => apiClient.createFinancialAgreement(agreementData),
        onError: (error: any) => {
            // Se a criação do acordo falhar, o usuário é notificado. O caso já foi salvo.
            toast({
                title: "Erro ao criar acordo financeiro",
                description: `O caso foi salvo, mas a criação do acordo falhou: ${error.message}`,
                variant: "destructive",
                duration: 10000,
            });
        }
    });

    const updateAgreementMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.updateFinancialAgreement(id, data),
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar acordo financeiro",
                description: `O caso foi salvo, mas a atualização do acordo falhou: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const deleteCaseMutation = useMutation({
        mutationFn: (id: number) => apiClient.deleteCase(String(id)),
        onSuccess: async () => {
            toast({ title: "Processo Excluído", description: "O processo foi excluído com sucesso." });
            await queryClient.invalidateQueries({ queryKey: ['cases'] });
            await queryClient.invalidateQueries({ queryKey: ['financialAgreements'] });
            await queryClient.invalidateQueries({ queryKey: ['monthlyInstallments'] });
            await queryClient.invalidateQueries({ queryKey: ['receivedByMonth'] });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    });

    const updateCaseStatusMutation = useMutation({
        mutationFn: ({ caseId, status }: { caseId: number; status: ExtendedCase['status'] }) => apiClient.updateCase(String(caseId), { status }),
        onSuccess: async () => {
            toast({ title: "Status Atualizado!", description: "O status do caso foi alterado." });
            await queryClient.refetchQueries({ queryKey: ['cases'] });
            await queryClient.refetchQueries({ queryKey: ['financialAgreements'] });
            await queryClient.invalidateQueries({ queryKey: ['monthlyInstallments'] });
            await queryClient.invalidateQueries({ queryKey: ['receivedByMonth'] });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
        },
    });

    const openEditModal = (caseItem: ExtendedCase) => {
        setIsEditMode(true);
        const client = caseItem.case_parties.find(p => p.role === 'Cliente') as any;
        const executed = caseItem.case_parties.find(p => p.role === 'Executado') as any;
        
        setCurrentCase({
            ...caseItem,
            client_entity_id: client?.entity_id || client?.entities?.id,
            executed_entity_id: executed?.entity_id || executed?.entities?.id
        });
        setSelectedFiles([]);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentCase({
            title: '', case_number: '', court: '', priority: 'Média', status: 'Em andamento',
            description: '', value: null, client_entity_id: undefined, executed_entity_id: undefined,
            // NOVO CAMPO ADICIONADO AQUI
            has_alvara: false,
        });
        setSelectedFiles([]);
        setIsModalOpen(true);
    };

    const openViewModal = (caseItem: ExtendedCase) => {
        setSelectedCaseForView(caseItem);
        setIsViewModalOpen(true);
    };

    const handleDeleteCase = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este processo? Esta ação removerá também os acordos e parcelas associadas e não pode ser desfeita.')) {
            deleteCaseMutation.mutate(id);
        }
    };

    // CORREÇÃO: A função de salvar agora orquestra a criação do caso e, se necessário, do acordo financeiro.
    const handleSaveCase = async () => {
        if (!currentCase.title || !currentCase.client_entity_id || !currentCase.executed_entity_id) {
            toast({ title: "Campos obrigatórios", description: "Título, Cliente e Executado são obrigatórios.", variant: "destructive" });
            return;
        }

        try {
            // 1. Salva o caso e espera o retorno com o ID.
            const savedCase = await saveCaseMutation.mutateAsync(currentCase);

            // Extração robusta do ID, testando múltiplos formatos de resposta da API
            let actualCaseId: number | string | undefined;
            if (savedCase) {
                if (savedCase.id) actualCaseId = savedCase.id;
                else if ((savedCase as any).data?.id) actualCaseId = (savedCase as any).data.id;
                else if ((savedCase as any).case?.id) actualCaseId = (savedCase as any).case.id;
                else if (Array.isArray(savedCase) && savedCase.length > 0) actualCaseId = savedCase[0].id;
                else if (Array.isArray((savedCase as any).cases) && (savedCase as any).cases.length > 0) actualCaseId = (savedCase as any).cases[0].id;
            }
            if (!actualCaseId && isEditMode) {
                actualCaseId = currentCase.id;
            }

            // 2. Se o status for 'Acordo' ou 'Pago' e o caso foi salvo, cria o acordo financeiro.
            if (currentCase.status === 'Acordo' || currentCase.status === 'Pago') {
                if (!actualCaseId) {
                    // Previne a falha silenciosa e informa o usuário
                    toast({
                        title: "Erro de Sincronização",
                        description: "Não foi possível obter o ID do caso recém-criado. O acordo financeiro não foi gerado. Por favor, edite o caso e salve-o novamente para forçar a criação.",
                        variant: "destructive",
                        duration: 15000
                    });
                } else {
                    const isPago = currentCase.status === 'Pago';
                    const amount = Number(currentCase.agreement_value) || Number(currentCase.value) || 0;
                    const installmentsCount = Number(currentCase.installments) || 1;
                    const today = new Date().toISOString().split('T')[0];
                    const startDateStr = currentCase.installment_due_date || today;
                    
                    const startDate = new Date(startDateStr + 'T12:00:00Z');
                    const endDate = new Date(startDate);
                    endDate.setMonth(startDate.getMonth() + installmentsCount);

                    const agreementPayload = {
                        case_id: Number(actualCaseId),
                        debtor_id: String(currentCase.executed_entity_id),
                        creditor_id: String(currentCase.client_entity_id),
                        total_amount: amount,
                        down_payment: Number(currentCase.down_payment || 0),
                        number_of_installments: installmentsCount,
                        start_date: startDateStr,
                        end_date: endDate.toISOString().split('T')[0],
                        status: isPago ? 'CONCLUIDO' : 'ATIVO',
                        agreement_type: currentCase.agreement_type || 'Judicial',
                        notes: `Acordo gerado automaticamente a partir do caso: ${currentCase.title}`,
                    };

                    // Evita criar duplicatas de acordo ao editar um caso, atualizando em vez disso
                    if (currentCase.financial_agreement_id) {
                        await updateAgreementMutation.mutateAsync({ id: String(currentCase.financial_agreement_id), data: agreementPayload });
                    } else if (!isPago && (!currentCase.agreement_value || !currentCase.installments || !currentCase.installment_due_date)) {
                        toast({ title: "Dados do Acordo Incompletos", description: "Valor, parcelas e data de vencimento são obrigatórios para criar um acordo.", variant: "destructive" });
                    } else {
                        await createAgreementMutation.mutateAsync(agreementPayload);
                    }
                } 
            } else if (currentCase.status === 'Extinto' && currentCase.financial_agreement_id) {
                try {
                    await apiClient.deleteFinancialAgreement(String(currentCase.financial_agreement_id));
                } catch (err) {
                    console.error("Erro ao excluir acordo financeiro do caso extinto:", err);
                }
            }

            // 3. Faz o upload dos documentos atrelados ao case ID
            if (actualCaseId && selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                        const upRes = await fetch(`/api/cases/${actualCaseId}/documents`, {
                            method: 'POST',
                            body: formData,
                        });
                        
                        if (!upRes.ok) {
                            const errData = await upRes.json().catch(() => ({}));
                            toast({
                                title: "Erro ao anexar arquivo",
                                description: errData.error || `Erro HTTP ${upRes.status} no upload.`,
                                variant: "destructive"
                            });
                        }
                    } catch (upErr) {
                        console.error("Erro ao subir arquivo:", upErr);
                        toast({ 
                            title: "Erro de conexão", 
                            description: "Falha na comunicação com o servidor ao subir arquivo.", 
                            variant: "destructive" 
                        });
                    }
                }
            }

            toast({ title: "Sucesso!", description: `Caso ${isEditMode ? 'atualizado' : 'criado'} com sucesso.` });
            setIsModalOpen(false);
            await queryClient.refetchQueries({ queryKey: ['cases'] });
            await queryClient.refetchQueries({ queryKey: ['financialAgreements'] });
            await queryClient.invalidateQueries({ queryKey: ['monthlyInstallments'] });
            await queryClient.invalidateQueries({ queryKey: ['receivedByMonth'] });

        } catch (error: any) {
            const action = isEditMode ? 'atualizar' : 'criar';
            toast({ title: `Erro ao ${action} o caso`, description: error.message, variant: "destructive" });
        }
    };

    const handleImportCases = async () => {
        if (!importFile) {
            toast({
                title: "Erro",
                description: "Por favor, selecione um arquivo Excel para importar.",
                variant: "destructive",
            });
            return;
        }

        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append("file", importFile);

            const response = await fetch('/api/cases/import', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Falha ao importar processos.");
            }

            // Exibir resultado da importação
            if (result.successCount > 0) {
                toast({
                    title: "Importação concluída!",
                    description: `${result.successCount} processo(s) importado(s) com sucesso.`,
                });
            }

            // Exibir erros se houver
            if (result.errors && result.errors.length > 0) {
                console.error("Erros de importação:", result.errors);

                // Mostrar detalhes dos erros
                const errorDetails = result.errors.map((e: any) => `Linha ${e.row}: ${e.error}`).join('\n');
                toast({
                    title: `${result.errorCount} erro(s) encontrado(s)`,
                    description: result.errors.length <= 3
                        ? errorDetails
                        : `${result.errors.slice(0, 3).map((e: any) => `Linha ${e.row}: ${e.error}`).join('\n')}\n... e mais ${result.errors.length - 3} erro(s)`,
                    variant: "destructive",
                    duration: 10000,
                });
            }

            // Se nenhum caso foi importado
            if (result.successCount === 0 && result.errorCount === 0) {
                toast({
                    title: "Nenhum caso importado",
                    description: "O arquivo não contém dados válidos para importação.",
                    variant: "destructive",
                });
            }

            setIsImportModalOpen(false);
            setImportFile(null);
            await queryClient.refetchQueries({ queryKey: ['cases'] });
        } catch (error: any) {
            toast({
                title: "Erro ao importar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const filteredCases = useMemo(() => {
        if (!cases) return [];
        return cases.filter(c => {
            const searchMatch = (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.case_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.case_parties.some(p => p.entities.name.toLowerCase().includes(searchTerm.toLowerCase())));
            const statusMatch = filterStatus === "all" || c.status === filterStatus;
            const priorityMatch = filterPriority === "all" || c.priority === filterPriority;
            return searchMatch && statusMatch && priorityMatch;
        });
    }, [cases, searchTerm, filterStatus, filterPriority]);

    const getStatusBadge = (status: ExtendedCase['status']) => {
        const statusMap = {
            'Em andamento': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
            'Acordo': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg',
            'Extinto': 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg',
            'Pago': 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
        };
        return <Badge className={`${statusMap[status]} border-0 px-3 py-1 font-semibold`}>{status}</Badge>;
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            'Alta': 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0',
            'Média': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0',
            'Baixa': 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0',
        };
        return (
            <Badge className={`${colors[priority as keyof typeof colors]} px-3 py-1 font-semibold shadow-lg`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {priority}
            </Badge>
        );
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, caseItem: ExtendedCase) => setDraggedCase(caseItem);
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: ExtendedCase['status']) => {
        e.preventDefault();
        if (draggedCase && draggedCase.status !== status) {
            updateCaseStatusMutation.mutate({ caseId: draggedCase.id, status });
        }
        setDraggedCase(null);
    };
    
    const renderAgreementTypeIcon = (type: string | null | undefined) => {
        switch(type) {
            case 'Judicial': return <Scale className="h-4 w-4 text-slate-500 mr-2" />;
            case 'Extrajudicial': return <FileSignature className="h-4 w-4 text-slate-500 mr-2" />;
            case 'Em Audiência': return <Handshake className="h-4 w-4 text-slate-500 mr-2" />;
            case 'Pela Loja': return <Store className="h-4 w-4 text-slate-500 mr-2" />;
            default: return null;
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96 bg-gradient-to-br from-brand-black to-brand-black/90 rounded-2xl">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500 mx-auto" />
                    <p className="text-slate-600 font-medium">Carregando casos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="relative bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 rounded-3xl p-8 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-10"></div>
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-3">Gestão de Casos e Processos</h2>
                    <p className="text-brand-olive text-xl">Administre todos os casos do escritório de forma centralizada e eficiente.</p>
                </div>
            </div>

            <CasesStats cases={cases} />

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                                <Input placeholder="Buscar por título, número ou parte..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-white border-2 border-slate-200 focus:border-brand-olive rounded-xl" />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[200px] h-12 bg-white border-2 border-slate-200 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                                    <SelectItem value="Acordo">Acordo</SelectItem>
                                    <SelectItem value="Extinto">Extinto</SelectItem>
                                    <SelectItem value="Pago">Pago</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-2 bg-slate-200 rounded-xl p-1">
                                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className={`rounded-lg ${viewMode === 'list' ? '' : 'text-slate-700 hover:text-slate-900'}`}><List className="h-4 w-4" /></Button>
                                <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className={`rounded-lg ${viewMode === 'kanban' ? '' : 'text-slate-700 hover:text-slate-900'}`}><LayoutGrid className="h-4 w-4" /></Button>
                            </div>
                            <Button variant="outline" className="border-2 border-slate-200 hover:border-brand-olive hover:bg-brand-olive rounded-xl" onClick={() => setIsImportModalOpen(true)}><Upload className="mr-2 h-4 w-4" /> Importar</Button>
                            <Button onClick={openCreateModal} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg rounded-xl"><Plus className="mr-2 h-4 w-4" /> Novo Caso</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {viewMode === 'list' && (
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gradient-to-r from-brand-black to-brand-black/90 hover:from-slate-100 hover:to-slate-200">
                                    <TableHead className="text-slate-700 font-bold">Processo / Título</TableHead>
                                    <TableHead className="text-slate-700 font-bold">Prioridade</TableHead>
                                    <TableHead className="text-slate-700 font-bold">Status</TableHead>
                                    <TableHead className="text-slate-700 font-bold">Partes</TableHead>
                                    <TableHead className="text-right text-slate-700 font-bold">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCases.map(caseItem => (
                                    <TableRow key={caseItem.id} className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-all duration-200">
                                        <TableCell><div className="space-y-1"><div className="font-semibold text-slate-900 group-hover:text-brand-olive transition-colors">{caseItem.title}</div><div className="text-sm text-slate-500 font-mono">{caseItem.case_number || "-"}</div></div></TableCell>
                                        <TableCell>{getPriorityBadge(caseItem.priority)}</TableCell>
                                        <TableCell><div className="flex flex-col items-start space-y-1">{getStatusBadge(caseItem.status)}{caseItem.status_reason && (<span className="text-xs text-slate-500 mt-1">{caseItem.status_reason}</span>)}</div></TableCell>
                                        <TableCell><div className="text-sm text-slate-600">{caseItem.case_parties.map(p => p.entities.name).join(', ')}</div></TableCell>
                                        <TableCell className="text-right"><div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => openViewModal(caseItem)} className="hover:bg-brand-olive hover:text-brand-olive rounded-lg"><Eye className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(caseItem)} className="hover:bg-blue-100 hover:text-blue-700 rounded-lg"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCase(caseItem.id)} className="hover:bg-red-100 hover:text-red-700 rounded-lg"><Trash2 className="h-4 w-4" /></Button>
                                        </div></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {viewMode === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(['Em andamento', 'Acordo', 'Extinto', 'Pago'] as const).map(status => (
                        <div key={status} className="space-y-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
                            <div className="bg-gradient-to-r from-brand-black to-brand-black/90 rounded-xl p-4 sticky top-0 z-10"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 text-lg">{status}</h3><Badge variant="secondary" className="bg-white text-slate-700 font-semibold">{filteredCases.filter(c => c.status === status).length}</Badge></div></div>
                            <div className="space-y-4 min-h-[400px]">
                                {filteredCases.filter(c => c.status === status).map(caseItem => (
                                    <div key={caseItem.id} draggable onDragStart={(e) => handleDragStart(e, caseItem)}>
                                        <Card className="cursor-move group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-purple-500">
                                            <CardContent className="p-4"><div className="space-y-3">
                                                <p className="font-semibold text-slate-900 line-clamp-2">{caseItem.title}</p>
                                                <p className="text-sm text-slate-500 font-mono">{caseItem.case_number}</p>
                                                <p className="text-xs text-slate-500 truncate">{caseItem.case_parties.map(p => p.entities.name).join(' vs ')}</p>
                                                <div className="flex justify-between items-center">
                                                    {getPriorityBadge(caseItem.priority)}
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-brand-olive hover:text-brand-olive" onClick={() => openViewModal(caseItem)}><Eye className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-100" onClick={() => handleDeleteCase(caseItem.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </div>
                                            </div></CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-2xl font-bold"><Briefcase className="mr-2 h-5 w-5" /> Detalhes do Caso</DialogTitle>
                        <DialogDescription className="text-slate-600">{selectedCaseForView?.title}</DialogDescription>
                    </DialogHeader>
                    {selectedCaseForView && (
                        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-slate-700 font-semibold">Nº do Processo</Label><p className="font-mono text-sm">{selectedCaseForView.case_number || 'N/A'}</p></div>
                                <div><Label className="text-slate-700 font-semibold">Vara/Tribunal</Label><p className="text-sm">{selectedCaseForView.court || 'N/A'}</p></div>
                                <div><Label className="text-slate-700 font-semibold">Cliente</Label><p className="text-sm font-medium">{getEntityName(selectedCaseForView.case_parties.find(p => p.role === 'Cliente')?.entities.id)}</p></div>
                                <div><Label className="text-slate-700 font-semibold">Executado</Label><p className="text-sm font-medium">{getEntityName(selectedCaseForView.case_parties.find(p => p.role === 'Executado')?.entities.id)}</p></div>
                                <div><Label className="text-slate-700 font-semibold">Status</Label><div>{getStatusBadge(selectedCaseForView.status)}</div></div>
                                <div><Label className="text-slate-700 font-semibold">Prioridade</Label><div>{getPriorityBadge(selectedCaseForView.priority)}</div></div>
                                <div><Label className="text-slate-700 font-semibold">Valor da Causa</Label><p className="text-sm">{selectedCaseForView.value != null ? `R$ ${Number(selectedCaseForView.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</p></div>
                            </div>
                            {selectedCaseForView.status === 'Acordo' && (
                                <div className="border-t pt-4 mt-4 space-y-4">
                                    <h4 className="font-semibold flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600"/> Detalhes do Acordo</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center"><Label className="text-slate-700 font-semibold">Tipo:</Label><div className="flex items-center ml-2">{renderAgreementTypeIcon(selectedCaseForView.agreement_type)}<p className="text-sm">{selectedCaseForView.agreement_type || 'N/A'}</p></div></div>
                                        <div><Label className="text-slate-700 font-semibold">Valor do Acordo:</Label><p className="text-sm">{selectedCaseForView.agreement_value != null ? `R$ ${Number(selectedCaseForView.agreement_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</p></div>
                                        <div><Label className="text-slate-700 font-semibold">Valor de Entrada:</Label><p className="text-sm">{selectedCaseForView.down_payment != null ? `R$ ${Number(selectedCaseForView.down_payment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</p></div>
                                        <div><Label className="text-slate-700 font-semibold">Parcelas:</Label><p className="text-sm">{selectedCaseForView.installments || 'N/A'}</p></div>
                                        <div><Label className="text-slate-700 font-semibold">Vencimento da Parcela:</Label><p className="text-sm">{selectedCaseForView.installment_due_date ? new Date(selectedCaseForView.installment_due_date).toLocaleDateString('pt-BR') : 'N/A'}</p></div>
                                    </div>
                                    {/* SEÇÃO DE EXIBIÇÃO DO ALVARÁ */}
                                    <div className="border-t pt-4 mt-4 space-y-2">
                                         <div className="flex justify-between items-center">
                                            <Label className="text-slate-700 font-semibold">Possui Alvará como Pagamento:</Label>
                                            <Badge variant={selectedCaseForView.has_alvara ? "default" : "outline"}>
                                                {selectedCaseForView.has_alvara ? "Sim" : "Não"}
                                            </Badge>
                                        </div>
                                        {selectedCaseForView.has_alvara && (
                                            <div className="flex justify-between items-center">
                                                <Label className="text-slate-700 font-semibold">Valor do Alvará:</Label>
                                                <p className="text-sm font-bold text-green-700">
                                                    {selectedCaseForView.alvara_value != null ? `R$ ${Number(selectedCaseForView.alvara_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div><Label className="text-slate-700 font-semibold">Descrição</Label><p className="text-sm bg-slate-50 p-3 rounded-md">{selectedCaseForView.description || 'Nenhuma descrição fornecida.'}</p></div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-semibold flex items-center mb-4"><FileText className="mr-2 h-4 w-4 text-brand"/> Documentos Anexados</h4>
                                <DocumentsModule caseId={Number(selectedCaseForView.id)} isViewOnly={true} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="border-2 border-slate-200 rounded-xl">Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[650px] bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-2xl font-bold"><Briefcase className="mr-2 h-5 w-5 text-brand-olive" />{isEditMode ? 'Editar Caso' : 'Criar Novo Caso'}</DialogTitle>
                        <DialogDescription className="text-slate-600">{isEditMode ? 'Altere as informações do caso.' : 'Preencha as informações do novo caso/processo judicial'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="title" className="text-slate-700 font-semibold">Título do Caso *</Label><Input id="title" value={currentCase.title || ''} onChange={(e) => setCurrentCase({ ...currentCase, title: e.target.value })} placeholder="Ex: Ação de Cobrança - João Silva" className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                            <div className="space-y-2"><Label htmlFor="case_number" className="text-slate-700 font-semibold">Número do Processo</Label><Input id="case_number" value={currentCase.case_number || ''} onChange={(e) => setCurrentCase({ ...currentCase, case_number: e.target.value })} placeholder="0000000-00.0000.0.00.0000" className="font-mono bg-white border-2 border-slate-200 rounded-xl" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="court" className="text-slate-700 font-semibold">Vara/Tribunal</Label><Input id="court" value={currentCase.court || ''} onChange={(e) => setCurrentCase({ ...currentCase, court: e.target.value })} placeholder="Ex: 1ª Vara Cível de Campo Grande" className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                            <div className="space-y-2">
                                <Label htmlFor="value" className="text-slate-700 font-semibold">Valor da Causa</Label>
                                <Input 
                                    id="value" 
                                    type="text" 
                                    value={currentCase.value != null ? Number(currentCase.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} 
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "");
                                        const val = digits ? parseInt(digits, 10) / 100 : null;
                                        setCurrentCase({ ...currentCase, value: val });
                                    }} 
                                    disabled={isEditMode} 
                                    placeholder="0,00" 
                                    className="bg-white border-2 border-slate-200 rounded-xl" 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">Cliente *</Label>
                                <Select value={String(currentCase.client_entity_id || '')} onValueChange={(value) => setCurrentCase({ ...currentCase, client_entity_id: value })}>
                                    <SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                                    <SelectContent>{allEntities.filter(e => String(e.type || '').trim().toLowerCase().startsWith('cliente')).map(e => <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">Executado *</Label>
                                <Select value={String(currentCase.executed_entity_id || '')} onValueChange={(value) => setCurrentCase({ ...currentCase, executed_entity_id: value })}>
                                    <SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue placeholder="Selecione o executado" /></SelectTrigger>
                                    <SelectContent>{allEntities.filter(e => String(e.type || '').trim().toLowerCase().startsWith('executado')).map(e => <SelectItem key={String(e.id)} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="priority" className="text-slate-700 font-semibold">Prioridade</Label><Select value={currentCase.priority} onValueChange={(value: 'Alta' | 'Média' | 'Baixa') => setCurrentCase({ ...currentCase, priority: value })}><SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label htmlFor="status" className="text-slate-700 font-semibold">Status</Label><Select value={currentCase.status} onValueChange={(value: ExtendedCase['status']) => setCurrentCase({ ...currentCase, status: value })}><SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Em andamento">Em andamento</SelectItem><SelectItem value="Acordo">Acordo</SelectItem><SelectItem value="Extinto">Extinto</SelectItem><SelectItem value="Pago">Pago</SelectItem></SelectContent></Select></div>
                        </div>
                        {currentCase.status === 'Acordo' && (
                            <div className="border-t border-dashed pt-6 mt-2 space-y-6">
                                <h4 className="font-semibold text-lg flex items-center text-slate-800"><DollarSign className="mr-2 h-5 w-5 text-yellow-600"/> Detalhes do Acordo</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-slate-700 font-semibold">Tipo de Acordo</Label><Select value={currentCase.agreement_type || ''} onValueChange={(value) => setCurrentCase({ ...currentCase, agreement_type: value as ExtendedCase['agreement_type'] })}><SelectTrigger className="bg-white border-2 border-slate-200 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Judicial">Judicial</SelectItem><SelectItem value="Extrajudicial">Extrajudicial</SelectItem><SelectItem value="Em Audiência">Em Audiência</SelectItem><SelectItem value="Pela Loja">Pela Loja</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-2"><Label className="text-slate-700 font-semibold">Valor do Acordo</Label><Input type="text" placeholder="0,00" value={currentCase.agreement_value != null ? Number(currentCase.agreement_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ""); const val = digits ? parseInt(digits, 10) / 100 : null; setCurrentCase({ ...currentCase, agreement_value: val }); }} className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label className="text-slate-700 font-semibold">Valor de Entrada</Label><Input type="text" placeholder="0,00" value={currentCase.down_payment != null ? Number(currentCase.down_payment).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ""); const val = digits ? parseInt(digits, 10) / 100 : null; setCurrentCase({ ...currentCase, down_payment: val }); }} className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                                    <div className="space-y-2"><Label className="text-slate-700 font-semibold">Nº de Parcelas</Label><Input type="number" value={currentCase.installments ?? ''} onChange={(e) => setCurrentCase({ ...currentCase, installments: parseInt(e.target.value, 10) })} className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                                    <div className="space-y-2"><Label className="text-slate-700 font-semibold">Vencimento da 1ª Parcela</Label><Input type="date" value={currentCase.installment_due_date || ''} onChange={(e) => setCurrentCase({ ...currentCase, installment_due_date: e.target.value })} className="bg-white border-2 border-slate-200 rounded-xl" /></div>
                                </div>
                                {/* INÍCIO DA SEÇÃO DO ALVARÁ */}
                                <div className="border-t pt-4 mt-4 space-y-4">
                                    <h5 className="font-semibold flex items-center text-slate-800">
                                        <FileSignature className="mr-2 h-4 w-4 text-brand" />
                                        Informações do Alvará
                                    </h5>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <Switch
                                        id="has_alvara"
                                        checked={currentCase.has_alvara || false}
                                        onCheckedChange={(checked) =>
                                            setCurrentCase({ ...currentCase, has_alvara: checked, alvara_value: checked ? currentCase.alvara_value : null })
                                        }
                                        />
                                        <Label htmlFor="has_alvara" className="text-slate-700 font-semibold">
                                        Possui Alvará como parte do pagamento?
                                        </Label>
                                    </div>

                                    {currentCase.has_alvara && (
                                        <div className="space-y-2">
                                        <Label htmlFor="alvara_value" className="text-slate-700 font-semibold">
                                            Valor do Alvará
                                        </Label>
                                        <Input
                                            id="alvara_value"
                                            type="text"
                                            placeholder="0,00"
                                            value={currentCase.alvara_value != null ? Number(currentCase.alvara_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, "");
                                                const val = digits ? parseInt(digits, 10) / 100 : null;
                                                setCurrentCase({ ...currentCase, alvara_value: val });
                                            }}
                                            className="bg-white border-2 border-slate-200 rounded-xl"
                                        />
                                        </div>
                                    )}
                                </div>
                                {/* FIM DA SEÇÃO DO ALVARÁ */}
                            </div>
                        )}
                        <div className="space-y-2"><Label htmlFor="description" className="text-slate-700 font-semibold">Descrição</Label><Textarea id="description" value={currentCase.description || ''} onChange={(e) => setCurrentCase({ ...currentCase, description: e.target.value })} placeholder="Descrição detalhada do caso..." className="min-h-[100px] bg-white border-2 border-slate-200 rounded-xl" /></div>

                        <div className="border-t pt-4 mt-2 space-y-2">
                            <Label className="text-slate-700 font-semibold">Anexar Documentos (PDF/Word)</Label>
                            <DocumentUpload onFilesSelected={setSelectedFiles} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-2 border-slate-200 rounded-xl">Cancelar</Button>
                        <Button onClick={handleSaveCase} disabled={saveCaseMutation.isPending} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg rounded-xl">
                            {saveCaseMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Salvando...</span></>) : (<><Plus className="mr-2 h-4 w-4" /><span>{isEditMode ? 'Salvar Alterações' : 'Criar Caso'}</span></>)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Importação */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-md bg-white/95 backdrop-blur-lg border-0 shadow-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Upload className="h-5 w-5 text-brand-olive" />
                            <span>Importar Processos</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Importe múltiplos processos a partir de um arquivo Excel
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload" className="text-slate-700 font-semibold">Arquivo Excel (.xlsx)</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                disabled={isImporting}
                                className="bg-white border-2 border-slate-200 rounded-xl"
                            />
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                <p className="text-sm text-blue-800 font-medium mb-1">Colunas necessárias:</p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                    <li>• Cliente</li>
                                    <li>• Executado</li>
                                    <li>• Numero Processo (opcional)</li>
                                    <li>• Observacao (título do caso)</li>
                                    <li>• Status (Em andamento, Acordo, Extinto, Pago)</li>
                                    <li>• Prioridade (Alta, Média, Baixa)</li>
                                </ul>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsImportModalOpen(false);
                                    setImportFile(null);
                                }}
                                disabled={isImporting}
                                className="border-2 border-slate-200 rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleImportCases}
                                disabled={!importFile || isImporting}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg rounded-xl"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Importar
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}