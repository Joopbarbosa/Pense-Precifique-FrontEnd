import { dataLocalIso, formatarData, MESES } from '../../utils/data'
export { rotuloMes } from '../../utils/data'


// V0.17.0 — #615 (DT-NOVA-10): período do dashboard, extraído de `components/compra/DashboardCompras.tsx` para ser usado
// também pelo Dashboard de Vendas (#719) e pelo de Cadastros (#607) sem duplicar.

export type Periodo = 'mes' | '3' | '6' | '12' | 'personalizado'
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes', label: 'Mês atual' },
  { id: '3', label: '3 meses' },
  { id: '6', label: '6 meses' },
  { id: '12', label: '12 meses' },
  { id: 'personalizado', label: 'Personalizado' },
]

/** Mês atual e "N meses" começam no dia 1 — o backend compara com os mesmos N meses anteriores. */
export function intervalo(p: Periodo): { de: string; ate: string } {
  const hoje = new Date()
  const meses = p === 'mes' ? 1 : Number(p)
  return { de: dataLocalIso(new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)), ate: dataLocalIso(hoje) }
}

export const pct = (n: number | null | undefined) => n == null ? '—' : `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
export const ultimoDia = (mesIso: string) => {
  const [a, m] = mesIso.split('-').map(Number)
  return `${mesIso.slice(0, 7)}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

/**
 * #599 (RN-NOVA-37) — o comparativo diz com qual período compara: "em ago/2026" quando o anterior é um mês
 * cheio; senão "de 22/08 a 31/08/2026" (ano nas duas pontas só quando muda).
 */
export function rotuloPeriodoAnterior(de: string, ate: string): string {
  const mesCheio = de.slice(8) === '01' && de.slice(0, 7) === ate.slice(0, 7) && ate === ultimoDia(de)
  if (mesCheio) return `em ${MESES[Number(de.slice(5, 7)) - 1]}/${de.slice(0, 4)}`
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  return de.slice(0, 4) === ate.slice(0, 4) ? `de ${dm(de)} a ${formatarData(ate)}` : `de ${formatarData(de)} a ${formatarData(ate)}`
}
