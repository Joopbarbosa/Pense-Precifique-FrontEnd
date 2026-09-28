import type { CompraResponse, RegraPrecoReferencia, StatusCompra } from '../../types/compra'
import { BRL } from '../venda/formato'

// V0.15.0 — formatação das telas de Compras (só exibição; valores vêm prontos da API).

/** "2026-09-20" ou "2026-09-20T15:02:11" → "20/09/2026", sem Date (evita deslocamento de fuso). */
export function formatarData(iso?: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** R$ com 2 casas (#603, RN-NOVA-33): custo unitário e preço pago guardam 4, mas a tela mostra 2. */
export function moeda(n: number | null | undefined): string {
  if (n == null) return '—'
  return BRL(n)
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

/**
 * #602 (RN-NOVA-32, CEN-NOVO-47) — validação do desconto ao SAIR do campo, antes de salvar. Exceção
 * documentada à regra "o front não decide": repete a regra e os textos de `DescontoCompra` do backend
 * só para avisar mais cedo; ao salvar/confirmar o backend valida de novo e é quem vale.
 * `onde`: "Linha 1 (Fita de cetim)" ou "Desconto da nota". `base`: preço cheio da linha / soma das linhas.
 */
export function erroDesconto(tipo: 'VALOR' | 'PERCENTUAL', valorTxt: string, base: number | null, onde: string):
  { titulo: string; mensagem: string; motivo: string; comoResolver: string } | null {
  const v = parseDecimal(valorTxt)
  if (v == null) return null
  if (tipo === 'PERCENTUAL') {
    if (v <= 0 || v >= 100) return {
      titulo: 'Desconto em %', mensagem: `${onde}: o desconto em % precisa ser maior que 0 e menor que 100.`,
      motivo: 'Com 100% ou mais o preço pago zeraria; com 0% não há desconto.',
      comoResolver: 'Informe um percentual entre 0 e 100 (ex.: 10%), ou deixe o campo vazio para não dar desconto.',
    }
    return null
  }
  if (base == null || v < base) return null
  return onde === 'Desconto da nota' ? {
    titulo: 'Desconto da nota maior que a compra', mensagem: 'O desconto da nota precisa ser menor que a soma das linhas.',
    motivo: 'O desconto da nota é dividido entre as linhas; se ele for igual ou maior que a soma, o total pago fica zerado.',
    comoResolver: 'Informe um desconto na nota menor que a soma das linhas (ex.: linhas de 71,00 → desconto de até 70,99).',
  } : {
    titulo: 'Desconto maior que o preço', mensagem: `${onde}: o desconto precisa ser menor que o preço cheio.`,
    motivo: 'O preço pago é o preço cheio menos o desconto; ele precisa ficar maior que zero.',
    comoResolver: 'Informe um desconto menor que o preço cheio (ex.: preço cheio 30,00 e desconto 3,00 → paga 27,00).',
  }
}

/** #597 (RN-NOVA-42) — "Pago — Cartão de crédito · 3x", "Pago — Pix" ou "Não pago". */
export function rotuloPagamento(c: Pick<CompraResponse, 'pago' | 'metodoPagamento' | 'parcelas'>): string {
  if (!c.pago) return 'Não pago'
  if (!c.metodoPagamento) return 'Pago'
  return `Pago — ${c.metodoPagamento.nome}${c.parcelas ? ` · ${c.parcelas}x` : ''}`
}

/** #590 (RN-NOVA-39) — regra do preço de referência (no insumo, vale para todos os fornecedores dele). */
export const REGRA_PRECO_LABEL: Record<RegraPrecoReferencia, string> = {
  MEDIA: 'Média',
  MENOR_VALOR: 'Menor valor',
  MANUAL: 'Manual',
}
