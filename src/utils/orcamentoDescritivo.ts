import type { DescritivoOpcaoRequest, GerarVendaDescritivoRequest } from '../types/orcamentoDescritivo'

export const MAX_OPCOES_DESCRITIVO = 100
export const MSG_LIMITE_OPCOES = 'Informe de 1 a 100 opções.'
export const MSG_CLIENTE_PARA_VENDA = 'Escolha o cliente para gerar o orçamento.'
export const MSG_MARQUE_OPCAO = 'Marque ao menos uma opção.'

/** Mensagem de bloqueio (ou null) para o número de opções do Descritivo (de 1 a 100). */
export function validarQuantidadeOpcoes(qtd: number): string | null {
  return qtd < 1 || qtd > MAX_OPCOES_DESCRITIVO ? MSG_LIMITE_OPCOES : null
}

/** Mensagem de bloqueio (ou null) para gerar a Venda: precisa de cliente (o do Descritivo ou o escolhido) e ao menos uma opção marcada. */
export function validarGerarVenda(temCliente: boolean, marcadas: number): string | null {
  if (marcadas < 1) return MSG_MARQUE_OPCAO
  if (!temCliente) return MSG_CLIENTE_PARA_VENDA
  return null
}

/** Quantidade digitada como inteiro de 1 a 100000; texto inválido volta null. */
export function quantidadeValida(texto: string): number | null {
  if (!/^\d{1,6}$/.test(texto.trim())) return null
  const n = Number(texto)
  return n >= 1 && n <= 100000 ? n : null
}

/** Preço digitado ("12,50" ou "12.5") para número com 2 casas; vazio = usar o preço atual (undefined); inválido = null. */
export function precoReferenciaDigitado(texto: string): number | undefined | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return undefined
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(t)) return null
  return Number(t)
}

export function montarCorpoGerarVenda(clienteId: string | undefined, marcadas: { opcaoId: string; quantidade: number }[]): GerarVendaDescritivoRequest {
  return { ...(clienteId ? { clienteId } : {}), itens: marcadas }
}

export function opcaoParaRequest(o: { produtoId?: string | null; itemCatalogoId?: string | null; precoReferencia?: number; quantidadeUnidade?: string }): DescritivoOpcaoRequest {
  const qtd = o.quantidadeUnidade?.trim()
  return {
    ...(o.produtoId ? { produtoId: o.produtoId } : {}),
    ...(o.itemCatalogoId ? { itemCatalogoId: o.itemCatalogoId } : {}),
    ...(o.precoReferencia !== undefined ? { precoReferencia: o.precoReferencia } : {}),
    ...(qtd ? { quantidadeUnidade: qtd } : {}),
  }
}
