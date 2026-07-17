import api from './api'
import type { AlterarSenhaRequest } from '../types/auth'

export const usuarioService = {
  alterarSenha: async (data: AlterarSenhaRequest): Promise<void> => {
    await api.put('/usuarios/me/senha', data)
  },
}
