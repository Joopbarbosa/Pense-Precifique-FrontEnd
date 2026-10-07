/**
 * #754 — "AAAA-MM-DD" no fuso do navegador. `toISOString().slice(0, 10)` usa UTC e, depois das 21h em Brasília,
 * devolve o dia seguinte (o backend recusa como data futura e os filtros começam no dia errado).
 */
export function dataLocalISO(data: Date = new Date()): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}
