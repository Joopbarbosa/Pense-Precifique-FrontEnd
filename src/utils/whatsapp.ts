// #1170 — espelho do NumeroWhatsapp.canonico do backend (a validação final é sempre do servidor).
export const LEGENDA_MAX = 1024

export function numeroWhatsappValido(entrada: string): boolean {
  const bruto = entrada.trim()
  if (!bruto || bruto.length > 40) return false
  const internacional = bruto.startsWith('+')
  const digitos = bruto.replace(/[\s()\-+]/g, '')
  if (!/^\d+$/.test(digitos)) return false
  if (internacional) return digitos.length >= 8 && digitos.length <= 15
  return digitos.length === 10 || digitos.length === 11 || (digitos.length >= 12 && digitos.length <= 15)
}

export function legendaExcedeu(legenda: string): boolean {
  return legenda.length > LEGENDA_MAX
}

/** Aviso de risco exibido antes de conectar o WhatsApp (PP-705, decisão do Gestor em 01/11/2026). */
export const AVISO_RISCO_WHATSAPP =
  'Existe o risco de o seu WhatsApp ser banido. Por isso, não use o WhatsApp principal da loja: use um número específico para cobranças e envio de orçamentos.'
