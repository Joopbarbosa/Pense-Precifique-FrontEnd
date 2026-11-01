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
