export interface LoginRequest {
  email: string
  senha: string
}

export interface CadastroRequest {
  email: string
  senha: string
  confirmarSenha: string
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

export interface ApiErrorResponse {
  message: string
  status: number
  timestamp: string
  fieldErrors?: Record<string, string> | null
}
