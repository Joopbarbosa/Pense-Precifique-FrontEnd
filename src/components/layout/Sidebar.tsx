import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark } from '../ui'
import { LayoutGrid, Users, FileText, Box, Package, LogOut, Files, Factory, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

// Mesmo valor do breakpoint `md:` do Tailwind (não customizado em tailwind.config.ts) —
// duplicado aqui só porque este cálculo específico precisa rodar em JS, não CSS.
const MOBILE_BREAKPOINT_PX = 768

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutGrid, size: 20, href: '/dashboard' },
  { id: 'clientes',   label: 'Clientes',      icon: Users,     size: 20, href: '/clientes' },
  { id: 'orcamentos', label: 'Orçamentos',    icon: FileText,  size: 20, href: '/orcamentos' },
  { id: 'insumos',    label: 'Insumos',       icon: Package,   size: 20, href: '/insumos' },
  { id: 'produtos',   label: 'Produtos',      icon: Box,       size: 20, href: '/produtos' },
  { id: 'catalogos',  label: 'Catálogos',     icon: Files,     size: 22, href: '/catalogos' },
  { id: 'producao',   label: 'Produção',      icon: Factory,   size: 20, href: '/producao' },
  { id: 'config',     label: 'Configurações', icon: Settings,  size: 20, href: '/configuracoes' },
] as const

interface SidebarProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config'
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  function closeIfMobile() {
    if (window.innerWidth < MOBILE_BREAKPOINT_PX) onClose()
  }

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      <nav
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-shrink-0 flex-col bg-app shadow-[4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-[220ms] ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0 md:border-r md:border-line md:shadow-none',
          collapsed && 'md:w-[76px]'
        )}
      >
        {/* Botão de recolher/expandir — só desktop (#181). Aba flutuante na borda direita. */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-3 top-[52px] z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-muted shadow-[0_2px_6px_rgba(0,0,0,0.14)] hover:text-teal md:flex"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header */}
        <div className={clsx('flex items-center gap-2.5 px-[14px] pb-3 pt-4', collapsed && 'md:justify-center')}>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] border border-line bg-white shadow-[0_2px_7px_rgba(0,0,0,0.07)]">
            <Logo size={32} />
          </div>
          <div className={clsx('flex flex-col gap-px', collapsed && 'md:hidden')}>
            <Wordmark size={15.5} />
            <span className="text-[11.5px] font-medium text-muted">Para artesãs</span>
          </div>
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col gap-[3px] p-[14px]">
          {NAV.map(({ id, label, icon: Icon, size, href }) => (
            <NavLink
              key={id}
              to={href}
              onClick={closeIfMobile}
              title={collapsed ? label : undefined}
              className={({ isActive }) => clsx(
                'flex items-center gap-[13px] rounded-[11px] px-[13px] py-[11px] text-[14.5px] no-underline transition-colors hover:bg-[#FAF8F5]',
                collapsed && 'md:justify-center md:px-0',
                isActive
                  ? 'bg-orange/[0.08] font-semibold text-orange shadow-[inset_3px_0_0_#F97316]'
                  : 'font-medium text-body'
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('flex', isActive ? 'text-orange' : 'text-muted')}>
                    <Icon size={size} />
                  </span>
                  <span className={clsx(collapsed && 'md:hidden')}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-[14px] pb-[18px] pt-3">
          <button
            onClick={() => { closeIfMobile(); handleLogout() }}
            title={collapsed ? 'Sair' : undefined}
            className={clsx(
              'flex w-full items-center gap-[13px] rounded-[11px] border-none bg-transparent px-[13px] py-[11px] text-[14.5px] font-medium text-subtle hover:bg-[#FAF8F5]',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            <span className="flex text-muted">
              <LogOut size={20} />
            </span>
            <span className={clsx(collapsed && 'md:hidden')}>Sair</span>
          </button>
        </div>
      </nav>
    </>
  )
}
