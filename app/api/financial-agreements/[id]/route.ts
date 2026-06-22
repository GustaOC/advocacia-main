import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { FinancialService } from '@/lib/services/financialService';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const agreement = await FinancialService.getAgreementWithDetails(params.id);
    if (!agreement) {
      return NextResponse.json({ message: 'Acordo não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(agreement);
  } catch (error: any) {
    console.error(`Erro ao buscar acordo ${params.id}:`, error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const updatedAgreement = await FinancialService.updateFinancialAgreement(params.id, body, user);

    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    console.error(`Erro ao atualizar acordo ${params.id}:`, error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const result = await FinancialService.deleteFinancialAgreement(params.id, user);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Erro ao deletar acordo ${params.id}:`, error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}