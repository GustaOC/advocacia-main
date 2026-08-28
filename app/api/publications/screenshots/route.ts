import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Data não informada' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Usando a chave de admin para ignorar regras de RLS do bucket!
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.storage.from('publications_screenshots').list(date);

    if (error) {
      throw error;
    }

    const urls = data
      .filter(f => f.name !== '.emptyFolderPlaceholder' && f.name.endsWith('.png'))
      .map(f => supabase.storage.from('publications_screenshots').getPublicUrl(`${date}/${f.name}`).data.publicUrl);

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Erro ao listar screenshots:", error);
    return NextResponse.json({ error: 'Erro interno ao carregar imagens' }, { status: 500 });
  }
}
