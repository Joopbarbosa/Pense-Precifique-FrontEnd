// RN-NOVA-17 (V0.8.3, #375+308, P-F003) — monta a fila de pendências para o modal sequencial de
// "desfazer vínculo?" exibido ao cancelar um Orçamento (vínculo = produções) ou uma Produção
// (vínculo = orçamentos, lado espelhado). Ver DECISOES_V0.8.3.md (Passo 0, item 4) para a decisão
// de estrutura (fila em estado local, não hook/contexto compartilhado).
//
// Estados terminais (FINALIZADA/CANCELADA/NAO_REALIZADA do lado da produção; CANCELADO do lado do
// orçamento) ficam fora da fila — mesmo efeito de "Não" (vínculo fica órfão, sem pergunta), tratamento
// sugerido em DECISOES_V0.8.3.md para o caso "vínculo já terminal no momento do cancelamento",
// confirmado nesta tarefa (P-F003, achado do Passo 0).
import type { OrcamentoDetalheResponse } from '../types/orcamento'
import type { ProducaoDetalhe, EstadoProducao, HistoricoStatus } from '../types/producao'
import { producaoService } from '../services/producaoService'

const ESTADOS_PRODUCAO_TERMINAIS: EstadoProducao[] = ['FINALIZADA', 'CANCELADA', 'NAO_REALIZADA']

export interface ProdutoContribuido {
  produtoId: string
  nomeProduto: string
  quantidade: number
}

export interface VinculoPendente {
  /** Chave estável para o item da fila — id do vínculo (OrcamentoProducao) quando disponível. */
  vinculoKey: string
  orcamentoId: string
  producaoId: string
  /** Rótulo do "outro lado" a exibir na pergunta — identificador da produção (lado Orçamento) ou
   *  identificador + cliente do orçamento (lado Produção). */
  rotuloOutroLado: string
  /** Estado da PRODUÇÃO do vínculo (sempre o lado Produção, nas duas direções) — decide se a
   *  resposta "Sim" reverte tudo (AGUARDANDO_INICIO) ou abre a 2ª pergunta por produto. */
  estadoProducao: EstadoProducao
  /** Produtos que este orçamento especificamente contribuiu para esta produção — derivado de
   *  historicoStatus (ITEM_ADICIONADO), não existe DTO de vínculo granular por produto hoje
   *  (achado do Passo 0, P-F003). Só relevante/usado quando estadoProducao é EM_ANDAMENTO/TRAVADA. */
  produtosContribuidos: ProdutoContribuido[]
}

/** Agrega o histórico ITEM_ADICIONADO de uma produção pelos produtos que um orçamento específico
 *  contribuiu — soma quantidade quando o mesmo produto foi vinculado mais de uma vez pelo mesmo
 *  orçamento (ex.: vincularProducao chamado 2x). */
export function agregarProdutosPorOrcamento(historico: HistoricoStatus[], orcamentoId: string): ProdutoContribuido[] {
  const porProduto = new Map<string, ProdutoContribuido>()
  for (const h of historico) {
    if (h.tipoEvento !== 'ITEM_ADICIONADO') continue
    if (h.referenciaOrcamentoId !== orcamentoId) continue
    if (!h.produtoId) continue
    const existente = porProduto.get(h.produtoId)
    if (existente) {
      existente.quantidade += h.quantidade ?? 0
    } else {
      porProduto.set(h.produtoId, {
        produtoId: h.produtoId,
        nomeProduto: h.nomeProduto ?? '—',
        quantidade: h.quantidade ?? 0,
      })
    }
  }
  return Array.from(porProduto.values())
}

/** Lado Orçamento: 1 GET por produção vinculada (o DTO de producoesVinculadas não traz `estado` —
 *  achado do Passo 0). Vínculo cuja produção não é possível carregar não bloqueia o cancelamento —
 *  fica de fora da fila (mesmo efeito de "Não"), AVISO nunca bloqueia. */
export async function construirFilaVinculosOrcamento(
  orcamento: OrcamentoDetalheResponse
): Promise<VinculoPendente[]> {
  const fila: VinculoPendente[] = []
  for (const vinculo of orcamento.producoesVinculadas) {
    let detalhe: ProducaoDetalhe
    try {
      detalhe = await producaoService.buscarPorId(vinculo.producaoId)
    } catch {
      continue
    }
    if (ESTADOS_PRODUCAO_TERMINAIS.includes(detalhe.estado)) continue
    fila.push({
      vinculoKey: vinculo.id,
      orcamentoId: orcamento.id,
      producaoId: vinculo.producaoId,
      rotuloOutroLado: vinculo.identificadorProducao,
      estadoProducao: detalhe.estado,
      produtosContribuidos: agregarProdutosPorOrcamento(detalhe.historicoStatus, orcamento.id),
    })
  }
  return fila
}

/** Lado Produção (espelhado): sem fetch extra — orcamentosVinculados já traz statusOrcamento, e
 *  historicoStatus/estado já são os da própria produção carregada na página. */
export function construirFilaVinculosProducao(producao: ProducaoDetalhe): VinculoPendente[] {
  return producao.orcamentosVinculados
    .filter(orc => orc.statusOrcamento !== 'CANCELADO')
    .map(orc => ({
      vinculoKey: orc.orcamentoId,
      orcamentoId: orc.orcamentoId,
      producaoId: producao.id,
      rotuloOutroLado: `${orc.identificadorOrcamento} · ${orc.nomeCliente}`,
      estadoProducao: producao.estado,
      produtosContribuidos: agregarProdutosPorOrcamento(producao.historicoStatus, orc.orcamentoId),
    }))
}
