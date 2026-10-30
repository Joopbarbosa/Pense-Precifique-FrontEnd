import { useState } from 'react'
import clsx from 'clsx'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { lerPreferencia, gravarPreferencia } from '../../utils/preferenciaLocal'

interface AppLayoutProps {
  active: 'agenda' | 'clientes' | 'orcamentos' | 'caixa' | 'compras' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config' | 'vendas-dashboard' | 'cadastros-dashboard'
  children: React.ReactNode
  noPad?: boolean
  fullHeight?: boolean
  /** #182 — piloto: padding reduzido (16px em vez de 40px) e conteúdo fluido, sem max-w-[1280px]. */
  compact?: boolean
}

// V0.18.0 (#671, RN-NOVA-23): o menu recolhido é preferência de cada pessoa (chave com o id da conta)
const SIDEBAR_COLLAPSED_PREF = 'menuRecolhido'

function readCollapsedPreference(): boolean {
  return lerPreferencia(SIDEBAR_COLLAPSED_PREF) === '1'
}

export default function AppLayout({ active, children, noPad, fullHeight, compact }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Preferência de sidebar recolhida (desktop) — precisa persistir porque AppLayout
  // remonta a cada navegação (não há layout compartilhado entre rotas), então um
  // useState puro resetaria o recolhimento a cada clique num link (#181).
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      gravarPreferencia(SIDEBAR_COLLAPSED_PREF, next ? '1' : null)
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <div
        className={clsx(
          'fixed inset-0 z-49 bg-black/35 md:hidden',
          drawerOpen ? 'block' : 'hidden'
        )}
        onClick={() => setDrawerOpen(false)}
      />
      <Sidebar
        active={active}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className={clsx('flex min-w-0 flex-1 flex-col', fullHeight ? 'overflow-hidden' : 'overflow-y-auto')}>
        <TopBar drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen(v => !v)} />
        {noPad ? children : (
          <div className={clsx(
            'w-full pb-14 pt-[34px] max-md:px-section max-md:pb-12 max-md:pt-[22px]',
            compact ? 'px-4' : 'mx-auto max-w-[1280px] px-10',
            fullHeight && 'flex min-h-0 flex-1 flex-col'
          )}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
