import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from '../components/shared/ProtectedRoute'
import LoginPage from '../pages/auth/LoginPage'
import CadastroPage from '../pages/auth/CadastroPage'
import OnboardingPage from '../pages/auth/OnboardingPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ClientesPage from '../pages/clientes/ClientesPage'
import FormClientePage from '../pages/clientes/FormClientePage'
import DetalheClientePage from '../pages/clientes/DetalheClientePage'
import ComprasPage from '../pages/compras/ComprasPage'
import FormCompraPage from '../pages/compras/FormCompraPage'
import DetalheCompraPage from '../pages/compras/DetalheCompraPage'
import PreviewPdfCompraPage from '../pages/compras/PreviewPdfCompraPage'
import ListaComprasPage from '../pages/compras/ListaComprasPage'
import DetalheListaCompraPage from '../pages/compras/DetalheListaCompraPage'
import PreviewPdfListaCompraPage from '../pages/compras/PreviewPdfListaCompraPage'
import ListaOrcamentosPage from '../pages/orcamentos/ListaOrcamentosPage'
import CriarOrcamentoPage from '../pages/orcamentos/CriarOrcamentoPage'
import DetalheOrcamentoPage from '../pages/orcamentos/DetalheOrcamentoPage'
import PreviewPdfOrcamentoPage from '../pages/orcamentos/PreviewPdfOrcamentoPage'
import ReciboSinalPage from '../pages/orcamentos/ReciboSinalPage'
import ReciboMultaPage from '../pages/orcamentos/ReciboMultaPage'
import ReciboPagamentoPage from '../pages/orcamentos/ReciboPagamentoPage'
import ReciboEstornoPage from '../pages/orcamentos/ReciboEstornoPage'
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
import CaixaPage from '../pages/caixa/CaixaPage'

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
      { path: '/clientes',            element: <ClientesPage /> },
      { path: '/clientes/novo',       element: <FormClientePage /> },
      { path: '/clientes/:id/editar', element: <FormClientePage /> },
      { path: '/clientes/:id',        element: <DetalheClientePage /> },

      { path: '/orcamentos',                          element: <ListaOrcamentosPage /> },
      { path: '/orcamentos/novo',                     element: <CriarOrcamentoPage /> },
      { path: '/orcamentos/:id/editar',               element: <CriarOrcamentoPage /> },
      { path: '/orcamentos/:id',                      element: <DetalheOrcamentoPage /> },
      { path: '/orcamentos/:id/preview',              element: <PreviewPdfOrcamentoPage /> },
      { path: '/orcamentos/:id/recibo-sinal',         element: <ReciboSinalPage /> },
      { path: '/orcamentos/:id/multa',                element: <ReciboMultaPage /> },
      { path: '/orcamentos/:id/recibo-pagamento',     element: <ReciboPagamentoPage /> },
      { path: '/orcamentos/:id/recibo-estorno',       element: <ReciboEstornoPage /> },

      { path: '/caixa',                element: <CaixaPage /> },

      { path: '/compras',              element: <ComprasPage /> },
      { path: '/compras/nova',         element: <FormCompraPage /> },
      { path: '/compras/lista',        element: <ListaComprasPage /> },
      { path: '/compras/lista/:id',    element: <DetalheListaCompraPage /> },
      { path: '/compras/lista/:id/pdf', element: <PreviewPdfListaCompraPage /> },
      { path: '/compras/:id/editar',   element: <FormCompraPage /> },
      { path: '/compras/:id',          element: <DetalheCompraPage /> },
      { path: '/compras/:id/pdf',      element: <PreviewPdfCompraPage /> },

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
      { path: '/producao/:id/editar',    element: <EditarProducaoPage /> },
      { path: '/producao/:id',           element: <DetalheProducaoPage /> },

      { path: '/configuracoes',        element: <ConfiguracoesPage /> },
    ],
  },
])
