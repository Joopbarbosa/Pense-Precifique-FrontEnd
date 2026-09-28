/**
 * Formatador único de moeda dos fluxos de venda.
 *
 * Unifica duas versões que conviviam divergentes: o Orçamento usava `toFixed(2).replace()`, sem
 * separador de milhar, enquanto Caixa e `CalculadoraPreco` já usavam `toLocaleString('pt-BR')`.
 * Com os componentes compartilhados, o Orçamento passa a exibir separador de milhar em valores
 * acima de mil — única mudança visual deliberada da extração (nenhum teste E2E depende do
 * formato antigo; verificado antes da troca).
 */
export const BRL = (n: number) =>
  'R$ ' + arredondar2(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * V0.15.0 (#603, RN-NOVA-33) — dinheiro na tela sempre com 2 casas, 3ª casa arredondada para cima a
 * partir de 5 (0,0153 → 0,02; 2,565 → 2,57). O EPSILON evita 2,565 virar 2,56 pela representação
 * binária. Cálculos e valores gravados continuam com 4 casas — isto é só exibição.
 */
export function arredondar2(n: number): number {
  return Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100
}
