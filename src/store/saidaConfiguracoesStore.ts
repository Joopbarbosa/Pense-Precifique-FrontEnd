import { create } from 'zustand'

// V0.17.0 (#983, RN-NOVA-28, DT-NOVA-23 item 3a) — "Sair da conta" não é navegação (o Sidebar limpa a
// sessão antes de navegar), então o bloqueio do roteador não o cobre. A tela de Configurações, enquanto
// montada, registra aqui a função que pede a confirmação; o botão Sair a consulta antes de limpar a sessão.
// Devolve true quando assumiu a saída (há alteração pendente e a modal foi aberta).
interface SaidaConfiguracoesState {
  pedirSaida: ((continuar: () => void) => boolean) | null
  definir: (fn: ((continuar: () => void) => boolean) | null) => void
}

export const useSaidaConfiguracoesStore = create<SaidaConfiguracoesState>()((set) => ({
  pedirSaida: null,
  definir: (fn) => set({ pedirSaida: fn }),
}))
