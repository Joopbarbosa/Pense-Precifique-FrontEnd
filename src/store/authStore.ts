import { create } from 'zustand'

interface Usuario {
  id: string
  nome: string
  email: string
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  usuario: null,
  setAuth: (token, usuario) => {
    localStorage.setItem('token', token)
    set({ token, usuario })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    set({ token: null, usuario: null })
  },
}))
