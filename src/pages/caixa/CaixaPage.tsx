import { useState, useEffect, useCallback, useRef } from 'react'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, ModalShell, SegmentedControl, Spinner, Tag } from '../../components/ui'
import { ItemSearch, ItemLinha, ModalCustomizacoes, DescontoBlock, SectionCard, ModoToggle } from '../../components/venda'
import type { CustomizacaoLinha, LinhaVendaView } from '../../components/venda'
import Toast from '../../components/shared/Toast'
import {
  Wallet, Lock, Check, AlertTriangle, Receipt, Clock, History, Ban, ShoppingCart, Plus,
  ArrowDownCircle, ArrowUpCircle, Users, Search,
} from 'lucide-react'
import { caixaService } from '../../services/caixaService'
import { empresaService } from '../../services/empresaService'
import { produtoService } from '../../services/produtoService'
import { catalogoService } from '../../services/catalogoService'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { extractApiError } from '../../utils/apiError'
import { rotuloMetodoPagamento, ICON_TIPO_METODO_PAGAMENTO } from '../../constants/metodoPagamentoConfiguravel'
import type { MetodoPagamentoConfiguravelResponse, HorarioFuncionamento } from '../../types/empresa'
import type { ProdutoResponse } from '../../types/produto'
import type { ClienteResponse } from '../../types/cliente'
import type { ItemCatalogoBuscaResponse } from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import type {
  CaixaTurnoResponse, VendaCaixaResponse, FechamentoPreviaResponse,
  AvisoEstoqueNegativoResponse, VendaCaixaRequest,
} from '../../types/caixa'
import { ehAvisoEstoqueNegativo } from '../../types/caixa'

/**
 * #487/#488 (V0.12.0) — Caixa/PDV, Epic #416. Venda de balcão paralela ao Orçamento: sem
 * rascunho/aprovação, nasce concluída no mesmo ato (RN-NOVA-10). Visualmente separado de
 * Orçamento por design — poucos cliques, poucos campos.
 *
 * #502 — reconstruído sobre os componentes compartilhados de `components/venda/` (o mesmo
 * `ItemSearch`/`ItemLinha`/`ModalCustomizacoes`/`DescontoBlock` do Orçamento) em vez das
 * reimplementações locais que existiam antes (`ProdutoSearch`/`CustomizacaoPicker` próprios).
 */

const num = (s: string) => parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const paraCampoMoeda = (n: number) => n.toFixed(2).replace('.', ',')

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus'

const TIPO_DESCONTO_API: Record<'%' | 'R$', 'PERCENTUAL' | 'VALOR'> = { '%': 'PERCENTUAL', 'R$': 'VALOR' }

// Reabertura de RN-NOVA-1 (achado do teste manual) — item do carrinho vem de Produto direto OU
// ItemCatalogo (nunca os dois), com customizações fixas (do Catálogo, somente leitura) e ad-hoc
// (escolhidas na hora, para as duas origens). `key` identifica a linha no carrinho (produtoId ou
// itemCatalogoId) — nunca reaproveitar `produtoId` puro, pois duas linhas de origem diferente
// podem apontar pro mesmo Produto principal.
interface ItemCarrinho extends LinhaVendaView {
  key: string
  /** Customizações fixas do item de Catálogo — somente leitura, o Backend as expande
   *  automaticamente ao persistir (nunca vão no payload). Separadas de `customs` (editável via
   *  `ModalCustomizacoes`, sempre ad-hoc) porque a UI trava a remoção das fixas — decisão da
   *  reabertura de RN-NOVA-1, #487. */
  customsFixas: CustomizacaoLinha[]
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

// #506 (V0.12.0) — aviso de abertura fora do horário configurado; nunca bloqueia (mesma regra do
// backend, RN de horário de funcionamento: avisa, não impede). `diaSemana` é ISO-8601
// (1=segunda...7=domingo) — `Date#getDay()` usa 0=domingo, convertido abaixo.
function calcularAvisoHorario(horarios: HorarioFuncionamento[] | undefined, agora: Date): string | null {
  if (!horarios || horarios.length === 0) return null
  const diaISO = agora.getDay() === 0 ? 7 : agora.getDay()
  const hoje = horarios.find(h => h.diaSemana === diaISO)
  if (!hoje) return null
  if (hoje.fechado) return 'Hoje é um dia configurado como fechado no horário de funcionamento.'
  if (!hoje.horaAbertura || !hoje.horaFechamento) return null
  const agoraHHmm = agora.toTimeString().slice(0, 5)
  if (agoraHHmm < hoje.horaAbertura || agoraHHmm >= hoje.horaFechamento) {
    return `Fora do horário configurado para hoje (${hoje.horaAbertura} às ${hoje.horaFechamento}).`
  }
  return null
}

function AbrirCaixaView({ onAberto }: { onAberto: (t: CaixaTurnoResponse) => void }) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoHorario, setAvisoHorario] = useState<string | null>(null)

  useEffect(() => {
    empresaService.getEmpresa()
      .then(emp => setAvisoHorario(calcularAvisoHorario(emp?.horarios, new Date())))
      .catch(() => {})
  }, [])

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
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center rounded-card border border-[#F0EEE9] bg-white px-9 py-11 text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
          <Wallet size={30} />
        </span>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Abrir o Caixa</h1>
        <p className="mt-2 mb-7 text-[14px] leading-[1.5] text-muted">
          Informe o valor em dinheiro que está na gaveta agora para começar a registrar vendas.
        </p>
        {avisoHorario && (
          <div className="mb-5 flex w-full items-start gap-2.5 rounded-input border border-orange/30 bg-orange/[0.06] px-3.5 py-3 text-left">
            <AlertTriangle size={15} className="mt-px flex-shrink-0 text-warning-alt" />
            <p className="m-0 text-[12.5px] leading-[1.5] text-warning-alt">{avisoHorario}</p>
          </div>
        )}
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
        <SegmentedControl
          options={[
            { value: 'SANGRIA' as const, label: 'Sangria (retirada)' },
            { value: 'SUPRIMENTO' as const, label: 'Suprimento (entrada)' },
          ]}
          value={tipo}
          onChange={setTipo}
          height="h-[38px]"
          textSize="text-[13px]"
        />
        <Field label="Valor" size="md">
          <MoneyInput value={valor} onChange={setValor} autoFocus />
        </Field>
        <Field label="Motivo" size="md">
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo (mínimo 30 caracteres)"
            className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
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
  const [justificativa, setJustificativa] = useState('')
  const [previa, setPrevia] = useState<FechamentoPreviaResponse | null>(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<CaixaTurnoResponse | null>(null)

  useEffect(() => {
    if (!open) return
    setValor(''); setJustificativa(''); setErro(null); setResultado(null); setPrevia(null)
    setCarregandoPrevia(true)
    caixaService.previaFechamento(turno.id)
      .then(setPrevia)
      .catch(() => setErro('Não foi possível calcular o valor esperado. Tente novamente.'))
      .finally(() => setCarregandoPrevia(false))
  }, [open, turno.id])

  // Prévia local, só pra decidir se mostra o campo de justificativa — o backend revalida no envio,
  // nunca confia nesse cálculo (mesmo espírito do padrão `simular-*`).
  const temDiferenca = previa != null && valor.trim() !== ''
    && Math.round((num(valor) - previa.valorEsperado) * 100) !== 0
  const justificativaCurta = justificativa.trim().length > 0 && justificativa.trim().length < 30

  const fechar = async () => {
    if (temDiferenca && justificativa.trim().length < 30) {
      setErro('Como há diferença entre o valor contado e o esperado, a justificativa é obrigatória (mínimo 30 caracteres).')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const fechado = await caixaService.fecharTurno(turno.id, {
        valorFechamentoInformado: num(valor),
        justificativa: temDiferenca ? justificativa.trim() : undefined,
      })
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
            <Button variant="primary" onClick={fechar} disabled={salvando || carregandoPrevia}>{salvando ? 'Fechando…' : 'Fechar caixa'}</Button>
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
          {resultado.fechamentoJustificativa && (
            <div className="mt-1 rounded-xl border border-line bg-cream px-3.5 py-3 text-[13px] leading-[1.5] text-body">
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">Justificativa</span>
              {resultado.fechamentoJustificativa}
            </div>
          )}
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
          {carregandoPrevia && (
            <div className="flex items-center gap-2 text-[12.5px] text-muted">
              <Spinner size={14} color="#2A9D8F" trackColor="#EFEDE8" /> Calculando valor esperado…
            </div>
          )}
          {temDiferenca && (
            <div className="animate-[fadeUp_.2s_ease_both]">
              <Field label="Justificativa" size="md">
                <textarea
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Descreva o motivo da diferença (mínimo 30 caracteres)"
                  className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
                />
                <span className={clsx('mt-1.5 block text-xs', justificativaCurta ? 'text-warning-alt' : 'text-muted')}>
                  {justificativa.trim().length}/30 caracteres mínimos
                </span>
              </Field>
            </div>
          )}
          {erro && <p className="text-[12.5px] font-medium text-danger-deep">{erro}</p>}
        </div>
      )}
    </ModalShell>
  )
}

/* ── VendasDoTurnoModal (#487, RN-NOVA-4/11 — cancelamento só com turno aberto) ──
   #505/#497 — cancelamento agora exige senha (reautenticação) e a escolha explícita de o
   estoque voltar ou não, além do motivo (mín. 30 caracteres, mesmo padrão de Sangria). ────── */

function VendasDoTurnoModal({ open, onClose, turnoId, onVendaCancelada }: {
  open: boolean; onClose: () => void; turnoId: string; onVendaCancelada: () => void
}) {
  const [vendas, setVendas] = useState<VendaCaixaResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelando, setCancelando] = useState<VendaCaixaResponse | null>(null)
  const [motivo, setMotivo] = useState('')
  const [senha, setSenha] = useState('')
  const [retornarEstoque, setRetornarEstoque] = useState(true)
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
    if (open) { carregar(); setCancelando(null); setMotivo(''); setSenha(''); setRetornarEstoque(true); setErro(null) }
  }, [open, turnoId])

  const motivoCurto = motivo.trim().length > 0 && motivo.trim().length < 30

  const confirmarCancelamento = async () => {
    if (!cancelando) return
    if (motivo.trim().length < 30) {
      setErro('O motivo do cancelamento deve ter no mínimo 30 caracteres.')
      return
    }
    if (!senha) {
      setErro('Confirme sua senha para cancelar a venda.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await caixaService.cancelarVenda(cancelando.id, { cancelamentoMotivo: motivo.trim(), senha, retornarEstoque })
      setCancelando(null)
      setMotivo('')
      setSenha('')
      setRetornarEstoque(true)
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
            Confira se o estoque deve voltar antes de confirmar. Para corrigir um erro, cancele e registre uma nova venda.
          </div>
          <Field label="Motivo do cancelamento" size="md">
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo (mínimo 30 caracteres)"
              className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-3 font-[inherit] text-[14px] leading-[1.5] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
            />
            <span className={clsx('mt-1.5 block text-xs', motivoCurto ? 'text-warning-alt' : 'text-muted')}>
              {motivo.trim().length}/30 caracteres mínimos
            </span>
          </Field>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-body">O estoque deve voltar?</span>
            <SegmentedControl
              options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
              value={retornarEstoque}
              onChange={setRetornarEstoque}
              height="h-10"
            />
            <p className="mt-1.5 text-xs text-muted">
              {retornarEstoque
                ? 'O estoque dos itens vendidos será devolvido.'
                : 'O estoque não volta — use quando o produto foi perdido ou danificado.'}
            </p>
          </div>
          <Field label="Confirme sua senha" size="md">
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Sua senha de login"
              className="h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
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

/* ── ModalEscolherFormaPagamento (#504/#506) ─────────────────────
   "Escolher forma de pagamento" abre esta modal com todos os métodos ativos; a usuária marca um
   ou mais e confirma — cada um marcado vira uma linha com campo de valor na tela principal
   (divisão entre métodos preservada, mesmo mecanismo de sempre).

   Ao confirmar a seleção, entra numa fila de passos extras — mesmo padrão "modal sequencial, uma
   pergunta por vez" já usado no sistema (ModalCustomizacoes/ModalConfirmacaoVinculoSequencial):
   - Cartão de Crédito com parcelamento configurado (maxParcelas > 1) sempre pergunta "Em quantas
     parcelas?" (entrevista com o usuário, V0.12.0). A taxa é só registro — resolvida e congelada
     pelo Backend (VendaCaixaService#resolverTaxaAplicada), nunca calculada aqui.
   - Dinheiro pergunta "Vai ter troco?" só quando é o ÚNICO método marcado — combinado com split
     (ex.: Dinheiro + Pix) mantém o campo de valor livre de sempre na tela principal, porque nesse
     caso "quanto do total este método cobre" e "quanto foi recebido em espécie" deixam de ser a
     mesma pergunta, e a entrevista não cobriu esse cruzamento — decisão de escopo, não descuido. */

type PassoPagamento =
  | { tipo: 'troco'; metodo: MetodoPagamentoConfiguravelResponse }
  | { tipo: 'parcelas'; metodo: MetodoPagamentoConfiguravelResponse }

function ModalEscolherFormaPagamento({ open, onClose, metodos, selecionados, total, onConfirmar }: {
  open: boolean
  onClose: () => void
  metodos: MetodoPagamentoConfiguravelResponse[]
  selecionados: string[]
  total: number
  onConfirmar: (ids: string[], parcelas: Record<string, number>, valores: Record<string, string>) => void
}) {
  const [marcados, setMarcados] = useState<string[]>(selecionados)
  const [fila, setFila] = useState<PassoPagamento[] | null>(null)
  const [parcelasEscolhidas, setParcelasEscolhidas] = useState<Record<string, number>>({})
  const [valoresEscolhidos, setValoresEscolhidos] = useState<Record<string, string>>({})
  // #512 (achado do teste manual) — "Não" vem pré-selecionado: é o caminho mais comum (pagamento
  // exato), então confirmar de cara sem precisar escolher nada já cobre o caso rápido.
  const [temTroco, setTemTroco] = useState(false)
  const [totalRecebido, setTotalRecebido] = useState('')

  useEffect(() => {
    if (!open) return
    setMarcados(selecionados)
    setFila(null)
    setParcelasEscolhidas({})
    setValoresEscolhidos({})
    setTemTroco(false)
    setTotalRecebido('')
  }, [open, selecionados])

  const toggle = (id: string) =>
    setMarcados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const iniciarPassos = () => {
    const passos: PassoPagamento[] = []
    const dinheiro = metodos.find(m => marcados.includes(m.id) && m.tipo === 'DINHEIRO')
    if (dinheiro && marcados.length === 1) passos.push({ tipo: 'troco', metodo: dinheiro })
    for (const id of marcados) {
      const m = metodos.find(x => x.id === id)
      if (m && m.tipo === 'CARTAO_CREDITO' && (m.maxParcelas ?? 1) > 1) passos.push({ tipo: 'parcelas', metodo: m })
    }
    if (passos.length === 0) {
      onConfirmar(marcados, {}, {})
      onClose()
      return
    }
    setFila(passos)
  }

  const passoAtual = fila && fila.length > 0 ? fila[0] : null

  const avancar = (parcela?: number, valor?: string) => {
    const proxParcelas = parcela !== undefined && passoAtual
      ? { ...parcelasEscolhidas, [passoAtual.metodo.id]: parcela } : parcelasEscolhidas
    const proxValores = valor !== undefined && passoAtual
      ? { ...valoresEscolhidos, [passoAtual.metodo.id]: valor } : valoresEscolhidos
    setParcelasEscolhidas(proxParcelas)
    setValoresEscolhidos(proxValores)
    const resto = fila!.slice(1)
    if (resto.length === 0) {
      onConfirmar(marcados, proxParcelas, proxValores)
      onClose()
    } else {
      setFila(resto)
      setTemTroco(false)
      setTotalRecebido('')
    }
  }

  if (passoAtual?.tipo === 'troco') {
    const nome = rotuloMetodoPagamento(passoAtual.metodo.tipo, passoAtual.metodo.nome)
    return (
      <ModalShell
        open={open}
        onClose={onClose}
        title={`${nome} — vai ter troco?`}
        subtitle={`Total da venda: ${moeda(total)}`}
        icon={<Wallet size={17} />}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={temTroco && num(totalRecebido) < total}
              onClick={() => avancar(undefined, temTroco ? totalRecebido : paraCampoMoeda(total))}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <SegmentedControl
            options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
            value={temTroco}
            onChange={setTemTroco}
            height="h-11"
          />
          {temTroco && (
            <div className="animate-[fadeUp_.2s_ease_both]">
              <span className="mb-1.5 block text-[13px] font-semibold text-body">Total recebido</span>
              <MoneyInput value={totalRecebido} onChange={setTotalRecebido} autoFocus size="lg" />
              {num(totalRecebido) >= total && num(totalRecebido) > 0 && (
                <p className="mt-1.5 text-[12.5px] font-medium text-teal">Troco: {moeda(num(totalRecebido) - total)}</p>
              )}
            </div>
          )}
        </div>
      </ModalShell>
    )
  }

  if (passoAtual?.tipo === 'parcelas') {
    const m = passoAtual.metodo
    const nome = rotuloMetodoPagamento(m.tipo, m.nome)
    const max = m.maxParcelas ?? 1
    const escolhida = parcelasEscolhidas[m.id] ?? 1
    return (
      <ModalShell
        open={open}
        onClose={onClose}
        title={`${nome} — em quantas parcelas?`}
        subtitle="A taxa da maquininha é só registro — não muda o valor cobrado do cliente."
        icon={<Wallet size={17} />}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={() => avancar(escolhida)}>Confirmar</Button>
          </div>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setParcelasEscolhidas(prev => ({ ...prev, [m.id]: p }))}
              className={clsx(
                'flex h-11 items-center justify-center rounded-input border-[1.5px] font-[inherit] text-[13.5px] font-semibold transition-colors duration-150',
                escolhida === p ? 'border-teal bg-teal/[0.08] text-teal' : 'border-line bg-white text-body'
              )}
            >
              {p}x
            </button>
          ))}
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Forma de pagamento"
      subtitle="O valor de cada método é informado na tela principal"
      icon={<Wallet size={17} />}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={iniciarPassos} disabled={marcados.length === 0}>
            OK{marcados.length > 0 ? ` (${marcados.length})` : ''}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {metodos.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">
            Nenhum método de pagamento ativo. Configure em Configurações → Métodos de Pagamento.
          </div>
        ) : metodos.map(m => {
          const on = marcados.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={clsx(
                'flex items-center gap-3 rounded-input border-[1.5px] px-3.5 py-3 text-left font-[inherit] transition-colors duration-150',
                on ? 'border-teal/40 bg-teal/[0.06]' : 'border-line bg-white'
              )}
            >
              <span className={clsx(
                'grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
                on ? 'border-teal bg-teal' : 'border-[#D4D0C8] bg-transparent'
              )}>
                {on && <Check width={12} height={12} stroke="#fff" strokeWidth={3} />}
              </span>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-cream text-teal">
                {ICON_TIPO_METODO_PAGAMENTO[m.tipo]}
              </span>
              <span className="text-[14.5px] font-medium text-dark">{rotuloMetodoPagamento(m.tipo, m.nome)}</span>
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}

/* ── VendaConcluidaModal (#504) ──────────────────────────────────
   Antes era uma view que substituía a tela inteira, escondendo o cabeçalho do turno junto
   (Sangria/Fechar Caixa ficavam inacessíveis até "Nova venda"). Virou ModalShell — o cabeçalho
   continua montado por trás, só fica inacessível enquanto a modal está aberta (igual qualquer
   outra modal do sistema), não até a próxima venda começar. */

function VendaConcluidaModal({ venda, onNovaVenda }: {
  venda: VendaCaixaResponse | null
  onNovaVenda: () => void
}) {
  return (
    <ModalShell
      open={!!venda}
      onClose={onNovaVenda}
      title={venda ? `Venda concluída — ${venda.identificador}` : 'Venda concluída'}
      icon={<Check size={17} />}
      iconBg="rgba(31,138,91,0.10)"
      iconColor="#1F8A5B"
      footer={<Button variant="primary" fullWidth onClick={onNovaVenda}>Nova venda</Button>}
    >
      {venda && (
        <div className="flex flex-col gap-1">
          {venda.itens.map(item => (
            <div key={item.id}>
              <div className="flex justify-between py-1.5 text-[13.5px]">
                <span className="text-body">{item.quantidade}x {item.produtoNome}</span>
                <span className="font-semibold text-dark">{moeda(item.subtotal)}</span>
              </div>
              {item.customizacoes.map(c => (
                <div key={c.id} className="flex items-baseline justify-between gap-2 py-0.5 pl-3 text-[12px] text-muted">
                  <span className="min-w-0 truncate">+ {c.quantidade}x {c.produtoNome}</span>
                  <span className="flex-shrink-0">{moeda(c.subtotal)}</span>
                </div>
              ))}
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
      )}
    </ModalShell>
  )
}

/* ── ModalSelecionarCliente (#513, layout) ────────────────────────
   Cliente da venda por botão + modal de seleção única — no lugar do campo de busca inline (mesmo
   `ClienteSelect` do Orçamento). Decisão de layout isolada do Caixa (meta: caber sem rolagem),
   não uma migração do padrão compartilhado — Orçamento continua com `ClienteSelect` como está,
   aprovado e em uso. */

function ModalSelecionarCliente({ open, onClose, onSelect }: {
  open: boolean
  onClose: () => void
  onSelect: (c: ClienteResponse) => void
}) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<ClienteResponse[]>([])
  const debouncedQ = useDebouncedValue(q, 300)

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    if (!open || debouncedQ !== q) return
    clienteService.listar(0, 20, debouncedQ.trim() || undefined)
      .then(data => setResultados(data.content))
      .catch(() => setResultados([]))
  }, [open, debouncedQ, q])

  return (
    <ModalShell open={open} onClose={onClose} title="Selecionar cliente" icon={<Users size={17} />}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
            <Search size={17} />
          </span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
            placeholder="Buscar por nome ou telefone..."
            className="h-11 w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
          />
        </div>
        <div className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">Nenhum cliente encontrado.</div>
          ) : resultados.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); onClose() }}
              className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left font-[inherit] transition-colors duration-100 hover:bg-cream"
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-teal/[0.12] font-bold text-teal">
                {c.nome.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold text-dark">{c.nome}</div>
                <div className="text-[12.5px] text-muted">{c.whatsapp || 'Sem telefone'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}

/* ── VendaCaixaView (#487, reconstruído sobre os compartilhados em #502) ────── */

function VendaCaixaView({ turno, onTurnoAtualizado }: {
  turno: CaixaTurnoResponse
  onTurnoAtualizado: () => void
}) {
  const { toast, setToast } = useToast()
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [modoItens, setModoItens] = useState<'tudo' | 'catalogo' | 'produto'>('tudo')
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [catalogoFiltro, setCatalogoFiltro] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const buscaWrapRef = useRef<HTMLDivElement>(null)
  const [modalCustomItem, setModalCustomItem] = useState<ItemCarrinho | null>(null)
  const [descTipo, setDescTipo] = useState<'%' | 'R$'>('%')
  const [descValor, setDescValor] = useState('')
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[]>([])
  const [pagamentosSelecionados, setPagamentosSelecionados] = useState<string[]>([])
  const [modalFormaPagamento, setModalFormaPagamento] = useState(false)
  const [pagamentos, setPagamentos] = useState<Record<string, string>>({})
  const [parcelasPorMetodo, setParcelasPorMetodo] = useState<Record<string, number>>({})
  const [avisos, setAvisos] = useState<AvisoEstoqueNegativoResponse[] | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [vendaConcluida, setVendaConcluida] = useState<VendaCaixaResponse | null>(null)
  const [modalSangria, setModalSangria] = useState(false)
  const [modalFechamento, setModalFechamento] = useState(false)
  const [modalVendas, setModalVendas] = useState(false)

  useEffect(() => {
    empresaService.listarMetodosPagamento().then(lista => setMetodos(lista.filter(m => m.ativo))).catch(() => {})
    catalogoService.listar({ size: 100 }).then(data => setCatalogos(data.content)).catch(() => setCatalogos([]))
  }, [])

  // Fecha o painel de busca ao clicar fora — o próprio ItemSearch chama `onClose` ao selecionar
  // um item ou perder o foco do clique fora dele (mesmo padrão do Orçamento, ORC-030).
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (buscaWrapRef.current && !buscaWrapRef.current.contains(e.target as Node)) setBuscaAberta(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Buscas do <ItemSearch> compartilhado — precisam ser estáveis (useCallback): entram na
  // dependência do fetcher paginado, uma função nova a cada render dispara busca em laço infinito.
  const buscarItensCatalogoCaixa = useCallback(
    (busca: string | undefined, page: number, size: number) => caixaService.buscarItensCatalogo(busca, page, size),
    []
  )
  const buscarProdutosCaixa = useCallback(
    (busca?: string) => produtoService.listar(0, 8, undefined, busca, true, true).then(d => d.content),
    []
  )

  const handleAddCatalogoItem = (item: ItemCatalogoBuscaResponse) => {
    setItens(prev => {
      const existente = prev.find(i => i.itemCatalogoId === item.id)
      if (existente) return prev.map(i => i.key === existente.key ? { ...i, qtd: i.qtd + 1 } : i)
      // V0.13.0 — componentes do catálogo deixaram de ser precificados individualmente (RN-NOVA-2):
      // o preço do item já reflete tudo, não há mais "customizações fixas" separadas para somar.
      // Não há mais estoque/fracionável agregado na busca (item pode ter N componentes) — achado
      // registrado em decisoes-catalogo.md.
      return [...prev, {
        key: item.id, itemCatalogoId: item.id, nome: item.nome,
        preco: item.precoVenda, qtd: 1, customs: [], customsFixas: [],
        catalogoNome: item.catalogoNome,
        permitirEstoqueNegativo: true, estoqueAtual: null,
        fracionavel: item.algumComponenteNaoFracionavel ? false : undefined,
      }]
    })
  }

  const handleAddProdutoAvulso = (produto: ProdutoResponse) => {
    setItens(prev => {
      const existente = prev.find(i => i.produtoId === produto.id && !i.itemCatalogoId)
      if (existente) return prev.map(i => i.key === existente.key ? { ...i, qtd: i.qtd + 1 } : i)
      return [...prev, {
        key: produto.id, produtoId: produto.id, nome: produto.nome,
        preco: produto.precoVenda ?? 0, qtd: 1, customs: [], customsFixas: [],
        produtoIdentificador: produto.identificador,
        permitirEstoqueNegativo: produto.permitirEstoqueNegativo, estoqueAtual: produto.estoqueAtual,
        fracionavel: produto.fracionavel ?? undefined,
      }]
    })
  }

  const removerItem = (key: string) => setItens(prev => prev.filter(i => i.key !== key))

  // Subtotal de uma linha inclui customizações fixas E ad-hoc, mas a quantidade da customização é
  // sempre independente da quantidade do item pai (confirmado contra o Backend — VendaCaixaService/
  // OrcamentoService calculam `precoUnitario * quantidadeDaCustomizacao`, nunca multiplicada pela
  // quantidade do item; a pré-visualização do Orçamento faz essa multiplicação extra por engano —
  // achado desta sessão, não replicado aqui).
  const subtotalItem = (i: ItemCarrinho) => i.preco * i.qtd
    + i.customs.reduce((s, c) => s + c.valor * c.qtd, 0)
    + i.customsFixas.reduce((s, c) => s + c.valor * c.qtd, 0)

  const subtotal = itens.reduce((s, i) => s + subtotalItem(i), 0)
  const descNum = num(descValor)
  const descontoAplicado = descTipo === '%' ? subtotal * descNum / 100 : Math.min(descNum, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)

  const somaPagamentos = Object.values(pagamentos).reduce((s, v) => s + num(v), 0)
  const trocoPreview = somaPagamentos - total

  const podeFinalizarBase = itens.length > 0 && Object.keys(pagamentos).some(id => num(pagamentos[id]) > 0)

  const confirmarFormaPagamento = (ids: string[], parcelas: Record<string, number>, valores: Record<string, string>) => {
    setPagamentosSelecionados(ids)
    setParcelasPorMetodo(prev => ({
      ...Object.fromEntries(Object.entries(prev).filter(([id]) => ids.includes(id))),
      ...parcelas,
    }))
    setPagamentos(prev => {
      const mantidos = Object.fromEntries(Object.entries(prev).filter(([id]) => ids.includes(id)))
      // Respostas da fila de passos (troco) já trazem o valor pronto. Fora isso, com um único
      // método marcado, o valor vem preenchido com o total da compra — cobre o caminho mais
      // comum (pagamento à vista num método só) sem exigir digitar de novo. Com 2+ métodos sem
      // resposta de troco, o valor fica em branco: dividir é decisão da usuária.
      const comRespostas = { ...mantidos, ...valores }
      if (ids.length === 1 && comRespostas[ids[0]] === undefined) {
        return { ...comRespostas, [ids[0]]: paraCampoMoeda(total) }
      }
      return comRespostas
    })
  }

  const construirRequest = (confirmarIds?: string[]): VendaCaixaRequest => ({
    clienteId: cliente?.id,
    itens: itens.map(i => ({
      // XOR: nunca os dois juntos — `produtoId` também fica preenchido num item de Catálogo (pra
      // exibição/agrupamento no carrinho), mas o Backend rejeita a linha se os dois vierem juntos.
      ...(i.itemCatalogoId ? { itemCatalogoId: i.itemCatalogoId } : { produtoId: i.produtoId }),
      quantidade: i.qtd,
      // Fixas nunca são enviadas — o Backend as expande automaticamente a partir do ItemCatalogo.
      customizacoes: i.customs.map(c => ({ produtoId: c.id, quantidade: c.qtd })),
    })),
    descontoTipo: descNum > 0 ? TIPO_DESCONTO_API[descTipo] : undefined,
    descontoValor: descNum > 0 ? descNum : undefined,
    pagamentos: Object.entries(pagamentos)
      .filter(([, v]) => num(v) > 0)
      .map(([metodoPagamentoId, v]) => ({
        metodoPagamentoId, valor: num(v),
        // Só enviado quando >1 — 1x é à vista, sem parcelamento de verdade (nem aceito pelo
        // Backend fora de Cartão de Crédito). A taxa aplicada é resolvida e congelada lá.
        ...(parcelasPorMetodo[metodoPagamentoId] > 1 ? { parcelas: parcelasPorMetodo[metodoPagamentoId] } : {}),
      })),
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
    setCliente(null)
    setItens([])
    setDescTipo('%')
    setDescValor('')
    setPagamentosSelecionados([])
    setPagamentos({})
    setParcelasPorMetodo({})
    setVendaConcluida(null)
    setErro(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header do turno — ícone/título + tags + ações num só bar (#513, layout: caber sem rolagem) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#F0EEE9] bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[11px] bg-teal/10 text-teal">
              <Receipt size={18} />
            </span>
            <h1 className="m-0 text-[17px] font-bold tracking-[-0.02em] text-dark">Caixa</h1>
          </div>
          {/* Escondido quando o bar quebra linha (mobile) — sobra órfão ao lado do título sem
              nada à direita para separar. */}
          <div className="hidden h-6 w-px flex-shrink-0 bg-line sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="green" icon={<Clock size={13} />}>
              Aberto às {new Date(turno.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Tag>
            <Tag tone="orange" icon={<Wallet size={13} />}>
              Fundo {moeda(turno.valorAbertura)}
            </Tag>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
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

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_380px]">
        {/* Coluna esquerda — cliente + itens (#511, mesmo padrão do Orçamento) */}
        <div className="flex flex-col gap-[18px]">
          <SectionCard step="1" label="Cliente" hint="Quem está comprando? (opcional)">
            <div className="px-5 pb-5 pt-3.5">
              <Button variant="secondary" fullWidth icon={<Users size={16} />} onClick={() => setModalCliente(true)}>
                {cliente ? 'Trocar cliente' : 'Selecionar cliente'}
              </Button>
              {cliente && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-teal/20 bg-teal/[0.07] px-3.5 py-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-teal/[0.15] text-[15px] font-bold text-teal">
                    {cliente.nome.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold text-dark">{cliente.nome}</div>
                    <div className="text-[12.5px] text-muted">{cliente.whatsapp || 'Sem telefone'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCliente(null)}
                    className="flex-shrink-0 cursor-pointer border-none bg-transparent px-1.5 py-1 font-[inherit] text-[12.5px] font-semibold text-teal"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard step="2" label="Itens da venda" hint="Produtos e quantidades do carrinho.">
            <div className="px-5 pt-3.5">
              <ModoToggle modo={modoItens} onChange={m => { setModoItens(m); setCatalogoFiltro('') }} />
            </div>

            {/* Campo de busca logo após Tudo/Catálogo/Produto — acima da lista/estado vazio
                (#513, layout: antes ficava embaixo do carrinho). */}
            <div ref={buscaWrapRef} className="relative px-5 pb-3.5 pt-3.5">
              <button
                type="button"
                onClick={() => setBuscaAberta(o => !o)}
                className="flex h-12 w-full items-center justify-center gap-[9px] rounded-input border-[1.5px] border-dashed border-teal/50 bg-teal/[0.05] font-[inherit] text-[14.5px] font-semibold text-teal transition-colors duration-150 hover:bg-teal/10"
              >
                <Plus size={16} /> Adicionar item
              </button>
              <ItemSearch
                open={buscaAberta}
                onClose={() => setBuscaAberta(false)}
                modo={modoItens}
                buscarItensCatalogo={buscarItensCatalogoCaixa}
                buscarProdutos={buscarProdutosCaixa}
                catalogos={catalogos}
                catalogoFiltro={catalogoFiltro}
                onSelectCatalogoFiltro={setCatalogoFiltro}
                onSelectCatalogoItem={handleAddCatalogoItem}
                onSelectProdutoAvulso={handleAddProdutoAvulso}
              />
            </div>

            <div className={clsx(itens.length > 0 && 'border-t border-line')}>
              {itens.length === 0 ? (
                <div className="mx-5 mb-5 mt-1 rounded-[14px] border-[1.5px] border-dashed border-line bg-cream px-6 py-10 text-center">
                  <span className="mb-3.5 inline-grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
                    <ShoppingCart size={17} />
                  </span>
                  <div className="text-[15.5px] font-semibold text-dark">Nenhum produto adicionado</div>
                  <p className="mb-0 mt-1.5 text-[13.5px] text-muted">Comece pelo botão acima.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {itens.map((item, i) => (
                    <div key={item.key} className={clsx(i > 0 && 'border-t border-line')}>
                      <ItemLinha
                        linha={item}
                        index={0}
                        onQtd={v => setItens(prev => prev.map(x => x.key === item.key ? { ...x, qtd: v } : x))}
                        onRemove={() => removerItem(item.key)}
                        onOpenCustom={() => setModalCustomItem(item)}
                      />
                      {item.customsFixas.length > 0 && (
                        <div className="-mt-2 flex flex-wrap gap-1.5 px-5 pb-4">
                          {item.customsFixas.map(c => (
                            <span key={c.id} className="inline-flex h-[26px] items-center gap-1 whitespace-nowrap rounded-full bg-teal/10 px-[9px] text-[11.5px] font-semibold text-teal">
                              + {c.nome} (inclusa)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Coluna direita — desconto, totais, pagamento */}
        <div className="flex flex-col gap-4 rounded-card border border-[#F0EEE9] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between text-[14px]">
            <span className="text-body">Subtotal</span>
            <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(subtotal)}</span>
          </div>

          <DescontoBlock
            tipo={descTipo}
            valor={descValor}
            onTipo={setDescTipo}
            onValor={setDescValor}
            descontoAplicado={descontoAplicado}
          />

          <div className="flex justify-between border-t border-line pt-3 text-[17px]">
            <span className="font-bold text-dark">Total</span>
            <span className="font-bold text-dark [font-variant-numeric:tabular-nums]">{moeda(total)}</span>
          </div>

          <div className="border-t border-line pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-body">Pagamento</span>
              {pagamentosSelecionados.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalFormaPagamento(true)}
                  className="border-none bg-transparent p-0 font-[inherit] text-[12px] font-semibold text-teal hover:underline"
                >
                  Alterar
                </button>
              )}
            </div>

            {pagamentosSelecionados.length === 0 ? (
              <Button variant="secondary" fullWidth icon={<Wallet size={16} />} onClick={() => setModalFormaPagamento(true)}>
                Escolher forma de pagamento
              </Button>
            ) : (
              <>
                <div className="flex flex-col overflow-hidden rounded-[11px] border border-line">
                  {pagamentosSelecionados.map(id => {
                    const m = metodos.find(x => x.id === id)
                    if (!m) return null
                    return (
                      <div key={id} className="flex items-center gap-3 border-b border-line bg-white px-3 py-2.5 last:border-b-0">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-cream text-teal">
                          {ICON_TIPO_METODO_PAGAMENTO[m.tipo]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-body">
                          {rotuloMetodoPagamento(m.tipo, m.nome)}
                          {parcelasPorMetodo[id] > 1 && (
                            <span className="ml-1.5 rounded-full bg-teal/10 px-1.5 py-0.5 text-[11px] font-semibold text-teal">
                              {parcelasPorMetodo[id]}x
                            </span>
                          )}
                        </span>
                        <div className="w-[120px] flex-shrink-0">
                          <MoneyInput
                            value={pagamentos[m.id] ?? ''}
                            onChange={v => setPagamentos(prev => ({ ...prev, [m.id]: v }))}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {trocoPreview > 0 && somaPagamentos > 0 && (
                  <div className="mt-3 flex justify-between text-[13.5px]">
                    <span className="text-body">Troco</span>
                    <span className="font-semibold text-teal">{moeda(trocoPreview)}</span>
                  </div>
                )}
              </>
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
        onVendaCancelada={() => setToast('Venda cancelada — estoque revertido conforme escolhido.')}
      />
      <AvisoEstoqueNegativoModal
        open={!!avisos}
        avisos={avisos ?? []}
        confirmando={finalizando}
        onCancel={() => setAvisos(null)}
        onConfirmar={() => finalizar(avisos?.map(a => a.componenteId))}
      />
      <ModalEscolherFormaPagamento
        open={modalFormaPagamento}
        onClose={() => setModalFormaPagamento(false)}
        metodos={metodos}
        selecionados={pagamentosSelecionados}
        total={total}
        onConfirmar={confirmarFormaPagamento}
      />
      {modalCustomItem && (
        <ModalCustomizacoes
          nomeItem={modalCustomItem.nome}
          customsIniciais={modalCustomItem.customs}
          comCalculadora={false}
          onClose={() => setModalCustomItem(null)}
          onConfirm={customs => {
            setItens(prev => prev.map(i => i.key === modalCustomItem.key ? { ...i, customs } : i))
            setModalCustomItem(null)
          }}
        />
      )}
      <VendaConcluidaModal venda={vendaConcluida} onNovaVenda={novaVenda} />
      <ModalSelecionarCliente open={modalCliente} onClose={() => setModalCliente(false)} onSelect={setCliente} />
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
    <AppLayout active="caixa" compact>
      <div className="flex flex-col">
        {/* #513 — quando há turno aberto, o ícone/título entra no mesmo bar de VendaCaixaView
            (tags + ações), então não duplica aqui. */}
        {!turno && (
          <div className="mb-5 flex items-center gap-[15px]">
            <span className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[13px] bg-teal/10 text-teal">
              <Receipt size={22} />
            </span>
            <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-dark">Caixa</h1>
          </div>
        )}

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
