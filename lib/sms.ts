// lib/sms.ts

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(`[SMS Mock] Simulação de Envio. O número ${to} receberia a seguinte mensagem:\n"${message}"`);
    console.warn("[SMS Mock] Para enviar de verdade, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no seu .env.local.");
    return false;
  }

  if (!to) return false;

  // Limpa o número para conter apenas dígitos
  let cleanedTo = to.replace(/\D/g, '');
  
  // Se for celular do Brasil e não começar com 55, adicionamos
  if (cleanedTo.length >= 10 && cleanedTo.length <= 11 && !cleanedTo.startsWith('55')) {
    cleanedTo = '55' + cleanedTo;
  }
  
  const formattedTo = `+${cleanedTo}`;

  const isWhatsApp = true; // Define se vamos usar WhatsApp ou SMS normal
  const prefixTo = isWhatsApp ? 'whatsapp:' : '';
  const prefixFrom = isWhatsApp ? 'whatsapp:' : '';

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: `${prefixTo}${formattedTo}`,
          From: `${prefixFrom}${fromNumber}`,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Twilio] Erro ao enviar mensagem:", errorText);
      return false;
    }

    console.log(`[Twilio] Enviado com sucesso para ${formattedTo} via ${isWhatsApp ? 'WhatsApp' : 'SMS'}`);
    return true;
  } catch (error) {
    console.error("[SMS] Exceção ao enviar SMS:", error);
    return false;
  }
}
