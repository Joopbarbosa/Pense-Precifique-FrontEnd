/**
 * V0.17.0 #997 (RN-NOVA-33) — último método de pagamento usado ao confirmar uma compra paga, guardado no
 * navegador (por aparelho). É só uma conveniência de tela: leitura e escrita nunca derrubam o formulário.
 */
const CHAVE = 'pp:compra:ultimo-metodo-pagamento'

export function lerUltimoMetodoPagamentoCompra(): string | null {
  try {
    const v = window.localStorage.getItem(CHAVE)
    return v && v.length <= 64 ? v : null
  } catch {
    return null
  }
}

export function gravarUltimoMetodoPagamentoCompra(metodoId: string | null | undefined) {
  if (!metodoId) return
  try {
    window.localStorage.setItem(CHAVE, metodoId)
  } catch {
    /* armazenamento indisponível: segue sem lembrar */
  }
}
