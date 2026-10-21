import type { Compromisso, OrigemCompromisso, VisaoAgenda } from '../types/agenda'

export type MostrarAgenda = 'TODOS' | 'ATRASADOS' | 'PENDENTES' | 'CONCLUIDOS'

export interface FiltrosAgenda {
  mostrar: MostrarAgenda
  origens: OrigemCompromisso[]
}

/** Filtros exclusivamente visuais da Agenda (RN-NOVA-3 v2); origem vazia significa todas. */
export function filtrarCompromissos(compromissos: Compromisso[], filtros: FiltrosAgenda): Compromisso[] {
  return compromissos.filter(c => {
    const situacaoCorresponde = filtros.mostrar === 'TODOS'
      || (filtros.mostrar === 'ATRASADOS' && c.atrasado)
      || (filtros.mostrar === 'PENDENTES' && c.situacao === 'PENDENTE')
      || (filtros.mostrar === 'CONCLUIDOS' && c.situacao === 'CONCLUIDO')
    const origemCorresponde = filtros.origens.length === 0 || filtros.origens.includes(c.origem)
    return situacaoCorresponde && origemCorresponde
  })
}

/**
 * V0.18.0 (#1034, DT-NOVA-12) — datas da grade da Agenda. Só apresentação: navegar entre dias, semanas e meses e montar a
 * grade. O atraso e o dia de exibição vêm do servidor; aqui as datas civis são tratadas como texto "AAAA-MM-DD" e a conta
 * passa por UTC, para o fuso do navegador nunca deslocar um dia.
 */
const DIA_MS = 86_400_000

function paraMs(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

function deMs(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, dias: number): string {
  return deMs(paraMs(iso) + dias * DIA_MS)
}

/** 0 = segunda ... 6 = domingo (a semana da Agenda vai de segunda a domingo). */
export function diaDaSemana(iso: string): number {
  return (new Date(paraMs(iso)).getUTCDay() + 6) % 7
}

export function segundaDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso))
}

export function primeiroDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function somarMeses(iso: string, meses: number): string {
  const [a, m] = iso.split('-').map(Number)
  const indice = a * 12 + (m - 1) + meses
  const ano = Math.floor(indice / 12)
  const mes = (indice % 12) + 1
  const dia = Number(iso.slice(8, 10))
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

export interface PeriodoAgenda {
  de: string
  ate: string
  /** Dias exibidos, em ordem. No mês são 42 (6 semanas completas, segunda a domingo). */
  dias: string[]
}

export function periodoDaVisao(visao: VisaoAgenda, referencia: string): PeriodoAgenda {
  let de: string
  let quantidade: number
  if (visao === 'DIA') {
    de = referencia
    quantidade = 1
  } else if (visao === 'SEMANA') {
    de = segundaDaSemana(referencia)
    quantidade = 7
  } else {
    de = segundaDaSemana(primeiroDoMes(referencia))
    quantidade = 42
  }
  const dias = Array.from({ length: quantidade }, (_, i) => somarDias(de, i))
  return { de, ate: dias[dias.length - 1], dias }
}

export function navegar(visao: VisaoAgenda, referencia: string, passo: -1 | 1): string {
  if (visao === 'DIA') return somarDias(referencia, passo)
  if (visao === 'SEMANA') return somarDias(referencia, 7 * passo)
  return somarMeses(primeiroDoMes(referencia), passo)
}

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const DIAS_SEMANA_CURTO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const DIAS_SEMANA_EXTENSO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

export function nomeDoMes(iso: string): string {
  return `${MESES_EXTENSO[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`
}

export function diaDoMes(iso: string): number {
  return Number(iso.slice(8, 10))
}

export function rotuloDoDia(iso: string): string {
  return `${DIAS_SEMANA_EXTENSO[diaDaSemana(iso)]}, ${diaDoMes(iso)} de ${MESES_EXTENSO[Number(iso.slice(5, 7)) - 1]}`
}

/** Título do período exibido no topo da Agenda. */
export function tituloDoPeriodo(visao: VisaoAgenda, referencia: string): string {
  if (visao === 'DIA') return rotuloDoDia(referencia)
  if (visao === 'MES') return nomeDoMes(referencia)
  const p = periodoDaVisao('SEMANA', referencia)
  const mesmoMes = p.de.slice(0, 7) === p.ate.slice(0, 7)
  const mes = (iso: string) => MESES_EXTENSO[Number(iso.slice(5, 7)) - 1]
  return mesmoMes
    ? `${diaDoMes(p.de)} a ${diaDoMes(p.ate)} de ${mes(p.de)} de ${p.ate.slice(0, 4)}`
    : `${diaDoMes(p.de)} de ${mes(p.de)} a ${diaDoMes(p.ate)} de ${mes(p.ate)} de ${p.ate.slice(0, 4)}`
}
