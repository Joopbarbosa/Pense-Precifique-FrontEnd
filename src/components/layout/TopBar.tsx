import { Logo, Wordmark } from '../ui'
import { Icons } from '../ui/Icons'

interface TopBarProps {
  onMenuOpen: () => void
}

export default function TopBar({ onMenuOpen }: TopBarProps) {
  return (
    <header className="mobile-topbar">
      <button
        onClick={onMenuOpen}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3A372F', padding: 4, display: 'flex' }}
      >
        <Icons.menu />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={26} />
        <Wordmark size={14} />
      </div>

      <button
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A29E96', padding: 4, display: 'flex' }}
      >
        <Icons.bell />
      </button>
    </header>
  )
}
