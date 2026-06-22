import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/lib/services/financialService';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    if (!yearStr || !monthStr) {
      return NextResponse.json(
        { message: 'Parâmetros year e month são obrigatórios.' },
        { status: 400 }
      );
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json(
        { message: 'Parâmetros year e month devem ser números válidos.' },
        { status: 400 }
      );
    }

    const payments = await FinancialService.getReceivedPaymentsByMonthYear(year, month, user);
    
    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('Erro ao buscar recebimentos do mês:', error);
    return NextResponse.json(
      { message: 'Erro interno ao buscar pagamentos.', error: error.message },
      { status: 500 }
    );
  }
}