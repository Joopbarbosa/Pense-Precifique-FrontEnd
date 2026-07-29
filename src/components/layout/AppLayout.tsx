import { useState } from 'react'
import clsx from 'clsx'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppLayoutProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config'
  children: React.ReactNode
  noPad?: boolean
  fullHeight?: boolean
  /** #182 — piloto: padding reduzido (16px em vez de 40px) e conteúdo fluido, sem max-w-[1280px]. */
  compact?: boolean
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
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
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // localStorage indisponível (ex: modo privado) — preferência só não persiste, sem quebrar a UI
      }
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <div
        className={clsx(
          'fixed inset-0 z-[49] bg-black/[0.35] md:hidden',
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
            'w-full pb-14 pt-[34px] max-md:px-[18px] max-md:pb-12 max-md:pt-[22px]',
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
