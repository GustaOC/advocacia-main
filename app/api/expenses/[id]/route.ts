import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';
import { apiError, validateAndParseBody } from '@/lib/api-helpers';

// Schema for updating an expense
const UpdateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  value: z.number().gt(0).optional(),
  date: z.string().refine((d) => !isNaN(Date.parse(d))).optional(),
  status: z.enum(['pending', 'paid']).optional(),
  due_date: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).partial();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError('Não autorizado', 401);

    const { data: body, error: validationError } = await validateAndParseBody(req, UpdateExpenseSchema);
    if (validationError) {
      return validationError;
    }
    if (!body || Object.keys(body).length === 0) {
      return apiError('Nenhum dado para atualizar foi fornecido.', 400);
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('financial_expenses').update(body).eq('id', params.id).select().single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao atualizar despesa:", error);
    return apiError(error.message || 'Erro interno do servidor');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError('Não autorizado', 401);

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('financial_expenses').delete().eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Despesa excluída com sucesso' }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao excluir despesa:", error);
    return apiError(error.message || 'Erro interno do servidor');
  }
}