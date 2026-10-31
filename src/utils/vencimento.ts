/** V0.19.0 (#1173, RN-NOVA-8) — vencimento sugerido: a data da compra; no cartão, um mês depois (1ª parcela). */
export function vencimentoPadrao(dataCompra: string, cartao: boolean): string {
  if (!cartao) return dataCompra
  const [a, m, d] = dataCompra.split('-').map(Number)
  const alvo = new Date(a, m, 1) // dia 1 do mês seguinte (m já é 1-based)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(d, ultimo))
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
}
