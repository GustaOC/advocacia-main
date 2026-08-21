/**
 * Utilitário para envio de SMS usando a API do SMS Barato.
 * Requer a chave configurada no .env.local como SMS_BARATO_KEY.
 */

export async function sendSMS(numero: string, mensagem: string) {
  try {
    const apiKey = process.env.SMS_BARATO_KEY;
    if (!apiKey) {
      console.warn("⚠️ SMS_BARATO_KEY não configurada. O SMS não será enviado.");
      return false;
    }

    // Limpa o número de telefone (remove parênteses, espaços e traços)
    const cleanNumber = numero.replace(/\D/g, '');

    if (!cleanNumber || cleanNumber.length < 10) {
      console.warn("⚠️ Número de telefone inválido para envio de SMS:", numero);
      return false;
    }

    // A documentação do SMS Barato geralmente funciona via HTTP POST/GET no /send
    // Com parâmetros URLSearchParams (key, number, msg)
    const params = new URLSearchParams({
      token: apiKey, // Pode variar entre 'token' ou 'key' de acordo com a doc que o suporte enviar
      number: cleanNumber,
      msg: mensagem
    });

    // Subtitua pelo endpoint EXATO fornecido pelo suporte do SMS Barato (normalmente sistema81 ou painel)
    const url = `https://sistema81.smsbarato.com.br/send?${params.toString()}`;

    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      console.log(`✅ SMS enviado com sucesso para ${cleanNumber}`);
      return true;
    } else {
      console.error(`❌ Falha ao enviar SMS para ${cleanNumber}. Status:`, response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Erro interno ao enviar SMS:", error);
    return false;
  }
}
