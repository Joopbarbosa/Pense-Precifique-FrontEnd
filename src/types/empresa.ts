/** #488/#506 (V0.12.0) — um dia do horário de funcionamento. `diaSemana` segue ISO-8601
 *  (1=segunda ... 7=domingo, `Date.getDay()` do JS usa 0=domingo — nunca usar direto). */
export interface HorarioFuncionamento {
  diaSemana: number
  fechado: boolean
  /** "HH:mm". Só nulo/ausente quando fechado = true. */
  horaAbertura?: string | null
  horaFechamento?: string | null
}

export interface EmpresaRequest {
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  logoUrl?: string
  /** Substituição total (PUT /empresa) — omitido preserva o horário atual, lista vazia apaga. */
  horarios?: HorarioFuncionamento[]
}

export interface EmpresaResponse {
  id: string
  nome: string
  email?: string
  whatsapp?: string
  endereco?: string
  logoUrl?: string
  /** Ordenado por dia da semana; vazio quando nunca foi configurado. */
  horarios?: HorarioFuncionamento[]
  createdAt: string
  updatedAt: string
}

export interface ConfiguracaoRequest {
  valorHora: number
  margemPadrao: number
}

export interface ConfiguracaoResponse {
  id: string | null
  valorHora: number
  margemPadrao: number
  updatedAt: string | null
}

/**
 * #491 (V0.12.0) — método de pagamento configurável, consumido pelo pagamento dividido do
 * Caixa/PDV. 4 tipos fixos (semeados na criação da conta) + OUTRO de nome livre.
 * Nome "Configuravel" no backend por colisão real com o enum fixo `MetodoPagamento` de Orçamento
 * — sem relação com este tipo (ver decisoes-config-perfil.md).
 */
export type TipoMetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'OUTRO'

export interface TaxaParcela {
  parcela: number
  taxa: number
}

export interface MetodoPagamentoConfiguravelResponse {
  id: string
  tipo: TipoMetodoPagamento
  /** Só preenchido quando tipo = OUTRO — os 4 tipos fixos não têm nome próprio. */
  nome?: string | null
  /** Derivado no backend: verdadeiro se e só se tipo = DINHEIRO. */
  afetaCaixaFisico: boolean
  /** Só aceito quando tipo é CARTAO_CREDITO ou CARTAO_DEBITO. Informativo nesta versão. */
  taxaMaquininha?: number | null
  ativo: boolean
  ordem?: number | null
  /** #491/#506 (V0.12.0) — parcelamento, só existe em CARTAO_CREDITO. Nulo = método não parcela. */
  maxParcelas?: number | null
  /** true: `taxaMaquininha` vale para toda parcela. false: cada parcela tem sua própria taxa em
   *  `taxasParcela` (sempre de 1 até `maxParcelas`, sem buraco). */
  taxaParcelaUniforme?: boolean | null
  /** Vazio quando `taxaParcelaUniforme = true`. */
  taxasParcela?: TaxaParcela[]
}

export interface MetodoPagamentoConfiguravelRequest {
  tipo: TipoMetodoPagamento
  nome?: string
}

export interface MetodoPagamentoConfiguravelUpdateRequest {
  ativo?: boolean
  taxaMaquininha?: number
  nome?: string
  maxParcelas?: number
  taxaParcelaUniforme?: boolean
  taxasParcela?: TaxaParcela[]
}
