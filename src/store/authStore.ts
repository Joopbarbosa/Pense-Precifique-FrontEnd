import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMenuStore } from './menuStore'

interface Usuario {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  onboardingCompleto: boolean | null
  setAuth: (token: string, usuario: Usuario) => void
  // #334 — troca de e-mail renova token e e-mail sem reabrir a checagem de onboarding
  atualizarSessao: (token: string, usuario: Usuario) => void
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
      // #963 (DT-NOVA-17): entrar e sair zeram o menu recolhido; a troca de e-mail (atualizarSessao) não mexe
      setAuth: (token, usuario) => {
        useMenuStore.getState().zerar()
        set({ token, usuario, onboardingCompleto: null })
      },
      atualizarSessao: (token, usuario) => set({ token, usuario }),
      clearAuth: () => {
        useMenuStore.getState().zerar()
        set({ token: null, usuario: null, onboardingCompleto: null })
      },
      isAuthenticated: () => !!get().token,
      setOnboardingCompleto: (v) => set({ onboardingCompleto: v }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    }
  )
)
