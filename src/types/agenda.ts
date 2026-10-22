import type { PageResponse } from './shared'

/** V0.18.0 (#1034, DT-NOVA-2) — contrato da Agenda: modulos/AGENDA/contrato-agenda.md (criado na Retomada). */
export type OrigemCompromisso = 'ORCAMENTO' | 'PRODUCAO' | 'COMPRA' | 'AVULSO'

export type TipoCompromisso =
  | 'ENTREGA_ESTIMADA' | 'VALIDADE_ORCAMENTO' | 'SINAL_A_RECEBER' | 'SALDO_A_RECEBER'
  | 'INICIO_PRODUCAO' | 'TERMINO_PRODUCAO' | 'RECEBIMENTO_COMPRA' | 'AVULSO'

export type SituacaoCompromisso = 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'

export type VisaoAgenda = 'DIA' | 'SEMANA' | 'MES'

/** Compromisso pronto para exibir: atraso, dia de exibição e ordem vêm do servidor (RN-NOVA-4, RN-NOVA-2). */
export interface Compromisso {
  chave: string
  tipo: TipoCompromisso
  origem: OrigemCompromisso
  situacao: SituacaoCompromisso
  titulo: string
  dataOrigem: string
  /** Só nas ocorrências do compromisso da usuária. */
  dataOriginalOcorrencia?: string | null
  /** Primeiro dia do compromisso (a data da origem). */
  dataExibicao: string
  /** Último dia: hoje no atrasado (a barra de continuidade vai de um ao outro, RN-NOVA-4 v2); a própria data nos demais. */
  dataFim: string
  horario?: string | null
  /** Hora de término do compromisso avulso (#1063); nula = o bloco dura 1 hora na grade. */
  horarioFim?: string | null
  diaInteiro: boolean
  atrasado: boolean
  diasAtraso: number
  /** Atraso por horário (hoje, hora já passada): minutos desde o horário; zero no atraso por data. */
  minutosAtraso: number
  marcacoes: string[]
  avisos: string[]
  referenciaId: string
  identificador?: string | null
  valor?: number | null
}

export interface AgendaResumo {
  atrasados: number
  hoje: number
}

export type PaginaCompromissos = PageResponse<Compromisso>

// ---- compromisso da usuária (#1039) ---------------------------------------------------------------

export type RecorrenciaCompromisso = 'NENHUMA' | 'SEMANAL' | 'MENSAL'
export type DiaSemanaApi = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type EscopoEdicao = 'OCORRENCIA' | 'SERIE'

export interface CompromissoUsuariaRequest {
  titulo: string
  data: string
  horario?: string | null
  horarioFim?: string | null
  orcamentoId?: string | null
  insumoId?: string | null
  recorrencia?: RecorrenciaCompromisso
  diasSemana?: DiaSemanaApi[]
  quantidadeOcorrencias?: number | null
}

export interface EditarCompromissoRequest {
  escopo?: EscopoEdicao
  titulo: string
  data?: string | null
  horario?: string | null
  horarioFim?: string | null
  orcamentoId?: string | null
  insumoId?: string | null
}

/** Uma ocorrência do compromisso da usuária, com os vínculos resolvidos (RN-NOVA-6 e RN-NOVA-7). */
export interface CompromissoUsuariaDetalhe {
  id: string
  titulo: string
  dataOriginal: string
  data: string
  horario?: string | null
  horarioFim?: string | null
  situacao: SituacaoCompromisso
  observacaoCancelamento?: string | null
  serie: boolean
  recorrencia: RecorrenciaCompromisso
  diasSemana: DiaSemanaApi[]
  quantidadeOcorrencias?: number | null
  orcamento?: { id: string; identificador: string; cliente: string } | null
  /** `removido`: o insumo foi inativado ou excluído depois do vínculo ("Insumo removido" no lugar do link). */
  insumo?: { id: string; nome: string; removido: boolean } | null
}

/** #1071 — Resumo do dia: o que é de hoje e o que está atrasado, por assunto. "A pagar" fica indisponível até o Financeiro. */
export interface ResumoDoDia {
  data: string
  paraHoje: number
  atrasados: number
  aReceber: ValoresDoDia
  aPagar: ValoresDoDia
  entregas: Compromisso[]
  producoes: Compromisso[]
  outros: Compromisso[]
  insumosFaltantes: InsumoFaltante[]
}
export interface ValoresDoDia { disponivel: boolean; total: number | null; totalAtrasado: number | null; itens: Compromisso[] }
export interface InsumoFaltante { nome: string; siglaUnidade: string | null; necessario: number; emEstoque: number; falta: number }
