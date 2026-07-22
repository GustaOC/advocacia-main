import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    let accessToken = cookieStore.get('google_access_token')?.value || request.headers.get('x-provider-token') || '';
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Sessão do Google expirada. Faça login com o Google novamente.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken');

    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.append('maxResults', '10');
    if (pageToken) url.searchParams.append('pageToken', pageToken);

    // 1. Tenta buscar a lista de e-mails
    let response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 2. Se o token estiver expirado (401) e tivermos o refresh token, tentamos renovar e buscar de novo
    if (response.status === 401 && refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenResponse.ok && tokenData.access_token) {
          accessToken = tokenData.access_token;
          
          // Refaz a requisição com o novo token
          response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro da API do Google: ${response.status}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    // 4. Busca metadados resumidos para cada e-mail
    const detailedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        try {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!detailRes.ok) return msg;
          const detailData = await detailRes.json();
          
          const subjectHeader = detailData.payload?.headers?.find((h: any) => h.name === 'Subject');
          const fromHeader = detailData.payload?.headers?.find((h: any) => h.name === 'From');
          
          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: detailData.snippet,
            subject: subjectHeader ? subjectHeader.value : '(Sem Assunto)',
            from: fromHeader ? fromHeader.value : 'Desconhecido',
            internalDate: detailData.internalDate
          };
        } catch (e) {
          return msg; // Se der falha num email específico, não trava toda a lista
        }
      })
    );

    // 5. Prepara a resposta json final
    const jsonResponse = NextResponse.json({
      messages: detailedMessages,
      nextPageToken: data.nextPageToken
    });
    
    // 6. Atualiza o cookie silenciosamente na máquina do usuário se tivermos acabado de renovar
    if (!cookieStore.get('google_access_token')?.value && accessToken) {
      jsonResponse.cookies.set({
        name: 'google_access_token',
        value: accessToken,
        path: '/',
        maxAge: 3500,
        httpOnly: true,
      });
    }

    return jsonResponse;
    
  } catch (error: any) {
    console.error('[GMAIL API ERROR]', error);
    
    // Se o erro for de permissão do Google, avisa o frontend com status 403
    if (error.message && error.message.includes('insufficient authentication scopes')) {
      return NextResponse.json(
        { error: 'Permissões insuficientes. Faça logout e login novamente marcando as caixas de permissão do Gmail.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}