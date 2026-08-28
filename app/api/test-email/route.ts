import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to");

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = port === 465;

    if (!to) {
      return NextResponse.json({ 
        error: "Adicione ?to=seuemail@gmail.com na URL para testar", 
        config: {
          host,
          port,
          secure,
          user_cadastrado: !!process.env.SMTP_USER,
          pass_cadastrado: !!process.env.SMTP_PASS,
        }
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"FAZ Adv Debug" <${process.env.SMTP_USER}>`,
      to,
      subject: "Teste de E-mail FAZ Adv",
      html: "<h1>Se você recebeu isso, a API de email está funcionando perfeitamente!</h1>",
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: error.stack,
      config: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '465'),
          user: process.env.SMTP_USER
      }
    }, { status: 500 });
  }
}