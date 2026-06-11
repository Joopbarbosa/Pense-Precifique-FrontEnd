import { useState } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Logo, Wordmark } from '../components/ui'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'

const DashboardPreview = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <div
        className={`scrim${drawerOpen ? ' show' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <Sidebar
        active="dashboard"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#3A372F', margin: 0 }}>Dashboard</h2>
          <p style={{ color: '#A29E96' }}>Tela em construção</p>
        </div>
      </div>
    </div>
  )
}

const Placeholder = ({ nome }: { nome: string }) => (
  <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#3A372F' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <Logo size={36} />
      <Wordmark size={18} />
    </div>
    <h2 style={{ margin: 0 }}>{nome}</h2>
    <p style={{ color: '#888' }}>Tela em construção</p>
  </div>
)

export const router = createBrowserRouter([
  { path: '/',                     element: <Placeholder nome="Login" /> },
  { path: '/login',                element: <Placeholder nome="Login" /> },
  { path: '/cadastro',             element: <Placeholder nome="Cadastro" /> },
  { path: '/onboarding',           element: <Placeholder nome="Onboarding" /> },
  { path: '/dashboard',            element: <DashboardPreview /> },
  { path: '/clientes',             element: <Placeholder nome="Clientes" /> },
  { path: '/orcamentos',           element: <Placeholder nome="Lista de Orçamentos" /> },
  { path: '/orcamentos/novo',      element: <Placeholder nome="Criar Orçamento" /> },
  { path: '/orcamentos/:id',       element: <Placeholder nome="Detalhe do Orçamento" /> },
  { path: '/insumos',              element: <Placeholder nome="Lista de Insumos" /> },
  { path: '/insumos/novo',         element: <Placeholder nome="Cadastrar Insumo" /> },
  { path: '/insumos/:id',          element: <Placeholder nome="Detalhe do Insumo" /> },
  { path: '/produtos',             element: <Placeholder nome="Lista de Produtos" /> },
  { path: '/produtos/novo',        element: <Placeholder nome="Cadastrar Produto" /> },
  { path: '/produtos/:id/editar',  element: <Placeholder nome="Editar Produto" /> },
  { path: '/produtos/:id',         element: <Placeholder nome="Detalhe do Produto" /> },
  { path: '/producao',             element: <Placeholder nome="Registro de Produção" /> },
  { path: '/configuracoes',        element: <Placeholder nome="Configurações" /> },
])
