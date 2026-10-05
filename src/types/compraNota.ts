// V0.16.0 (#683) — registrar compra por nota fiscal. Espelha o contrato do leitor-fiscal (RN-NOVA-2) e as
// rotas /compras/nota/* do backend (DT-NOVA-9). Valores monetários chegam como lidos na nota.

export type ModeloNota = 'NFCE' | 'NFE'

export interface NotaLida {
  emitente: { cnpj: string; nome: string; uf: string }
  chaveAcesso: string
  numero: string
  serie: string
  dataEmissao: string
  totalPago: number
  descontoGeral: number | null
  acrescimos: number | null
  itens: NotaLidaItem[]
  origem: 'NFCE_QR' | 'NFE_PDF' | 'NFE_FOTO' | 'NFE_XML'
  metodo: 'LEITOR_UF' | 'IA' | 'XML'
  doCache: boolean
  uf: string
  leiaute: string
  avisos: string[]
}

export interface NotaLidaItem {
  nome: string
  quantidade: number
  valorFinal: number
  valorBruto: number | null
  desconto: number | null
  unidade: string | null
  codigo: string | null
  ean: string | null
}

export type SituacaoFornecedor = 'FORNECEDOR_CADASTRADO' | 'SO_CLIENTE' | 'NAO_CADASTRADO'

export interface FornecedorProposta {
  situacao: SituacaoFornecedor
  fornecedorId: string | null
  nome: string | null
  cnpj: string | null
}

export interface ItemConciliacao {
  posicao: number
  nome: string
  quantidade: number
  valorFinal: number
  unidade: string | null
  /** SEM_LIGACAO nesta etapa; vínculo salvo, nome e IA chegam com a conciliação (#681). */
  origemLigacao: string
  insumoId: string | null
  fator: number | null
}

export interface NotaLeituraResponse {
  nota: NotaLida | null
  assinatura: string | null
  expiraEm: string | null
  fornecedor: FornecedorProposta | null
  /** Preenchido quando a nota já está num rascunho: a tela abre esse rascunho (RN-NOVA-5). */
  rascunhoExistente: { id: string; identificador: string } | null
  itens: ItemConciliacao[]
}

export type AcaoFornecedor = 'ADICIONAR_PAPEL' | 'CADASTRAR' | 'SEM_FORNECEDOR'

export interface EscolhaItemNota {
  posicao: number
  insumoId: string | null
  fator: number | null
  ignorar: boolean
}

export interface NotaRascunhoRequest {
  notaLida: NotaLida
  assinatura: string
  escolhas: EscolhaItemNota[]
  fornecedor: AcaoFornecedor | null
  comprovanteLink: string | null
}

export interface LinhaPreviaNota {
  insumoId: string
  insumoNome: string
  quantidade: number
  precoCheio: number
  descontoLinha: number
  posicoes: number[]
}

export interface AvisoNota {
  tipo: 'AVISO'
  codigo: 'JUNCAO_DE_ITENS' | 'DIFERENCA_NO_TOTAL'
  mensagem: string
  valor: number | null
}

export interface NotaRascunhoResponse {
  /** Nula quando só simulou. */
  compra: import('./compra').CompraResponse | null
  linhas: LinhaPreviaNota[]
  descontoNota: number
  acrescimos: number
  avisos: AvisoNota[]
}
