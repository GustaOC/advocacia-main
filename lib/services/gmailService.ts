export async function getGmailMessages(token: string, pageToken?: string) {
  if (!token) throw new Error("Token Google não encontrado");

  let url = "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10";
  if (pageToken) url += `&pageToken=${pageToken}`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Erro ao acessar Gmail");
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return { messages: [], nextPageToken: null };
  }

  const details = await Promise.all(
    messages.map(async (message: any) => {
      const detailRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      if (!detailRes.ok) return null;

      const fullMsg = await detailRes.json();
      const headers = fullMsg.payload?.headers || [];

      return {
        id: fullMsg.id,
        threadId: fullMsg.threadId,
        snippet: fullMsg.snippet,
        internalDate: fullMsg.internalDate,
        from: headers.find((h: any) => h.name === "From")?.value ?? "Desconhecido",
        subject: headers.find((h: any) => h.name === "Subject")?.value ?? "(Sem assunto)",
      };
    })
  );

  return {
    messages: details.filter(Boolean),
    nextPageToken: listData.nextPageToken || null,
  };
}

/**
 * Busca o conteúdo completo de um e-mail (incluindo o corpo em HTML/Texto)
 */
export async function getGmailMessageDetails(token: string, messageId: string) {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error("Erro ao buscar detalhes do e-mail");

  const fullMsg = await res.json();
  const attachments: { id: string; filename: string; mimeType: string }[] = [];
  const inlineImages: Record<string, string> = {};

  const getBody = (payload: any): string => {
    if (payload.body?.data) {
      const base64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      let htmlBody = '';
      let textBody = '';

      for (const part of payload.parts) {
        // Imagens inline (cid:)
        if (part.headers) {
          const contentId = part.headers.find((h: any) => h.name === 'Content-ID')?.value;
          if (contentId && part.body?.attachmentId) {
            const cleanId = contentId.replace(/[<>]/g, '');
            inlineImages[cleanId] = part.body.attachmentId;
          }
        }

        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
          });
          continue;
        }

        if (part.mimeType === 'text/html' && part.body?.data) {
          const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
          htmlBody = Buffer.from(base64, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
          textBody = Buffer.from(base64, 'base64').toString('utf-8');
        } else if (part.parts) {
          const nested = getBody(part);
          if (nested) htmlBody = nested;
        }
      }

      return htmlBody || textBody;
    }

    return "";
  };

  const headers = fullMsg.payload?.headers || [];
  let body = getBody(fullMsg.payload);

  // Substitui cid: por URLs da nossa API
  for (const [cid, attachmentId] of Object.entries(inlineImages)) {
    body = body.replace(
  /src="(https?:\/\/[^"]+)"/g,
  (match, url) => `src="/api/proxy-image?url=${encodeURIComponent(url)}"`
);
  }

  return {
    id: fullMsg.id,
    threadId: fullMsg.threadId,
    snippet: fullMsg.snippet,
    from: headers.find((h: any) => h.name === "From")?.value,
    subject: headers.find((h: any) => h.name === "Subject")?.value,
    date: headers.find((h: any) => h.name === "Date")?.value,
    messageIdHeader: headers.find((h: any) => h.name === "Message-ID")?.value,
    body,
    attachments,
  };
}

/**
 * Auxiliar para formatar e-mail no padrão RFC 2822 e codificar em Base64URL
 */
function encodeMessage({ to, subject, body, replyToId }: { 
  to: string; subject: string; body: string; replyToId?: string 
}) {
  const headers = [
    `Content-Type: text/html; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    `to: ${to}`,
    `subject: ${subject}`,
  ];

  if (replyToId) {
    // Para que o Gmail e outros clientes agrupem a resposta corretamente
    headers.push(`In-Reply-To: ${replyToId}`);
    headers.push(`References: ${replyToId}`);
  }

  const email = headers.join('\r\n') + '\r\n\r\n' + body;

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Envia um e-mail (ou responde a uma thread existente)
 */
export async function sendGmailMessage(
  token: string, 
  { to, subject, body, threadId, replyToId }: { 
    to: string; subject: string; body: string; threadId?: string; replyToId?: string 
  }
) {
  const raw = encodeMessage({ to, subject, body, replyToId });

  const res = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw,
        threadId, // Mantém a conversa agrupada se for uma resposta
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Erro ao enviar e-mail");
  }

  return res.json();
}

/**
 * Cria um rascunho de e-mail
 */
export async function createGmailDraft(
  token: string,
  { to, subject, body }: { to: string; subject: string; body: string }
) {
  const raw = encodeMessage({ to, subject, body });

  const res = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: { raw },
      }),
    }
  );

  if (!res.ok) throw new Error("Erro ao criar rascunho");
  return res.json();
}

/**
 * Move uma mensagem para a lixeira (Trash)
 */
export async function deleteGmailMessage(token: string, messageId: string) {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) throw new Error("Erro ao excluir e-mail");
  return true;
}
