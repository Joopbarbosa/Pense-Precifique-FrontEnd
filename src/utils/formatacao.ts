/** Formatação única para números exibidos à pessoa usuária. Não altera o valor original. */
export function formatarNumero2(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Formatação única para valores monetários exibidos à pessoa usuária. */
export function formatarMoeda2(valor: number): string {
  return `R$ ${formatarNumero2(valor)}`
}
