import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { List, Search } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import Spinner from '../ui/Spinner'
import SortableHeader from '../shared/SortableHeader'
import CampoFiltros, { type FiltroEscolhido } from '../shared/CampoFiltros'
import ModalVinculoFornecedorInsumo from './ModalVinculoFornecedorInsumo'
import { formatarData, moeda, REGRA_PRECO_LABEL } from './formato'
import { fornecedorInsumoService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import type { FornecedorInsumoResponse, RegraPrecoReferencia } from '../../types/compra'

// V0.15.0 (#586, RN-NOVA-36) — lupa "Insumos vinculados" do cadastro: modal de listagem na fonte "Insumos do
// fornecedor". Colunas Código, Insumo, Preço de referência, Regra do preço e Última compra; ordenação por
// Insumo, Preço de referência e Última compra; filtro Regra do preço (RN-NOVA-35). Clique abre o vínculo.
// A lista vem inteira do GET /fornecedor-insumos (poucos itens por fornecedor): busca, filtro e ordem aqui.

type Campo = 'insumo' | 'preco' | 'ultimaCompra'
const GRUPOS = [{ id: 'regra', rotulo: 'Regra do preço',
  opcoes: (Object.keys(REGRA_PRECO_LABEL) as RegraPrecoReferencia[]).map(r => ({ valor: r, rotulo: REGRA_PRECO_LABEL[r] })) }]
const GRADE = 'md:grid-cols-[0.7fr_2fr_1.2fr_0.9fr_1.4fr]'

export default function ModalInsumosFornecedor({ fornecedorId, fornecedorNome, onClose }: {
  fornecedorId: string
  fornecedorNome: string
  onClose: () => void
}) {
  const [vinculos, setVinculos] = useState<FornecedorInsumoResponse[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<FiltroEscolhido[]>([])
  const [ordem, setOrdem] = useState<{ campo: Campo; dir: 'asc' | 'desc' }>({ campo: 'insumo', dir: 'asc' })
  const [aberto, setAberto] = useState<FornecedorInsumoResponse | null>(null)

  const carregar = () => {
    setErro(null)
    fornecedorInsumoService.listarPorFornecedor(fornecedorId).then(setVinculos)
      .catch(err => setErro(extractApiError(err, 'Não foi possível carregar os insumos.')))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [fornecedorId])

  const linhas = useMemo(() => {
    const regras = filtros.map(f => f.valor)
    const termo = busca.trim().toLowerCase()
    const sinal = ordem.dir === 'asc' ? 1 : -1
    const chave = (v: FornecedorInsumoResponse): string | number => ordem.campo === 'insumo' ? v.insumo.nome.toLowerCase()
      : ordem.campo === 'preco' ? (v.precoReferencia ?? -1) : (v.ultimaCompra?.data ?? '')
    return (vinculos ?? [])
      .filter(v => regras.length === 0 || regras.includes(v.regraPrecoReferencia))
      .filter(v => !termo || v.insumo.nome.toLowerCase().includes(termo) || v.insumo.identificador.toLowerCase().includes(termo))
      .sort((a, b) => { const x = chave(a), y = chave(b); return (x < y ? -1 : x > y ? 1 : 0) * sinal })
  }, [vinculos, filtros, busca, ordem])

  const ordenar = (campo: Campo) => setOrdem(o => o.campo === campo
    ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
    : { campo, dir: campo === 'insumo' ? 'asc' : 'desc' })

  return (
    <>
      <ModalShell open onClose={onClose} width={900} icon={<List size={16} />} title="Insumos vinculados" subtitle={fornecedorNome}
        footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-start gap-3">
            <label className="relative block min-w-[220px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar insumo" placeholder="Buscar por código ou insumo"
                className="h-10 w-full rounded-input border-[1.5px] border-line bg-white pl-8 pr-3 font-[inherit] text-[13px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus" />
            </label>
            <div className="min-w-[260px] flex-1"><CampoFiltros grupos={GRUPOS} escolhidos={filtros} onChange={setFiltros} /></div>
          </div>
          <div className="rounded-input border border-line" data-testid="modal-insumos-fornecedor">
            <div className={clsx('hidden gap-3 bg-cream px-4 py-2.5 md:grid', GRADE)}>
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Código</span>
              <SortableHeader label="Insumo" field="insumo" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <SortableHeader label="Preço de referência" field="preco" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">Regra do preço</span>
              <SortableHeader label="Última compra" field="ultimaCompra" activeField={ordem.campo} dir={ordem.dir} onSort={ordenar} />
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {erro ? <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-danger">{erro}<Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button></div>
                : vinculos === null ? <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
                : linhas.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted">{vinculos.length === 0 ? 'Nenhum insumo vinculado a este fornecedor.' : 'Nenhum insumo com estes filtros.'}</div>
                : linhas.map(v => (
                  <button key={v.id} type="button" data-testid="linha-insumo-fornecedor" onClick={() => setAberto(v)}
                    className={clsx('grid w-full cursor-pointer grid-cols-2 gap-x-3 gap-y-1 border-0 border-t border-solid border-line bg-white px-4 py-2.5 text-left font-[inherit] text-[13.5px] first:border-t-0 hover:bg-cream md:items-center', GRADE)}>
                    <span className="text-[12.5px] font-semibold text-muted">{v.insumo.identificador}</span>
                    <span className="font-semibold text-dark">{v.insumo.nome}{!v.insumo.ativo && <span className="ml-2 text-[11px] text-danger">inativo</span>}</span>
                    <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{v.precoReferencia != null ? `${moeda(v.precoReferencia)} / ${v.insumo.unidade}` : '—'}</span>
                    <span className="text-body">{REGRA_PRECO_LABEL[v.regraPrecoReferencia]}</span>
                    <span className="text-muted [font-variant-numeric:tabular-nums]">{v.ultimaCompra ? `${formatarData(v.ultimaCompra.data)} · ${moeda(v.ultimaCompra.precoUnitario)}` : '—'}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </ModalShell>
      {aberto && <ModalVinculoFornecedorInsumo vinculo={aberto} onClose={() => setAberto(null)}
        onSalvo={v => { setVinculos(prev => prev?.map(x => x.id === v.id ? v : x) ?? null); setAberto(v) }} />}
    </>
  )
}
