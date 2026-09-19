/**
 * Tipos compartilhados entre os fluxos de venda (Orçamento e Caixa) e o cadastro de item de
 * Catálogo. Extraídos de `pages/orcamentos/CriarOrcamentoPage.tsx` na V0.12.0 — até então eram
 * funções/interfaces locais não exportadas, o que levou o Caixa a reimplementar tudo do zero.
 */

/** Customização anexada a uma linha de venda — mesma forma em Orçamento e Caixa. */
export interface CustomizacaoLinha {
  id: string
  nome: string
  valor: number
  qtd: number
}

/**
 * O que os componentes compartilhados precisam para desenhar uma linha de venda.
 *
 * Deliberadamente SEM identidade: o Orçamento identifica a linha por `id` numérico (`Date.now()`,
 * permitindo duas linhas do mesmo produto) e o Caixa por `key` string (que mescla duplicadas).
 * Quem é dono da lista fecha sobre a identidade nos callbacks — o componente nunca a vê, e por
 * isso as duas políticas continuam convivendo sem `if` nenhum aqui dentro.
 */
export interface LinhaVendaView {
  nome: string
  qtd: number
  preco: number
  customs: CustomizacaoLinha[]
  produtoId?: string
  produtoIdentificador?: string
  itemCatalogoId?: string
  catalogoNome?: string
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
  /** `undefined` quando a origem não expõe o dado — o badge só aparece com valor conhecido. */
  fracionavel?: boolean
}

export interface DadosCalculadoraItem {
  titulo: string
  sugerido: number
  precoInicial: number
  breakdown: { label: string; value: string; sub?: string }[]
}
