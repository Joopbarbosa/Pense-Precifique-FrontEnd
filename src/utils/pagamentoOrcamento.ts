/**
 * V0.19.0 (PP-528, RN-NOVA-38/39/42, RN-NOVA-10) — regras do passo "Pagamento" da aprovação do orçamento.
 * Cálculo em centavos inteiros (nunca em ponto flutuante de reais): o sinal é arredondado PARA BAIXO em
 * centavos e precisa ter pelo menos R$ 0,01. O servidor repete todas as regras; aqui só se evita o
 * ida-e-volta e se mostra a mensagem no campo certo.
 */

export const PERCENTUAL_SINAL_PADRAO = 50
export const MSG_SINAL = 'O sinal precisa ser maior que zero e no máximo o total.'
export const MSG_FORMA = 'Escolha uma forma de pagamento da lista.'
export const MSG_SINAL_ATE = 'Informe até quando o sinal deve ser pago.'
export const MSG_DATA_ANTERIOR_SINAL = 'A data limite do sinal não pode ser anterior à data da aprovação.'
export const MSG_DATA_ANTERIOR_SALDO = 'O vencimento do saldo não pode ser anterior à data da aprovação.'
export const MSG_DATA_FAIXA = 'Informe uma data entre 01/01/2000 e 31/12/2100.'

export type TipoSinalPagamento = 'PERCENTUAL' | 'VALOR'

export interface EntradaPagamento {
  total: number
  metodoId: string | null
  /** ids dos métodos ATIVOS do cadastro (a lista que o servidor também usa). */
  metodosAtivosIds: string[]
  temSinal: boolean
  tipoSinal: TipoSinalPagamento
  /** texto digitado ("50", "12,5"); vazio no percentual vale o padrão de 50%. */
  percentualTexto: string
  valorTexto: string
  sinalAte: string
  vencimentoSaldo: string
  /** data de hoje no formato AAAA-MM-DD (data local da usuária). */
  hoje: string
}

export interface ResumoPagamento {
  total: number
  valorSinal: number
  percentualSinal: number
  saldo: number
  geraParcelaSaldo: boolean
}

export interface ResultadoPagamento {
  erros: Record<string, string>
  resumo: ResumoPagamento | null
}

/** "12,5" ou "12.50" para número; texto vazio ou inválido devolve null. */
export function lerDecimal(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Quantidade de casas depois da vírgula do texto digitado. */
function casas(texto: string): number {
  const t = texto.trim().replace(',', '.')
  const i = t.indexOf('.')
  return i < 0 ? 0 : t.length - i - 1
}

export function emCentavos(reais: number): number {
  return Math.round(reais * 100)
}

/** Sinal em reais para um percentual: arredonda PARA BAIXO em centavos. */
export function sinalPorPercentual(total: number, percentual: number): number {
  const centavos = Math.floor((emCentavos(total) * Math.round(percentual * 100)) / 10000)
  return centavos / 100
}

/** Percentual (2 casas, meio para cima) que um valor representa do total. */
export function percentualPorValor(total: number, valor: number): number {
  if (total <= 0) return 0
  return Math.round((emCentavos(valor) * 10000) / emCentavos(total)) / 100
}

export function formatarDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function validarData(iso: string, hoje: string, msgAnterior: string): string | null {
  if (!dataValida(iso) || iso < '2000-01-01' || iso > '2100-12-31') return MSG_DATA_FAIXA
  if (iso < hoje) return msgAnterior
  return null
}

export function validarPagamentoOrcamento(e: EntradaPagamento): ResultadoPagamento {
  const erros: Record<string, string> = {}
  const total = Math.round(e.total * 100) / 100

  if (!e.metodoId || !e.metodosAtivosIds.includes(e.metodoId)) erros.metodoPagamentoId = MSG_FORMA

  let valorSinal = 0
  let percentual = 0
  if (e.temSinal) {
    if (total <= 0) {
      erros.sinal = MSG_SINAL
    } else if (e.tipoSinal === 'PERCENTUAL') {
      const texto = e.percentualTexto.trim() === '' ? String(PERCENTUAL_SINAL_PADRAO) : e.percentualTexto
      const p = lerDecimal(texto)
      if (p === null || casas(texto) > 2 || p < 1 || p > 100) {
        erros.sinal = MSG_SINAL
      } else {
        percentual = p
        valorSinal = sinalPorPercentual(total, p)
        if (valorSinal < 0.01) erros.sinal = MSG_SINAL
      }
    } else {
      const v = lerDecimal(e.valorTexto)
      if (v === null || casas(e.valorTexto) > 2 || v < 0.01 || emCentavos(v) > emCentavos(total)) {
        erros.sinal = MSG_SINAL
      } else {
        valorSinal = v
        percentual = percentualPorValor(total, v)
      }
    }
    if (!e.sinalAte) erros.sinalAte = MSG_SINAL_ATE
    else {
      const m = validarData(e.sinalAte, e.hoje, MSG_DATA_ANTERIOR_SINAL)
      if (m) erros.sinalAte = m
    }
  }

  const saldoCentavos = emCentavos(total) - emCentavos(valorSinal)
  const saldo = saldoCentavos / 100
  const geraParcelaSaldo = !e.temSinal || saldoCentavos > 0
  if (geraParcelaSaldo && e.vencimentoSaldo) {
    const m = validarData(e.vencimentoSaldo, e.hoje, MSG_DATA_ANTERIOR_SALDO)
    if (m) erros.vencimentoSaldo = m
  }

  if (Object.keys(erros).length > 0) return { erros, resumo: null }
  return { erros, resumo: { total, valorSinal, percentualSinal: percentual, saldo, geraParcelaSaldo } }
}

/** Corpo enviado ao servidor; o vencimento do saldo vazio fica de fora (o servidor usa hoje). */
export function montarCorpoPagamento(e: EntradaPagamento): Record<string, unknown> {
  const corpo: Record<string, unknown> = { metodoPagamentoId: e.metodoId, temSinal: e.temSinal }
  if (e.temSinal) {
    corpo.tipoSinal = e.tipoSinal
    if (e.tipoSinal === 'PERCENTUAL') corpo.percentualSinal = lerDecimal(e.percentualTexto.trim() === '' ? String(PERCENTUAL_SINAL_PADRAO) : e.percentualTexto)
    else corpo.valorSinal = lerDecimal(e.valorTexto)
    corpo.sinalAte = e.sinalAte
  }
  if (e.vencimentoSaldo) corpo.vencimentoSaldo = e.vencimentoSaldo
  return corpo
}

/** RN-NOVA-41 (#1174): "Alterar pagamento" só entre a aprovação e o fim da produção e sem parcela recebida. */
export function podeAlterarPagamento(status: string | undefined, parcelas: { situacao: string }[] | undefined): boolean {
  if (!status || !['APROVADO', 'AGUARDANDO_SINAL', 'EM_PRODUCAO', 'FINALIZADO'].includes(status)) return false
  const ps = parcelas ?? []
  return ps.length > 0 && !ps.some(p => p.situacao === 'BAIXADA')
}
