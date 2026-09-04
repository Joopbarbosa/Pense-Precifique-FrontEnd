import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Link2Off, AlertCircle, AlertTriangle } from 'lucide-react'
import { orcamentoService } from '../../services/orcamentoService'
import { extractApiError } from '../../utils/apiError'
import { getBadgeEstado } from '../../utils/badges'
import type { VinculoPendente } from '../../utils/vinculoCancelamento'

// RN-NOVA-17 (V0.8.3, #375+308, P-F003) — modal sequencial de "desfazer vínculo?" ao cancelar
// Orçamento (vínculo = produções) ou Produção (vínculo = orçamentos, lado espelhado). Padrão de UI
// novo, sem precedente no projeto (achado do Passo 0/Spec) — os únicos modais parecidos
// (ProdutoResolverVinculosModal/InsumoResolverVinculosModal) confirmam em lote, não um por vez.
//
// Classificação AVISO em toda a extensão da regra — nenhuma resposta bloqueia o cancelamento de
// origem, que já aconteceu antes deste modal abrir (ver chamadores: DetalheOrcamentoPage/
// DetalheProducaoPage rodam esta fila só depois do cancelamento confirmado com sucesso, reaproveitando
// os vínculos já carregados no detalhe — cancelar() não toca em OrcamentoProducao, então o dado não
// fica desatualizado por rodar depois).
//
// Fechar a modal (X/Escape/clique fora) nunca dispara a ação destrutiva do passo atual — equivale
// sempre à resposta não-destrutiva ("Não" no nível de vínculo, "Sim, manter" no nível de produto),
// e avança a fila. Decisão de interação desta tarefa: como a regra é 100% AVISO, um fechamento
// acidental não pode nunca causar uma perda de material silenciosa.

interface Props {
  fila: VinculoPendente[]
  onConcluir: () => void
  /** Lado que iniciou o cancelamento — decide o texto (rotuloOutroLado é sempre "o outro lado do
   *  vínculo": identificador de produção quando 'orcamento' cancela, "identificador · cliente" do
   *  orçamento quando 'producao' cancela). As chamadas de API são as mesmas nas duas direções
   *  (sempre endereçadas por orcamentoId/producaoId), só a cópia muda. */
  direcao: 'orcamento' | 'producao'
}

type Passo = { tipo: 'vinculo' } | { tipo: 'produto'; indice: number }

const ESTADOS_COM_SEGUNDA_PERGUNTA = ['EM_ANDAMENTO', 'TRAVADA']

export default function ModalConfirmacaoVinculoSequencial({ fila, onConcluir, direcao }: Props) {
  const [indiceVinculo, setIndiceVinculo] = useState(0)
  const [passo, setPasso] = useState<Passo>({ tipo: 'vinculo' })
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const item = fila[indiceVinculo]
  if (!item) return null

  const precisaSegundaPergunta = ESTADOS_COM_SEGUNDA_PERGUNTA.includes(item.estadoProducao)
  const totalVinculos = fila.length

  const irParaProximoVinculo = () => {
    setErro(null)
    if (indiceVinculo + 1 >= fila.length) {
      onConcluir()
      return
    }
    setIndiceVinculo(i => i + 1)
    setPasso({ tipo: 'vinculo' })
  }

  // "Sim, manter" (CEN-NOVO-15) — só a linha OrcamentoProducao é removida; produto, histórico e
  // estoque continuam intocados. Também usado quando não há produto a perguntar (fila de produtos
  // vazia) ou depois de esgotada a sub-fila de produtos ("Não, remover" x N).
  const fecharVinculoMantendoProdutos = async () => {
    setProcessando(true)
    setErro(null)
    try {
      await orcamentoService.desvincularProducao(item.orcamentoId, item.producaoId, true)
      irParaProximoVinculo()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao desfazer vínculo.'))
    } finally {
      setProcessando(false)
    }
  }

  // "Não" no nível de vínculo (CEN-NOVO-14) — prossegue sem chamar nenhuma API, vínculo fica órfão.
  const responderNaoDesfazer = () => irParaProximoVinculo()

  // "Sim" no nível de vínculo (CEN-NOVO-12/13/18)
  const responderSimDesfazer = async () => {
    if (precisaSegundaPergunta) {
      if (item.produtosContribuidos.length === 0) {
        await fecharVinculoMantendoProdutos()
      } else {
        setErro(null)
        setPasso({ tipo: 'produto', indice: 0 })
      }
      return
    }
    // AGUARDANDO_INICIO — reaproveita o mecanismo já existente (removerProdutosDeOrcamento via
    // desvincularProducao sem manterProdutos): reversão completa, sem 2ª pergunta.
    setProcessando(true)
    setErro(null)
    try {
      await orcamentoService.desvincularProducao(item.orcamentoId, item.producaoId)
      irParaProximoVinculo()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao desfazer vínculo.'))
    } finally {
      setProcessando(false)
    }
  }

  const avancarSubFilaProdutos = (indiceProduto: number) => {
    if (indiceProduto + 1 >= item.produtosContribuidos.length) {
      void fecharVinculoMantendoProdutos()
    } else {
      setErro(null)
      setPasso({ tipo: 'produto', indice: indiceProduto + 1 })
    }
  }

  // "Sim, manter" por produto (CEN-NOVO-15) — nada a chamar por produto individualmente; o
  // fechamento do vínculo (manterProdutos=true) acontece uma única vez, ao esgotar a sub-fila.
  const responderManterProduto = (indiceProduto: number) => avancarSubFilaProdutos(indiceProduto)

  // "Não, remover" por produto (CEN-NOVO-16) — remove a contribuição deste produto específico.
  // AVISO com perda de material explícita, nunca bloqueio; erro de rede/servidor é tratado à parte
  // (não confundir com o aviso de perda, que é esperado e não é uma falha).
  const responderRemoverProduto = async (indiceProduto: number) => {
    const produto = item.produtosContribuidos[indiceProduto]
    setProcessando(true)
    setErro(null)
    try {
      await orcamentoService.removerProdutoDeProducaoAtiva(item.orcamentoId, item.producaoId, produto.produtoId)
      setProcessando(false)
      avancarSubFilaProdutos(indiceProduto)
    } catch (err: any) {
      setProcessando(false)
      setErro(extractApiError(err, 'Erro ao remover produto da produção.'))
    }
  }

  const fecharComoNao = () => {
    if (processando) return
    if (passo.tipo === 'vinculo') responderNaoDesfazer()
    else responderManterProduto(passo.indice)
  }

  const progresso = totalVinculos > 1 ? `Vínculo ${indiceVinculo + 1} de ${totalVinculos}` : undefined

  if (passo.tipo === 'vinculo') {
    return (
      <ModalShell
        open
        onClose={fecharComoNao}
        title={direcao === 'orcamento' ? 'Desfazer vínculo com a produção?' : 'Desfazer vínculo com o orçamento?'}
        subtitle={progresso}
        icon={<Link2Off size={18} />}
        iconBg="rgba(249,115,22,0.10)"
        iconColor="#F97316"
        closeLabel="Fechar (equivale a responder Não)"
        footer={
          <>
            <Button variant="ghost" onClick={responderNaoDesfazer} disabled={processando}>Não</Button>
            <Button variant="primary" onClick={responderSimDesfazer} disabled={processando}>
              {processando ? 'Desfazendo...' : 'Sim, desfazer vínculo'}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[13.5px] leading-[1.6] text-body">
          {direcao === 'orcamento' ? (
            <>
              Este orçamento tem um vínculo ativo com a produção <strong>{item.rotuloOutroLado}</strong>{' '}
              ({getBadgeEstado(item.estadoProducao).label.toLowerCase()}). Deseja desfazer esse vínculo?
            </>
          ) : (
            <>
              Esta produção tem um vínculo ativo com o orçamento <strong>{item.rotuloOutroLado}</strong>.
              Deseja desfazer esse vínculo?
            </>
          )}
        </p>
        <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-muted">
          Isto não afeta o cancelamento em andamento — respondendo "Não", o vínculo apenas fica
          registrado {direcao === 'orcamento' ? 'com a produção' : 'com o orçamento'} mesmo após o cancelamento.
        </p>
        {erro && (
          <div className="mt-3 flex items-center gap-[5px] text-[13px] text-danger">
            <AlertCircle size={13} /> {erro}
          </div>
        )}
      </ModalShell>
    )
  }

  // passo.tipo === 'produto'
  const produto = item.produtosContribuidos[passo.indice]
  const progressoProduto = item.produtosContribuidos.length > 1
    ? `Produto ${passo.indice + 1} de ${item.produtosContribuidos.length}`
    : undefined

  return (
    <ModalShell
      open
      onClose={fecharComoNao}
      title="Manter o produto sendo produzido?"
      subtitle={progressoProduto ?? progresso}
      icon={<Link2Off size={18} />}
      iconBg="rgba(249,115,22,0.10)"
      iconColor="#F97316"
      closeLabel="Fechar (equivale a responder Sim, manter)"
      footer={
        <>
          <Button variant="danger" onClick={() => responderRemoverProduto(passo.indice)} disabled={processando}>
            {processando ? 'Removendo...' : 'Não, remover'}
          </Button>
          <Button variant="primary" onClick={() => responderManterProduto(passo.indice)} disabled={processando}>
            Sim, manter
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.6] text-body">
        {direcao === 'orcamento' ? (
          <>
            A produção <strong>{item.rotuloOutroLado}</strong> já está{' '}
            {getBadgeEstado(item.estadoProducao).label.toLowerCase()} e o produto{' '}
            <strong>{produto.nomeProduto}</strong> (×{produto.quantidade}) foi contribuído por este
            orçamento.
          </>
        ) : (
          <>
            Esta produção já está {getBadgeEstado(item.estadoProducao).label.toLowerCase()} e o
            produto <strong>{produto.nomeProduto}</strong> (×{produto.quantidade}) foi contribuído
            pelo orçamento <strong>{item.rotuloOutroLado}</strong>.
          </>
        )}{' '}
        Manter o produto sendo produzido mesmo sem vínculo ao orçamento?
      </p>
      <div className="mt-3 flex items-start gap-2.5 rounded-input border border-danger/40 bg-danger-bg px-3.5 py-3 text-[13px] leading-[1.5] text-danger">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Se optar por remover, o material e o trabalho já aplicados a este produto <strong>não
          são revertidos</strong> — a perda é definitiva. Nenhuma movimentação de estoque nova é criada.
        </span>
      </div>
      {erro && (
        <div className="mt-3 flex items-center gap-[5px] text-[13px] text-danger">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}
