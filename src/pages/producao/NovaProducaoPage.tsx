import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button } from '../../components/ui'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { Search, Box, Trash2, Calendar, StickyNote, Plus, AlertTriangle } from 'lucide-react'
import { FracionavelBadge, EstoqueNegativoBadge, QuantidadeTravadaAviso } from '../../components/ui/Badge'
import { produtoService } from '../../services/produtoService'
import { producaoService } from '../../services/producaoService'
import type { ProdutoResponse } from '../../types/produto'
import type { AlertaInsumo } from '../../types/producao'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'

interface ProdutoSelecionado {
  produtoId: string
  nome: string
  identificador?: string
  quantidade: number
  // RN-051 — algum insumo não-fracionável na ficha técnica: quantidade travada em rendimento, sem stepper.
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
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <FracionavelBadge fracionavel={!p.algumInsumoNaoFracionavel} variant="busca" />
                  <EstoqueNegativoBadge permitir={p.permitirEstoqueNegativo} variant="busca" />
                </div>
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
  const [valor, setValor] = useState(String(item.quantidade))

  useEffect(() => { setValor(String(item.quantidade)) }, [item.quantidade])

  const aplicar = (quantidade: number) => {
    const segura = Math.max(1, quantidade)
    setValor(String(segura))
    onQuantidade(item.produtoId, segura)
  }

  return (
    <div className="flex items-center gap-4 border-t border-line px-5 py-4">
      <div className="min-w-[160px] flex-1">
        <div className="text-[15px] font-semibold text-dark">{item.nome}</div>
        {item.identificador && <div className="mt-0.5 text-[12.5px] text-muted">{item.identificador}</div>}
        {item.quantidadeTravada && <QuantidadeTravadaAviso />}
      </div>
      {item.quantidadeTravada ? (
        <div className="flex h-11 flex-shrink-0 items-center rounded-input border-[1.5px] border-line bg-cream px-4 font-[inherit] text-[14.5px] font-semibold text-subtle">
          {item.quantidade}
        </div>
      ) : (
        <div className="flex h-11 flex-shrink-0 items-stretch overflow-hidden rounded-input border-[1.5px] border-line bg-white focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/[0.12]">
          <button
            type="button"
            onClick={() => aplicar((parseInt(valor) || 1) - 1)}
            className="grid w-8 flex-shrink-0 place-items-center border-none bg-transparent text-base text-body transition-colors duration-100 hover:bg-cream"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={valor}
            onChange={e => {
              setValor(e.target.value)
              onQuantidade(item.produtoId, Math.max(1, parseInt(e.target.value) || 1))
            }}
            className="h-full w-[44px] flex-shrink-0 border-x-[1.5px] border-line bg-white text-center font-[inherit] text-[14.5px] font-semibold text-dark outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => aplicar((parseInt(valor) || 1) + 1)}
            className="grid w-8 flex-shrink-0 place-items-center border-none bg-transparent text-base text-teal transition-colors duration-100 hover:bg-cream"
          >
            +
          </button>
        </div>
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

function AlertasInsumos({ alertas }: { alertas: AlertaInsumo[] }) {
  const relevantes = alertas.filter(a => a.situacao !== 'SUFICIENTE')
  if (relevantes.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {relevantes.map((a, i) => {
        const bloqueio = a.situacao === 'BLOQUEIO_FUTURO'
        return (
          <div
            key={i}
            className={clsx(
              'flex items-start gap-2.5 rounded-input border px-3.5 py-3 text-[13.5px]',
              bloqueio ? 'border-danger/40 bg-danger-bg text-danger' : 'border-orange/30 bg-orange/[0.08] text-warning-alt'
            )}
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>{a.nomeInsumo}:</strong> necessário {a.quantidadeNecessaria}, disponível {a.estoqueAtual}
              {bloqueio && ' (bloqueará ao iniciar)'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function NovaProducaoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const produtoIdParam = searchParams.get('produtoId')
  const quantidadeParam = searchParams.get('quantidade')
  const { toast, setToast } = useToast()
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const [loading, setLoading] = useState(false)
  const [alertas, setAlertas] = useState<AlertaInsumo[] | null>(null)
  const [producaoIdCriada, setProducaoIdCriada] = useState<string | null>(null)
  const [alertasAtuais, setAlertasAtuais] = useState<AlertaInsumo[]>([])
  const [avisoPendente, setAvisoPendente] = useState<{ candidato: ProdutoSelecionado[]; alertas: AlertaInsumo[] } | null>(null)
  const [verificandoAlertas, setVerificandoAlertas] = useState(false)
  const ultimoConfirmadoRef = useRef<ProdutoSelecionado[]>([])
  const debounceQuantidadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (debounceQuantidadeRef.current) clearTimeout(debounceQuantidadeRef.current)
  }, [])

  const avaliarAlertas = async (candidato: ProdutoSelecionado[]) => {
    setVerificandoAlertas(true)
    try {
      const alertasSimulados = await producaoService.simularAlertas(
        candidato.map(p => ({ produtoId: p.produtoId, quantidade: p.quantidade }))
      )

      const bloqueios = alertasSimulados.filter(a => a.situacao === 'BLOQUEIO_FUTURO')
      if (bloqueios.length > 0) {
        setToast(`Insumo insuficiente: ${bloqueios.map(b => b.nomeInsumo).join(', ')}`)
        setProdutos(ultimoConfirmadoRef.current)
        return
      }

      const avisos = alertasSimulados.filter(a => a.situacao === 'AVISO')
      if (avisos.length > 0) {
        setAvisoPendente({ candidato, alertas: avisos })
        return
      }

      setProdutos(candidato)
      ultimoConfirmadoRef.current = candidato
      setAlertasAtuais(avisos)
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao verificar disponibilidade de insumos.'))
      setProdutos(ultimoConfirmadoRef.current)
    } finally {
      setVerificandoAlertas(false)
    }
  }

  // RN-NOVA-5 (#194) — pré-preenchimento vindo do botão "Criar produção" no Detalhe do Orçamento
  // (item sem estoque suficiente). Mesmo padrão de query params de NovoItemCatalogoPage.
  useEffect(() => {
    if (!produtoIdParam) return
    produtoService.buscarPorId(produtoIdParam)
      .then(produto => {
        // RN-051 — insumo não-fracionável: quantidade sempre = rendimento, ignora ?quantidade= da query.
        const travado = !!produto.algumInsumoNaoFracionavel
        const quantidade = travado
          ? (produto.rendimento ?? 1)
          : Math.max(1, parseInt(quantidadeParam || '1', 10) || 1)
        avaliarAlertas([{
          produtoId: produto.id, nome: produto.nome, identificador: produto.identificador,
          quantidade, quantidadeTravada: travado,
        }])
      })
      .catch(() => setToast('Não foi possível pré-carregar o produto informado.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoIdParam, quantidadeParam])

  const handleSelectProduto = async (produto: ProdutoResponse) => {
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

    const candidato = existente
      ? produtos.map(p => p.produtoId === produto.id ? { ...p, quantidade, quantidadeTravada } : p)
      : [...produtos, { produtoId: produto.id, nome: produto.nome, identificador: produto.identificador, quantidade, quantidadeTravada }]

    await avaliarAlertas(candidato)
  }

  const handleQuantidade = (produtoId: string, quantidade: number) => {
    if (produtos.find(p => p.produtoId === produtoId)?.quantidadeTravada) return
    const candidato = produtos.map(p => p.produtoId === produtoId ? { ...p, quantidade } : p)
    setProdutos(candidato)

    if (debounceQuantidadeRef.current) clearTimeout(debounceQuantidadeRef.current)
    debounceQuantidadeRef.current = setTimeout(() => avaliarAlertas(candidato), 350)
  }

  const confirmarAvisoPendente = () => {
    if (!avisoPendente) return
    setProdutos(avisoPendente.candidato)
    ultimoConfirmadoRef.current = avisoPendente.candidato
    setAlertasAtuais(avisoPendente.alertas)
    setAvisoPendente(null)
  }

  const handleRemoverProduto = async (produtoId: string) => {
    const novaLista = produtos.filter(p => p.produtoId !== produtoId)
    setProdutos(novaLista)
    ultimoConfirmadoRef.current = novaLista

    if (novaLista.length === 0) {
      if (alertasAtuais.length === 1) {
        setToast(`Alerta de ${alertasAtuais[0].nomeInsumo} resolvido`)
      } else if (alertasAtuais.length > 1) {
        setToast(`Alertas de ${alertasAtuais.map(a => a.nomeInsumo).join(', ')} resolvidos`)
      }
      setAlertasAtuais([])
      return
    }

    try {
      const alertasSimulados = await producaoService.simularAlertas(
        novaLista.map(p => ({ produtoId: p.produtoId, quantidade: p.quantidade }))
      )
      const relevantes = alertasSimulados.filter(a => a.situacao !== 'SUFICIENTE')
      const resolvidos = alertasAtuais.filter(a => !relevantes.some(r => r.nomeInsumo === a.nomeInsumo))

      if (resolvidos.length === 1) {
        setToast(`Alerta de ${resolvidos[0].nomeInsumo} resolvido`)
      } else if (resolvidos.length > 1) {
        setToast(`Alertas de ${resolvidos.map(r => r.nomeInsumo).join(', ')} resolvidos`)
      }

      setAlertasAtuais(relevantes)
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao verificar disponibilidade de insumos.'))
    }
  }

  const handleSubmit = async () => {
    if (!dataInicio) {
      setToast('Informe a data de início.')
      return
    }
    if (!dataTerminoPrevista) {
      setToast('Informe a data de término prevista.')
      return
    }
    if (produtos.length === 0) {
      setToast('Adicione pelo menos um produto.')
      return
    }

    setLoading(true)
    try {
      const result = await producaoService.criar({
        dataInicio,
        dataTerminoPrevista,
        observacoes: observacoes || undefined,
        produtos: produtos.map(p => ({ produtoId: p.produtoId, quantidade: p.quantidade })),
      })

      const temAlerta = result.alertasInsumos.some(a => a.situacao !== 'SUFICIENTE')
      if (temAlerta) {
        setAlertas(result.alertasInsumos)
        setProducaoIdCriada(result.id)
      } else {
        navigate(`/producao/${result.id}`)
      }
    } catch (err: any) {
      setToast(extractApiError(err, 'Erro ao criar produção.'))
    } finally {
      setLoading(false)
    }
  }

  if (alertas && producaoIdCriada) {
    return (
      <AppLayout active="producao" compact>
        <div className="mx-auto max-w-[640px]">
          <QuoteCard step="!" label="Produção criada com alertas de insumo" hint="Revise antes de prosseguir.">
            <div className="flex flex-col gap-4 px-5 py-5">
              <AlertasInsumos alertas={alertas} />
              <Button variant="primary" fullWidth onClick={() => navigate(`/producao/${producaoIdCriada}`)}>
                Ver Produção Criada
              </Button>
            </div>
          </QuoteCard>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao" compact>
      <div className="mb-[22px]">
        <div className="mb-[5px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal">
          Produção / Nova Produção
        </div>
        <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Nova Produção</h1>
      </div>

      <div className="mx-auto flex max-w-[720px] flex-col gap-[18px]">
        <QuoteCard step="1" label="Datas" hint="Quando a produção começa e quando deve terminar.">
          <div className="flex flex-wrap gap-4 px-5 py-5">
            <label className="block flex-1">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <Calendar size={16} className="text-teal" /> Data de início <span className="text-orange">*</span>
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
          {verificandoAlertas && (
            <div className="px-5 pt-3 text-[12.5px] text-muted">Verificando disponibilidade de insumos...</div>
          )}
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
                  onQuantidade={handleQuantidade}
                  onRemove={handleRemoverProduto}
                />
              ))}
              <div className="h-2" />
            </div>
          )}
          {alertasAtuais.length > 0 && (
            <div className="px-5 pb-5 pt-1">
              <AlertasInsumos alertas={alertasAtuais} />
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
          <Button variant="ghost" onClick={() => navigate('/producao')}>Cancelar</Button>
          <Button variant="primary" icon={<Plus size={16} />} disabled={loading || produtos.length === 0} onClick={handleSubmit}>
            {loading ? 'Criando...' : 'Criar Produção'}
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      <ConfirmacaoModal
        open={!!avisoPendente}
        onClose={() => { setProdutos(ultimoConfirmadoRef.current); setAvisoPendente(null) }}
        onConfirm={confirmarAvisoPendente}
        title="Estoque insuficiente"
        description="Este produto vai deixar o estoque de algum insumo negativo. Deseja adicionar mesmo assim?"
        icon={<AlertTriangle size={18} />}
        variant="danger"
        confirmLabel="Adicionar mesmo assim"
        cancelLabel="Cancelar"
      >
        {avisoPendente && <AlertasInsumos alertas={avisoPendente.alertas} />}
      </ConfirmacaoModal>
    </AppLayout>
  )
}
