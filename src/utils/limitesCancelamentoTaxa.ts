// V0.19.0 (#692, RN-NOVA-50, RN-NOVA-52 e RN-NOVA-58) — limites da multa do cancelamento e da taxa da maquininha.
// Mesmas regras e mensagens do servidor; a tela valida antes de enviar.

export const MSG_MULTA_ZERO = 'Informe uma multa maior que zero ou escolha cancelar sem multa.'
export const MSG_MULTA_ACIMA = 'A multa não pode ser maior que o total do orçamento.'
export const MSG_MULTA_MENOS_UM_CENTAVO = 'A multa resulta em menos de R$ 0,01.'
export const MSG_MULTA_CASAS = 'A multa deve ter no máximo duas casas decimais.'
export const MSG_TAXA = 'A taxa deve estar entre 0% e 100%.'

function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function casasDecimais(texto: string): number {
  const t = texto.trim().replace(',', '.')
  const i = t.indexOf('.')
  return i < 0 ? 0 : t.length - i - 1
}

/**
 * Multa em % do total: maior que 0 e até 100, com no máximo 2 casas. Com o total do orçamento, recusa também o
 * percentual que resulta em menos de R$ 0,01 (RN-NOVA-58). Retorna a mensagem ou null se válida.
 */
export function validarPercentualMulta(texto: string, total?: number): string | null {
  const n = lerNumero(texto)
  if (n === null || n <= 0 || casasDecimais(texto) > 2) return MSG_MULTA_ZERO
  if (n > 100) return MSG_MULTA_ACIMA
  if (total !== undefined && Math.round((total * n) / 100 * 100) / 100 < 0.01) return MSG_MULTA_MENOS_UM_CENTAVO
  return null
}

/** Multa em R$: de R$ 0,01 até o total do orçamento, com no máximo 2 casas (RN-NOVA-58). */
export function validarValorMulta(texto: string, total: number): string | null {
  const n = lerNumero(texto)
  if (n === null || n < 0.01) return MSG_MULTA_ZERO
  if (casasDecimais(texto) > 2) return MSG_MULTA_CASAS
  if (n > total) return MSG_MULTA_ACIMA
  return null
}

export type ModoMulta = 'valor' | 'percentual'

/** Valida o campo da multa conforme o modo escolhido (R$ ou %). */
export function validarMulta(modo: ModoMulta, texto: string, total: number): string | null {
  return modo === 'valor' ? validarValorMulta(texto, total) : validarPercentualMulta(texto, total)
}

/** Multa total em R$ (referência) para a prévia da tela; o servidor recalcula ao confirmar. */
export function multaBrutaEmReais(modo: ModoMulta, texto: string, total: number): number {
  const n = lerNumero(texto) ?? 0
  return modo === 'valor' ? n : Math.round((total * n) / 100 * 100) / 100
}

/** Taxa da maquininha em %: de 0 a 100, com no máximo 2 casas. Vazio vale 0. */
export function validarTaxaMaquininha(texto: string): string | null {
  if (texto.trim() === '') return null
  const n = lerNumero(texto)
  if (n === null || n < 0 || n > 100 || casasDecimais(texto) > 2) return MSG_TAXA
  return null
}
