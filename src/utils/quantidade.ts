const GLIFOS_FRACAO: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾',
  '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
}

const DENOMINADORES_COMUNS = [2, 3, 4, 5, 6, 8]

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b)
}

function formatFracao(valor: number): string {
  const inteiro = Math.trunc(valor)
  const resto = Math.abs(valor - inteiro)
  if (resto < 1e-9) return String(inteiro)

  for (const den of DENOMINADORES_COMUNS) {
    const numerador = Math.round(resto * den)
    if (numerador > 0 && numerador < den && Math.abs(resto - numerador / den) < 0.01) {
      const d = mdc(numerador, den)
      const chave = `${numerador / d}/${den / d}`
      const glifo = GLIFOS_FRACAO[chave] ?? chave
      return inteiro > 0 ? `${inteiro} ${glifo}` : glifo
    }
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

/** Formata uma quantidade de insumo respeitando fracionavel/tipoExibicaoQuantidade — RN-NOVA-1. */
export function formatQuantidade(
  valor: number,
  fracionavel: boolean,
  tipoExibicaoQuantidade?: 'FRACAO' | 'DECIMAL' | null
): string {
  if (fracionavel && tipoExibicaoQuantidade === 'FRACAO') return formatFracao(valor)
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: fracionavel ? 3 : 0 })
}
