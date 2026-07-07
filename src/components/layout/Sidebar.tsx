import { NavLink, useNavigate } from 'react-router-dom'
import { Logo, Wordmark } from '../ui'
import { Icons } from '../ui/Icons'
import { useAuthStore } from '../../store/authStore'

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
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config'
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  function closeIfMobile() {
    if (window.innerWidth < 768) onClose()
  }

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
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#A29E96', padding: 4 }}
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
              onClick={closeIfMobile}
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
            onClick={() => { closeIfMobile(); handleLogout() }}
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
