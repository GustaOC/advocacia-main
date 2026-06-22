// lib/services/financialService.ts - SEU CÓDIGO ORIGINAL COM CORREÇÕES

import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { AuthUser } from "@/lib/auth"; // <-- 1. CORREÇÃO: ADICIONADA IMPORTAÇÃO FALTANTE
import { Installment, Payment, PaymentSchema, EnhancedAgreement } from "@/lib/schemas";

// Função auxiliar para auditoria
async function logAudit(action: string, user: AuthUser, data: any) {
  try {
    console.log(`📝 [AUDIT] ${action}:`, { userId: user.id, data });
  } catch (e) {
    console.warn("⚠️ Falha ao registrar auditoria:", e);
  }
}

/** YYYY-MM-DD baseado na data local (sem UTC) */
function toIsoDateOnly(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converte string | Date para Date (mantém compat c/ tipos existentes) */
function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Normaliza status para 'PENDENTE' | 'PAGA' | 'ATRASADA' */
function normalizeStatus(raw?: string): "PENDENTE" | "PAGA" | "ATRASADA" {
  const s = String(raw ?? "").toUpperCase();
  if (s === "PAGO" || s === "PAGA" || s === "PAID" || s === 'CONCLUIDO') return "PAGA";
  if (s === "ATRASADO" || s === "ATRASADA" || s === "OVERDUE") return "ATRASADA";
  return "PENDENTE";
}

/** DTO usado pelo front em Parcelas do Mês */
export type MonthlyInstallmentDTO = {
  id: number | string;
  due_date: string; // YYYY-MM-DD
  amount: number;
  status: "PENDENTE" | "PAGA" | "ATRASADA";
  agreement: {
    id: number | string;
    cases: {
      case_number: string | null;
      title: string | null;
      case_parties?: { role: string; entities: { name: string } }[];
    } | null;
    debtor: { name: string } | null;
  } | null;
};

// <-- 2. CORREÇÃO: TIPO MOVIDO PARA FORA DA CLASSE
/** DTO para a interface de Alvará no frontend. */
export type AlvaraDTO = {
    id: number;
    case_id: number;
    case_number: string | null;
    value: number;
    received: boolean;
    issue_date: string; // YYYY-MM-DD
    received_date?: string | null; // YYYY-MM-DD
    creditor_name: string | null;
    court: string | null;
};

/** DTO para a interface de Recebidos no frontend. */
export type ReceivedPaymentDTO = {
  id: string | number;
  payment_date: string;
  amount_paid: number;
  payment_method: string | null;
  installment_number: number;
  client_name: string;
  case_number: string | null;
};

export class FinancialService {
  /**
   * PARCELAS POR MÊS/ANO
   * - Busca parcelas no intervalo [1º dia, 1º dia do mês seguinte) em datas locais
   * - Resolve relacionamentos com queries planas (sem nested select)
   * - Tolera falhas parciais (segue com dados parciais)
   */
  static async getInstallmentsByMonthYear(
    year: number,
    month: number,
    _authUser: AuthUser
  ): Promise<MonthlyInstallmentDTO[]> {
    const supabase = createAdminClient();

    // 1) Janela de datas em YYYY-MM-DD (UTC) para consistência com a inserção
    const startOfMonthUTC = new Date(Date.UTC(year, month - 1, 1));
    const startOfNextMonthUTC = new Date(Date.UTC(year, month, 1));

    const startStr = startOfMonthUTC.toISOString().slice(0, 10);
    const endStr = startOfNextMonthUTC.toISOString().slice(0, 10);

    console.log(`🔍 Buscando parcelas do período [${startStr}, ${endStr})`);

    // 2) Parcelas do mês (sem QUALQUER nested select)
    const { data: installments, error: instError } = await supabase
      .from("financial_installments")
      .select("id, agreement_id, installment_number, amount, due_date, status")
      .gte("due_date", startStr)
      .lt("due_date", endStr)
      .order("due_date", { ascending: true });

    if (instError) {
      console.error("❌ Erro ao buscar parcelas do mês:", instError);
      throw new Error("Não foi possível buscar as parcelas do mês.");
    }

    const safeInstallments = (installments ?? []) as any[];
    console.log(
      `📊 Encontradas ${safeInstallments.length} parcelas para ${month}/${year}`
    );

    // 3) Resolver relacionamentos com consultas planas
    const agreementIds = Array.from(
      new Set(safeInstallments.map((i) => i.agreement_id).filter(Boolean))
    ) as string[];

    const agreementsById: Record<
      string,
      { id: string; case_id: number | null; debtor_id: string | null }
    > = {};
    const casesById: Record<
      number,
      { case_number: string | null; title: string | null }
    > = {};
    const debtorNamesById: Record<string, string> = {};
    const casePartiesByCaseId: Record<
      number,
      Array<{ role: string; name: string }>
    > = {};

    if (agreementIds.length > 0) {
      // 3.1) financial_agreements -> chaves mínimas
      const { data: ags, error: agErr } = await supabase
        .from("financial_agreements")
        .select("id, case_id, debtor_id")
        .in("id", agreementIds);
      if (agErr) {
        console.warn(
          "⚠️ Falha ao buscar acordos (seguindo com dados parciais):",
          agErr
        );
      } else {
        for (const ag of ags ?? []) {
          agreementsById[String(ag.id)] = {
            id: String(ag.id),
            case_id: ag.case_id ? Number(ag.case_id) : null,
            debtor_id: ag.debtor_id ? String(ag.debtor_id) : null,
          };
        }
      }

      // 3.2) cases -> número e título
      const caseIds = Array.from(
        new Set(Object.values(agreementsById).map((a) => a.case_id).filter(Boolean))
      ) as number[];
      if (caseIds.length > 0) {
        const { data: cs, error: cErr } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .in("id", caseIds);
        if (cErr) {
          console.warn("⚠️ Falha ao buscar processos:", cErr);
        } else {
          for (const c of cs ?? []) {
            casesById[Number(c.id)] = {
              case_number: c.case_number ?? null,
              title: c.title ?? null,
            };
          }
        }

        // 3.3) case_parties -> papeis + ids de entidades
        const { data: cps, error: cpErr } = await supabase
          .from("case_parties")
          .select("case_id, role, entity_id")
          .in("case_id", caseIds);
        if (cpErr) {
          console.warn("⚠️ Falha ao buscar partes do processo:", cpErr);
        } else {
          const entityIds = Array.from(
            new Set((cps ?? []).map((p) => p.entity_id).filter(Boolean))
          ) as string[];

          // 3.3.1) entities -> nomes das entidades
          let entitiesById: Record<string, string> = {};
          if (entityIds.length > 0) {
            const { data: ents, error: eErr } = await supabase
              .from("entities")
              .select("id, name")
              .in("id", entityIds);
            if (eErr) {
              console.warn("⚠️ Falha ao buscar entidades (nomes):", eErr);
            } else {
              for (const e of ents ?? []) {
                entitiesById[String(e.id)] = e.name ?? "";
              }
            }
          }

          // montar map por case_id
          for (const p of cps ?? []) {
            const cid = Number(p.case_id);
            const name = p.entity_id
              ? entitiesById[String(p.entity_id)] ?? ""
              : "";
            if (!casePartiesByCaseId[cid]) casePartiesByCaseId[cid] = [];
            casePartiesByCaseId[cid].push({ role: p.role, name });
          }
        }
      }

      // 3.4) devedores -> entities (nomes)
      const debtorIds = Array.from(
        new Set(
          Object.values(agreementsById).map((a) => a.debtor_id).filter(Boolean)
        )
      ) as string[];
      if (debtorIds.length > 0) {
        const { data: debtors, error: dErr } = await supabase
          .from("entities")
          .select("id, name")
          .in("id", debtorIds);
        if (dErr) {
          console.warn("⚠️ Falha ao buscar devedores:", dErr);
        } else {
          for (const d of debtors ?? []) {
            debtorNamesById[String(d.id)] = d.name ?? "";
          }
        }
      }
    }

    // 4) Normalização final -> MonthlyInstallmentDTO[]
    const result: MonthlyInstallmentDTO[] = safeInstallments.map((it) => {
      const ag = it.agreement_id
        ? agreementsById[String(it.agreement_id)]
        : undefined;
      const caseId = ag?.case_id ?? null;
      const debtorId = ag?.debtor_id ?? null;

      return {
        id: it.id,
        due_date:
          typeof it.due_date === "string"
            ? it.due_date.split("T")[0]
            : toIsoDateOnly(it.due_date),
        amount: Number(it.amount) || 0,
        status: normalizeStatus(it.status),
        agreement: ag
          ? {
            id: ag.id,
            cases: caseId
              ? {
                case_number: casesById[caseId]?.case_number ?? null,
                title: casesById[caseId]?.title ?? null,
                case_parties: (casePartiesByCaseId[caseId] ?? []).map(
                  (p) => ({
                    role: p.role,
                    entities: { name: p.name },
                  })
                ),
              }
              : null,
            debtor: debtorId
              ? { name: debtorNamesById[debtorId] ?? "" }
              : null,
          }
          : null,
      };
    });

    console.log(`✅ Parcelas normalizadas: ${result.length}`);
    return result;
  }

  /**
   * PAGAMENTOS RECEBIDOS POR MÊS/ANO
   */
  static async getReceivedPaymentsByMonthYear(
    year: number,
    month: number,
    _authUser: AuthUser
  ): Promise<ReceivedPaymentDTO[]> {
    const supabase = createAdminClient();

    // 1) Janela de datas
    const startOfMonthUTC = new Date(Date.UTC(year, month - 1, 1));
    const startOfNextMonthUTC = new Date(Date.UTC(year, month, 1));

    const startStr = startOfMonthUTC.toISOString().slice(0, 10);
    const endStr = startOfNextMonthUTC.toISOString().slice(0, 10);

    // 2) Pagamentos do mês
    const { data: payments, error: payError } = await supabase
      .from("financial_payments")
      .select("id, installment_id, amount_paid, payment_date, payment_method")
      .gte("payment_date", startStr)
      .lt("payment_date", endStr)
      .order("payment_date", { ascending: false });

    if (payError) {
      console.error("❌ Erro ao buscar recebimentos do mês:", payError);
      throw new Error("Não foi possível buscar os recebimentos do mês.");
    }

    const safePayments = (payments ?? []) as any[];

    // 3) Resolver relacionamentos sem nested select para evitar bugs de PostgREST
    const installmentIds = Array.from(
      new Set(safePayments.map((p) => p.installment_id).filter(Boolean))
    ) as string[];

    const installmentsById: Record<string, { agreement_id: string; installment_number: number }> = {};
    if (installmentIds.length > 0) {
      const { data: insts } = await supabase
        .from("financial_installments")
        .select("id, agreement_id, installment_number")
        .in("id", installmentIds);
        
      for (const inst of insts ?? []) {
        installmentsById[String(inst.id)] = {
          agreement_id: String(inst.agreement_id),
          installment_number: Number(inst.installment_number),
        };
      }
    }

    const agreementIds = Array.from(
      new Set(Object.values(installmentsById).map((i) => i.agreement_id).filter(Boolean))
    ) as string[];

    const agreementsById: Record<string, { case_id: number | null; debtor_id: string | null }> = {};
    if (agreementIds.length > 0) {
      const { data: ags } = await supabase
        .from("financial_agreements")
        .select("id, case_id, debtor_id")
        .in("id", agreementIds);
        
      for (const ag of ags ?? []) {
        agreementsById[String(ag.id)] = {
          case_id: ag.case_id ? Number(ag.case_id) : null,
          debtor_id: ag.debtor_id ? String(ag.debtor_id) : null,
        };
      }
    }

    const caseIds = Array.from(
      new Set(Object.values(agreementsById).map((a) => a.case_id).filter(Boolean))
    ) as number[];
    const debtorIds = Array.from(
      new Set(Object.values(agreementsById).map((a) => a.debtor_id).filter(Boolean))
    ) as string[];

    const casesById: Record<number, string | null> = {};
    if (caseIds.length > 0) {
      const { data: cs } = await supabase
        .from("cases")
        .select("id, case_number")
        .in("id", caseIds);
      for (const c of cs ?? []) {
        casesById[Number(c.id)] = c.case_number ?? null;
      }
    }

    const entitiesById: Record<string, string> = {};
    if (debtorIds.length > 0) {
      const { data: ents } = await supabase
        .from("entities")
        .select("id, name")
        .in("id", debtorIds);
      for (const e of ents ?? []) {
        entitiesById[String(e.id)] = e.name ?? "Desconhecido";
      }
    }

    // 4) Normalizar retorno
    return safePayments.map((p) => {
      const inst = p.installment_id ? installmentsById[String(p.installment_id)] : undefined;
      const ag = inst ? agreementsById[inst.agreement_id] : undefined;
      
      return {
        id: p.id,
        payment_date: typeof p.payment_date === "string" ? p.payment_date.split("T")[0] : toIsoDateOnly(p.payment_date),
        amount_paid: Number(p.amount_paid) || 0,
        payment_method: p.payment_method ?? null,
        installment_number: inst?.installment_number ?? 0,
        client_name: ag?.debtor_id ? (entitiesById[ag.debtor_id] ?? "Desconhecido") : "Desconhecido",
        case_number: ag?.case_id ? (casesById[ag.case_id] ?? null) : null,
      };
    });
  }

  /**
   * DEBUG: Lista todas as parcelas e filtra por mês/ano no Node
   */
  static async debugInstallments(year: number, month: number) {
    const supabase = createAdminClient();

    console.log("🔍 [DEBUG] Buscando TODAS as parcelas do banco...");
    const { data: allInstallments, error } = await supabase
      .from("financial_installments")
      .select("id, agreement_id, installment_number, amount, due_date, status")
      .order("due_date", { ascending: true });

    if (error) {
      console.error("❌ [DEBUG] Erro ao buscar parcelas:", error);
      return [];
    }

    console.log(`📊 [DEBUG] Total de parcelas no banco: ${allInstallments?.length ?? 0}`);

    const monthInstallments =
      allInstallments?.filter((inst) => {
        try {
          const d = new Date(inst.due_date);
          return (
            d.getFullYear() === year && d.getMonth() + 1 === month
          );
        } catch {
          return false;
        }
      }) ?? [];

    console.log(`📅 [DEBUG] Parcelas do mês ${month}/${year}: ${monthInstallments.length}`);
    console.log(`📊 [DEBUG] Acordos com parcelas neste mês:`,
      [...new Set(monthInstallments.map((i) => i.agreement_id))]
    );

    return monthInstallments;
  }

  /**
   * Parcelas por acordo
   */
  static async getInstallmentsByAgreement(
    agreementId: string
  ): Promise<Installment[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("financial_installments")
      .select(
        "id, agreement_id, installment_number, amount, due_date, status, created_at, updated_at"
      )
      .eq("agreement_id", agreementId)
      .order("installment_number", { ascending: true });

    if (error) {
      console.error(
        `Erro ao buscar parcelas para o acordo ${agreementId}:`,
        error
      );
      throw new Error("Não foi possível buscar as parcelas.");
    }

    return ((data as any[]) || []).map((x: any) => ({
      ...x,
      due_date: toDate(x.due_date),
    })) as Installment[];
  }

  /**
   * Buscar parcela por ID (usado na validação de pagamentos)
   */
  static async getInstallmentById(installmentId: string): Promise<Installment | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("financial_installments")
      .select("id, agreement_id, installment_number, amount, due_date, status, created_at, updated_at")
      .eq("id", installmentId)
      .single();

    if (error) {
      console.error(`Erro ao buscar parcela ${installmentId}:`, error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      due_date: toDate(data.due_date),
    } as Installment;
  }

  /**
   * Registrar pagamento de parcela (assinatura compatível com a rota de API)
   */
  static async recordPaymentForInstallment(
    data: z.infer<typeof PaymentSchema>,
    authUser: AuthUser
  ): Promise<Payment> {
    return this.recordPayment(authUser, data);
  }

  /**
   * Registrar pagamento de parcela (método interno)
   * - Insere pagamento
   * - Atualiza status da parcela (best effort)
   * - Registra auditoria (best effort)
   */
  static async recordPayment(
    authUser: AuthUser,
    data: z.infer<typeof PaymentSchema>
  ): Promise<Payment> {
    const parsed = PaymentSchema.parse(data);
    const supabase = createAdminClient();

    // 1) Inserir pagamento
    const { data: inserted, error: insertErr } = await supabase
      .from("financial_payments")
      .insert([
        {
          installment_id: parsed.installment_id,
          amount_paid: Number(parsed.amount_paid),
          payment_date:
            parsed.payment_date instanceof Date
              ? parsed.payment_date.toISOString()
              : new Date(
                parsed.payment_date as unknown as string
              ).toISOString(),
          payment_method: parsed.payment_method,
          notes: parsed.notes ?? null,
        },
      ])
      .select(
        "id, installment_id, amount_paid, payment_date, payment_method, notes, created_at"
      )
      .single();

    if (insertErr || !inserted) {
      console.error("Erro ao registrar pagamento:", insertErr);
      throw new Error("Não foi possível registrar o pagamento.");
    }

    // 2) Atualizar status da parcela (best effort)
    try {
      const { data: instData, error: instErr } = await supabase
        .from("financial_installments")
        .select("amount, agreement_id")
        .eq("id", parsed.installment_id)
        .single();

      if (!instErr && instData) {
        const installmentAmount = Number(instData.amount ?? 0);
        const paidAmount = Number(parsed.amount_paid);
        const newStatus = paidAmount >= installmentAmount ? "PAGA" : "PENDENTE";

        const { error: updErr } = await supabase
          .from("financial_installments")
          .update({ status: newStatus })
          .eq("id", parsed.installment_id);

        if (updErr) {
          console.warn(
            "⚠️ Pagamento inserido, mas falhou atualização de status:",
            updErr
          );
        } else {
          // Check if all installments are paid to auto-close the agreement
          const { data: allInsts, error: allInstsErr } = await supabase
            .from("financial_installments")
            .select("status, agreement_id")
            .eq("agreement_id", instData.agreement_id);

          if (!allInstsErr && allInsts && allInsts.length > 0) {
            const allPaid = allInsts.every((i: any) => i.status === 'PAGA');
            if (allPaid) {
              const { error: agErr } = await supabase
                .from("financial_agreements")
                .update({ status: 'CONCLUIDO' })
                .eq("id", instData.agreement_id);

              if (!agErr) {
                await FinancialService.syncAgreementStatusToCase(instData.agreement_id, 'CONCLUIDO', authUser);
              }
            }
          }
        }
      } else {
        console.warn(
          "⚠️ Pagamento inserido, mas não foi possível ler o valor da parcela:",
          instErr
        );
      }
    } catch (e) {
      console.warn(
        "⚠️ Pagamento inserido, mas ocorreu erro inesperado ao atualizar status:",
        e
      );
    }

    // 3) Auditoria (best effort)
    try {
      await logAudit("PAYMENT_RECORDED", authUser, {
        installmentId: parsed.installment_id,
        amount: Number(parsed.amount_paid),
      });
    } catch (e) {
      console.warn("⚠️ Falha ao registrar auditoria de pagamento:", e);
    }

    // 4) Retorno tipado
    return {
      ...inserted,
      payment_date: toDate(inserted.payment_date),
    } as Payment;
  }
  
  // <-- 3. ADIÇÃO: NOVO MÉTODO PARA BUSCAR ALVARÁS
  /**
   * BUSCA DE ALVARÁS
   * - Identifica alvarás como acordos do tipo 'A_VISTA'.
   * - Junta informações do processo (cases) e do credor (entities).
   */
  static async getAlvaras(
    _authUser: AuthUser
  ): Promise<AlvaraDTO[]> {
    const supabase = createAdminClient();

    console.log("🔍 Buscando acordos do tipo 'A_VISTA' (alvarás)...");

    const { data, error } = await supabase
      .from("financial_agreements")
      .select(`
        id,
        case_id,
        total_amount,
        status,
        start_date,
        updated_at,
        notes,
        cases:case_id (
          case_number
        ),
        creditor:creditor_id (
          name
        )
      `)
      .eq('agreement_type', 'A_VISTA'); // Filtro principal para identificar alvarás

    if (error) {
      console.error("❌ Erro ao buscar alvarás no banco de dados:", error);
      throw new Error("Não foi possível carregar os alvarás.");
    }

    if (!data) {
      return [];
    }
    
    console.log(`📊 Encontrados ${data.length} alvarás.`);

    // Mapeia o resultado da consulta para o formato esperado pelo frontend (AlvaraDTO)
    const result: AlvaraDTO[] = data.map((ag: any) => ({
      id: ag.id,
      case_id: ag.case_id,
      case_number: ag.cases?.case_number ?? 'N/A',
      value: Number(ag.total_amount) || 0,
      received: ['PAGO', 'pago', 'CONCLUIDO'].includes(ag.status), 
      issue_date: toIsoDateOnly(ag.start_date),
      received_date: ['PAGO', 'pago', 'CONCLUIDO'].includes(ag.status) ? (ag.updated_at ? toIsoDateOnly(ag.updated_at) : toIsoDateOnly(new Date())) : null,
      creditor_name: ag.creditor?.name ?? 'Não informado',
      court: null, // Campo não disponível no schema atual
    }));

    return result;
  }

  // --- MÉTODOS ADICIONADOS ---

  /**
   * Busca um acordo financeiro específico pelo ID com detalhes.
   * @param agreementId - O UUID do acordo.
   */
  static async getAgreementWithDetails(agreementId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('financial_agreements')
      .select(`
        *,
        debtor:debtor_id (*),
        creditor:creditor_id (*),
        cases:case_id (case_number, title),
        installments:financial_installments (*)
      `)
      .eq('id', agreementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error(`Erro ao buscar acordo ${agreementId}:`, error);
      throw new Error("Não foi possível buscar os detalhes do acordo.");
    }

    return data;
  }

  /**
   * Sincroniza o status de um acordo financeiro com o caso associado
   * @param agreementId - O UUID do acordo
   * @param newStatus - O novo status do acordo
   * @param user - Usuário realizando a ação
   */
  static async syncAgreementStatusToCase(agreementId: string, newStatus: string, user: AuthUser) {
    const supabase = createAdminClient();

    // Buscar o case associado
    const { data: agreement } = await supabase
      .from('financial_agreements')
      .select('case_id')
      .eq('id', agreementId)
      .single();

    if (!agreement?.case_id) return;

    let caseStatusToUpdate = null;
    if (newStatus === 'CONCLUIDO') caseStatusToUpdate = 'Pago';
    else if (newStatus === 'CANCELADO') caseStatusToUpdate = 'Extinto';
    else if (newStatus === 'ATIVO') caseStatusToUpdate = 'Em andamento';

    if (caseStatusToUpdate) {
      const { data: currentCase } = await supabase
        .from('cases')
        .select('status')
        .eq('id', agreement.case_id)
        .single();

      if (currentCase && currentCase.status !== caseStatusToUpdate) {
        await supabase
          .from('cases')
          .update({ status: caseStatusToUpdate })
          .eq('id', agreement.case_id);

        // Registrar no histórico do caso
        await supabase.from('case_status_history').insert({
          case_id: agreement.case_id,
          previous_main_status: currentCase.status,
          new_main_status: caseStatusToUpdate,
          changed_by_user_id: user.id,
          changed_by_user_email: user.email,
        });

        await logAudit('CASE_STATUS_SYNCED_FROM_FINANCIAL', user, {
          caseId: agreement.case_id,
          previousStatus: currentCase.status,
          newStatus: caseStatusToUpdate
        });
      }
    }
  }

  /**
   * Atualiza um acordo financeiro.
   * @param agreementId - O UUID do acordo a ser atualizado.
   * @param data - Os dados para atualizar.
   * @param user - O usuário autenticado que realiza a ação.
   */
  static async updateFinancialAgreement(agreementId: string, data: Partial<EnhancedAgreement>, user: AuthUser) {
    const supabase = createAdminClient();
    const { data: updatedAgreement, error } = await supabase
      .from('financial_agreements')
      .update(data as any)
      .eq('id', agreementId)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar acordo ${agreementId}:`, error);
      throw new Error("Não foi possível atualizar o acordo financeiro.");
    }

    // Sincronizar o status com o case associado, caso o status tenha sido alterado
    if (data.status) {
      await this.syncAgreementStatusToCase(agreementId, data.status, user);
    }

    await logAudit('FINANCIAL_AGREEMENT_UPDATE', user, {
        agreementId,
        updatedFields: Object.keys(data)
    });

    return updatedAgreement;
  }

  /**
   * Deleta um acordo financeiro e suas parcelas associadas.
   * @param agreementId - O UUID do acordo a ser deletado.
   * @param user - O usuário autenticado que realiza a ação.
   */
  static async deleteFinancialAgreement(agreementId: string, user: AuthUser) {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('financial_agreements')
      .delete()
      .eq('id', agreementId);

    if (error) {
      console.error(`Erro ao deletar acordo ${agreementId}:`, error);
      throw new Error("Não foi possível deletar o acordo. Verifique se existem pagamentos associados.");
    }

    await logAudit('FINANCIAL_AGREEMENT_DELETE', user, { agreementId });

    return { message: "Acordo deletado com sucesso." };
  }
}