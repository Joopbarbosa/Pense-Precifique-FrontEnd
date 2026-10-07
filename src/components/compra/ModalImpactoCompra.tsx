import clsx from 'clsx'
import { ArrowRight, Info, TrendingUp } from 'lucide-react'
import { ModalShell, Button } from '../ui'
import { BRL } from '../venda/formato'
import { moeda } from './formato'
import type { ImpactoCompraResponse, ImpactoProduto } from '../../types/compra'

// #543 (RN-NOVA-8) — modal informativo depois de confirmar (ou cancelar) uma compra. Todos os
// números vêm do backend; o preço de venda nunca é alterado pela compra.

function AntesDepois({ antes, depois, formatar }: { antes: number; depois: number; formatar: (n: number) => string }) {
  const subiu = depois > antes
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 [font-variant-numeric:tabular-nums]">
      <span className="text-muted line-through decoration-line-deep">{formatar(antes)}</span>
      <ArrowRight size={13} className="text-dim" />
      <span className={clsx('font-semibold', subiu ? 'text-warning-alt' : 'text-success')}>{formatar(depois)}</span>
    </span>
  )
}

function LinhaProduto({ p }: { p: ImpactoProduto }) {
  return (
    <div data-testid="impacto-produto" className="grid grid-cols-1 gap-1.5 border-t border-line px-4 py-3 text-[13px] md:grid-cols-[1.4fr_1fr_1fr] md:items-center md:gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-muted">{p.identificador}</span>
          <span className="font-semibold text-dark">{p.nome}</span>
          <span className={clsx('rounded-full px-2 py-0.5 text-[10.5px] font-bold', p.direto ? 'bg-teal/10 text-teal' : 'bg-azul/10 text-azul')}>
            {p.direto ? 'Direto' : 'Indireto'}
          </span>
        </div>
        <div className="mt-0.5 text-[12px] text-muted">
          Preço de venda {BRL(p.precoVenda)}{p.precoVendaManual ? ' (definido por você)' : ''} — não muda
        </div>
      </div>
      <div><span className="mr-1.5 text-[11px] uppercase tracking-[0.04em] text-faint md:hidden">Custo</span><AntesDepois antes={p.custoAntes} depois={p.custoDepois} formatar={moeda} /></div>
      <div><span className="mr-1.5 text-[11px] uppercase tracking-[0.04em] text-faint md:hidden">Sugerido</span><AntesDepois antes={p.precoSugeridoAntes} depois={p.precoSugeridoDepois} formatar={BRL} /></div>
    </div>
  )
}

export default function ModalImpactoCompra({ impacto, titulo, onClose }: {
  impacto: ImpactoCompraResponse
  titulo: string
  onClose: () => void
}) {
  const diretos = impacto.produtos.filter(p => p.direto)
  const indiretos = impacto.produtos.filter(p => !p.direto)
  return (
    <ModalShell
      open
      onClose={onClose}
      title={titulo}
      subtitle={impacto.alterouCustos ? 'Veja o que mudou nos custos' : undefined}
      icon={<TrendingUp size={16} />}
      iconBg="rgba(42,157,143,0.12)"
      iconColor="#2A9D8F"
      width={760}
      footer={<Button variant="primary" onClick={onClose}>Entendi</Button>}
    >
      {!impacto.alterouCustos ? (
        <p className="m-0 text-sm text-body">Esta compra não alterou o custo de nenhum insumo, então nenhum produto mudou.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.04em] text-dim">Insumos com custo novo</div>
            <div className="rounded-input border border-line">
              {impacto.insumos.map((i, k) => (
                <div key={i.id} data-testid="impacto-insumo" className={clsx('flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]', k > 0 && 'border-t border-line')}>
                  <span><span className="mr-2 text-[12px] font-semibold text-muted">{i.identificador}</span><span className="font-semibold text-dark">{i.nome}</span></span>
                  <span className="inline-flex items-center gap-1">
                    <AntesDepois antes={i.custoAntes} depois={i.custoDepois} formatar={moeda} />
                    <span className="text-muted">/ {i.unidade}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.04em] text-dim">Produtos afetados</div>
            {impacto.produtos.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nenhum produto usa estes insumos.</p>
            ) : (
              <div className="rounded-input border border-line">
                <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-3 bg-cream px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim md:grid">
                  <span>Produto</span><span>Custo unitário</span><span>Preço sugerido</span>
                </div>
                {[...diretos, ...indiretos].map(p => <LinhaProduto key={p.id} p={p} />)}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-input border border-teal/20 bg-teal/6 px-3.5 py-2.5 text-[12.5px] text-body">
            <Info size={15} className="mt-px shrink-0 text-teal" />
            O preço de venda dos produtos não muda sozinho. "Indireto" é o produto que usa outro produto afetado como componente.
          </div>
        </div>
      )}
    </ModalShell>
  )
}
