import api from './api'
import type { AlterarEmailRequest, AlterarSenhaRequest, AuthResponse } from '../types/auth'

export const usuarioService = {
  alterarSenha: async (data: AlterarSenhaRequest): Promise<void> => {
    await api.put('/usuarios/me/senha', data)
  },

  // #334 — devolve token novo (o antigo deixa de valer assim que o e-mail muda)
  alterarEmail: async (data: AlterarEmailRequest): Promise<AuthResponse> => {
    const response = await api.put<AuthResponse>('/usuarios/me/email', data)
    return response.data
  },
}
