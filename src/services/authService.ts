import api from './api'
import type { LoginRequest, CadastroRequest, AuthResponse, UsuarioResponse } from '../types/auth'

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: CadastroRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  getMe: async (): Promise<UsuarioResponse> => {
    const response = await api.get<UsuarioResponse>('/usuarios/me')
    return response.data
  },
}
