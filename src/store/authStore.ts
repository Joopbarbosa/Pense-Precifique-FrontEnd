import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Usuario {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  onboardingCompleto: boolean | null
  setAuth: (token: string, usuario: Usuario) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  setOnboardingCompleto: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      onboardingCompleto: null,
      setAuth: (token, usuario) => set({ token, usuario, onboardingCompleto: null }),
      clearAuth: () => set({ token: null, usuario: null, onboardingCompleto: null }),
      isAuthenticated: () => !!get().token,
      setOnboardingCompleto: (v) => set({ onboardingCompleto: v }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    }
  )
)
