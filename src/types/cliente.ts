export interface ClienteRequest {
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  observacoes?: string
}

export interface ClienteResponse {
  id: string
  numero?: number
  identificador?: string
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  observacoes?: string
  ativa: boolean
  createdAt: string
  updatedAt: string
}
