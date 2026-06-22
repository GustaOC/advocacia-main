import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCaseById, updateCase, deleteCase } from '@/lib/services/caseService';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const data = await getCaseById(params.id);
    if (!data) return NextResponse.json({ message: 'Processo não encontrado' }, { status: 404 });
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const updatedCase = await updateCase(Number(params.id), body, user);

    return NextResponse.json(updatedCase);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

    const caseId = parseInt(params.id, 10);
    if (isNaN(caseId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

    await deleteCase(caseId, user);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}