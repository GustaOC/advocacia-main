/**
 * Utilitário para envio de SMS
 */

export async function sendSMS(numero: string, mensagem: string) {
  try {
    const apiKey = process.env.SMS_BARATO_KEY;
    if (!apiKey) {
      console.warn("⚠️ SMS_BARATO_KEY não configurada. O SMS não será enviado.");
      return false;
    }

    const cleanNumber = numero.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 10) return false;

    // Se o cliente definiu a URL customizada na Vercel, usamos ela, caso contrário tentamos o padrão
    const customUrl = process.env.SMS_BARATO_URL;
    
    let url = "";
    if (customUrl) {
      // Exemplo de url customizada: https://api.site.com/send?key={key}&number={number}&msg={msg}
      url = customUrl
        .replace("{key}", apiKey)
        .replace("{token}", apiKey)
        .replace("{number}", cleanNumber)
        .replace("{msg}", encodeURIComponent(mensagem));
    } else {
      // Tenta usar a plataforma SMS DEV/SMS Barato padrão
      // Tenta o sistema81, muito comum em revendas
      const params = new URLSearchParams({
        token: apiKey,
        number: cleanNumber,
        msg: mensagem
      });
      url = \`https://sistema81.smsbarato.com.br/send?\${params.toString()}\`;
    }

    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();
    
    if (response.ok) {
      console.log(\`✅ SMS enviado para \${cleanNumber}. Resposta: \${text}\`);
      return true;
    } else {
      console.error(\`❌ Falha SMS para \${cleanNumber}. Status: \${response.status}. Resp: \${text}\`);
      
      // Tentar fallback se for erro de autenticacao/rota
      if (response.status === 400 || response.status === 404) {
         console.log("Tentando endpoint alternativo (SMS Dev)...");
         const fallbackUrl = \`https://api.smsdev.com.br/v1/send?key=\${apiKey}&type=9&number=\${cleanNumber}&msg=\${encodeURIComponent(mensagem)}\`;
         const fRes = await fetch(fallbackUrl);
         const fText = await fRes.text();
         console.log(\`Resposta Fallback: \${fRes.status} - \${fText}\`);
      }
      return false;
    }
  } catch (error) {
    console.error("❌ Erro interno ao enviar SMS:", error);
    return false;
  }
}
