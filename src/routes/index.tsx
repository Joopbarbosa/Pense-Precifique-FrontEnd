import { createBrowserRouter } from 'react-router-dom'
import { Logo, Wordmark } from '../components/ui'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/auth/LoginPage'
import CadastroPage from '../pages/auth/CadastroPage'
import OnboardingPage from '../pages/auth/OnboardingPage'
import DashboardPage from '../pages/dashboard/DashboardPage'

const Placeholder = ({ nome, active }: {
  nome: string
  active: 'dashboard' | 'clientes' | 'orcamentos' | 'insumos' | 'produtos' | 'producao' | 'config'
}) => (
  <AppLayout active={active}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <Logo size={36} />
      <Wordmark size={18} />
    </div>
    <h2 style={{ margin: 0, color: '#3A372F' }}>{nome}</h2>
    <p style={{ color: '#A29E96', marginTop: 8 }}>Tela em construção</p>
  </AppLayout>
)

const AuthPlaceholder = ({ nome }: { nome: string }) => (
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
  { path: '/',      element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro',   element: <CadastroPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },

  { path: '/dashboard',           element: <DashboardPage /> },
  { path: '/clientes',            element: <Placeholder nome="Clientes" active="clientes" /> },
  { path: '/orcamentos',          element: <Placeholder nome="Lista de Orçamentos" active="orcamentos" /> },
  { path: '/orcamentos/novo',     element: <Placeholder nome="Criar Orçamento" active="orcamentos" /> },
  { path: '/orcamentos/:id',      element: <Placeholder nome="Detalhe do Orçamento" active="orcamentos" /> },
  { path: '/insumos',             element: <Placeholder nome="Lista de Insumos" active="insumos" /> },
  { path: '/insumos/novo',        element: <Placeholder nome="Cadastrar Insumo" active="insumos" /> },
  { path: '/insumos/:id',         element: <Placeholder nome="Detalhe do Insumo" active="insumos" /> },
  { path: '/produtos',            element: <Placeholder nome="Lista de Produtos" active="produtos" /> },
  { path: '/produtos/novo',       element: <Placeholder nome="Cadastrar Produto" active="produtos" /> },
  { path: '/produtos/:id/editar', element: <Placeholder nome="Editar Produto" active="produtos" /> },
  { path: '/produtos/:id',        element: <Placeholder nome="Detalhe do Produto" active="produtos" /> },
  { path: '/producao',            element: <Placeholder nome="Registro de Produção" active="producao" /> },
  { path: '/configuracoes',       element: <Placeholder nome="Configurações" active="config" /> },
])
