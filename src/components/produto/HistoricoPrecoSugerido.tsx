import { formatarData } from '../../utils/data'
import { useState } from 'react'
import clsx from 'clsx'
import { ArrowRight, ChevronDown, Tag } from 'lucide-react'
import { BRL } from '../venda/formato'

import type { MovimentacaoProdutoResponse } from '../../types/produto'
import type { PrecoSugeridoAgregado } from '../../types/insumo'

// V0.17.0 — #672 (RN-NOVA-10 e 11): linhas do preço sugerido nos históricos do Produto e do Insumo. Os valores,
// as causas e as referências (COM-12, PRO-3…) vêm prontos do backend; aqui só a exibição.

const CAUSA: Record<string, string> = {
  COMPRA_ENTRADA: 'Entrada da compra',
  COMPRA_CANCELAMENTO: 'Cancelamento da compra',
  PRODUTO_EDICAO: 'Edição da ficha técnica',
  PRODUTO_MARGEM: 'Mudança de margem',
  INSUMO_SUBSTITUICAO: 'Substituição de insumo',
  VALOR_HORA: 'Mudança do valor da hora',
}

export function rotuloCausa(causa: string, referencia?: string | null): string {
  const base = CAUSA[causa] ?? causa
  return referencia && (causa === 'COMPRA_ENTRADA' || causa === 'COMPRA_CANCELAMENTO' || causa === 'INSUMO_SUBSTITUICAO')
    ? `${base} ${referencia}` : base
}

function AntesDepois({ antes, depois }: { antes: number; depois: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 [font-variant-numeric:tabular-nums]">
      {/* #987 (RN-NOVA-10 e 11, alteração): preço anterior em laranja e riscado; o novo mantém a cor (laranja se subiu, verde se desceu) */}
      <span data-testid="preco-anterior" className="text-orange line-through decoration-orange">{BRL(antes)}</span>
      <ArrowRight size={13} className="text-dim" />
      <span data-testid="preco-novo" className={clsx('font-semibold', depois > antes ? 'text-warning-alt' : 'text-success')}>{BRL(depois)}</span>
    </span>
  )
}

/** Linha de mudança do preço sugerido no histórico do Produto (sem quantidade; visualmente distinta). */
export function LinhaPrecoSugeridoProduto({ mov }: { mov: MovimentacaoProdutoResponse }) {
  return (
    <div data-testid="linha-preco-sugerido"
      className="animate-fade-up border-t border-line bg-azul/5 px-5 py-[15px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{formatarData(mov.createdAt)}</span>
        <span className="inline-flex items-center gap-2 text-[13.8px] font-semibold text-dark">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-azul/10 text-azul"><Tag size={15} /></span>
          Preço sugerido
        </span>
        {mov.precoSugeridoAnterior != null && mov.precoSugeridoNovo != null && (
          <AntesDepois antes={mov.precoSugeridoAnterior} depois={mov.precoSugeridoNovo} />
        )}
        <span className="text-[12.5px] text-muted">{rotuloCausa(mov.causaPrecoSugerido ?? '', mov.referenciaTexto)}</span>
      </div>
    </div>
  )
}

/** Linha agregada do histórico do Insumo: "Preço sugerido de N produtos mudou, COM-12" — abre a lista dos produtos. */
export function LinhaPrecoSugeridoInsumo({ data, agregado }: { data: string; agregado: PrecoSugeridoAgregado }) {
  const [aberta, setAberta] = useState(false)
  const n = agregado.quantidadeProdutos
  return (
    <div data-testid="linha-preco-sugerido" className="animate-fade-up border-t border-line bg-azul/5">
      <button type="button" onClick={() => setAberta(a => !a)} aria-expanded={aberta}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 border-none bg-transparent px-5 py-[15px] text-left font-[inherit]">
        <span className="text-[13px] text-body [font-variant-numeric:tabular-nums]">{formatarData(data)}</span>
        <span className="inline-flex items-center gap-2 text-[13.8px] font-semibold text-dark">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-azul/10 text-azul"><Tag size={15} /></span>
          Preço sugerido de {n} {n === 1 ? 'produto mudou' : 'produtos mudou'}{agregado.referenciaTexto ? `, ${agregado.referenciaTexto}` : ''}
        </span>
        <span className="text-[12.5px] text-muted">{rotuloCausa(agregado.causa)}</span>
        <ChevronDown size={16} className={clsx('ml-auto text-dim transition-transform', aberta && 'rotate-180')} />
      </button>
      {aberta && (
        <div className="px-5 pb-4">
          {agregado.produtos.map(p => (
            <div key={p.id} data-testid="produto-preco-sugerido" className="flex flex-wrap items-center gap-x-3 border-t border-line px-1 py-2.5 text-[13px]">
              <span className="text-[12px] font-semibold text-muted">{p.identificador}</span>
              <span className="font-semibold text-dark">{p.nome}:</span>
              <AntesDepois antes={p.anterior} depois={p.novo} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
