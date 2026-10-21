/** Formata uma data ISO sem criar Date, evitando deslocamento de fuso em datas civis. */
export function formatarData(iso?: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Data atual (ou informada) em ISO usando o fuso local do navegador. */
export function dataLocalIso(data: Date = new Date()): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function rotuloMes(iso: string): string {
  return `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`
}

/** "2026-10-02T14:10:00" → "02/10/2026 14:10"; vazio quando não há data. */
export function formatarDataHora(iso?: string | null): string {
  if (!iso) return ''
  return `${formatarData(iso)} ${iso.slice(11, 16)}`
}
