// V0.15.0 (#536) — cadastro único "Clientes e Fornecedores": a rota/tabela continua `clientes`,
// o registro ganha papéis (Cliente, Fornecedor ou os dois), tipo de pessoa e documento.
export type TipoPessoa = 'FISICA' | 'JURIDICA' | 'ESTRANGEIRO'

export type PapelCadastro = 'CLIENTE' | 'FORNECEDOR'

export interface ClienteRequest {
  nome: string
  ehCliente: boolean
  ehFornecedor: boolean
  tipoPessoa: TipoPessoa
  documento?: string
  email?: string
  whatsapp?: string
  telefone?: string
  site?: string
  endereco?: string
  observacoes?: string
}

export interface ClienteResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  email?: string | null
  whatsapp?: string | null
  telefone?: string | null
  site?: string | null
  endereco?: string | null
  observacoes?: string | null
  ehCliente: boolean
  ehFornecedor: boolean
  tipoPessoa: TipoPessoa
  /** Normalizado pelo backend: sem máscara, maiúsculo (a máscara é só de exibição). */
  documento?: string | null
  ativa: boolean
  createdAt: string
  updatedAt: string
}

export interface ClienteContagensResponse {
  ativos: number
  clientes: number
  fornecedores: number
  inativos: number
}

/** Filtros de `GET /clientes` — `ativo` omitido = só ativos; `papel` omitido = os dois papéis. */
export interface ClienteFiltros {
  papel?: PapelCadastro
  ativo?: boolean
}
