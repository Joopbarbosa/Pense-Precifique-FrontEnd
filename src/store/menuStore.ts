import { create } from 'zustand'

// V0.17.0 (#963, RN-NOVA-18, DT-NOVA-17) — estado dos grupos recolhíveis do menu só em memória.
// Não é persistido: atualizar a página, entrar ou sair zera tudo (todos recolhidos). Sobrevive à
// troca de tela dentro da mesma sessão porque o estado vive fora dos componentes do Sidebar.
export type GrupoMenu = 'vendas' | 'compras' | 'cadastros'

const RECOLHIDOS: Record<GrupoMenu, boolean> = { vendas: false, compras: false, cadastros: false }

interface MenuState {
  expandido: Record<GrupoMenu, boolean>
  alternar: (grupo: GrupoMenu) => void
  zerar: () => void
}

export const useMenuStore = create<MenuState>()((set) => ({
  expandido: { ...RECOLHIDOS },
  alternar: (grupo) => set((s) => ({ expandido: { ...s.expandido, [grupo]: !s.expandido[grupo] } })),
  zerar: () => set({ expandido: { ...RECOLHIDOS } }),
}))
