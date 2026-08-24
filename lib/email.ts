import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: parseInt(process.env.SMTP_PORT || '465') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    // 1. Tenta enviar via RESEND (Se a chave estiver configurada)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Cássio Miguel Advogados <sistema@cassiomiguel.com.br>`,
          to,
          subject,
          html
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('✅ E-mail enviado via Resend:', data.id);
        return data;
      } else {
        console.error('❌ Erro Resend:', data);
        return null;
      }
    }

    // 2. Fallback: Envia via SMTP antigo (Nodemailer)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ E-mail NÃO enviado. Nenhuma credencial (Resend ou SMTP) configurada:', { to, subject });
      return;
    }
    const info = await transporter.sendMail({
      from: `"Cássio Miguel Advogados" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('✅ E-mail enviado com sucesso via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro interno ao enviar e-mail:', error);
  }
}
