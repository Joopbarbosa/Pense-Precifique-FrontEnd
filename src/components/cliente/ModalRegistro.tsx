import { useEffect, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import { BRL } from '../venda/formato'
import { formatarData, moeda, qtd, rotuloPagamento, STATUS_COMPRA_LABEL } from '../compra/formato'
import { orcamentoService } from '../../services/orcamentoService'
import { caixaService } from '../../services/caixaService'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import { STATUS_LABEL } from '../../constants/statusOrcamento'

// V0.15.0 (#571) — dados de um registro do histórico do cadastro sem sair da página. O botão abre o
// registro numa aba nova: editar enquanto ainda é editável (orçamento/compra em rascunho), senão só
// abrir. Venda do Caixa não tem página própria, então fica sem botão.

export type TipoRegistro = 'ORCAMENTO' | 'VENDA_CAIXA' | 'COMPRA'

const rotuloDesconto = (tipo: string | null | undefined, valor: number | null | undefined) =>
  !valor ? null : tipo === 'PERCENTUAL' ? `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : BRL(valor)

const TIPO_LABEL: Record<TipoRegistro, string> = { ORCAMENTO: 'Orçamento', VENDA_CAIXA: 'Venda no Caixa', COMPRA: 'Compra' }

interface Linha { nome: string; quantidade: string; unitario: string; subtotal: string; detalhe?: string }

interface Visao {
  identificador: string
  status: string
  data: string
  pessoa?: string
  linhas: Linha[]
  subtotal?: number
  /** Como foi dado: "10%" ou "R$ 5,00" (o valor vem do backend; aqui só formatação). */
  desconto?: string | null
  total: number
  extras: { rotulo: string; valor: string }[]
  acao?: { label: string; href: string }
}

async function carregar(tipo: TipoRegistro, id: string): Promise<Visao> {
  if (tipo === 'ORCAMENTO') {
    const o = await orcamentoService.buscarPorId(id)
    return {
      identificador: `ORC-${o.numero}`,
      status: STATUS_LABEL[o.status] ?? o.status,
      data: formatarData(o.createdAt),
      pessoa: o.nomeCliente,
      linhas: o.itens.map(i => ({
        nome: i.catalogoNome ?? i.nomeProduto,
        quantidade: qtd(i.quantidade),
        unitario: BRL(i.precoUnitario),
        subtotal: BRL(i.subtotal),
        detalhe: i.customizacoes.length ? `+ ${i.customizacoes.map(c => `${c.nomeProduto} ×${qtd(c.quantidade)}`).join(', ')}` : undefined,
      })),
      subtotal: o.subtotal,
      desconto: rotuloDesconto(o.tipoDesconto, o.descontoValor),
      total: o.total,
      extras: o.dataPagamento ? [{ rotulo: 'Pago em', valor: formatarData(o.dataPagamento) }] : [],
      // #584 (RN-NOVA-45) — a modal leva ao detalhe, nunca à edição (também no rascunho).
      acao: { label: 'Abrir orçamento', href: `/orcamentos/${id}` },
    }
  }
  if (tipo === 'VENDA_CAIXA') {
    const v = await caixaService.buscarVendaPorId(id)
    return {
      identificador: v.identificador,
      status: v.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada',
      data: formatarData(v.dataVenda),
      linhas: v.itens.map(i => ({
        nome: i.produtoNome,
        quantidade: qtd(i.quantidade),
        unitario: BRL(i.precoUnitario),
        subtotal: BRL(i.subtotal),
        detalhe: i.customizacoes.length ? `+ ${i.customizacoes.map(c => `${c.produtoNome} ×${qtd(c.quantidade)}`).join(', ')}` : undefined,
      })),
      subtotal: v.subtotal,
      desconto: rotuloDesconto(v.descontoTipo, v.descontoValor),
      total: v.total,
      extras: v.cancelamentoMotivo ? [{ rotulo: 'Motivo do cancelamento', valor: v.cancelamentoMotivo }] : [],
    }
  }
  const c = await compraService.buscar(id)
  return {
    identificador: c.identificador,
    status: STATUS_COMPRA_LABEL[c.status],
    data: formatarData(c.dataCompra),
    pessoa: c.multiplosFornecedores ? 'Vários fornecedores' : c.fornecedor?.nome,
    linhas: c.itens.map(i => ({
      nome: i.insumo.nome,
      quantidade: i.quantidade != null ? `${qtd(i.quantidade)} ${i.insumo.unidade ?? ''}`.trim() : '—',
      unitario: moeda(c.status === 'RASCUNHO' ? i.precoUnitario : i.precoUnitarioPago),
      subtotal: i.precoTotal != null ? BRL(i.precoTotal) : '—',
      detalhe: c.multiplosFornecedores ? (i.fornecedor?.nome ?? 'Sem fornecedor') : undefined,
    })),
    total: c.total,
    extras: [
      { rotulo: 'Pagamento', valor: rotuloPagamento(c) },
      ...(c.observacaoCancelamento ? [{ rotulo: 'Motivo do cancelamento', valor: c.observacaoCancelamento }] : []),
    ],
    acao: { label: 'Abrir compra', href: `/compras/${id}` },
  }
}

export default function ModalRegistro({ tipo, id, onClose }: { tipo: TipoRegistro; id: string; onClose: () => void }) {
  const [visao, setVisao] = useState<Visao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setVisao(null); setErro(null)
    carregar(tipo, id).then(setVisao).catch(err => setErro(extractApiError(err, 'Não foi possível carregar o registro.')))
  }, [tipo, id])

  return (
    <ModalShell open onClose={onClose} width={680} icon={<FileText size={16} />}
      title={visao ? `${TIPO_LABEL[tipo]} ${visao.identificador}` : TIPO_LABEL[tipo]}
      subtitle={visao ? [visao.data, visao.status, visao.pessoa].filter(Boolean).join(' · ') : undefined}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
        {visao?.acao && (
          <Button variant="secondary" icon={<ExternalLink size={16} />}
            onClick={() => window.open(visao.acao!.href, '_blank', 'noopener')}>
            {visao.acao.label}
          </Button>
        )}
      </>}>
      {erro ? (
        <div role="alert" className="rounded-input border border-danger-line bg-danger-tint px-3.5 py-2.5 text-[13px] text-danger-deep">{erro}</div>
      ) : !visao ? (
        <div className="flex items-center gap-2.5 py-6 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
      ) : (
        <div data-testid="modal-registro" className="flex flex-col gap-4">
          <div className="rounded-input border border-line">
            <div className="hidden grid-cols-[2fr_0.7fr_0.9fr_0.9fr] gap-3 bg-cream px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim sm:grid">
              <span>Item</span><span>Qtd.</span><span>Unitário</span><span className="text-right">Subtotal</span>
            </div>
            {visao.linhas.length === 0 && <div className="px-4 py-4 text-sm text-muted">Sem itens.</div>}
            {visao.linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-[13.5px] first:border-t-0 sm:grid-cols-[2fr_0.7fr_0.9fr_0.9fr] sm:items-center">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <div className="font-semibold text-dark">{l.nome}</div>
                  {l.detalhe && <div className="text-[12px] text-muted">{l.detalhe}</div>}
                </div>
                <div className="text-body [font-variant-numeric:tabular-nums]">{l.quantidade}</div>
                <div className="text-body [font-variant-numeric:tabular-nums]">{l.unitario}</div>
                <div className="text-right font-semibold text-dark [font-variant-numeric:tabular-nums]">{l.subtotal}</div>
              </div>
            ))}
          </div>
          <dl className="m-0 flex flex-col gap-1.5 text-[13.5px]">
            {visao.subtotal != null && (
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="m-0 [font-variant-numeric:tabular-nums]">{BRL(visao.subtotal)}</dd></div>
            )}
            {!!visao.desconto && (
              <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd className="m-0 [font-variant-numeric:tabular-nums]">{visao.desconto}</dd></div>
            )}
            <div className="flex justify-between text-[15px] font-bold text-dark"><dt>Total</dt><dd className="m-0 [font-variant-numeric:tabular-nums]">{BRL(visao.total)}</dd></div>
            {visao.extras.map(e => (
              <div key={e.rotulo} className="flex justify-between gap-4"><dt className="text-muted">{e.rotulo}</dt><dd className="m-0 text-right">{e.valor}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </ModalShell>
  )
}
