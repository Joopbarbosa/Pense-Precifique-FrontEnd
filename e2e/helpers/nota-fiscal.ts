import { expect, type APIRequestContext } from '@playwright/test'
import { hojeLocal } from './data'

/**
 * #749 (saúde técnica V0.16.0) — auxiliares dos specs de Compras que usam o leitor fiscal falso
 * (e2e/fakes/leitor-fiscal-falso.mjs): CNPJ válido, chave de acesso única e a nota registrada no leitor.
 * Antes cada spec tinha a sua cópia, e as correções #738 a #740 tiveram de ser repetidas em cada uma.
 */
export const LEITOR_FALSO = `http://localhost:${process.env.E2E_LEITOR_FALSO_PORT ?? 13501}`

/** CNPJ com dígitos verificadores corretos (filial 0001), diferente a cada chamada. */
export function cnpjValido(): string {
  const base = Array.from({ length: 12 }, (_, i) => (i < 8 ? Math.floor(Math.random() * 10) : [0, 0, 0, 1][i - 8])).join('')
  const dv = (s: string, pesos: number[]) => {
    const r = [...s].reduce((soma, c, i) => soma + Number(c) * pesos[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${base}${d1}${d2}`
}

/** Chave de acesso de 44 dígitos, única por chamada. */
export function chaveAcessoUnica(): string {
  return `3526101122233300018165001${String(Date.now()).padStart(13, '0')}${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`
}

export type ItemNotaFalsa = { nome: string; quantidade: number; valorFinal: number; unidade?: string }

export interface DadosNotaFalsa {
  chave?: string
  cnpj?: string
  emitenteNome?: string
  itens: ItemNotaFalsa[]
  descontoGeral?: number
  origem?: string
  metodo?: string
  leiaute?: string
  /** Padrão: ontem às 10h (-03:00). */
  dataEmissao?: string
}

/** A nota que o leitor falso devolve para a chave: emitente de SP, itens em UN, sem aviso e fora do cache. */
export function montarNotaFalsa(dados: DadosNotaFalsa) {
  const chave = dados.chave ?? chaveAcessoUnica()
  const descontoGeral = dados.descontoGeral ?? 0
  const origem = dados.origem ?? 'NFCE_QR'
  const ontem = hojeLocal(-1)
  const soma = dados.itens.reduce((t, i) => t + i.valorFinal, 0)
  return {
    emitente: { cnpj: dados.cnpj ?? cnpjValido(), nome: dados.emitenteNome ?? 'Papelaria Estrela E2E', uf: 'SP' },
    chaveAcesso: chave, numero: '1', serie: '1', dataEmissao: dados.dataEmissao ?? `${ontem}T10:00:00-03:00`,
    totalPago: Math.round((soma - descontoGeral) * 100) / 100, descontoGeral, acrescimos: 0,
    itens: dados.itens.map(i => ({ ...i, unidade: i.unidade ?? 'UN' })),
    origem, metodo: dados.metodo ?? (origem === 'NFCE_QR' ? 'LEITOR_UF' : 'IA'), doCache: false, uf: 'SP', leiaute: dados.leiaute ?? 'SP-1', avisos: [],
  }
}

/** Registra a nota no leitor falso e devolve a nota e a chave. */
export async function registrarNotaFalsa(request: APIRequestContext, dados: DadosNotaFalsa) {
  const nota = montarNotaFalsa(dados)
  const res = await request.post(`${LEITOR_FALSO}/_fixture`, { data: { chave: nota.chaveAcesso, nota } })
  expect(res.ok(), await res.text()).toBe(true)
  return { chave: nota.chaveAcesso, nota }
}
