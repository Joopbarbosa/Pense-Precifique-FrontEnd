/** V0.19.0 (#382, RN-NOVA-44) — orçamento Descritivo: opções com preço de referência, sem total nem aprovação. */
export type StatusDescritivo = 'RASCUNHO' | 'ENVIADO' | 'CANCELADO'

export interface DescritivoOpcaoResponse {
  id: string
  produtoId: string | null
  itemCatalogoId: string | null
  nome: string
  precoReferencia: number
  /** Preço de venda atual do cadastro (só informativo; a Venda gerada usa este valor). */
  precoAtual: number | null
  quantidadeUnidade: string | null
  ordem: number
}

export interface DescritivoResponse {
  id: string
  numero: number
  identificador: string
  tipo: 'DESCRITIVO'
  titulo: string
  status: StatusDescritivo
  clienteId: string | null
  nomeCliente: string | null
  observacoes: string | null
  dataEnvio: string | null
  createdAt: string
  updatedAt: string
  opcoes: DescritivoOpcaoResponse[]
}

export interface DescritivoResumoResponse {
  id: string
  numero: number
  identificador: string
  titulo: string
  status: StatusDescritivo
  nomeCliente: string | null
  quantidadeOpcoes: number
  createdAt: string
}

export interface DescritivoOpcaoRequest {
  produtoId?: string
  itemCatalogoId?: string
  precoReferencia?: number
  quantidadeUnidade?: string
}

export interface DescritivoRequest {
  titulo: string
  clienteId?: string
  observacoes?: string
  opcoes: DescritivoOpcaoRequest[]
}

export interface GerarVendaDescritivoRequest {
  clienteId?: string
  itens: { opcaoId: string; quantidade: number }[]
}
