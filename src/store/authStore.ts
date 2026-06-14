import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Usuario {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      clearAuth: () => set({ token: null, usuario: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-storage' }
  )
)
