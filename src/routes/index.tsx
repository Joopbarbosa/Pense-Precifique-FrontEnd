import { createBrowserRouter } from 'react-router-dom'

const Placeholder = ({ nome }: { nome: string }) => (
  <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#3A372F' }}>
    <h2>{nome}</h2>
    <p style={{ color: '#888' }}>Tela em construção</p>
  </div>
)

export const router = createBrowserRouter([
  { path: '/',                     element: <Placeholder nome="Login" /> },
  { path: '/login',                element: <Placeholder nome="Login" /> },
  { path: '/cadastro',             element: <Placeholder nome="Cadastro" /> },
  { path: '/onboarding',           element: <Placeholder nome="Onboarding" /> },
  { path: '/dashboard',            element: <Placeholder nome="Dashboard" /> },
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
