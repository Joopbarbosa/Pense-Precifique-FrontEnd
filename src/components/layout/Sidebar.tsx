import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark } from '../ui'
import { LayoutGrid, Users, FileText, Box, Package, X, LogOut, Files, Factory, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

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
      <div
        className={clsx('fixed inset-0 z-[49] bg-black/35', open ? 'block md:hidden' : 'hidden')}
        onClick={onClose}
      />
      <nav
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-shrink-0 flex-col bg-app shadow-[4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-[220ms] ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0 md:border-r md:border-line md:shadow-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-[14px] pb-3 pt-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] border border-line bg-white shadow-[0_2px_7px_rgba(0,0,0,0.07)]">
            <Logo size={32} />
          </div>
          <div className="flex flex-col gap-px">
            <Wordmark size={15.5} />
            <span className="text-[11.5px] font-medium text-muted">Para artesãs</span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex border-none bg-transparent p-1 text-muted md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col gap-[3px] p-[14px]">
          {NAV.map(({ id, label, icon: Icon, size, href }) => (
            <NavLink
              key={id}
              to={href}
              onClick={closeIfMobile}
              className={({ isActive }) => clsx(
                'flex items-center gap-[13px] rounded-[11px] px-[13px] py-[11px] text-[14.5px] no-underline transition-colors hover:bg-[#FAF8F5]',
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
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-[14px] pb-[18px] pt-3">
          <button
            onClick={() => { closeIfMobile(); handleLogout() }}
            className="flex w-full items-center gap-[13px] rounded-[11px] border-none bg-transparent px-[13px] py-[11px] text-[14.5px] font-medium text-subtle hover:bg-[#FAF8F5]"
          >
            <span className="flex text-muted">
              <LogOut size={20} />
            </span>
            Sair
          </button>
        </div>
      </nav>
    </>
  )
}
