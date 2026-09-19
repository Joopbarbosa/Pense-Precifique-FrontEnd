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
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
