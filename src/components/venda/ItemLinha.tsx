import clsx from 'clsx'
import { Layers, Box, Trash2, SlidersHorizontal, Tag, AlertTriangle } from 'lucide-react'
import { Stepper } from '../ui'
import { EstoqueTags } from '../ui/Badge'
import type { SimulacaoEstoqueProdutoResponse } from '../../types/orcamento'
import type { LinhaVendaView } from './types'
import { BRL } from './formato'

/**
 * Linha de item já adicionado à venda — usada pelo carrinho do Orçamento e do Caixa.
 *
 * Não recebe identidade da linha: os callbacks já vêm fechados sobre o item pela página dona da
 * lista (ver nota em `types.ts`). `onOpenCustom` omitido esconde o bloco de customizações.
 */
export default function ItemLinha({ linha, index, simulacao, onQtd, onRemove, onOpenCustom }: {
  linha: LinhaVendaView
  index: number
  simulacao?: SimulacaoEstoqueProdutoResponse
  onQtd: (v: number) => void
  onRemove: () => void
  onOpenCustom?: () => void
}) {
  const lineTotal = linha.preco * linha.qtd
  const origemLabel = linha.itemCatalogoId
    ? linha.catalogoNome
    : linha.produtoId
      ? (linha.produtoIdentificador ? `${linha.produtoIdentificador} - Venda sem catálogo` : 'Venda sem catálogo')
      : null
  // RN-NOVA-11 (revisada) — estoque exibido sempre vem da simulação mais recente (nunca o
  // snapshot congelado no momento da adição); valores monetários (preço, margem) continuam
  // congelados. Aviso inline aparece sempre que a situação não é SUFICIENTE, independente de
  // permitirEstoqueNegativo — a adição/criação do orçamento nunca bloqueia, só a trava real vive
  // no avanço para Finalizado (RN-059, backend).
  const estoqueExibido = simulacao?.estoqueAtual ?? linha.estoqueAtual
  const estoqueInsuficiente = simulacao != null && simulacao.situacao !== 'SUFICIENTE'
  // V0.13.0 — item de catálogo com N componentes não tem mais um único estoque agregado
  // (estoqueExibido null quando não há simulação nem valor de origem) — sem dado, sem badge.
  const mostrarEstoque = estoqueExibido != null

  return (
    <div
      className={clsx('animate-fade-up px-5 py-4', index > 0 && 'border-t border-line')}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[160px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15.5px] font-semibold text-dark">{linha.nome}</div>
            {origemLabel && (
              <span className={clsx(
                'inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold',
                linha.itemCatalogoId ? 'bg-teal/10 text-teal' : 'bg-line-soft text-dim'
              )}>
                {linha.itemCatalogoId ? <Layers size={11} /> : <Box size={11} />}
                {origemLabel}
              </span>
            )}
            {estoqueInsuficiente && (
              <span className="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full bg-orange/10 px-[9px] text-[11.5px] font-semibold text-orange">
                <AlertTriangle size={11} />
                Estoque insuficiente
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">{BRL(linha.preco)} / unidade</div>
          {mostrarEstoque && (
            <EstoqueTags
              className="mt-1.5"
              fracionavel={linha.fracionavel ?? true}
              showFracionavel={linha.fracionavel != null}
              permitirEstoqueNegativo={linha.permitirEstoqueNegativo}
              estoqueAtual={estoqueExibido}
              variant="busca"
            />
          )}
        </div>
        <Stepper value={linha.qtd} onChange={onQtd} />
        <div className="min-w-[108px] text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-faint">Subtotal</div>
          <div className="text-[17px] font-bold text-dark [font-variant-numeric:tabular-nums]">{BRL(lineTotal)}</div>
        </div>
        <button
          onClick={onRemove}
          className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[9px] border border-transparent bg-transparent text-faint transition-colors duration-100 hover:bg-[#FCF1ED] hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {onOpenCustom && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCustom}
            className={clsx(
              'inline-flex h-[34px] items-center gap-[7px] rounded-[9px] border px-3 font-[inherit] text-[13px] font-semibold',
              linha.customs.length ? 'border-orange/40 bg-orange/[0.08] text-warning-alt' : 'border-line bg-cream text-body'
            )}
          >
            <SlidersHorizontal size={15} /> Customizações{linha.customs.length ? ` (${linha.customs.length})` : ''}
          </button>
          {linha.customs.map((c, k) => (
            <span key={k} className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-white px-[11px] text-[12.5px] text-dim">
              <Tag size={17} className="text-orange" />
              {c.nome} <strong className="font-semibold text-warning-alt">+{BRL(c.valor)}/un</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
