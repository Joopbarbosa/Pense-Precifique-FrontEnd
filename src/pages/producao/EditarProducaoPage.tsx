import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Spinner } from '../../components/ui'
import { extractApiError } from '../../utils/apiError'
import { Search, Box, Trash2, Calendar, StickyNote, Save, Lock } from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { producaoService } from '../../services/producaoService'
import type { ProdutoResponse } from '../../types/produto'

interface ProdutoSelecionado {
  produtoId: string
  nome: string
  identificador?: string
  quantidade: number
  // RN-051 — algum insumo não-fracionável na ficha técnica: quantidade travada em rendimento, sem edição livre.
  quantidadeTravada?: boolean
}

function QuoteCard({ step, label, hint, children }: {
  step: string
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-teal/[0.12] text-[13.5px] font-bold text-teal">{step}</span>
        <div>
          <div className="text-[15.5px] font-bold text-dark">{label}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function ProdutoSearch({ onSelect }: { onSelect: (produto: ProdutoResponse) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const timer = setTimeout(() => {
      produtoService.listar(0, 10, 'PRODUTO', q.trim() || undefined)
        .then(data => setResults(data.content))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, open])

  return (
    <div ref={wrapRef} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
        <Search size={18} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar produto..."
        className="h-12 w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
      />
      {open && (
        <div className="absolute inset-x-0 top-[54px] z-30 max-h-[280px] min-h-[60px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
          {loading ? (
            <div className="p-5 text-center text-sm text-muted">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-5 text-center text-sm text-muted">Nenhum produto encontrado.</div>
          ) : results.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setOpen(false); setQ('') }}
              className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                <Box size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-dark">{p.nome}</div>
                <div className="text-[12.5px] text-muted">{p.identificador}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProdutoRow({ item, onQuantidade, onRemove }: {
  item: ProdutoSelecionado
  onQuantidade: (produtoId: string, quantidade: number) => void
  onRemove: (produtoId: string) => void
}) {
  return (
    <div className="flex items-center gap-4 border-t border-line px-5 py-4">
      <div className="min-w-[160px] flex-1">
        <div className="text-[15px] font-semibold text-dark">{item.nome}</div>
        {item.identificador && <div className="mt-0.5 text-[12.5px] text-muted">{item.identificador}</div>}
        {item.quantidadeTravada && (
          <div className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-muted">
            <Lock size={11} /> Quantidade fixa — insumo não-fracionável na ficha técnica
          </div>
        )}
      </div>
      {item.quantidadeTravada ? (
        <div className="flex h-11 w-[84px] flex-shrink-0 items-center justify-center rounded-input border-[1.5px] border-line bg-cream font-[inherit] text-[14.5px] font-semibold text-subtle">
          {item.quantidade}
        </div>
      ) : (
        <input
          type="number"
          min={1}
          value={item.quantidade}
          onChange={e => onQuantidade(item.produtoId, Math.max(1, parseInt(e.target.value) || 1))}
          className="h-11 w-[84px] rounded-input border-[1.5px] border-line bg-white px-3 text-center font-[inherit] text-[14.5px] font-semibold text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
      )}
      <button
        onClick={() => onRemove(item.produtoId)}
        className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[9px] border border-transparent bg-transparent text-faint transition-colors duration-100 hover:bg-[#FCF1ED] hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default function EditarProducaoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [carregando, setCarregando] = useState(true)
  const [bloqueado, setBloqueado] = useState(false)
  const [identificador, setIdentificador] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!id) return
    producaoService.buscarPorId(id)
      .then(async data => {
        setIdentificador(data.identificador)
        if (data.estado !== 'AGUARDANDO_INICIO') {
          setBloqueado(true)
          return
        }
        setDataInicio(data.dataInicio ?? '')
        setDataTerminoPrevista(data.dataTerminoPrevista ?? '')
        setObservacoes(data.observacoes ?? '')

        // RN-051 — cada produto já lançado pode ter insumo não-fracionável (quantidade travada
        // em rendimento); ProducaoProdutoItem não traz algumInsumoNaoFracionavel, então é
        // preciso buscar o detalhe de cada produto para saber se a linha nasce travada.
        const detalhes = await Promise.all(
          data.produtos.map(p => produtoService.buscarPorId(p.produtoId).catch(() => null))
        )
        setProdutos(data.produtos.map((p, i) => {
          const detalhe = detalhes[i]
          const travado = !!detalhe?.algumInsumoNaoFracionavel
          return {
            produtoId: p.produtoId,
            nome: p.nomeProduto,
            quantidade: travado ? (detalhe!.rendimento ?? p.quantidade) : p.quantidade,
            quantidadeTravada: travado,
          }
        }))
      })
      .catch(() => setToast('Não foi possível carregar a produção.'))
      .finally(() => setCarregando(false))
  }, [id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSelectProduto = (produto: ProdutoResponse) => {
    const existente = produtos.find(p => p.produtoId === produto.id)
    if (existente?.quantidadeTravada) {
      setToast(`${produto.nome} já foi adicionado — insumo não-fracionável não permite mais de uma unidade por produção.`)
      return
    }

    let quantidade = existente ? existente.quantidade + 1 : 1
    let quantidadeTravada = false
    if (produto.algumInsumoNaoFracionavel) {
      quantidadeTravada = true
      quantidade = produto.rendimento ?? 1
    }

    setProdutos(arr => {
      const existenteAtual = arr.find(p => p.produtoId === produto.id)
      if (existenteAtual) {
        return arr.map(p => p.produtoId === produto.id ? { ...p, quantidade, quantidadeTravada } : p)
      }
      return [...arr, { produtoId: produto.id, nome: produto.nome, identificador: produto.identificador, quantidade, quantidadeTravada }]
    })
  }

  const handleSubmit = async () => {
    if (!id) return
    if (!dataTerminoPrevista) {
      setToast('Informe a data de término prevista.')
      return
    }
    if (produtos.length === 0) {
      setToast('Adicione pelo menos um produto.')
      return
    }

    setSalvando(true)
    try {
      await producaoService.editar(id, {
        dataInicio: dataInicio || undefined,
        dataTerminoPrevista,
        observacoes: observacoes || undefined,
        produtos: produtos.map(p => ({ produtoId: p.produtoId, quantidade: p.quantidade })),
      })
      navigate(`/producao/${id}`)
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao editar produção.'))
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <AppLayout active="producao" compact>
        <div className="flex justify-center py-24"><Spinner /></div>
      </AppLayout>
    )
  }

  if (bloqueado) {
    return (
      <AppLayout active="producao" compact>
        <div className="mx-auto max-w-[640px] rounded-card border border-[#F0EEE9] bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <span className="mb-3.5 inline-grid h-14 w-14 place-items-center rounded-full bg-danger-bg text-danger">
            <Lock size={22} />
          </span>
          <div className="text-[16px] font-bold text-dark">Esta produção não pode mais ser editada.</div>
          <p className="mb-0 mt-1.5 text-[13.5px] text-muted">Apenas produções aguardando início podem ser editadas.</p>
          <div className="mt-5">
            <Button variant="ghost" onClick={() => navigate(`/producao/${id}`)}>Voltar</Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao" compact>
      <div className="mb-[22px]">
        <div className="mb-[5px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal">
          Produção / {identificador} / Editar
        </div>
        <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Editar Produção</h1>
      </div>

      <div className="mx-auto flex max-w-[720px] flex-col gap-[18px]">
        <QuoteCard step="1" label="Datas" hint="Quando a produção começa e quando deve terminar.">
          <div className="flex flex-wrap gap-4 px-5 py-5">
            <label className="block flex-1">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <Calendar size={16} className="text-teal" /> Data de início (opcional)
              </span>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </label>
            <label className="block flex-1">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <Calendar size={16} className="text-teal" /> Data de término prevista <span className="text-orange">*</span>
              </span>
              <input
                type="date"
                value={dataTerminoPrevista}
                min={dataInicio || undefined}
                onChange={e => setDataTerminoPrevista(e.target.value)}
                className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </label>
          </div>
        </QuoteCard>

        <QuoteCard step="2" label="Produtos" hint="O que será produzido.">
          <div className="px-5 pt-4">
            <ProdutoSearch onSelect={handleSelectProduto} />
          </div>
          {produtos.length === 0 ? (
            <div className="mx-5 mb-5 mt-4 rounded-[14px] border-[1.5px] border-dashed border-line bg-cream px-6 py-8 text-center">
              <div className="text-[14.5px] font-semibold text-dark">Nenhum produto adicionado</div>
              <p className="mb-0 mt-1.5 text-[13px] text-muted">Busque um produto acima para adicionar.</p>
            </div>
          ) : (
            <div className="mb-1 mt-4">
              {produtos.map(p => (
                <ProdutoRow
                  key={p.produtoId}
                  item={p}
                  onQuantidade={(pid, qtd) => setProdutos(arr => arr.map(x => x.produtoId === pid && !x.quantidadeTravada ? { ...x, quantidade: qtd } : x))}
                  onRemove={pid => setProdutos(arr => arr.filter(x => x.produtoId !== pid))}
                />
              ))}
              <div className="h-2" />
            </div>
          )}
        </QuoteCard>

        <QuoteCard step="3" label="Observações" hint="Alguma informação adicional sobre esta produção?">
          <div className="px-5 py-5">
            <label className="block">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <StickyNote size={15} /> Observações (opcional)
              </span>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Ex: Priorizar entrega da tarde"
                className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </label>
          </div>
        </QuoteCard>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(`/producao/${id}`)}>Cancelar</Button>
          <Button variant="primary" icon={<Save size={16} />} disabled={salvando || produtos.length === 0} onClick={handleSubmit}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}
    </AppLayout>
  )
}
