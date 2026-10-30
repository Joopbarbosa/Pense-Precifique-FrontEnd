import { lerPreferencia, gravarPreferencia } from './preferenciaLocal'

/**
 * V0.17.0 #997 (RN-NOVA-33) — último método de pagamento usado ao confirmar uma compra paga. V0.18.0 (#671, RN-NOVA-23): guardado por
 * pessoa (conta), pelo utilitário de preferências. É só uma conveniência de tela: leitura e escrita nunca derrubam o formulário.
 */
const NOME = 'compra:ultimo-metodo-pagamento'

export function lerUltimoMetodoPagamentoCompra(): string | null {
  return lerPreferencia(NOME)
}

export function gravarUltimoMetodoPagamentoCompra(metodoId: string | null | undefined) {
  if (!metodoId) return
  gravarPreferencia(NOME, metodoId)
}
