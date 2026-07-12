import { Logo, Wordmark } from '../ui'
import { Menu, Bell } from 'lucide-react'

interface TopBarProps {
  onMenuOpen: () => void
}

export default function TopBar({ onMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-[10px] md:hidden">
      <button
        onClick={onMenuOpen}
        className="flex cursor-pointer border-none bg-transparent p-1 text-dark"
      >
        <Menu size={24} />
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
