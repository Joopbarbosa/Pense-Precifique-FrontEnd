import { Logo, Wordmark } from '../ui'
import { Menu, X, Bell } from 'lucide-react'

interface TopBarProps {
  drawerOpen: boolean
  onToggleDrawer: () => void
}

export default function TopBar({ drawerOpen, onToggleDrawer }: TopBarProps) {
  return (
    // z-[60] — acima do Sidebar (z-50) e do overlay (z-[49]), pra que este botão
    // continue clicável/visível com o drawer mobile aberto (#181).
    <header className="sticky top-0 z-[60] flex items-center justify-between border-b border-line bg-white px-4 py-[10px] md:hidden">
      <button
        onClick={onToggleDrawer}
        aria-label={drawerOpen ? 'Fechar menu' : 'Abrir menu'}
        className="flex cursor-pointer border-none bg-transparent p-1 text-dark"
      >
        {drawerOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="flex items-center gap-2">
        <Logo size={26} />
        <Wordmark size={14} />
      </div>

      <button className="flex cursor-pointer border-none bg-transparent p-1 text-muted">
        <Bell size={20} />
      </button>
    </header>
  )
}
