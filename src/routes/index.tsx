import { useState } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Logo, Wordmark, StatusBadge, TipoProdutoBadge, VencidoBadge } from '../components/ui'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'

type ActivePage = 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'producao' | 'config'

const DashboardPreview = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <div className={`scrim${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />
      <Sidebar active="dashboard" open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 style={{ color: '#3A372F', margin: 0 }}>Badges — Preview C-006</h2>

          <div>
            <p style={{ color: '#A29E96', fontSize: 13, marginBottom: 10, marginTop: 0 }}>Status de Orçamento</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <StatusBadge status="Rascunho" />
              <StatusBadge status="Enviado" />
              <StatusBadge status="Aprovado" />
              <StatusBadge status="Aguardando Sinal" />
              <StatusBadge status="Sinal Pago" />
              <StatusBadge status="Em Produção" />
              <StatusBadge status="Finalizado" />
              <StatusBadge status="Entregue" />
              <StatusBadge status="Pago" />
              <StatusBadge status="Cancelado" />
            </div>
          </div>

          <div>
            <p style={{ color: '#A29E96', fontSize: 13, marginBottom: 10, marginTop: 0 }}>Tamanho sm</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <StatusBadge status="Em Produção" size="sm" />
              <StatusBadge status="Pago" size="sm" />
              <StatusBadge status="Cancelado" size="sm" />
            </div>
          </div>

          <div>
            <p style={{ color: '#A29E96', fontSize: 13, marginBottom: 10, marginTop: 0 }}>Tipo de Produto</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TipoProdutoBadge tipo="Produto" />
              <TipoProdutoBadge tipo="Produto Base" />
              <TipoProdutoBadge tipo="Customização" />
            </div>
          </div>

          <div>
            <p style={{ color: '#A29E96', fontSize: 13, marginBottom: 10, marginTop: 0 }}>Badge especial</p>
            <VencidoBadge />
          </div>
        </div>
      </div>
    </div>
  )
}

const AppShell = ({ active, nome }: { active: ActivePage; nome: string }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <div
        className={`scrim${drawerOpen ? ' show' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <Sidebar
        active={active}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#3A372F', margin: 0 }}>{nome}</h2>
          <p style={{ color: '#A29E96' }}>Tela em construção</p>
        </div>
      </div>
    </div>
  )
}

const AuthShell = ({ nome }: { nome: string }) => (
  <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <Logo size={36} />
      <Wordmark size={18} />
    </div>
    <h2 style={{ color: '#3A372F', margin: 0 }}>{nome}</h2>
    <p style={{ color: '#A29E96' }}>Tela em construção</p>
  </div>
)

export const router = createBrowserRouter([
  { path: '/',           element: <AuthShell nome="Login" /> },
  { path: '/login',      element: <AuthShell nome="Login" /> },
  { path: '/cadastro',   element: <AuthShell nome="Cadastro" /> },
  { path: '/onboarding', element: <AuthShell nome="Onboarding" /> },

  { path: '/dashboard',  element: <DashboardPreview /> },
  { path: '/clientes',   element: <AppShell active="clientes"   nome="Clientes" /> },

  { path: '/orcamentos',          element: <AppShell active="orcamentos" nome="Lista de Orçamentos" /> },
  { path: '/orcamentos/novo',     element: <AppShell active="orcamentos" nome="Criar Orçamento" /> },
  { path: '/orcamentos/:id',      element: <AppShell active="orcamentos" nome="Detalhe do Orçamento" /> },

  { path: '/insumos',             element: <AppShell active="insumos" nome="Lista de Insumos" /> },
  { path: '/insumos/novo',        element: <AppShell active="insumos" nome="Cadastrar Insumo" /> },
  { path: '/insumos/:id',         element: <AppShell active="insumos" nome="Detalhe do Insumo" /> },

  { path: '/produtos',            element: <AppShell active="produtos" nome="Lista de Produtos" /> },
  { path: '/produtos/novo',       element: <AppShell active="produtos" nome="Cadastrar Produto" /> },
  { path: '/produtos/:id/editar', element: <AppShell active="produtos" nome="Editar Produto" /> },
  { path: '/produtos/:id',        element: <AppShell active="produtos" nome="Detalhe do Produto" /> },

  { path: '/producao',      element: <AppShell active="producao" nome="Registro de Produção" /> },
  { path: '/configuracoes', element: <AppShell active="config"   nome="Configurações" /> },
])
