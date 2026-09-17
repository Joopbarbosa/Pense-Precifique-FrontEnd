export interface EmpresaRequest {
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  logoUrl?: string
}

export interface EmpresaResponse {
  id: string
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ConfiguracaoRequest {
  valorHora: number
  margemPadrao: number
}

export interface ConfiguracaoResponse {
  id: string | null
  valorHora: number
  margemPadrao: number
  updatedAt: string | null
}

/**
 * #491 (V0.12.0) — método de pagamento configurável, consumido pelo pagamento dividido do
 * Caixa/PDV. 4 tipos fixos (semeados na criação da conta) + OUTRO de nome livre.
 * Nome "Configuravel" no backend por colisão real com o enum fixo `MetodoPagamento` de Orçamento
 * — sem relação com este tipo (ver decisoes-config-perfil.md).
 */
export type TipoMetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'OUTRO'

export interface MetodoPagamentoConfiguravelResponse {
  id: string
  tipo: TipoMetodoPagamento
  /** Só preenchido quando tipo = OUTRO — os 4 tipos fixos não têm nome próprio. */
  nome?: string | null
  /** Derivado no backend: verdadeiro se e só se tipo = DINHEIRO. */
  afetaCaixaFisico: boolean
  /** Só aceito quando tipo é CARTAO_CREDITO ou CARTAO_DEBITO. Informativo nesta versão. */
  taxaMaquininha?: number | null
  ativo: boolean
  ordem?: number | null
}

export interface MetodoPagamentoConfiguravelRequest {
  tipo: TipoMetodoPagamento
  nome?: string
}

export interface MetodoPagamentoConfiguravelUpdateRequest {
  ativo?: boolean
  taxaMaquininha?: number
  nome?: string
}
