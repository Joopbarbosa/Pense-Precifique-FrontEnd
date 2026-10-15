export interface LoginRequest {
  email: string
  senha: string
}

export interface CadastroRequest {
  email: string
  senha: string
  confirmarSenha: string
  nomeEmpresa?: string
}

export interface AuthResponse {
  token: string
  tipo: string
  usuarioId: string
  email: string
  expiresIn: number
}

export interface UsuarioResponse {
  id: string
  email: string
  ativo: boolean
  createdAt: string
}

export interface AlterarSenhaRequest {
  senhaAtual: string
  novaSenha: string
  confirmarNovaSenha: string
}

export interface AlterarEmailRequest {
  novoEmail: string
  senhaAtual: string
}

export interface ApiErrorResponse {
  message: string
  status: number
  timestamp: string
  fieldErrors?: Record<string, string> | null
}
