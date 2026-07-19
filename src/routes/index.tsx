import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from '../components/shared/ProtectedRoute'
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
import ListaCatalogosPage from '../pages/catalogos/ListaCatalogosPage'
import NovoCatalogoPage from '../pages/catalogos/NovoCatalogoPage'
import NovoItemCatalogoPage from '../pages/catalogos/NovoItemCatalogoPage'
import DetalheCatalogoPage from '../pages/catalogos/DetalheCatalogoPage'
import ListaProducaoPage from '../pages/producao/ListaProducaoPage'
import NovaProducaoPage from '../pages/producao/NovaProducaoPage'
import EditarProducaoPage from '../pages/producao/EditarProducaoPage'
import DetalheProducaoPage from '../pages/producao/DetalheProducaoPage'
import ConfiguracoesPage from '../pages/configuracoes/ConfiguracoesPage'

export const router = createBrowserRouter([
  // Rotas públicas
  { path: '/',         element: <LoginPage /> },
  { path: '/login',    element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroPage /> },

  // Rotas protegidas — exigem autenticação
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },

      { path: '/dashboard',  element: <DashboardPage /> },
      { path: '/clientes',   element: <ClientesPage /> },

      { path: '/orcamentos',                          element: <ListaOrcamentosPage /> },
      { path: '/orcamentos/novo',                     element: <CriarOrcamentoPage /> },
      { path: '/orcamentos/:id',                      element: <DetalheOrcamentoPage /> },
      { path: '/orcamentos/:id/preview',              element: <PreviewPdfPage /> },
      { path: '/orcamentos/:id/recibo-sinal',         element: <ReciboSinalPage /> },
      { path: '/orcamentos/:id/multa',                element: <PreviewMultaPage /> },
      { path: '/orcamentos/:id/recibo-pagamento',     element: <ReciboPagamentoPage /> },

      { path: '/insumos',              element: <ListaInsumosPage /> },
      { path: '/insumos/novo',         element: <FormInsumoPage /> },
      { path: '/insumos/:id/editar',   element: <FormInsumoPage /> },
      { path: '/insumos/:id',          element: <DetalheInsumoPage /> },

      { path: '/produtos',             element: <ListaProdutosPage /> },
      { path: '/produtos/novo',        element: <CadastrarProdutoPage /> },
      { path: '/produtos/:id/editar',  element: <CadastrarProdutoPage /> },
      { path: '/produtos/:id',         element: <DetalheProdutoPage /> },

      { path: '/catalogos',            element: <ListaCatalogosPage /> },
      { path: '/catalogos/novo',       element: <NovoCatalogoPage /> },
      { path: '/catalogos/itens/novo', element: <NovoItemCatalogoPage /> },
      { path: '/catalogos/:id',        element: <DetalheCatalogoPage /> },

      { path: '/producao',             element: <ListaProducaoPage /> },
      { path: '/producao/nova',        element: <NovaProducaoPage /> },
      { path: '/producao/:id/editar',  element: <EditarProducaoPage /> },
      { path: '/producao/:id',         element: <DetalheProducaoPage /> },

      { path: '/configuracoes',        element: <ConfiguracoesPage /> },
    ],
  },
])
