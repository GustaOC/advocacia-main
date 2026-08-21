/**
 * Utilitário para envio de SMS usando a API do SMS Barato.
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

    // Se o cliente definiu a URL customizada na Vercel, usamos ela
    const customUrl = process.env.SMS_BARATO_URL;
    
    let url = "";
    if (customUrl) {
      url = customUrl
        .replace("{key}", apiKey)
        .replace("{token}", apiKey)
        .replace("{number}", cleanNumber)
        .replace("{msg}", encodeURIComponent(mensagem));
    } else {
      // Endpoint EXATO fornecido pelo cliente:
      // https://sistema81.smsbarato.com.br/send?chave=SUA_CHAVE&dest=11988887777&text=Sua+mensagem+aqui
      const params = new URLSearchParams({
        chave: apiKey,
        dest: cleanNumber,
        text: mensagem
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
      return false;
    }
  } catch (error) {
    console.error("❌ Erro interno ao enviar SMS:", error);
    return false;
  }
}
