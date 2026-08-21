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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ E-mail NÃO enviado. Credenciais SMTP não configuradas:', { to, subject });
      return;
    }
    const info = await transporter.sendMail({
      from: `"FAZ Adv" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('✅ E-mail enviado com sucesso:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
  }
}
