import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = params;
    const { fileName, contentType } = await request.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const randomId = Math.random().toString(36).substring(2);
    const path = `${id}/${randomId}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('analysis-documents')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
