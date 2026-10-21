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
  dataExibicao: string
  horario?: string | null
  diaInteiro: boolean
  atrasado: boolean
  diasAtraso: number
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
