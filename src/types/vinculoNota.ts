import type { InsumoProposto } from './compraNota'

/** #688 — memória por item/emitente; espelha contrato COMPRAS. */
export interface VinculoNotaResponse {
  id: string
  nomeItem: string
  emitenteCnpj: string
  emitenteNome: string
  fornecedorId: string | null
  fornecedorNome: string
  insumo: InsumoProposto | null
  fator: number | null
  ignorar: boolean
  origem: 'CASAMENTO_NOME' | 'SUGESTAO_IA' | 'MANUAL' | 'OUTRO_FORNECEDOR'
  createdAt: string
  updatedAt: string
  /** #716 — compra (rascunho gerado da nota) em que o vínculo foi feito; nula se excluída ou sem compra. */
  compraId: string | null
  compraIdentificador: string | null
}
export interface FiltrosVinculoNota {
  busca?: string
  fornecedorId?: string
  emitenteCnpj?: string
  insumoId?: string
  ignorar?: boolean
  sort?: string
}
export interface DestinoVinculoNota { insumoId: string | null; fator: number | null }
export interface IgnorarVinculoNota { ignorar: boolean; insumoId?: string | null; fator?: number | null }
