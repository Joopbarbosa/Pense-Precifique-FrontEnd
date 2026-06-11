import { NavLink, useNavigate } from 'react-router-dom'
import { Logo, Wordmark } from '../ui'
import { useAuthStore } from '../../store/authStore'

const sw = { strokeWidth: 1.7, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const Icons = {
  grid:    () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>,
  users:   () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><circle cx="9" cy="8" r="3.3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4"/></svg>,
  doc:     () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/><path d="M8.5 13.5h7M8.5 16.5h5"/></svg>,
  box:     () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8"/></svg>,
  cube:    () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
  factory: () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/><path d="M3.5 20.5h17M7 16.5h.01M11.5 16.5h.01M16 16.5h.01"/></svg>,
  gear:    () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.4a1.7 1.7 0 0 0 1-1.6V2.7a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2"/></svg>,
  logout:  () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5"/><path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6"/></svg>,
  x:       () => <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M6 6l12 12M18 6 6 18"/></svg>,
}

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',    icon: Icons.grid,    href: '/dashboard' },
  { id: 'clientes',   label: 'Clientes',      icon: Icons.users,   href: '/clientes' },
  { id: 'orcamentos', label: 'Orçamentos',    icon: Icons.doc,     href: '/orcamentos' },
  { id: 'insumos',    label: 'Insumos',       icon: Icons.box,     href: '/insumos' },
  { id: 'produtos',   label: 'Produtos',      icon: Icons.cube,    href: '/produtos' },
  { id: 'producao',   label: 'Produção',      icon: Icons.factory, href: '/producao' },
  { id: 'config',     label: 'Configurações', icon: Icons.gear,    href: '/configuracoes' },
] as const

interface SidebarProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'producao' | 'config'
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} onClick={onClose} />
      <nav className={`sidebar${open ? ' open' : ''}`}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px 12px' }}>
          <div style={{
            width: 44, height: 44, background: '#fff',
            border: '1px solid #EFEDE8', borderRadius: 13,
            boxShadow: '0 2px 7px rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Logo size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Wordmark size={15.5} />
            <span style={{ fontSize: 11.5, color: '#A29E96', fontWeight: 500 }}>Para artesãs</span>
          </div>
          <button
            className="drawer-close"
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              cursor: 'pointer', color: '#A29E96', padding: 4,
            }}
          >
            <Icons.x />
          </button>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(({ id, label, icon: Icon, href }) => (
            <NavLink
              key={id}
              to={href}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 13,
                padding: '11px 13px', borderRadius: 11,
                fontSize: 14.5, textDecoration: 'none',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#F97316' : '#5C594F',
                background: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
                boxShadow: isActive ? 'inset 3px 0 0 #F97316' : 'none',
              })}
              className="nav-item"
            >
              {({ isActive }) => (
                <>
                  <span style={{ color: isActive ? '#F97316' : '#A29E96', display: 'flex' }}>
                    <Icon />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #EFEDE8', padding: '12px 14px 18px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 13,
              padding: '11px 13px', borderRadius: 11, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: 14.5, fontWeight: 500, color: '#7C786F',
            }}
            className="nav-item"
          >
            <span style={{ color: '#A29E96', display: 'flex' }}>
              <Icons.logout />
            </span>
            Sair
          </button>
        </div>
      </nav>
    </>
  )
}
