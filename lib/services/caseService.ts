// lib/services/caseService.ts - VERSÃO FINAL E ROBUSTA COM LÓGICA DE ALVARÁ

import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { CaseSchema } from "@/lib/schemas";
import { AuthUser } from "@/lib/auth";
import { logAudit } from "./auditService";

// Util: retorna 'YYYY-MM-DD' em UTC
function ymdUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Util: cria Date UTC a partir de 'YYYY-MM-DD' (sem risco de fuso)
function fromYmdUTC(ymd: string) {
  // força meia-noite UTC
  return new Date(`${ymd}T00:00:00.000Z`);
}

// Util: clamp de fim de mês quando o dia original não existe no mês alvo
function addMonthsClampedUTC(base: Date, monthsToAdd: number) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + monthsToAdd;
  const d = base.getUTCDate();

  // tenta mesma "day" no mês alvo
  let candidate = new Date(Date.UTC(y, m, d));

  // se transbordou (ex.: 31 → mês com 30 ou 28), cai para último dia do mês alvo
  const expectedMonth = ((m % 12) + 12) % 12;
  if (candidate.getUTCMonth() !== expectedMonth) {
    // último dia do mês alvo = dia 0 do mês seguinte
    candidate = new Date(Date.UTC(y, m + 1, 0));
  }
  return candidate;
}

/**
 * Função auxiliar para gerar parcelas automaticamente (UTC + ajuste de centavos)
 */
function generateInstallments(params: {
  agreementId: string;
  totalAmount: number;
  downPayment?: number;
  numberOfInstallments: number;
  startDate: string; // esperado 'YYYY-MM-DD'
}) {
  const {
    agreementId,
    totalAmount,
    downPayment = 0,
    numberOfInstallments,
    startDate,
  } = params;

  const n = Math.max(1, Number(numberOfInstallments || 1));
  const baseAmount = Math.max(0, Number(totalAmount) - Number(downPayment || 0));
  if (baseAmount === 0) return [];

  // parcela base truncada em 2 casas, e última absorve a diferença
  const raw = Math.floor((baseAmount / n) * 100) / 100;
  const lastAdj = Number((baseAmount - raw * (n - 1)).toFixed(2));

  const base = fromYmdUTC(startDate);
  const out = Array.from({ length: n }).map((_, i) => {
    const due = addMonthsClampedUTC(base, i);
    const amount = i === n - 1 ? lastAdj : raw;

    return { agreement_id: agreementId, installment_number: i + 1, amount, due_date: ymdUTC(due), status: 'PENDENTE' as const };
  });

  return out;
}

// Função auxiliar para normalizar a estrutura de dados das partes do processo
function normalizeParties(caseItem: any) {
  if (!caseItem?.case_parties) return caseItem;
  caseItem.case_parties = caseItem.case_parties.map((party: any) => ({
    role: party?.role,
    entity_id: party?.entity_id ?? party?.entities?.id ?? null,
    entities: party?.entities
      ? { ...party.entities, id: party.entities?.id != null ? String(party.entities.id) : null }
      : null,
  }));
  return caseItem;
}

// Schema flexível para criação de caso, evitando travamentos do Zod com campos novos, vazios ou nulos
const CaseCreateSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  client_entity_id: z.union([z.string(), z.number()]),
  executed_entity_id: z.union([z.string(), z.number()]),
}).passthrough();

// Busca paginada de todos os casos
export async function getCases(page: number = 1, limit: number = 10) {
  const supabase = createAdminClient();

  console.log(`[caseService.getCases] Recebido: page=${page}, limit=${limit}`);

  // Se o limit for muito grande, fazer múltiplas queries para buscar TODOS os registros
  if (limit >= 100000) {
    console.log(`[caseService.getCases] MODO BULK - Buscando TODOS os registros em múltiplas queries`);

    // Primeira query para pegar o count total
    const { count: totalCount, error: countError } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Erro ao buscar count:", countError);
      throw new Error("Não foi possível buscar o total de casos.");
    }

    console.log(`[caseService.getCases] Total de casos no banco: ${totalCount}`);

    // Supabase limita a 1000 por query, então vamos buscar em lotes
    const batchSize = 1000;
    const totalBatches = Math.ceil((totalCount || 0) / batchSize);
    let allData: any[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const from = i * batchSize;
      const to = from + batchSize - 1;

      console.log(`[caseService.getCases] Buscando lote ${i + 1}/${totalBatches} (${from}-${to})`);

      const { data: batchData, error: batchError } = await supabase
        .from("cases")
        .select(`*, case_parties (role, entity_id, entities:entity_id (id, name, document))`)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (batchError) {
        console.error(`Erro ao buscar lote ${i + 1}:`, batchError);
        continue;
      }

      allData = allData.concat(batchData || []);
    }

    console.log(`[caseService.getCases] Total carregado: ${allData.length} casos`);

    return { data: allData.map(d => normalizeParties(d)), count: totalCount || 0 };
  }

  // Paginação normal - otimizada
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  console.log(`[caseService.getCases] Aplicando range: from=${from}, to=${to}`);

  const { data, error, count } = await supabase
    .from("cases")
    .select(`
      *,
      case_parties (
        role,
        entity_id,
        entities:entity_id (id, name)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Erro ao buscar casos:", error);
    throw new Error("Não foi possível buscar os casos.");
  }

  console.log(`[caseService.getCases] Retornados: ${data?.length || 0} casos de um total de ${count}`);

  return { data: (data || []).map(d => normalizeParties(d)), count: count || 0 };
}

// Busca um único caso pelo seu ID
export async function getCaseById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cases")
    .select(`*, case_parties (role, entity_id, entities:entity_id (*))`)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error(`Erro ao buscar caso ${id}:`, error);
    throw new Error("Não foi possível buscar o caso.");
  }
  
  if (data) {
    data.case_parties = data.case_parties.map((party: any) => ({
      role: party.role,
      entities: party.entities
    }));
  }
  
  return normalizeParties(data);
}

// Cria um novo caso e, se aplicável, o acordo financeiro associado
export async function createCase(caseData: unknown, user: AuthUser) {
    try {
      console.log('[caseService.createCase] Recebendo caseData:', JSON.stringify(caseData, null, 2));
      
      const parsed = CaseCreateSchema.safeParse(caseData);
      if (!parsed.success) {
        const errorMsg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(" | ");
        throw new Error(`Campos inválidos na criação: ${errorMsg}`);
      }

      // Remove campos que não pertencem à tabela 'cases' (serão usados em 'case_parties')
      const { client_entity_id, executed_entity_id, debtor_id, creditor_id, ...caseInsertData } = parsed.data;
      console.log('[caseService.createCase] Dados validados com sucesso. caseInsertData:', JSON.stringify(caseInsertData, null, 2));
      const supabase = createAdminClient();

      // Filtra apenas colunas existentes/seguras da tabela 'cases'
      const ALLOWED_CASE_COLUMNS = new Set(['title','case_number','status','priority','value','court','description','has_alvara','alvara_value'] as const);
      const filteredInsert: any = {};
      for (const [k, v] of Object.entries(caseInsertData)) {
        if (ALLOWED_CASE_COLUMNS.has(k as any)) {
          filteredInsert[k] = v === "" ? null : v;
        }
      }

      // Ajusta o status para o enum real do banco (case_status)
      // Domínio do app (CaseSchema): 'Em Andamento' | 'Finalizado' | 'Arquivado' | 'Suspenso' | 'Acordo'
      // Domínio no DB (eusado na UI): 'Em andamento' | 'Pago' | 'Extinto' | 'Suspenso' | 'Acordo'
      if (typeof filteredInsert.status === 'string') {
        const statusMap: Record<string, string> = {
          'Em Andamento': 'Em andamento',
          'Finalizado': 'Pago',
          'Arquivado': 'Extinto',
          'Acordo': 'Acordo',
          'Suspenso': 'Suspenso',
        };
        const mapped = statusMap[filteredInsert.status];
        if (mapped) filteredInsert.status = mapped;
      }

      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert(filteredInsert)
        .select()
        .single();

      if (caseError) {
        console.error("[caseService.createCase] Erro do Supabase ao inserir caso:", caseError);
        if (caseError.code === '23505') throw new Error("Já existe um caso com este número de processo.");
        throw new Error("Não foi possível criar o caso.");
      }

    const partiesToInsert = [
      { case_id: newCase.id, entity_id: client_entity_id, role: 'Cliente' },
      { case_id: newCase.id, entity_id: executed_entity_id, role: 'Executado' }
    ];

    const { error: partiesError } = await supabase.from('case_parties').insert(partiesToInsert);

    if (partiesError) {
      console.error(`ERRO CRÍTICO: Rollback do caso ${newCase.id} por falha ao associar partes.`, partiesError);
      await supabase.from('cases').delete().eq('id', newCase.id);
      throw new Error("Não foi possível associar as partes ao caso. A operação foi desfeita.");
    }

    await logAudit('CASE_CREATE', user, { caseId: newCase.id, title: newCase.title });

    await supabase.from('case_status_history').insert({
      case_id: newCase.id, new_main_status: newCase.status,
      changed_by_user_id: user.id, changed_by_user_email: user.email,
      notes: 'Caso criado no sistema.'
    });

    // --- LÓGICA UNIFICADA PARA CRIAÇÃO DE ACORDO FINANCEIRO ---
    if (newCase.status === 'Acordo') {
        const agreementFields = parsed.data as any;

        // Lógica para acordo padrão
        if (agreementFields.agreement_value && agreementFields.agreement_type) {
            const startDateStr = agreementFields.installment_due_date || new Date().toISOString().split('T')[0];
            const tempStartDate = new Date(startDateStr + 'T12:00:00Z');
            const tempEndDate = new Date(tempStartDate);
            tempEndDate.setMonth(tempStartDate.getMonth() + (Number(agreementFields.installments) || 1));
            const endDateStr = tempEndDate.toISOString().split('T')[0];

            const agreementData = {
                case_id: newCase.id, 
                debtor_id: executed_entity_id, // Executado é quem deve
                creditor_id: client_entity_id, // Cliente é quem recebe
                agreement_type: agreementFields.agreement_type,
                total_amount: agreementFields.agreement_value,
                down_payment: agreementFields.down_payment || 0,
                number_of_installments: agreementFields.installments || 1,
                start_date: startDateStr,
                end_date: endDateStr,
                status: 'ATIVO' as const, 
                notes: `Acordo (padrão) criado junto com o caso #${newCase.id}.`
            };
            
            const { data: agreement, error: agreementError } = await supabase
                .from('financial_agreements')
                .insert(agreementData)
                .select()
                .single();

            if (agreementError) {
                console.error(`Erro ao criar acordo financeiro padrão para o caso ${newCase.id}:`, agreementError);
            } else if (agreement) {
                // PASSO 7: Vincula o acordo ao processo
                await supabase.from('cases').update({ financial_agreement_id: agreement.id }).eq('id', newCase.id);

                const installmentsToInsert = generateInstallments({
                    agreementId: agreement.id,
                    totalAmount: Number(agreement.total_amount),
                    downPayment: Number(agreement.down_payment ?? 0),
                    numberOfInstallments: Number(agreement.number_of_installments),
                    startDate: agreement.start_date.split('T')[0],
                });

                if (installmentsToInsert.length > 0) {
                    const { error: instErr } = await supabase.from('financial_installments').insert(installmentsToInsert);
                    if (instErr) {
                        console.error(`Erro ao criar parcelas para o acordo padrão ${agreement.id}:`, instErr);
                        await supabase.from('financial_agreements').update({ notes: `${agreement.notes || ''} [AVISO: Erro ao gerar parcelas automaticamente.]` }).eq('id', agreement.id);
                    }
                }
            }
        }
        // Lógica para acordo de ALVARÁ
        if (newCase.has_alvara && newCase.alvara_value) {
            const alvaraAgreementData = {
                case_id: newCase.id,
                debtor_id: executed_entity_id,
                creditor_id: client_entity_id,
                agreement_type: 'A_VISTA', // ATENÇÃO: Este tipo pode não ser válido no schema de 'AgreementType'. A lógica de 'getAlvaras' depende dele.
                total_amount: newCase.alvara_value,
                down_payment: 0,
                number_of_installments: 1,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                status: 'ATIVO' as const,
                notes: `Acordo financeiro referente ao ALVARÁ do caso #${newCase.id}.`
            };
            const { data: alvaraAgreement, error: alvaraAgreementError } = await supabase
                .from('financial_agreements')
                .insert(alvaraAgreementData)
                .select()
                .single();

            if (alvaraAgreementError) {
                console.error(`Erro ao criar acordo de alvará para o caso ${newCase.id}:`, alvaraAgreementError);
            } else if (alvaraAgreement) {
                // PASSO 7: Vincula o acordo de alvará ao processo
                await supabase.from('cases').update({ financial_agreement_id: alvaraAgreement.id }).eq('id', newCase.id);

                const installmentsToInsert = generateInstallments({
                    agreementId: alvaraAgreement.id,
                    totalAmount: Number(alvaraAgreement.total_amount),
                    downPayment: 0,
                    numberOfInstallments: 1,
                    startDate: alvaraAgreement.start_date.split('T')[0],
                });
                if (installmentsToInsert.length > 0) {
                    const { error: instErr } = await supabase.from('financial_installments').insert(installmentsToInsert);
                    if (instErr) {
                        console.error(`Erro ao criar parcela para o acordo de alvará ${alvaraAgreement.id}:`, instErr);
                        await supabase.from('financial_agreements').update({ notes: `${alvaraAgreement.notes || ''} [AVISO: Erro ao gerar parcela automaticamente.]` }).eq('id', alvaraAgreement.id);
                    }
                }
            }
        }
    }

      const { data: createdCaseWithParties } = await supabase
        .from("cases").select(`*, case_parties (role, entity_id, entities:entity_id (id, name))`)
        .eq('id', newCase.id).single();

      return normalizeParties(createdCaseWithParties);
    } catch (error: any) {
      console.error("[caseService.createCase] Erro ao criar caso:", error);
      if (error instanceof z.ZodError) {
        console.error("[caseService.createCase] Erros de validação:", error.errors);
      }
      throw error;
    }
}

// Atualiza um caso existente e gerencia o acordo financeiro associado
export async function updateCase(id: number, caseData: unknown, user: AuthUser) {
    const parsedData = z.object({}).passthrough().parse(caseData) as any;
    const supabase = createAdminClient();

    const { data: currentCase, error: fetchError } = await supabase
        .from("cases").select(`*, case_parties (role, entity_id)`)
        .eq("id", id).single();

    if (fetchError || !currentCase) {
        throw new Error("Não foi possível encontrar o caso para atualização.");
    }
    
    // Filtra os campos para garantir que apenas colunas da tabela 'cases' sejam enviadas no update.
    // O campo 'value' (Valor da Causa) foi removido intencionalmente para não permitir alterações pós-criação.
    const caseFields = ['title','case_number','status','priority','court','description','has_alvara','alvara_value'];
    const caseUpdateData: any = {};
    for (const key of Object.keys(parsedData)) {
      if (caseFields.includes(key)) {
        caseUpdateData[key] = parsedData[key] === "" ? null : parsedData[key];
      }
    }

    const { data: updatedCase, error: updateError } = await supabase
        .from("cases")
        .update(caseUpdateData)
        .eq("id", id)
        .select('*')
        .single();

    if (updateError) {
        console.error("Erro do Supabase ao atualizar o caso:", updateError);
        throw new Error("Não foi possível atualizar o caso.");
    }
    
    // Log de auditoria e histórico de status
    const statusChanged = currentCase.status !== updatedCase.status;
    if (statusChanged) {
        await supabase.from('case_status_history').insert({
            case_id: id, previous_main_status: currentCase.status, new_main_status: updatedCase.status,
            changed_by_user_id: user.id, changed_by_user_email: user.email,
        });
    }
    await logAudit('CASE_UPDATE', user, { caseId: updatedCase.id, updatedFields: Object.keys(parsedData) });

    // --- LÓGICA ROBUSTA PARA GERENCIAR ACORDOS FINANCEIROS ---
    const clientParty = currentCase.case_parties.find((p: any) => p.role === 'Cliente');
    const executedParty = currentCase.case_parties.find((p: any) => p.role === 'Executado');

    if (!clientParty || !executedParty) {
        console.warn(`[caseService.updateCase] Partes não encontradas para o caso ${id}. Ações financeiras ignoradas.`);
        return updatedCase;
    }
    
    // VERIFICA SE O CASO FOI ATUALIZADO PARA "ACORDO" COM ALVARÁ
    const becameAlvaraAgreement = updatedCase.status === 'Acordo' && updatedCase.has_alvara && updatedCase.alvara_value && (!currentCase.has_alvara || currentCase.status !== 'Acordo');
    
    if (becameAlvaraAgreement) {
        console.log(`Criando NOVO acordo financeiro para o ALVARÁ do caso ${id}`);
        const { data: newAlvara, error } = await supabase.from('financial_agreements').insert({
            case_id: id,
            debtor_id: executedParty.entity_id,
            creditor_id: clientParty.entity_id,
            agreement_type: 'A_VISTA',
            total_amount: Number(updatedCase.alvara_value),
            number_of_installments: 1,
            start_date: new Date().toISOString(),
            status: 'ATIVO',
            notes: `Acordo gerado a partir da definição de um ALVARÁ no caso #${id}.`
        }).select('id').single();
        
        if (newAlvara) {
            await supabase.from('cases').update({ financial_agreement_id: newAlvara.id }).eq('id', id);
        }
        
        if (error) console.error(`Erro ao CRIAR acordo de alvará para o caso ${id}:`, error);
    }
    
    return updatedCase;
}

// Deleta um caso e suas dependências (em cascata)
export async function deleteCase(id: number, user: AuthUser) {
    const supabase = createAdminClient();
    
    const { data: currentCase } = await supabase.from('cases').select('title, case_number').eq('id', id).single();
    
    if (currentCase) {
        await logAudit('CASE_DELETE', user, { caseId: id, title: currentCase.title });
    }

    const { error } = await supabase.from('cases').delete().eq('id', id);
    
    if (error) {
        console.error(`Erro ao deletar o caso ${id}:`, error);
        throw new Error("Não foi possível excluir o processo. Verifique se existem dependências ativas.");
    }
    return { success: true };
}

// Busca o histórico de status de um caso
export async function getCaseHistory(caseId: number) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("case_status_history").select("*").eq("case_id", caseId).order("changed_at", { ascending: false });
    
    if (error) {
        console.error(`Erro ao buscar histórico do caso ${caseId}:`, error);
        throw new Error("Não foi possível buscar o histórico do caso.");
    }
    return data;
}
