import { createBrowserRouter } from 'react-router-dom'
import { Logo, Wordmark } from '../components/ui'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/auth/LoginPage'
import CadastroPage from '../pages/auth/CadastroPage'
import OnboardingPage from '../pages/auth/OnboardingPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ClientesPage from '../pages/clientes/ClientesPage'
import ListaOrcamentosPage from '../pages/orcamentos/ListaOrcamentosPage'
import CriarOrcamentoPage from '../pages/orcamentos/CriarOrcamentoPage'
import DetalheOrcamentoPage from '../pages/orcamentos/DetalheOrcamentoPage'
import PreviewPdfPage from '../pages/orcamentos/PreviewPdfPage'
import ReciboSinalPage from '../pages/orcamentos/ReciboSinalPage'
import PreviewMultaPage from '../pages/orcamentos/PreviewMultaPage'
import ReciboPagamentoPage from '../pages/orcamentos/ReciboPagamentoPage'
import ListaInsumosPage from '../pages/insumos/ListaInsumosPage'
import ListaProdutosPage from '../pages/produtos/ListaProdutosPage'
import CadastrarProdutoPage from '../pages/produtos/CadastrarProdutoPage'
import FormInsumoPage from '../pages/insumos/FormInsumoPage'
import DetalheInsumoPage from '../pages/insumos/DetalheInsumoPage'
import DetalheProdutoPage from '../pages/produtos/DetalheProdutoPage'
import RegistroProducaoPage from '../pages/producao/RegistroProducaoPage'
import ConfiguracoesPage from '../pages/configuracoes/ConfiguracoesPage'

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
  { path: '/clientes',            element: <ClientesPage /> },
  { path: '/orcamentos',          element: <ListaOrcamentosPage /> },
  { path: '/orcamentos/novo',     element: <CriarOrcamentoPage /> },
  { path: '/orcamentos/:id',      element: <DetalheOrcamentoPage /> },
  { path: '/orcamentos/:id/preview', element: <PreviewPdfPage /> },
  { path: '/orcamentos/:id/recibo-sinal', element: <ReciboSinalPage /> },
  { path: '/orcamentos/:id/multa', element: <PreviewMultaPage /> },
  { path: '/orcamentos/:id/recibo-pagamento', element: <ReciboPagamentoPage /> },
  { path: '/insumos',             element: <ListaInsumosPage /> },
  { path: '/insumos/novo',        element: <FormInsumoPage /> },
  { path: '/insumos/:id/editar',  element: <FormInsumoPage /> },
  { path: '/insumos/:id',         element: <DetalheInsumoPage /> },
  { path: '/produtos',            element: <ListaProdutosPage /> },
  { path: '/produtos/novo',       element: <CadastrarProdutoPage /> },
  { path: '/produtos/:id/editar', element: <CadastrarProdutoPage /> },
  { path: '/produtos/:id',        element: <DetalheProdutoPage /> },
  { path: '/producao',            element: <RegistroProducaoPage /> },
  { path: '/producao/:numero',    element: <RegistroProducaoPage /> },
  { path: '/configuracoes',       element: <ConfiguracoesPage /> },
])
