import type { StatusCompra } from '../../types/compra'

// V0.15.0 — formatação das telas de Compras (só exibição; valores vêm prontos da API).

/** "2026-09-20" ou "2026-09-20T15:02:11" → "20/09/2026", sem Date (evita deslocamento de fuso). */
export function formatarData(iso?: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** R$ com 2 casas no mínimo e até 4 (custo unitário/preço pago guardam 4 casas). */
export function moeda4(n: number | null | undefined): string {
  if (n == null) return '—'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function qtd(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

/** Texto digitado ("1.250,5" / "1250.5" / "12,35") → número; vazio/ inválido → null. */
export function parseDecimal(texto: string): number | null {
  const t = texto.trim()
  if (!t) return null
  const normalizado = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

/** Número vindo da API → texto do campo ("12,35"). */
export function paraCampo(n: number | null | undefined, casas = 4): string {
  if (n == null) return ''
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas, useGrouping: false })
}

export function hojeIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const STATUS_COMPRA_LABEL: Record<StatusCompra, string> = {
  RASCUNHO: 'Rascunho',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
}
