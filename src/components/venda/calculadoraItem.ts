import { produtoService } from '../../services/produtoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import { empresaService } from '../../services/empresaService'
import type { ProdutoDetalheResponse } from '../../types/produto'
import type { DadosCalculadoraItem } from './types'
import { BRL } from './formato'

// ── Calculadora de preço (ORC-020 REVISÃO/RN-NOVA-22-23, V0.8.4/#399) ───────────────
// Funções de módulo — reaproveitadas tanto pela adição direta de produto avulso/item de
// catálogo quanto pela fila de customizações dentro de ModalCustomizacoes (customização é um
// Produto com ficha técnica própria — mesma mecânica do produto avulso, RN-NOVA-23).

// Monta os dados da calculadora para produto avulso/customização — RN-NOVA-23: usa
// GET /produtos/{id} (detalhe) + GET /configuracoes/precificacao, os dois endpoints já
// existentes. `sugerido` vem pronto do Backend (precoSugerido) — Frontend não recalcula
// custo×margem (isso seria regra de negócio replicada no cliente).
export async function carregarCalculadoraAvulso(produtoId: string, titulo = 'Calculadora de Preço'): Promise<DadosCalculadoraItem> {
  const [detalhe, config] = await Promise.all([
    produtoService.buscarPorId(produtoId) as Promise<ProdutoDetalheResponse & { precoSugerido: number; margemLucro: number }>,
    empresaService.getConfiguracao(),
  ])
  const custoInsumos = detalhe.fichaTecnica.reduce((s, f) => s + f.quantidade * f.custoUnitario, 0)
  const maoObra = (detalhe.tempoProducao / 60) * config.valorHora
  // `margemLucro` do produto é a PORCENTAGEM cadastrada (ex.: 40 = 40%), não um valor em
  // R$ — o lucro em reais é a diferença entre o sugerido (já pronto do Backend) e o
  // custo total (insumos + mão de obra). Achado do teste visual desta tarefa: a
  // primeira versão exibia `margemLucro` direto como moeda (R$ 40,00 em vez de R$ 5,66).
  const lucro = detalhe.precoSugerido - custoInsumos - maoObra
  return {
    titulo,
    sugerido: detalhe.precoSugerido,
    precoInicial: detalhe.precoSugerido,
    breakdown: [
      { label: 'Custo dos insumos', value: BRL(custoInsumos) },
      { label: 'Mão de obra', value: BRL(maoObra), sub: `${detalhe.tempoProducao} min × ${BRL(config.valorHora)}/h` },
      { label: 'Margem de lucro', value: BRL(lucro), sub: `${detalhe.margemLucro}%` },
    ],
  }
}

// Monta os dados da calculadora para item de catálogo — V0.13.0: combina o precoSugerido JÁ
// PERSISTIDO do item (custo dos componentes + mão de obra + margem própria, calculado no
// Backend) com a composição de componentes de ItemCatalogoResponse — não recalcula a composição
// do zero. RN-NOVA-4: `bloqueadoParaVenda` já vem pronto do Backend (true quando qualquer
// componente está inativo/excluído) — substitui a checagem manual por customização que existia
// antes da reforma de composição.
export async function carregarCalculadoraCatalogo(catalogoId: string, itemId: string): Promise<DadosCalculadoraItem> {
  const itensDoCatalogo = await itemCatalogoService.listar(catalogoId)
  const item = itensDoCatalogo.find(i => i.id === itemId)
  if (!item) throw new Error('Item de catálogo não encontrado — composição pode ter mudado.')
  if (item.bloqueadoParaVenda) throw new Error(`Item "${item.nome}" tem componente inativo/excluído e não pode ser vendido.`)
  // CEN-NOVO-4 (DECISOES_V0.8.4.md) — valor final inicia com o precoSugerido já
  // calculado (não o precoVenda persistido, que pode já vir de override anterior no
  // cadastro do Catálogo — aqui é uma nova confirmação, não a herança de uma antiga).
  return {
    titulo: 'Calculadora de Preço',
    sugerido: item.precoSugerido,
    precoInicial: item.precoSugerido,
    breakdown: [
      { label: `${item.nome} × ${item.componentes.length} componente(s)`, value: BRL(item.precoSugerido) },
    ],
  }
}
