import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, ModalShell, Spinner } from '../../components/ui'
import Toast from '../../components/shared/Toast'
import {
  Wallet, Plus, Minus, Trash2, Search, Box, ArrowDownCircle, ArrowUpCircle,
  Lock, Check, AlertTriangle, Receipt, Clock, History, Ban,
} from 'lucide-react'
import { caixaService } from '../../services/caixaService'
import { empresaService } from '../../services/empresaService'
import { produtoService } from '../../services/produtoService'
import { useToast } from '../../hooks/useToast'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { extractApiError } from '../../utils/apiError'
import { rotuloMetodoPagamento } from '../../constants/metodoPagamentoConfiguravel'
import type { MetodoPagamentoConfiguravelResponse } from '../../types/empresa'
import type { ProdutoResponse } from '../../types/produto'
import type {
  CaixaTurnoResponse, TipoDescontoCaixa, VendaCaixaResponse,
  AvisoEstoqueNegativoResponse, VendaCaixaRequest,
} from '../../types/caixa'
import { ehAvisoEstoqueNegativo } from '../../types/caixa'

/**
 * #487/#488 (V0.12.0) — Caixa/PDV, Epic #416. Venda de balcão paralela ao Orçamento: sem
 * rascunho/aprovação, nasce concluída no mesmo ato (RN-NOVA-10). Visualmente separado de
 * Orçamento por design — poucos cliques, poucos campos.
 */

const num = (s: string) => parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'

interface ItemCarrinho {
  produto: ProdutoResponse
  quantidade: number
}

/* ── MoneyInput ──────────────────────────────────────────────── */

function MoneyInput({ value, onChange, autoFocus, size = 'md' }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; size?: 'md' | 'lg'
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-12 place-items-center rounded-l-input border-r border-line bg-cream text-[13px] font-semibold text-dim">
        R$
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        autoFocus={autoFocus}
        className={clsx(
          inputBase, 'pl-14 pr-3.5 [font-variant-numeric:tabular-nums]',
          size === 'lg' && 'h-[54px] text-[18px] font-semibold'
        )}
      />
    </div>
  )
}

/* ── AbrirCaixaView (#488) ───────────────────────────────────── */

function AbrirCaixaView({ onAberto }: { onAberto: (t: CaixaTurnoResponse) => void }) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const abrir = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const turno = await caixaService.abrirTurno({ valorAbertura: num(valor) })
      onAberto(turno)
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao abrir o caixa. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
        <Wallet size={30} />
      </span>
      <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Abrir o Caixa</h1>
      <p className="mt-2 mb-7 text-[14px] leading-[1.5] text-muted">
        Informe o valor em dinheiro que está na gaveta agora para começar a registrar vendas.
      </p>
      <div className="w-full text-left">
        <Field label="Fundo de troco" size="md">
          <MoneyInput value={valor} onChange={setValor} autoFocus size="lg" />
        </Field>
      </div>
      {erro && <p className="mt-3 text-[13px] font-medium text-danger-deep">{erro}</p>}
      <Button variant="primary" size="lg" fullWidth className="mt-6" onClick={abrir} disabled={salvando}>
        {salvando ? 'Abrindo…' : 'Abrir Caixa'}
      </Button>
    </div>
  )
}

/* ── SangriaSuprimentoModal (#488, RN-NOVA-8) ───────────────── */

function SangriaSuprimentoModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void
}) {
  const [tipo, setTipo] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setTipo('SANGRIA'); setValor(''); setMotivo(''); setErro(null) }
  }, [open])

  const motivoCurto = motivo.trim().length > 0 && motivo.trim().length < 30

  const salvar = async () => {
    if (motivo.trim().length < 30) {
      setErro('O motivo deve ter no mínimo 30 caracteres.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await caixaService.registrarMovimento({ tipo, valor: num(valor), motivo: motivo.trim() })
      onSaved()
      onClose()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao registrar. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Sangria ou Suprimento"
      subtitle="Retirada ou entrada de dinheiro no caixa fora de uma venda."
      icon={tipo === 'SANGRIA' ? <ArrowDownCircle size={17} /> : <ArrowUpCircle size={17} />}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Registrar'}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex gap-[3px] rounded-[9px] bg-line-soft p-[3px]">
          {([['SANGRIA', 'Sangria (retirada)'], ['SUPRIMENTO', 'Suprimento (entrada)']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTipo(v)}
              className={clsx(
                'h-[38px] flex-1 whitespace-nowrap rounded-[7px] border-none font-[inherit] text-[13px] font-semibold',
                tipo === v ? 'bg-white text-dark shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-dim'
              )}
            >{l}</button>
          ))}
        </div>
        <Field label="Valor" size="md">
          <MoneyInput value={valor} onChange={setValor} autoFocus />
        </Field>
        <Field label="Motivo" size="md">
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo (mínimo 30 caracteres)"
            className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
          <span className={clsx('mt-1.5 block text-xs', motivoCurto ? 'text-warning-alt' : 'text-muted')}>
            {motivo.trim().length}/30 caracteres mínimos
          </span>
        </Field>
        {erro && <p className="text-[12.5px] font-medium text-danger-deep">{erro}</p>}
      </div>
    </ModalShell>
  )
}

/* ── FecharCaixaModal (#488, RN-NOVA-9) ─────────────────────── */

function FecharCaixaModal({ open, onClose, turno, onFechado }: {
  open: boolean; onClose: () => void
  turno: CaixaTurnoResponse
  onFechado: () => void
}) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<CaixaTurnoResponse | null>(null)

  useEffect(() => {
    if (open) { setValor(''); setErro(null); setResultado(null) }
  }, [open])

  const fechar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const fechado = await caixaService.fecharTurno(turno.id, { valorFechamentoInformado: num(valor) })
      setResultado(fechado)
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao fechar o caixa. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => { onClose(); if (resultado) onFechado() }}
      title="Fechar Caixa"
      icon={<Lock size={17} />}
      footer={
        resultado ? (
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => { onClose(); onFechado() }}>Concluir</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button variant="primary" onClick={fechar} disabled={salvando}>{salvando ? 'Fechando…' : 'Fechar caixa'}</Button>
          </div>
        )
      }
    >
      {resultado ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-[14px]"><span className="text-body">Fundo de abertura</span><span className="font-semibold text-dark">{moeda(turno.valorAbertura)}</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-body">Valor esperado</span><span className="font-semibold text-dark">{moeda(resultado.valorFechamentoEsperado ?? 0)}</span></div>
          <div className="flex justify-between text-[14px]"><span className="text-body">Valor contado</span><span className="font-semibold text-dark">{moeda(resultado.valorFechamentoInformado ?? 0)}</span></div>
          <div className="my-1 h-px bg-line" />
          <div className="flex justify-between text-[15px]">
            <span className="font-bold text-dark">Diferença</span>
            <span className={clsx('font-bold', (resultado.diferenca ?? 0) < 0 ? 'text-danger-deep' : (resultado.diferenca ?? 0) > 0 ? 'text-success' : 'text-dark')}>
              {moeda(resultado.diferenca ?? 0)}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] leading-[1.5] text-muted">
            O caixa foi fechado normalmente — diferença é só informativa, não bloqueia o fechamento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          <div className="rounded-xl border border-teal/[0.18] bg-teal/[0.06] px-4 py-3.5 text-[13px] leading-[1.5] text-[#3F5B54]">
            Conte o dinheiro que está na gaveta agora e informe o valor abaixo. O sistema compara
            com o valor esperado (fundo + vendas em dinheiro + suprimentos − sangrias).
          </div>
          <Field label="Valor contado na gaveta" size="md">
            <MoneyInput value={valor} onChange={setValor} autoFocus />
          </Field>
          {erro && <p className="text-[12.5px] font-medium text-danger-deep">{erro}</p>}
        </div>
      )}
    </ModalShell>
  )
}

/* ── VendasDoTurnoModal (#487, RN-NOVA-4/11 — cancelamento só com turno aberto) ── */

function VendasDoTurnoModal({ open, onClose, turnoId, onVendaCancelada }: {
  open: boolean; onClose: () => void; turnoId: string; onVendaCancelada: () => void
}) {
  const [vendas, setVendas] = useState<VendaCaixaResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelando, setCancelando] = useState<VendaCaixaResponse | null>(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = () => {
    setLoading(true)
    caixaService.listarVendasDoTurno(turnoId)
      .then(setVendas)
      .catch(() => setVendas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) { carregar(); setCancelando(null); setMotivo(''); setErro(null) }
  }, [open, turnoId])

  const confirmarCancelamento = async () => {
    if (!cancelando || !motivo.trim()) {
      setErro('Informe o motivo do cancelamento.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await caixaService.cancelarVenda(cancelando.id, { cancelamentoMotivo: motivo.trim() })
      setCancelando(null)
      setMotivo('')
      carregar()
      onVendaCancelada()
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao cancelar a venda. Tente novamente.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={cancelando ? `Cancelar ${cancelando.identificador}` : 'Vendas deste turno'}
      icon={cancelando ? <Ban size={17} /> : <History size={17} />}
      width={560}
      footer={cancelando ? (
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setCancelando(null); setErro(null) }} disabled={salvando}>Voltar</Button>
          <Button variant="danger" onClick={confirmarCancelamento} disabled={salvando}>
            {salvando ? 'Cancelando…' : 'Confirmar cancelamento'}
          </Button>
        </div>
      ) : undefined}
    >
      {cancelando ? (
        <div className="flex flex-col gap-[14px]">
          <div className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] leading-[1.5] text-danger-deep">
            Reverte a baixa de estoque automaticamente. Para corrigir um erro, cancele e registre uma nova venda.
          </div>
          <Field label="Motivo do cancelamento" size="md">
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo do cancelamento"
              className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </Field>
          {erro && <p className="text-[12.5px] font-medium text-danger-deep">{erro}</p>}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2.5 py-8 text-sm text-muted">
          <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando…
        </div>
      ) : vendas.length === 0 ? (
        <div className="py-8 text-center text-[14px] text-muted">Nenhuma venda registrada neste turno ainda.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {vendas.map(v => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-input border border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-dark">{v.identificador}</span>
                  <span className={clsx(
                    'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                    v.status === 'CANCELADA' ? 'bg-line-soft text-subtle' : 'bg-success/10 text-success'
                  )}>
                    {v.status === 'CANCELADA' ? 'Cancelada' : 'Concluída'}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {v.itens.length} item(ns) · {moeda(v.total)} · {new Date(v.dataVenda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {v.status === 'CONCLUIDA' && (
                <Button variant="ghost" size="sm" onClick={() => setCancelando(v)}>Cancelar</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

/* ── ProdutoSearch (#487, RN-NOVA-1 — busca por nome ou código de barras) ────── */

function ProdutoSearch({ onAdd }: { onAdd: (p: ProdutoResponse) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [resultados, setResultados] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const debouncedQ = useDebouncedValue(q, q.trim() ? 250 : 0)
  useEffect(() => {
    if (!open || debouncedQ !== q || !debouncedQ.trim()) { setResultados([]); return }
    setLoading(true)
    setErro(false)
    produtoService.listar(0, 8, undefined, debouncedQ, undefined, true)
      .then(r => setResultados(r.content))
      .catch(() => { setResultados([]); setErro(true) })
      .finally(() => setLoading(false))
  }, [debouncedQ, open, q])

  const adicionar = (p: ProdutoResponse) => {
    onAdd(p)
    setQ('')
    setResultados([])
    setOpen(false)
  }

  // Leitor de código de barras digita o código e emite Enter — se houver exatamente 1 resultado
  // (ou correspondência exata de codigoBarras), adiciona direto, sem exigir clique.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    const exato = resultados.find(p => p.codigoBarras === q.trim())
    if (exato) { adicionar(exato); return }
    if (resultados.length === 1) adicionar(resultados[0])
  }

  return (
    <div ref={ref} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
        <Search size={18} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar produto por nome ou código de barras..."
        autoFocus
        className="h-[52px] w-full rounded-input border-[1.5px] border-line bg-white pl-[46px] pr-3.5 font-[inherit] text-[15px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-[58px] z-30 max-h-80 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.2)]">
          {loading ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
          ) : erro ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-danger-deep">Não foi possível buscar produtos.</div>
          ) : resultados.length === 0 ? (
            <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum produto encontrado</div>
          ) : resultados.map(p => (
            <button
              key={p.id}
              onClick={() => adicionar(p)}
              className="flex w-full items-center gap-[11px] rounded-[9px] border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
            >
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-teal/[0.12] text-teal">
                <Box size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-dark">{p.nome}</span>
                <span className="block text-xs text-muted">
                  {moeda(p.precoVenda ?? 0)} · estoque {p.estoqueAtual.toLocaleString('pt-BR')}
                </span>
              </span>
              <Plus size={16} className="flex-shrink-0 text-teal" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── AvisoEstoqueNegativoModal (RN-NOVA-2, mesmo padrão de Orçamento/Produção) ── */

function AvisoEstoqueNegativoModal({ open, avisos, onCancel, onConfirmar, confirmando }: {
  open: boolean; avisos: AvisoEstoqueNegativoResponse[]
  onCancel: () => void; onConfirmar: () => void; confirmando: boolean
}) {
  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      title="Estoque ficará negativo"
      icon={<AlertTriangle size={17} />}
      iconBg="rgba(224,92,58,0.10)"
      iconColor="#E05C3A"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={confirmando}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? 'Confirmando…' : 'Confirmar e concluir venda'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {avisos.map(a => (
          <div key={a.componenteId} className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] leading-[1.5] text-danger-deep">
            {a.mensagem}
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/* ── VendaConcluidaView ──────────────────────────────────────── */

function VendaConcluidaView({ venda, onNovaVenda }: { venda: VendaCaixaResponse; onNovaVenda: () => void }) {
  return (
    <div className="mx-auto flex max-w-[420px] flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check size={30} />
      </span>
      <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Venda concluída — {venda.identificador}</h1>
      <div className="mt-5 w-full rounded-card border border-[#F0EEE9] bg-white px-6 py-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        {venda.itens.map(item => (
          <div key={item.id} className="flex justify-between py-1.5 text-[13.5px]">
            <span className="text-body">{item.quantidade}x {item.produtoNome}</span>
            <span className="font-semibold text-dark">{moeda(item.subtotal)}</span>
          </div>
        ))}
        <div className="my-2.5 h-px bg-line" />
        <div className="flex justify-between text-[16px]">
          <span className="font-bold text-dark">Total</span>
          <span className="font-bold text-dark">{moeda(venda.total)}</span>
        </div>
        {venda.troco != null && venda.troco > 0 && (
          <div className="mt-1.5 flex justify-between text-[14px]">
            <span className="text-body">Troco</span>
            <span className="font-semibold text-teal">{moeda(venda.troco)}</span>
          </div>
        )}
      </div>
      <Button variant="primary" size="lg" fullWidth className="mt-6" onClick={onNovaVenda}>
        Nova venda
      </Button>
    </div>
  )
}

/* ── VendaCaixaView (#487) ───────────────────────────────────── */

function VendaCaixaView({ turno, onTurnoAtualizado }: {
  turno: CaixaTurnoResponse
  onTurnoAtualizado: () => void
}) {
  const { toast, setToast } = useToast()
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [descontoTipo, setDescontoTipo] = useState<TipoDescontoCaixa | null>(null)
  const [descontoValor, setDescontoValor] = useState('')
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[]>([])
  const [pagamentos, setPagamentos] = useState<Record<string, string>>({})
  const [avisos, setAvisos] = useState<AvisoEstoqueNegativoResponse[] | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [vendaConcluida, setVendaConcluida] = useState<VendaCaixaResponse | null>(null)
  const [modalSangria, setModalSangria] = useState(false)
  const [modalFechamento, setModalFechamento] = useState(false)
  const [modalVendas, setModalVendas] = useState(false)

  useEffect(() => {
    empresaService.listarMetodosPagamento().then(lista => setMetodos(lista.filter(m => m.ativo))).catch(() => {})
  }, [])

  const adicionarItem = (produto: ProdutoResponse) => {
    setItens(prev => {
      const existente = prev.find(i => i.produto.id === produto.id)
      if (existente) {
        return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, { produto, quantidade: 1 }]
    })
  }

  const alterarQuantidade = (produtoId: string, delta: number) => {
    setItens(prev => prev
      .map(i => i.produto.id === produtoId ? { ...i, quantidade: i.quantidade + delta } : i)
      .filter(i => i.quantidade > 0))
  }

  const removerItem = (produtoId: string) => setItens(prev => prev.filter(i => i.produto.id !== produtoId))

  const subtotal = itens.reduce((s, i) => s + i.quantidade * (i.produto.precoVenda ?? 0), 0)
  const descontoEmValor = !descontoTipo || !descontoValor ? 0
    : descontoTipo === 'PERCENTUAL' ? subtotal * (num(descontoValor) / 100)
    : num(descontoValor)
  const total = Math.max(0, subtotal - descontoEmValor)

  const somaPagamentos = Object.values(pagamentos).reduce((s, v) => s + num(v), 0)
  const trocoPreview = somaPagamentos - total

  const podeFinalizarBase = itens.length > 0 && Object.keys(pagamentos).some(id => num(pagamentos[id]) > 0)

  const construirRequest = (confirmarIds?: string[]): VendaCaixaRequest => ({
    itens: itens.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
    descontoTipo: descontoTipo ?? undefined,
    descontoValor: descontoTipo ? num(descontoValor) : undefined,
    pagamentos: Object.entries(pagamentos)
      .filter(([, v]) => num(v) > 0)
      .map(([metodoPagamentoId, v]) => ({ metodoPagamentoId, valor: num(v) })),
    confirmarEstoqueNegativoProdutoIds: confirmarIds,
  })

  const finalizar = async (confirmarIds?: string[]) => {
    setFinalizando(true)
    setErro(null)
    try {
      const resultado = await caixaService.registrarVenda(construirRequest(confirmarIds))
      if (ehAvisoEstoqueNegativo(resultado)) {
        setAvisos(resultado.avisos)
      } else {
        setAvisos(null)
        setVendaConcluida(resultado)
      }
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao registrar a venda. Tente novamente.'))
    } finally {
      setFinalizando(false)
    }
  }

  const novaVenda = () => {
    setItens([])
    setDescontoTipo(null)
    setDescontoValor('')
    setPagamentos({})
    setVendaConcluida(null)
    setErro(null)
  }

  if (vendaConcluida) {
    return <VendaConcluidaView venda={vendaConcluida} onNovaVenda={novaVenda} />
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Header do turno */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#F0EEE9] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 text-[13px] text-muted">
          <Clock size={15} className="text-teal" />
          Caixa aberto às {new Date(turno.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          <span className="text-dim">·</span>
          Fundo {moeda(turno.valorAbertura)}
        </div>
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" icon={<History size={14} />} onClick={() => setModalVendas(true)}>
            Vendas do turno
          </Button>
          <Button variant="ghost" size="sm" icon={<ArrowDownCircle size={14} />} onClick={() => setModalSangria(true)}>
            Sangria / Suprimento
          </Button>
          <Button variant="ghost" size="sm" icon={<Lock size={14} />} onClick={() => setModalFechamento(true)}>
            Fechar Caixa
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_380px]">
        {/* Coluna esquerda — busca + carrinho */}
        <div className="flex flex-col gap-4">
          <ProdutoSearch onAdd={adicionarItem} />

          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            {itens.length === 0 ? (
              <div className="px-6 py-14 text-center text-[14px] text-muted">
                Busque um produto acima para adicionar à venda.
              </div>
            ) : (
              <div className="flex flex-col">
                {itens.map(item => (
                  <div key={item.produto.id} className="flex animate-row-in items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold text-dark">{item.produto.nome}</div>
                      <div className="text-xs text-muted">{moeda(item.produto.precoVenda ?? 0)} / un</div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-line px-1">
                      <button aria-label={`Diminuir quantidade de ${item.produto.nome}`} onClick={() => alterarQuantidade(item.produto.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border-none bg-transparent text-dim hover:bg-cream">
                        <Minus size={13} />
                      </button>
                      <span className="w-7 text-center text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">{item.quantidade}</span>
                      <button aria-label={`Aumentar quantidade de ${item.produto.nome}`} onClick={() => alterarQuantidade(item.produto.id, 1)} className="grid h-7 w-7 place-items-center rounded-full border-none bg-transparent text-dim hover:bg-cream">
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="w-24 flex-shrink-0 text-right text-[14.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">
                      {moeda(item.quantidade * (item.produto.precoVenda ?? 0))}
                    </div>
                    <button onClick={() => removerItem(item.produto.id)} aria-label="Remover item" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] border-none bg-transparent text-[#BDB9B1] hover:bg-danger-bg hover:text-danger-deep">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita — desconto, totais, pagamento */}
        <div className="flex flex-col gap-4 rounded-card border border-[#F0EEE9] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between text-[14px]">
            <span className="text-body">Subtotal</span>
            <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(subtotal)}</span>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-body">Desconto</span>
              <div className="flex gap-[3px] rounded-[8px] bg-line-soft p-[2px]">
                {([[null, 'Sem'], ['PERCENTUAL', '%'], ['VALOR', 'R$']] as const).map(([v, l]) => (
                  <button
                    key={l}
                    onClick={() => setDescontoTipo(v)}
                    className={clsx(
                      'h-[26px] whitespace-nowrap rounded-[6px] border-none px-2.5 font-[inherit] text-[11.5px] font-semibold',
                      descontoTipo === v ? 'bg-white text-dark shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'bg-transparent text-dim'
                    )}
                  >{l}</button>
                ))}
              </div>
            </div>
            {descontoTipo && (
              descontoTipo === 'PERCENTUAL' ? (
                <div className="relative">
                  <input
                    value={descontoValor}
                    onChange={e => setDescontoValor(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    className={clsx(inputBase, 'h-10 pl-3.5 pr-8 text-right')}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-dim">%</span>
                </div>
              ) : (
                <MoneyInput value={descontoValor} onChange={setDescontoValor} />
              )
            )}
          </div>

          <div className="flex justify-between border-t border-line pt-3 text-[17px]">
            <span className="font-bold text-dark">Total</span>
            <span className="font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(total)}</span>
          </div>

          <div className="border-t border-line pt-4">
            <span className="mb-2.5 block text-[13px] font-semibold text-body">Pagamento</span>
            <div className="flex flex-col gap-2.5">
              {metodos.map(m => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <span className="w-[120px] flex-shrink-0 truncate text-[13.5px] font-medium text-body">
                    {rotuloMetodoPagamento(m.tipo, m.nome)}
                  </span>
                  <div className="flex-1">
                    <MoneyInput
                      value={pagamentos[m.id] ?? ''}
                      onChange={v => setPagamentos(prev => ({ ...prev, [m.id]: v }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            {trocoPreview > 0 && somaPagamentos > 0 && (
              <div className="mt-3 flex justify-between text-[13.5px]">
                <span className="text-body">Troco</span>
                <span className="font-semibold text-teal">{moeda(trocoPreview)}</span>
              </div>
            )}
          </div>

          {erro && <p className="text-[12.5px] font-medium text-danger-deep">{erro}</p>}

          <Button
            variant="primary" size="lg" fullWidth
            disabled={!podeFinalizarBase || finalizando}
            onClick={() => finalizar()}
          >
            {finalizando ? 'Finalizando…' : `Finalizar venda — ${moeda(total)}`}
          </Button>
        </div>
      </div>

      <SangriaSuprimentoModal open={modalSangria} onClose={() => setModalSangria(false)} onSaved={() => setToast('Movimento registrado com sucesso!')} />
      <FecharCaixaModal open={modalFechamento} onClose={() => setModalFechamento(false)} turno={turno} onFechado={onTurnoAtualizado} />
      <VendasDoTurnoModal
        open={modalVendas}
        onClose={() => setModalVendas(false)}
        turnoId={turno.id}
        onVendaCancelada={() => setToast('Venda cancelada — estoque revertido.')}
      />
      <AvisoEstoqueNegativoModal
        open={!!avisos}
        avisos={avisos ?? []}
        confirmando={finalizando}
        onCancel={() => setAvisos(null)}
        onConfirmar={() => finalizar(avisos?.map(a => a.componenteId))}
      />
      <Toast message={toast} />
    </div>
  )
}

/* ── CaixaPage ───────────────────────────────────────────────── */

export default function CaixaPage() {
  const [turno, setTurno] = useState<CaixaTurnoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregarTurno = () => {
    setLoading(true)
    setErro(null)
    caixaService.buscarTurnoAberto()
      .then(setTurno)
      .catch(err => setErro(extractApiError(err, 'Erro ao carregar o caixa.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarTurno() }, [])

  return (
    <AppLayout active="caixa" compact fullHeight>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-5 flex items-center gap-[15px]">
          <span className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[13px] bg-teal/10 text-teal">
            <Receipt size={22} />
          </span>
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Caixa</h1>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2.5 text-sm text-muted">
            <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
            Carregando…
          </div>
        ) : erro ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle size={28} className="text-danger-deep" />
            <p className="text-[14px] text-danger-deep">{erro}</p>
            <Button variant="ghost" onClick={carregarTurno}>Tentar novamente</Button>
          </div>
        ) : turno ? (
          <VendaCaixaView turno={turno} onTurnoAtualizado={carregarTurno} />
        ) : (
          <AbrirCaixaView onAberto={setTurno} />
        )}
      </div>
    </AppLayout>
  )
}
