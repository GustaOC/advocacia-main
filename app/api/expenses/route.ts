import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';
import { apiError, validateAndParseBody } from '@/lib/api-helpers';

// Schema de validação para a criação de uma despesa
const CreateExpenseSchema = z.object({
  description: z.string().min(1, { message: "A descrição não pode ser vazia." }),
  category: z.string().min(1, { message: "A categoria é obrigatória." }),
  value: z.number().gt(0, { message: "O valor deve ser maior que zero." }),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), { message: "Formato de data inválido." }),
  due_date: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  duration_months: z.number().min(1).default(1).optional(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('financial_expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Erro ao buscar despesas:", error);
    return apiError(error.message || 'Erro interno do servidor');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError('Não autorizado', 401);

    const { data: parsedBody, error: validationError } = await validateAndParseBody(req, CreateExpenseSchema);
    if (validationError) {
      return validationError;
    }
if (!parsedBody) {
      return apiError('Dados não fornecidos', 400);
    }   
   const { duration_months, ...body } = parsedBody as any;
    const duration = duration_months || 1;

    const supabase = createSupabaseServerClient();
    
    if (duration === 1) {
      const { data, error } = await supabase.from('financial_expenses').insert(body).select().single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Lógica para criar despesas recorrentes somando os meses
      const expensesToInsert = [];
      const baseDate = new Date(body.date + 'T12:00:00Z'); // Evitar que o fuso horário atrase 1 dia

      for (let i = 0; i < duration; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setUTCMonth(currentDate.getUTCMonth() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        expensesToInsert.push({
          ...body,
          date: dateStr,
          description: `${body.description} (${i + 1}/${duration})`,
        });
      }

      const { data, error } = await supabase.from('financial_expenses').insert(expensesToInsert).select();
      if (error) throw error;
      return NextResponse.json(data[0] || {});
    }
  } catch (error: any) {
    console.error("Erro ao criar despesa:", error);
    return apiError(error.message || 'Erro interno do servidor');
  }
}