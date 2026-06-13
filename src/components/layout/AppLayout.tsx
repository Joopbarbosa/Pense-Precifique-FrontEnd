import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AppLayoutProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'producao' | 'config'
  children: React.ReactNode
  noPad?: boolean
}

export default function AppLayout({ active, children, noPad }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="app-shell">
      <div
        className={`scrim${drawerOpen ? ' show' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <Sidebar
        active={active}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <div className="main-area">
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        {noPad ? children : <div className="content">{children}</div>}
      </div>
    </div>
  )
}
