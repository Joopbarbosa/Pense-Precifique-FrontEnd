// #298 (V0.14.0, RN-NOVA-8/UC-NOVO-1) — unidades de medida cadastráveis em Configurações,
// substituindo o texto livre antigo de Insumo.unidadeMedida.
export interface UnidadeMedidaRequest {
  nome: string
  sigla: string
}

export interface UnidadeMedidaResponse {
  id: string
  nome: string
  sigla: string
  createdAt: string
  updatedAt: string
}
