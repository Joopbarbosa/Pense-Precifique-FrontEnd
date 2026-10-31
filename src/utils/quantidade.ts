import { formatarNumero2 } from './formatacao.ts'

/** Formata uma quantidade exibida. A API conserva a precisão original; só a apresentação arredonda. */
export function formatQuantidade(
  valor: number,
  _fracionavel: boolean,
  _tipoExibicaoQuantidade?: 'FRACAO' | 'DECIMAL' | null
): string {
  // Esses parâmetros permanecem na assinatura por compatibilidade com as telas que os fornecem.
  return formatarNumero2(valor)
}

/**
 * Converte texto digitado em formato de fração ("1/2") para decimal (0.5).
 * Retorna null se o texto não tiver o formato N/D — quem chama deve cair no
 * parse decimal normal (vírgula) nesse caso. Backend espera decimal puro
 * em `fichaTecnica[].quantidade` (ver contrato-produto.md, nota V0.7 #208).
 */
export function tentarConverterFracao(texto: string): number | null {
  const partes = (texto || '').trim().split('/')
  if (partes.length !== 2) return null
  const numerador = parseFloat(partes[0].replace(',', '.'))
  const denominador = parseFloat(partes[1].replace(',', '.'))
  if (!isFinite(numerador) || !isFinite(denominador) || denominador === 0) return null
  return numerador / denominador
}
