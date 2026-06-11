import { Logo, Wordmark } from '../ui'

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" strokeWidth={1.7} fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16"/>
  </svg>
)

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" strokeWidth={1.7} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/>
    <path d="M10 19.5a2 2 0 0 0 4 0"/>
  </svg>
)

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
        <MenuIcon />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={26} />
        <Wordmark size={14} />
      </div>

      <button
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A29E96', padding: 4, display: 'flex' }}
      >
        <BellIcon />
      </button>
    </header>
  )
}
