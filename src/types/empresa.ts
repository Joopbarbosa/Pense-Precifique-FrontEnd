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
