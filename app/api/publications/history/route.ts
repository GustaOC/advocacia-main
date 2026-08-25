import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    // Fetch recently updated publications to extract their history logs
    const { data: publications, error } = await supabase
      .from('publications')
      .select(`id, title, description, updated_at`)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error("Erro ao buscar publicações:", error);
      throw error;
    }

    let allHistory: any[] = [];

    publications.forEach(pub => {
      if (pub.description) {
        const historyMatch = pub.description.match(/<!-- HISTORY: ([\\s\\S]*?) -->/);
        if (historyMatch) {
          try {
            const history = JSON.parse(historyMatch[1]);
            history.forEach((event: any) => {
              allHistory.push({
                ...event,
                publication_id: pub.id,
                publication_title: pub.title
              });
            });
          } catch (e) {}
        }
      }
    });

    // Sort flattened history by timestamp desc
    allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to the last 200 events overall
    if (allHistory.length > 200) {
      allHistory = allHistory.slice(0, 200);
    }

    return NextResponse.json(allHistory);
  } catch (error: any) {
    console.error("Erro GET /api/publications/history:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao buscar histórico." },
      { status: 500 }
    );
  }
}
