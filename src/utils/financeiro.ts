import type { ParcelaFinanceira, SituacaoExibida, TipoLancamento } from '../types/financeiro'

// V0.19.0 (PP-520) — só apresentação: "vencida", totais e rótulos vêm prontos da API (o front não decide regra).

export const MENSAGEM_SEM_LANCAMENTOS = 'Os lançamentos começam a valer a partir de agora: compras e orçamentos antigos não entram aqui.'

// (sem import de runtime: este módulo é testado direto pelo node --test)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Mês corrente (primeiro e último dia), padrão do filtro de período. */
export function periodoDoMes(hoje: Date = new Date()): { de: string; ate: string } {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  return { de: iso(new Date(ano, mes, 1)), ate: iso(new Date(ano, mes + 1, 0)) }
}

/** PP-697 — texto do período padrão (sem datas escolhidas). */
export const TEXTO_PERIODO_PADRAO = 'Mostrando o mês atual e todas as contas vencidas de meses anteriores.'

/** Período enviado à API: só vai quando a usuária escolheu datas; sem escolha, a API aplica o padrão. */
export function parametrosPeriodo(escolhido: { de: string; ate: string } | null): { de?: string; ate?: string } {
  return escolhido ? { de: escolhido.de, ate: escolhido.ate } : {}
}

export function mensagemListaVazia(tipo: TipoLancamento): string {
  return tipo === 'A_PAGAR' ? 'Nada a pagar neste período.' : 'Nada a receber neste período.'
}

export function rotuloAcaoBaixa(tipo: TipoLancamento): string {
  return tipo === 'A_PAGAR' ? 'Paguei' : 'Recebi'
}

export function rotuloOrigem(origem: ParcelaFinanceira['origem']): string {
  return origem === 'COMPRA' ? 'Compra' : origem === 'ORCAMENTO' ? 'Orçamento' : 'Avulso'
}

export function rotuloSituacao(s: SituacaoExibida): string {
  switch (s) {
    case 'EM_ABERTO': return 'Em aberto'
    case 'VENCE_HOJE': return 'Vence hoje'
    case 'VENCIDA': return 'Vencida'
    case 'PAGA': return 'Paga'
    case 'RECEBIDA': return 'Recebida'
    case 'CANCELADA': return 'Cancelada'
  }
}

/** "2 de 5" — só quando há mais de uma parcela. */
export function rotuloParcela(p: Pick<ParcelaFinanceira, 'numero' | 'totalParcelas'>): string {
  return p.totalParcelas > 1 ? `${p.numero} de ${p.totalParcelas}` : 'Única'
}

export function podeBaixar(p: Pick<ParcelaFinanceira, 'situacaoExibida'>): boolean {
  return p.situacaoExibida === 'EM_ABERTO' || p.situacaoExibida === 'VENCE_HOJE' || p.situacaoExibida === 'VENCIDA'
}

export function podeDesfazer(p: Pick<ParcelaFinanceira, 'situacaoExibida'>): boolean {
  return p.situacaoExibida === 'PAGA' || p.situacaoExibida === 'RECEBIDA'
}

/** PP-525 — validação rápida do nome de categoria (2 a 40); a API repete a regra e decide a unicidade. Devolve a mensagem ou null. */
export function mensagemNomeCategoria(nome: string): string | null {
  const texto = nome.trim()
  if (!texto) return 'Informe o nome da categoria.'
  if (texto.length < 2 || texto.length > 40) return 'O nome da categoria deve ter de 2 a 40 caracteres.'
  return null
}

// ---- PP-524 (F5): resumo do mês — só apresentação; todos os números vêm prontos da API ----

export const MENSAGEM_SEM_MOVIMENTOS_GRAFICO = 'Sem movimentos para mostrar.'
export const MENSAGEM_SEM_VENCIMENTOS = 'Nenhum vencimento nos próximos 7 dias.'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10" do mês de uma data local. */
export function mesDaData(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Soma (ou subtrai) meses de um "AAAA-MM", virando o ano quando preciso. */
export function mudarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const total = ano * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** "outubro de 2026". */
export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return `${NOMES_MES[m - 1]} de ${ano}`
}

/** Urgência da linha de "Próximos vencimentos": vencida, vence hoje ou próximos dias (cor + texto, nunca só cor). */
export function urgenciaVencimento(p: Pick<ParcelaFinanceira, 'situacaoExibida'>): 'VENCIDA' | 'HOJE' | 'PROXIMA' {
  return p.situacaoExibida === 'VENCIDA' ? 'VENCIDA' : p.situacaoExibida === 'VENCE_HOJE' ? 'HOJE' : 'PROXIMA'
}

export function rotuloUrgencia(p: Pick<ParcelaFinanceira, 'situacaoExibida' | 'rotulo'>): string {
  const u = urgenciaVencimento(p)
  if (p.rotulo && u !== 'PROXIMA') return p.rotulo
  return u === 'VENCIDA' ? 'Vencida' : u === 'HOJE' ? 'Vence hoje' : 'Próximos dias'
}

/** Texto de "Ver todas (N)". */
export function rotuloVerTodas(total: number): string {
  return `Ver todas (${total})`
}

/** Largura (0 a 100) da barra de uma categoria em relação à maior. */
export function larguraBarra(valor: number, maior: number): number {
  if (!(maior > 0) || !(valor > 0)) return 0
  return Math.min(100, Math.max(2, Math.round((valor / maior) * 100)))
}

/** "47,1%" — percentual com uma casa, como vem da API. */
export function formatarPercentual(p: number): string {
  return `${p.toFixed(1).replace('.', ',')}%`
}

/** Dia/mês curto para eixo e tabela: "2026-11-05" -> "05/11". */
export function diaMes(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Quando o saldo projetado fica negativo em algum ponto (alerta em texto, além da cor). */
export function primeiroDiaNegativo(serie: { data: string; saldo: number }[]): string | null {
  return serie.find(p => p.saldo < 0)?.data ?? null
}
