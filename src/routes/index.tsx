import { createBrowserRouter, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Sidebar } from '../components/layout'

const Placeholder = ({ nome }: { nome: string }) => (
  <div style={{ padding: 32 }}>
    <h2 style={{ color: '#3A372F', margin: 0 }}>{nome}</h2>
    <p style={{ color: '#888' }}>Tela em construção</p>
  </div>
)

function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="dashboard" open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main style={{ flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/',         element: <Placeholder nome="Login" /> },
  { path: '/login',    element: <Placeholder nome="Login" /> },
  { path: '/cadastro', element: <Placeholder nome="Cadastro" /> },
  { path: '/onboarding', element: <Placeholder nome="Onboarding" /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard',           element: <Placeholder nome="Dashboard" /> },
      { path: '/clientes',            element: <Placeholder nome="Clientes" /> },
      { path: '/orcamentos',          element: <Placeholder nome="Lista de Orçamentos" /> },
      { path: '/orcamentos/novo',     element: <Placeholder nome="Criar Orçamento" /> },
      { path: '/orcamentos/:id',      element: <Placeholder nome="Detalhe do Orçamento" /> },
      { path: '/insumos',             element: <Placeholder nome="Lista de Insumos" /> },
      { path: '/insumos/novo',        element: <Placeholder nome="Cadastrar Insumo" /> },
      { path: '/insumos/:id',         element: <Placeholder nome="Detalhe do Insumo" /> },
      { path: '/produtos',            element: <Placeholder nome="Lista de Produtos" /> },
      { path: '/produtos/novo',       element: <Placeholder nome="Cadastrar Produto" /> },
      { path: '/produtos/:id/editar', element: <Placeholder nome="Editar Produto" /> },
      { path: '/produtos/:id',        element: <Placeholder nome="Detalhe do Produto" /> },
      { path: '/producao',            element: <Placeholder nome="Registro de Produção" /> },
      { path: '/configuracoes',       element: <Placeholder nome="Configurações" /> },
    ],
  },
])
