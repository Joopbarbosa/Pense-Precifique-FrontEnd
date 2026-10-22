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

/** 0 = domingo ... 6 = sábado (a semana da Agenda vai de domingo a sábado, como no Google Agenda — #1062). */
export function diaDaSemana(iso: string): number {
  return new Date(paraMs(iso)).getUTCDay()
}

export function domingoDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso))
}

/** Número da semana domingo–sábado; a semana que contém 1º de janeiro é a semana 1 (#1067). */
export function numeroDaSemana(iso: string): number {
  const anoDaData = Number(iso.slice(0, 4))
  const inicioSemana = paraMs(iso) - diaDaSemana(iso) * DIA_MS
  const ano = [anoDaData, anoDaData + 1].find(a => {
    const primeiroDeJaneiro = Date.UTC(a, 0, 1)
    return inicioSemana <= primeiroDeJaneiro && primeiroDeJaneiro < inicioSemana + 7 * DIA_MS
  }) ?? anoDaData
  const primeiroDeJaneiro = Date.UTC(ano, 0, 1)
  const primeiroDomingo = primeiroDeJaneiro - new Date(primeiroDeJaneiro).getUTCDay() * DIA_MS
  return Math.floor((inicioSemana - primeiroDomingo) / (7 * DIA_MS)) + 1
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
  /** Dias exibidos, em ordem. No mês são 42 (6 semanas completas, domingo a sábado). */
  dias: string[]
}

export function periodoDaVisao(visao: VisaoAgenda, referencia: string): PeriodoAgenda {
  let de: string
  let quantidade: number
  if (visao === 'DIA') {
    de = referencia
    quantidade = 1
  } else if (visao === 'SEMANA') {
    de = domingoDaSemana(referencia)
    quantidade = 7
  } else {
    de = domingoDaSemana(primeiroDoMes(referencia))
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
export const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DIAS_SEMANA_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

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

/** Agrupa os compromissos pelo dia de exibição (o atrasado fica no seu dia, RN-NOVA-4 v3). */
export function distribuirPorDia(compromissos: Compromisso[]): Map<string, Compromisso[]> {
  const mapa = new Map<string, Compromisso[]>()
  for (const c of compromissos) {
    const lista = mapa.get(c.dataExibicao)
    if (lista) lista.push(c)
    else mapa.set(c.dataExibicao, [c])
  }
  return mapa
}

/** "7 h", "7 h 30 min" ou "40 min" — o atraso por horário (RN-NOVA-4 v2). */
export function duracaoEmMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Hora e minuto de Brasília (o servidor decide o atraso nesse fuso), em minutos desde a meia-noite. */
export function minutosAgoraBrasilia(agora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(agora)
  const h = Number(partes.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(partes.find(p => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

/** Duração de um compromisso com horário na grade: 1 hora, já que o compromisso só tem a hora de início (#1061). */
export const DURACAO_BLOCO_MIN = 60

export interface BlocoNaGrade {
  compromisso: Compromisso
  /** Minutos desde a meia-noite em que o bloco começa. */
  inicio: number
  /** Posição lado a lado entre os blocos que se sobrepõem no tempo (0 = primeira coluna). */
  coluna: number
  /** Quantas colunas o grupo de blocos sobrepostos tem. */
  colunas: number
}

/** Hora de início em minutos desde a meia-noite ("07:30" = 450). */
export function minutosDoHorario(horario: string): number {
  const [h, m] = horario.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Posiciona os compromissos com horário de um dia como no Google Agenda: cada um começa na sua hora e dura
 * {@link DURACAO_BLOCO_MIN}; os que se sobrepõem no tempo dividem a largura do dia, lado a lado.
 */
export function posicionarBlocos(compromissos: Compromisso[]): BlocoNaGrade[] {
  const itens = compromissos
    .filter(c => !!c.horario)
    .map(c => ({ compromisso: c, inicio: minutosDoHorario(c.horario as string), coluna: 0, colunas: 1 }))
    .sort((a, b) => a.inicio - b.inicio)
  let grupo: typeof itens = []
  let fimDoGrupo = -1
  const fecharGrupo = () => {
    const colunas = grupo.reduce((m, b) => Math.max(m, b.coluna + 1), 1)
    for (const b of grupo) b.colunas = colunas
    grupo = []
  }
  const fimDasColunas: number[] = []
  for (const b of itens) {
    if (grupo.length > 0 && b.inicio >= fimDoGrupo) { fecharGrupo(); fimDasColunas.length = 0 }
    let coluna = fimDasColunas.findIndex(fim => fim <= b.inicio)
    if (coluna === -1) coluna = fimDasColunas.length
    fimDasColunas[coluna] = b.inicio + DURACAO_BLOCO_MIN
    b.coluna = coluna
    grupo.push(b)
    fimDoGrupo = Math.max(fimDoGrupo, b.inicio + DURACAO_BLOCO_MIN)
  }
  if (grupo.length > 0) fecharGrupo()
  return itens
}
