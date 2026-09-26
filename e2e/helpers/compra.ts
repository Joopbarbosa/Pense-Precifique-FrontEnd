import { APIRequestContext } from '@playwright/test'
import { API_URL } from './auth'

/**
 * V0.15.0 (#541) — `POST /lotes-compra` foi removido; entrada de estoque real agora é uma compra
 * confirmada (`POST /compras/confirmar`, tudo ou nada). Custo pela média ponderada, igual ao lote antigo.
 */
export async function registrarCompraConfirmada(
  request: APIRequestContext,
  token: string,
  itens: { insumoId: string; quantidade: number; precoTotal: number }[],
) {
  const hoje = new Date()
  const dataCompra = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const res = await request.post(`${API_URL}/compras/confirmar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataCompra, multiplosFornecedores: false, pago: false, itens },
  })
  if (!res.ok()) throw new Error(`Falha ao registrar compra de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}
