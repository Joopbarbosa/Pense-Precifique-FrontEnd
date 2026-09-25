import api from './api'
import type { ProdutoResponse, ProdutoDetalheResponse, ProdutoRequest, ProdutoContagensResponse, BaixaManualProdutoRequest, MovimentacaoProdutoResponse, CatalogoVinculadoResponse, ComponenteVinculadoResponse, ResolverVinculosProdutoRequest } from '../types/produto'
import type { InsumoResponse } from '../types/insumo'
import type { PageResponse } from '../types/shared'

export const produtoService = {
  // #459 (V0.10.0, parent #336) — ativo filtra server-side (era sem filtro nenhum: a categoria
  // "Inativos" mostrava a mesma lista que "Todos", mesma classe de bug do #336 original).
  listar: async (page: number, size = 20, tipo?: string, busca?: string, semCatalogo?: boolean, ativo?: boolean): Promise<PageResponse<ProdutoResponse>> => {
    const params: Record<string, unknown> = { page, size, sort: 'nome' }
    if (tipo) params.tipo = tipo
    if (busca) params.busca = busca
    if (semCatalogo) params.semCatalogo = true
    if (ativo != null) params.ativo = ativo
    const response = await api.get('/produtos', { params })
    return response.data
  },

  // RN-NOVA-4 (V0.10.0, #336) — contadores por categoria (badges de ListaProdutosPage.tsx).
  // Endpoint já existia (Frente 4/P-BE-CONSOLIDADO-001), nunca tinha sido consumido pelo frontend.
  contagens: async (): Promise<ProdutoContagensResponse> => {
    const response = await api.get('/produtos/contagens')
    return response.data
  },

  buscarPorId: async (id: string): Promise<ProdutoDetalheResponse> => {
    const response = await api.get(`/produtos/${id}`)
    return response.data
  },

  cadastrar: async (data: ProdutoRequest): Promise<ProdutoDetalheResponse> => {
    const response = await api.post('/produtos', data)
    return response.data
  },

  editar: async (id: string, data: ProdutoRequest): Promise<ProdutoDetalheResponse> => {
    const response = await api.put(`/produtos/${id}`, data)
    return response.data
  },

  inativar: async (id: string): Promise<void> => {
    await api.post(`/produtos/${id}/inativar`)
  },

  reativar: async (id: string): Promise<void> => {
    await api.post(`/produtos/${id}/reativar`)
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/produtos/${id}`)
  },

  catalogosVinculados: async (id: string): Promise<CatalogoVinculadoResponse[]> => {
    const response = await api.get(`/produtos/${id}/catalogos-vinculados`)
    return response.data
  },

  componentesVinculados: async (id: string): Promise<ComponenteVinculadoResponse[]> => {
    const response = await api.get(`/produtos/${id}/componentes-vinculados`)
    return response.data
  },

  resolverVinculos: async (id: string, data: ResolverVinculosProdutoRequest): Promise<void> => {
    await api.post(`/produtos/${id}/resolver-vinculos`, data)
  },

  // #347 — ativo=true filtra já na busca (antes só bloqueava ao salvar a ficha técnica, deixando
  // inativos aparecerem/serem selecionáveis na lista de resultados).
  buscarInsumos: async (busca: string): Promise<InsumoResponse[]> => {
    const response = await api.get('/insumos', { params: { page: 0, size: 20, busca, sort: 'nome', ativo: true } })
    return response.data.content
  },

  // RN-NOVA-8 (V0.10.0, #462, altera PDT-015) — sem filtro de tipo: Produto e Customização, ambos
  // ativos, agora podem ser componente de ficha técnica. Antes só tipo=PRODUTO.
  // #347 — ativo=true filtra já na busca (mesmo motivo de buscarInsumos acima).
  buscarProdutosComponente: async (busca: string): Promise<ProdutoResponse[]> => {
    const response = await api.get('/produtos', { params: { page: 0, size: 20, busca, sort: 'nome', ativo: true } })
    return response.data.content
  },

  baixaManual: async (id: string, data: BaixaManualProdutoRequest): Promise<MovimentacaoProdutoResponse> => {
    const response = await api.post(`/produtos/${id}/baixa-manual`, data)
    return response.data
  },

  listarMovimentacoes: async (id: string, page: number, size = 20): Promise<PageResponse<MovimentacaoProdutoResponse>> => {
    const response = await api.get(`/produtos/${id}/movimentacoes`, { params: { page, size } })
    return response.data
  },

  // #531 (V0.14.0) — mesmo padrão de foto do Item de Catálogo (itemCatalogoService.uploadFoto/removerFoto).
  uploadFoto: async (id: string, arquivo: File): Promise<ProdutoDetalheResponse> => {
    const formData = new FormData()
    formData.append('arquivo', arquivo)
    const response = await api.post(`/produtos/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  removerFoto: async (id: string): Promise<ProdutoDetalheResponse> => {
    const response = await api.delete(`/produtos/${id}/foto`)
    return response.data
  },

}
