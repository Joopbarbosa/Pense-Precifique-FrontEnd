import { useState } from 'react'
import clsx from 'clsx'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppLayoutProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config'
  children: React.ReactNode
  noPad?: boolean
}

export default function AppLayout({ active, children, noPad }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        {noPad ? children : (
          <div className="mx-auto w-full max-w-[1280px] px-10 pb-14 pt-[34px] max-md:px-[18px] max-md:pb-12 max-md:pt-[22px]">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
