import { NextRequest, NextResponse } from 'next/server';
import { getGmailMessageDetails } from '@/lib/services/gmailService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('x-provider-token') || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 });
    }

    const message = await getGmailMessageDetails(token, params.id);
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}