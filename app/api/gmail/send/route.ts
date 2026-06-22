import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const providerToken = req.headers.get('x-provider-token');

    if (!providerToken || providerToken === "") {
      return NextResponse.json({ error: "Token do Google não encontrado. Saia do sistema e faça login novamente utilizando o botão do Google." }, { status: 403 });
    }

    const formData = await req.formData();
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const threadId = formData.get('threadId') as string | null;
    const files = formData.getAll('attachments') as File[];

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Campos 'to', 'subject' e 'message' são obrigatórios." }, { status: 400 });
    }

    // Converter arquivos para Base64
    const attachments = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        content: buffer.toString('base64')
      });
    }

    // Montar o e-mail no formato MIME com suporte a anexos e HTML
    const boundary = 'bound_' + Date.now().toString(16) + Math.random().toString(16).substring(2);
    let rawEmail = '';
    const headers = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      `MIME-Version: 1.0`
    ];

    if (attachments.length > 0) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      rawEmail = headers.join('\r\n') + '\r\n\r\n';
      
      // Parte do corpo do E-mail (Texto)
      rawEmail += `--${boundary}\r\n`;
      rawEmail += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
      rawEmail += `${message.replace(/\n/g, '<br/>')}\r\n\r\n`;

      // Partes de Arquivos (Anexos)
      for (const att of attachments) {
        rawEmail += `--${boundary}\r\n`;
        rawEmail += `Content-Type: ${att.mimeType}; name="${att.filename}"\r\n`;
        rawEmail += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
        rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
        
        // Gmail exige que base64 de arquivos seja dividido em blocos de 76 caracteres
        const chunked = att.content.match(/.{1,76}/g)?.join('\r\n') || '';
        rawEmail += `${chunked}\r\n\r\n`;
      }
      rawEmail += `--${boundary}--\r\n`;
    } else {
      // Se não houver anexos envia formato normal HTML
      headers.push(`Content-Type: text/html; charset="UTF-8"`);
      rawEmail = headers.join('\r\n') + '\r\n\r\n';
      rawEmail += message.replace(/\n/g, '<br/>');
    }
    
    // Transformar para base64url como exigido pela API do Gmail
    const encodedEmail = Buffer.from(rawEmail).toString('base64url');

    const sendBody: any = { raw: encodedEmail };
    if (threadId) {
      sendBody.threadId = threadId; // Envia junto na mesma thread caso seja uma resposta
    }

    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      return NextResponse.json({ error: "Falha ao enviar e-mail pelo Gmail", details: errorData }, { status: gmailResponse.status });
    }

    const data = await gmailResponse.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Erro na rota /api/gmail/send:", error);
    return NextResponse.json({ error: "Erro interno do servidor.", details: error.message }, { status: 500 });
  }
}