import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo, Wordmark } from '../ui'
import { LayoutGrid, Users, FileText, Box, Package, LogOut, Files, Factory, Settings, ChevronLeft, ChevronRight, ChevronDown, Receipt, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

// Mesmo valor do breakpoint `md:` do Tailwind (não customizado em tailwind.config.ts) —
// duplicado aqui só porque este cálculo específico precisa rodar em JS, não CSS.
const MOBILE_BREAKPOINT_PX = 768

const ITEM_DASHBOARD = { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, size: 20, href: '/dashboard' } as const

// Achado do teste manual (#487/#488, V0.12.0) — Caixa e Orçamentos são os dois caminhos de venda
// do sistema (rápida x planejada, Epic #416); agrupados sob "Vendas" para deixar essa relação
// visível na navegação, em vez de dois itens soltos e sem ligação aparente.
const GRUPO_VENDAS = {
  id: 'vendas',
  label: 'Vendas',
  itens: [
    { id: 'caixa',      label: 'Caixa',      icon: Receipt,  size: 20, href: '/caixa' },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText, size: 20, href: '/orcamentos' },
  ],
} as const

const NAV_RESTANTE = [
  { id: 'clientes',  label: 'Clientes e Fornecedores', icon: Users, size: 20, href: '/clientes' },
  { id: 'insumos',   label: 'Insumos',       icon: Package,  size: 20, href: '/insumos' },
  { id: 'produtos',  label: 'Produtos',      icon: Box,      size: 20, href: '/produtos' },
  { id: 'catalogos', label: 'Catálogos',     icon: Files,    size: 22, href: '/catalogos' },
  { id: 'producao',  label: 'Produção',      icon: Factory,  size: 20, href: '/producao' },
  { id: 'config',    label: 'Configurações', icon: Settings, size: 20, href: '/configuracoes' },
] as const

interface SidebarProps {
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'caixa' | 'insumos' | 'produtos' | 'catalogos' | 'producao' | 'config'
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

interface NavItemDef {
  id: string
  label: string
  icon: typeof LayoutGrid
  size: number
  href: string
}

function renderNavItem(
  { id, label, icon: Icon, size, href }: NavItemDef,
  collapsed: boolean,
  onClick: () => void,
  indent = false,
) {
  return (
    <NavLink
      key={id}
      to={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) => clsx(
        'flex items-center gap-[13px] rounded-[11px] px-[13px] py-[11px] text-[14.5px] no-underline transition-colors hover:bg-cream',
        collapsed && 'md:justify-center md:px-0',
        indent && !collapsed && 'ml-5',
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
  )
}

// #501 (V0.12.0) — mesmo motivo de `collapsed` em AppLayout.tsx: o AppLayout remonta a cada
// navegação (sem layout de rota compartilhado), então um `useState` puro resetaria o grupo pra
// expandido a cada clique num link. Só afeta o layout interno do Sidebar (não a largura da coluna
// como `collapsed`), então o estado fica local aqui em vez de subir pro AppLayout.
const SIDEBAR_VENDAS_EXPANDIDO_KEY = 'sidebarVendasExpandido'

function readVendasExpandidoPreference(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_VENDAS_EXPANDIDO_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [vendasExpandido, setVendasExpandido] = useState(readVendasExpandidoPreference)

  function toggleVendasExpandido() {
    setVendasExpandido(prev => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_VENDAS_EXPANDIDO_KEY, next ? '1' : '0')
      } catch {
        // localStorage indisponível (ex: modo privado) — preferência só não persiste, sem quebrar a UI
      }
      return next
    })
  }

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
          {renderNavItem(ITEM_DASHBOARD, collapsed, closeIfMobile)}

          {/* #501/#513 — grupo recolhível só faz sentido com o sidebar expandido: no modo ícone
              (`collapsed`) não há onde mostrar o cabeçalho/chevron, então os itens do grupo
              sempre aparecem, ignorando `vendasExpandido`. Cabeçalho segue o mesmo padrão visual
              dos demais itens de navegação (ícone, mesma fonte, sem caixa alta) — a única
              diferença é expandir/recolher ao clicar (achado do teste manual, correção do #501). */}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleVendasExpandido}
              aria-expanded={vendasExpandido}
              className="flex w-full items-center gap-[13px] rounded-[11px] border-none bg-transparent px-[13px] py-[11px] text-left font-[inherit] text-[14.5px] font-medium text-body transition-colors hover:bg-cream"
            >
              <span className="flex text-muted">
                <ShoppingBag size={20} />
              </span>
              <span className="flex-1">{GRUPO_VENDAS.label}</span>
              <ChevronDown size={15} className={clsx('flex-shrink-0 text-muted transition-transform duration-150', !vendasExpandido && '-rotate-90')} />
            </button>
          )}
          {(vendasExpandido || collapsed) && GRUPO_VENDAS.itens.map(item => renderNavItem(item, collapsed, closeIfMobile, true))}

          {NAV_RESTANTE.map(item => renderNavItem(item, collapsed, closeIfMobile))}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-[14px] pb-[18px] pt-3">
          <button
            onClick={() => { closeIfMobile(); handleLogout() }}
            title={collapsed ? 'Sair' : undefined}
            className={clsx(
              'flex w-full items-center gap-[13px] rounded-[11px] border-none bg-transparent px-[13px] py-[11px] text-[14.5px] font-medium text-subtle hover:bg-cream',
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
