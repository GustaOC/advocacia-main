// components/financial-agreement-modal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Tipagens
interface AgreementFormData {
  case_id: number | null;
  debtor_id: string | null;
  creditor_id: string | null;
  agreement_type: 'Judicial' | 'Extrajudicial' | 'Em Audiência' | string;
  total_amount: number | string;
  down_payment?: number | string;
  number_of_installments: number | string;
  start_date: string;
  // IMPORTANTE: alinhar com o schema do backend
  // Vamos sempre enviar 'ATIVO' (valor aceito pelo EnhancedAgreementSchema)
  status: 'ATIVO';
  notes?: string;
}

interface Case {
  id: number;
  title: string;
  case_number: string | null;
  case_parties: { role: string; entities: { id: string | number; name: string } }[];
}

interface FinancialAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: Case | null; // Recebe os dados do caso para pré-preenchimento
}

export function FinancialAgreementModal({ isOpen, onClose, caseData }: FinancialAgreementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AgreementFormData>({
    case_id: null,
    debtor_id: null,
    creditor_id: null,
    agreement_type: 'Judicial',
    total_amount: '',
    down_payment: '',
    number_of_installments: 1,
    start_date: new Date().toISOString().slice(0, 10),
    status: 'ATIVO', // <- alinhado ao backend
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases'],
    queryFn: () => apiClient.getCases()
  });
  const casesList = casesData?.cases || (casesData as any)?.data || (Array.isArray(casesData) ? casesData : []);

  const { data: entitiesData } = useQuery({
    queryKey: ['entities'],
    queryFn: () => apiClient.getEntities()
  });
  const entitiesList = Array.isArray(entitiesData) ? entitiesData : ((entitiesData as any)?.data || (entitiesData as any)?.entities || []);

  // Efeito para pré-preencher o formulário quando os dados do caso são recebidos
  useEffect(() => {
    if (isOpen) {
      if (caseData) {
        const clientParty = caseData.case_parties?.find((p: any) => p.role === 'Cliente');
        const executedParty = caseData.case_parties?.find((p: any) => p.role === 'Executado');
        setFormData(prev => ({
          ...prev,
          case_id: caseData.id,
          creditor_id: clientParty?.entities?.id ? String(clientParty.entities.id) : null,
          debtor_id: executedParty?.entities?.id ? String(executedParty.entities.id) : null,
        }));
      } else {
        setFormData({
          case_id: null,
          debtor_id: null,
          creditor_id: null,
          agreement_type: 'Judicial',
          total_amount: '',
          down_payment: '',
          number_of_installments: 1,
          start_date: new Date().toISOString().slice(0, 10),
          status: 'ATIVO',
        });
      }
    }
  }, [caseData, isOpen]);

  const handleChange = (field: keyof AgreementFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createAgreementMutation = useMutation({
    mutationFn: (agreementData: AgreementFormData) => {
      // Converte valores numéricos antes de enviar para a API
      const numericData = {
        ...agreementData,
        total_amount: Number(agreementData.total_amount),
        down_payment: Number(agreementData.down_payment || 0),
        number_of_installments: Number(agreementData.number_of_installments),
      };
      return apiClient.createFinancialAgreement(numericData);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Acordo financeiro criado com sucesso." });
      // Invalida as listas relacionadas para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['financialAgreements'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyInstallments'] });
      queryClient.invalidateQueries({ queryKey: ['receivedByMonth'] });
      onClose(); // Fecha o modal
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar acordo", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    // Validações básicas de preenchimento e faixas
    const total = Number(formData.total_amount);
    const installments = Number(formData.number_of_installments);
    if (!formData.case_id || !formData.creditor_id || !formData.debtor_id || !total) {
      toast({
        title: "Campos obrigatórios",
        description: "Caso, Credor, Devedor e Valor Total são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    if (total <= 0) {
      toast({ title: "Valor inválido", description: "O valor total deve ser maior que zero.", variant: "destructive" });
      return;
    }
    if (!installments || installments < 1) {
      toast({ title: "Parcelas inválidas", description: "O número de parcelas deve ser pelo menos 1.", variant: "destructive" });
      return;
    }

    createAgreementMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-600" />
            Criar Novo Lançamento de Acordo
          </DialogTitle>
          {caseData && <DialogDescription>Acordo para o caso: {caseData.title}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Processo *</Label>
              <Select
                value={String(formData.case_id || '')}
                onValueChange={value => handleChange('case_id', Number(value))}
                disabled={!!caseData}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
                <SelectContent>
                  {casesList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.case_number || c.title || `Caso #${c.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credor (Quem recebe) *</Label>
              <Select
                value={String(formData.creditor_id || '')}
                onValueChange={value => handleChange('creditor_id', value)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o credor" /></SelectTrigger>
                <SelectContent>
                  {entitiesList.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Devedor (Quem paga) *</Label>
              <Select
                value={String(formData.debtor_id || '')}
                onValueChange={value => handleChange('debtor_id', value)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o devedor" /></SelectTrigger>
                <SelectContent>
                  {entitiesList.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total do Acordo *</Label>
              <Input
                type="number"
                placeholder="5000,00"
                value={String(formData.total_amount)}
                onChange={e => handleChange('total_amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor de Entrada (Opcional)</Label>
              <Input
                type="number"
                placeholder="1000,00"
                value={String(formData.down_payment || '')}
                onChange={e => handleChange('down_payment', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Número de Parcelas *</Label>
              <Input
                type="number"
                min="1"
                value={String(formData.number_of_installments)}
                onChange={e => handleChange('number_of_installments', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => handleChange('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acordo *</Label>
              <Select
                value={formData.agreement_type}
                onValueChange={value => handleChange('agreement_type', value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Judicial">Judicial</SelectItem>
                  <SelectItem value="Extrajudicial">Extrajudicial</SelectItem>
                  <SelectItem value="Em Audiência">Em Audiência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Detalhes do acordo, datas de vencimento das parcelas, etc."
              value={formData.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={createAgreementMutation.isPending}>
            {createAgreementMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            Salvar Acordo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
