import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, ModalShell, SegmentedControl } from '../../components/ui'
import {
  AlertCircle, AlertTriangle,
  Calendar, Wallet, DollarSign, FileText, StickyNote, ShoppingCart, Plus, Check, Factory,
} from 'lucide-react'
import { clienteService } from '../../services/clienteService'
import { produtoService } from '../../services/produtoService'
import { orcamentoService } from '../../services/orcamentoService'
import { catalogoService } from '../../services/catalogoService'
import Toast from '../../components/shared/Toast'
import type { ClienteResponse } from '../../types/cliente'
import type { ProdutoResponse } from '../../types/produto'
import type {
  OrcamentoRequest, MetodoPagamento, ItemCatalogoBuscaResponse,
  SimularAlertasOrcamentoItemRequest, SimulacaoEstoqueProdutoResponse, CriarProducaoVinculadaRequest,
} from '../../types/orcamento'
import type { CatalogoResponse } from '../../types/catalogo'
import type { AlertaInsumo } from '../../types/producao'
import { METODOS_PAGAMENTO } from '../../constants'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'
import ModalVincularProducao from '../../components/orcamento/ModalVincularProducao'
import SelecaoProducaoEstoque from '../../components/orcamento/SelecaoProducaoEstoque'
// Componentes de venda compartilhados com o Caixa (V0.12.0) — antes eram funções locais deste
// arquivo, o que levou o Caixa a reimplementar cada um deles do zero.
import {
  ItemSearch, ItemLinha, ModalCustomizacoes, ModalCalculadoraItem, DescontoBlock,
  ClienteSelect, SectionCard, ModoToggle,
  BRL, carregarCalculadoraAvulso, carregarCalculadoraCatalogo,
} from '../../components/venda'


// Símbolo exibido na UI ('%' | 'R$') é conceito distinto do valor aceito pela API
// (enum TipoDesconto do backend, ver TipoDesconto.java) — nunca enviar o símbolo direto.
const TIPO_DESCONTO_API: Record<'%' | 'R$', 'PERCENTUAL' | 'VALOR'> = { '%': 'PERCENTUAL', 'R$': 'VALOR' }

// #218 (RN-NOVA-8/9) — monta o corpo de POST /orcamentos/simular-alertas a partir dos itens em
// construção na tela; XOR itemCatalogoId/produtoId, mesmo critério de handleSubmit.
function toSimularItens(itens: Item[]): SimularAlertasOrcamentoItemRequest[] {
  return itens.map(it => it.itemCatalogoId
    ? { itemCatalogoId: it.itemCatalogoId, quantidade: it.qtd }
    : { produtoId: it.produtoId, quantidade: it.qtd })
}

interface Item {
  id: number
  nome: string
  qtd: number
  preco: number
  customs: { id: string; nome: string; valor: number; qtd: number }[]
  produtoId?: string
  produtoIdentificador?: string
  itemCatalogoId?: string
  catalogoNome?: string
  algumInsumoNaoFracionavel: boolean
  permitirEstoqueNegativo: boolean
  // V0.13.0 — null para item de origem Catálogo: com N componentes, deixou de existir um único
  // "estoque atual" para o item (achado, ver decisoes-orcamento.md/decisoes-catalogo.md).
  estoqueAtual: number | null
  // RN-NOVA-7 (V0.10.0, #461, reversão de RN-NOVA-6) — undefined quando a origem do item não
  // expõe o dado; badge só aparece quando o valor é conhecido de verdade.
  fracionavel?: boolean
}

// ── PrazoSection ───────────────────────────────────────────────────────────
function PrazoSection({
  temPrazoProducao, setTemPrazoProducao,
  prazoDias, setPrazoDias,
  inicioImediato, setInicioImediato,
  dataInicioEstimada, setDataInicioEstimada,
  error,
}: {
  temPrazoProducao: boolean
  setTemPrazoProducao: (v: boolean) => void
  prazoDias: string
  setPrazoDias: (v: string) => void
  inicioImediato: boolean
  setInicioImediato: (v: boolean) => void
  dataInicioEstimada: string
  setDataInicioEstimada: (v: string) => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-4">

      {/* Toggle Vai ter prazo de produção? */}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
            <Calendar size={18} />
          </span>
          <div>
            <div className="text-[14.5px] font-semibold text-dark">Vai ter prazo de produção?</div>
            <div className="mt-px text-[12.5px] text-muted">Define se este pedido tem data prevista de entrega.</div>
          </div>
        </div>
        <SegmentedControl
          options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
          value={temPrazoProducao}
          onChange={setTemPrazoProducao}
          height="h-10"
          optionWidth="w-[60px]"
          textSize="text-sm"
          className="flex-shrink-0"
        />
      </div>

      {temPrazoProducao && (
        <div className="flex flex-col gap-4 animate-[fadeUp_.2s_ease_both]">

          {/* Campo de dias */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={prazoDias}
              onChange={e => setPrazoDias(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="10"
              className={clsx(
                'h-[46px] w-[100px] rounded-input border-[1.5px] px-3.5 text-center font-[inherit] text-lg font-bold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                error ? 'border-danger' : 'border-line'
              )}
            />
            <span className="text-[15px] font-medium text-body">dias úteis</span>
          </div>
          {error && (
            <div className="flex items-center gap-[5px] text-[13px] text-danger">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Checkbox início */}
          <button
            type="button"
            onClick={() => setInicioImediato(!inicioImediato)}
            className={clsx(
              'flex items-start gap-2.5 rounded-xl border-[1.5px] px-[15px] py-[13px] text-left font-[inherit] transition-all duration-150',
              inicioImediato ? 'border-teal/30 bg-teal/[0.06]' : 'border-line bg-cream'
            )}
          >
            <span className={clsx(
              'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
              inicioImediato ? 'border-teal bg-teal' : 'border-[#D4D0C8] bg-transparent'
            )}>
              {inicioImediato && <Check width={12} height={12} stroke="#fff" strokeWidth={3} />}
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-dark">Início assim que aprovado</div>
              <div className="mt-0.5 text-[12.5px] text-muted">A produção começa logo após a aprovação do cliente.</div>
            </div>
          </button>

          {/* Data estimada */}
          {!inicioImediato && (
            <div className="animate-[fadeUp_.2s_ease_both]">
              <label className="block">
                <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                  <Calendar size={16} className="text-teal" /> Data estimada de início
                </span>
                <input
                  type="date"
                  value={dataInicioEstimada}
                  onChange={e => setDataInicioEstimada(e.target.value)}
                  className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
              </label>
              <p className="mb-0 mt-1.5 text-[12.5px] text-muted">
                Informe quando você estima começar a produção deste pedido.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  )
}

// ── PagamentoSection ───────────────────────────────────────────────────────
function PagamentoSection({
  metodoPagamento, setMetodoPagamento,
  metodoPagamentoObs, setMetodoPagamentoObs,
  ativo, setAtivo,
  tipo, setTipo,
  valor, setValor,
  sinalAplicado, restante,
  error,
}: {
  metodoPagamento: string
  setMetodoPagamento: (v: string) => void
  metodoPagamentoObs: string
  setMetodoPagamentoObs: (v: string) => void
  ativo: boolean
  setAtivo: (v: boolean) => void
  tipo: '%' | 'R$'
  setTipo: (v: '%' | 'R$') => void
  valor: string
  setValor: (v: string) => void
  sinalAplicado: number
  restante: number
  error?: string
}) {
  const obsCharCount = metodoPagamentoObs.length
  const obsInvalido = obsCharCount > 0 && obsCharCount < 50
  return (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-4">

      {/* MÉTODO DE PAGAMENTO */}
      <div>
        <div className="mb-3.5 flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
            <Wallet size={18} />
          </span>
          <div>
            <div className="text-[14.5px] font-semibold text-dark">Método de pagamento</div>
            <div className="mt-px text-[12.5px] text-muted">Como a cliente vai pagar.</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {METODOS_PAGAMENTO.map(m => {
            const on = metodoPagamento === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMetodoPagamento(m.id)}
                className={clsx(
                  'h-[38px] whitespace-nowrap rounded-full border-[1.5px] px-4 font-[inherit] text-[13.5px] font-semibold transition-all duration-150',
                  on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream'
                )}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {metodoPagamento === 'OUTRO' && (
          <div className="mt-3 animate-[fadeUp_.2s_ease_both]">
            <label className="block">
              <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
                <span>Descreva o método de pagamento <span className="text-orange">*</span></span>
                <span className={clsx('font-normal', obsCharCount >= 50 ? 'text-success' : 'text-muted')}>
                  {obsCharCount}/50 caracteres mín.
                </span>
              </span>
              <textarea
                value={metodoPagamentoObs}
                onChange={e => setMetodoPagamentoObs(e.target.value)}
                placeholder="Ex: cheque à vista, transferência internacional..."
                rows={3}
                className={clsx(
                  'w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                  obsInvalido ? 'border-[#F2B8A6]' : 'border-line'
                )}
              />
              {obsInvalido && (
                <div className="mt-1.5 flex items-center gap-[5px] text-[13px] text-danger">
                  <AlertCircle size={13} />
                  Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* DIVISOR */}
      <div className="h-px bg-line" />

      {/* SINAL */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-teal/10 text-teal">
              <DollarSign size={22} />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-dark">Cobrar entrada (sinal)?</div>
              <div className="mt-px text-[12.5px] text-muted">Garante o início da produção.</div>
            </div>
          </div>
          <SegmentedControl
            options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
            value={ativo}
            onChange={setAtivo}
            height="h-10"
            optionWidth="w-[60px]"
            textSize="text-sm"
            className="flex-shrink-0"
          />
        </div>

        {ativo && (
          <div className="mt-4 animate-[fadeUp_.25s_ease_both]">
            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedControl
                options={[{ value: '%', label: '%' }, { value: 'R$', label: 'R$' }]}
                value={tipo}
                onChange={setTipo}
                height="h-[46px]"
                optionWidth="w-[46px]"
                textSize="text-sm"
                className="flex-shrink-0"
              />
              <input
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                inputMode="decimal"
                min={0}
                placeholder={tipo === '%' ? '50' : '0,00'}
                className={clsx(
                  'h-[46px] min-w-0 flex-1 rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                  error ? 'border-danger' : 'border-line'
                )}
              />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-[5px] text-[13px] text-danger">
                <AlertCircle size={13} />
                {error}
              </div>
            )}
            <div className="mt-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-input border border-dashed border-teal/[0.35] bg-teal/[0.06] px-3.5 py-2.5">
                <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-teal">
                  <Wallet size={15} /> Sinal solicitado
                </span>
                <span className="text-[15px] font-bold text-teal [font-variant-numeric:tabular-nums]">
                  {BRL(sinalAplicado)}
                </span>
              </div>
              <div className="flex justify-between px-0.5 text-[13.5px] text-body">
                <span>Restante após sinal</span>
                <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">
                  {BRL(restante)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary ────────────────────────────────────────────────────────────────
function Summary({ subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit, loading, submitLabel, submitLabelLoading }: {
  subtotal: number
  descTipo: '%' | 'R$'
  descValor: string
  setDescTipo: (v: '%' | 'R$') => void
  setDescValor: (v: string) => void
  descontoAplicado: number
  total: number
  validade: string
  setValidade: (v: string) => void
  obs: string
  setObs: (v: string) => void
  sinalAtivo: boolean
  sinalAplicado: number
  restante: number
  onSubmit: () => void
  loading: boolean
  submitLabel: string
  submitLabelLoading: string
}) {
  return (
    <div className="overflow-hidden rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
          <FileText size={20} />
        </span>
        <h2 className="m-0 text-[15.5px] font-bold text-dark">Resumo do orçamento</h2>
      </div>
      <div className="flex flex-col gap-3.5 px-5 py-[18px]">
        <div className="flex justify-between text-[14.5px] text-body">
          <span>Subtotal</span>
          <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(subtotal)}</span>
        </div>

        <DescontoBlock
          tipo={descTipo}
          valor={descValor}
          onTipo={setDescTipo}
          onValor={setDescValor}
          descontoAplicado={descontoAplicado}
        />

        <div className="flex items-baseline justify-between rounded-xl border border-teal/[0.18] bg-teal/[0.08] px-4 py-3.5">
          <span className="text-[15px] font-semibold text-dark">Total</span>
          <span className="text-[26px] font-bold tracking-[-0.01em] text-teal [font-variant-numeric:tabular-nums]">{BRL(total)}</span>
        </div>

        {sinalAtivo && (
          <div className="-mt-0.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between rounded-input border border-dashed border-teal/[0.35] bg-teal/[0.06] px-3.5 py-2.5">
              <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-teal">
                <Wallet size={15} /> Sinal solicitado
              </span>
              <span className="text-[15px] font-bold text-teal [font-variant-numeric:tabular-nums]">{BRL(sinalAplicado)}</span>
            </div>
            <div className="flex justify-between px-0.5 text-[13.5px] text-body">
              <span>Restante após sinal</span>
              <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{BRL(restante)}</span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-[7px] whitespace-nowrap text-[13px] font-semibold text-body">
            <Calendar size={16} className="text-teal" /> Validade do orçamento
          </span>
          <input
            type="date" value={validade}
            onChange={e => setValidade(e.target.value)}
            className="h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-[7px] text-[13px] font-semibold text-body">
            <StickyNote size={15} /> Observações
          </span>
          <textarea
            value={obs} onChange={e => setObs(e.target.value)}
            rows={2} placeholder="Ex: Entrega combinada para 15/06"
            className="min-h-[64px] w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </label>

        <Button variant="primary" fullWidth size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? submitLabelLoading : submitLabel}
        </Button>
      </div>
    </div>
  )
}

// ── CriarOrcamentoPage ─────────────────────────────────────────────────────
export default function CriarOrcamentoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id
  const [carregandoEdicao, setCarregandoEdicao] = useState(editando)
  const [erroCarregarEdicao, setErroCarregarEdicao] = useState(false)
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [modalItem, setModalItem] = useState<Item | null>(null)
  const [descTipo, setDescTipo] = useState<'%' | 'R$'>('%')
  const [descValor, setDescValor] = useState('')
  const [metodoPagamento, setMetodoPagamento] = useState('PIX')
  const [metodoPagamentoObs, setMetodoPagamentoObs] = useState('')
  const [temPrazoProducao, setTemPrazoProducao] = useState(true)
  const [prazoDias, setPrazoDias] = useState('')
  const [prazoDiasError, setPrazoDiasError] = useState('')
  const [inicioImediato, setInicioImediato] = useState(true)
  const [dataInicioEstimada, setDataInicioEstimada] = useState('')
  const [sinalAtivo, setSinalAtivo] = useState(false)
  const [sinalTipo, setSinalTipo] = useState<'%' | 'R$'>('%')
  const [sinalValor, setSinalValor] = useState('')
  const [sinalError, setSinalError] = useState('')
  const [validade, setValidade] = useState('')
  const [obs, setObs] = useState('')
  const [productOpen, setProductOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modoItens, setModoItens] = useState<'tudo' | 'catalogo' | 'produto'>('tudo')
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [catalogoFiltro, setCatalogoFiltro] = useState('')
  // Buscas do <ItemSearch> compartilhado. Precisam ser estáveis: entram na dependência do fetcher
  // paginado e do efeito de busca lá dentro — função nova a cada render viraria busca em laço.
  const buscarItensCatalogoOrcamento = useCallback(
    (busca: string | undefined, page: number, size: number) =>
      orcamentoService.buscarItensCatalogo(catalogoFiltro || undefined, busca, page, size),
    [catalogoFiltro]
  )
  const buscarProdutosOrcamento = useCallback(
    (busca: string | undefined) =>
      produtoService.listar(0, 20, 'PRODUTO', busca, modoItens === 'produto').then(d => d.content),
    [modoItens]
  )
  // #218 (RN-NOVA-8/9/11) — última simulação de estoque conhecida por produtoId (não por item da
  // lista: o backend acumula quantidade quando o mesmo produto aparece em mais de um item).
  const [simulacoes, setSimulacoes] = useState<Record<string, SimulacaoEstoqueProdutoResponse>>({})
  const [pendentesAvanco, setPendentesAvanco] = useState<SimulacaoEstoqueProdutoResponse[] | null>(null)
  // RN-NOVA-11 (revisada, checkpoint em lote) — seleção de itens por checkbox na modal de
  // checkpoint, para acionar "Criar produção" uma única vez cobrindo todos os selecionados.
  const [selecionadosProducao, setSelecionadosProducao] = useState<Set<string>>(new Set())
  // RN-ORC-VINC-02 ponto 1 (P-F004) — sub-modal de "vincular a produção existente", embutida no
  // mesmo checkpoint acima. orcamentoCriadoId != null indica que o orçamento já foi persistido como
  // efeito da pré-visualização do vínculo (ver handleSimularVinculo).
  const [modalVincular, setModalVincular] = useState(false)
  const [orcamentoCriadoId, setOrcamentoCriadoId] = useState<string | null>(null)
  const [confirmandoVinculo, setConfirmandoVinculo] = useState(false)
  // RN-NOVA-12/13/14 (#375+308) — mini-formulário próprio de "Criar produção (N)" do checkpoint,
  // separado do ModalVincularProducao (que é !editando-only e cobre sempre todos os itens). Cobre
  // criação E edição: persiste o orçamento (POST ou PUT, conforme editando) antes de chamar
  // criar-producao-vinculada só com os produtoIds selecionados. edicaoPersistidaCheckpoint rastreia
  // se o PUT desta ação específica já aconteceu, pra decidir se o cancelamento deve navegar de volta
  // pro orçamento (RN-NOVA-14 ponto 2) — em edição, orcamentoCriadoId nunca é setado (id já existe).
  const [modalCriarProducaoCheckpoint, setModalCriarProducaoCheckpoint] = useState(false)
  const [formDataInicioProducaoCheckpoint, setFormDataInicioProducaoCheckpoint] = useState('')
  const [formDataTerminoProducaoCheckpoint, setFormDataTerminoProducaoCheckpoint] = useState('')
  const [formObsProducaoCheckpoint, setFormObsProducaoCheckpoint] = useState('')
  const [formErroProducaoCheckpoint, setFormErroProducaoCheckpoint] = useState<string | null>(null)
  const [criandoProducaoCheckpoint, setCriandoProducaoCheckpoint] = useState(false)
  const [edicaoPersistidaCheckpoint, setEdicaoPersistidaCheckpoint] = useState(false)
  const { toast, setToast } = useToast()
  const prodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    catalogoService.listar({ size: 100 }).then(data => setCatalogos(data.content)).catch(() => setCatalogos([]))
  }, [])

  // P-F007 (#312+318) — modo edição: carrega o orçamento existente (RN-NOVA-4/ORC-038) e
  // pré-preenche todo o formulário. `Item.id` local é sempre gerado de novo aqui (Date.now() + índice)
  // — nunca reaproveita o id do OrcamentoItemResponse, porque esse id é só chave de React local,
  // nunca enviada no payload (ver montarPayload) e nunca usada pra casar com a resposta da API; a
  // troca de produto de um item vira remover+adicionar no backend (id novo na resposta), mas isso é
  // transparente porque salvarOrcamento sempre navega para /orcamentos/{id} e a tela de Detalhe
  // busca os itens frescos da API.
  useEffect(() => {
    if (!editando || !id) return
    let cancelled = false
    setCarregandoEdicao(true)
    setErroCarregarEdicao(false)
    ;(async () => {
      try {
        const orc = await orcamentoService.buscarPorId(id)
        const cli = await clienteService.buscarPorId(orc.clienteId)
        if (cancelled) return
        setCliente(cli)
        setItems(orc.itens.map((it, i) => ({
          id: Date.now() + i,
          nome: it.nomeProduto,
          qtd: it.quantidade,
          preco: it.precoUnitario,
          customs: it.customizacoes.map(c => ({ id: c.produtoId, nome: c.nomeProduto, valor: c.precoUnitario, qtd: c.quantidade })),
          produtoId: it.produtoId ?? undefined,
          itemCatalogoId: it.itemCatalogoId,
          catalogoNome: it.catalogoNome,
          algumInsumoNaoFracionavel: it.algumInsumoNaoFracionavel,
          permitirEstoqueNegativo: it.permitirEstoqueNegativo,
          estoqueAtual: it.estoqueAtual,
          fracionavel: it.fracionavel ?? undefined,
        })))
        setMetodoPagamento(orc.metodoPagamento)
        setMetodoPagamentoObs(orc.metodoPagamentoObs || '')
        setTemPrazoProducao(orc.prazoProducaoDias != null)
        setPrazoDias(orc.prazoProducaoDias != null ? String(orc.prazoProducaoDias) : '')
        setInicioImediato(orc.inicioAssimQueAprovado)
        setDataInicioEstimada(orc.dataInicioEstimada || '')
        setSinalAtivo(orc.sinalAtivo)
        setSinalTipo(orc.percentualSinal != null ? '%' : 'R$')
        setSinalValor(orc.percentualSinal != null ? String(orc.percentualSinal) : orc.valorSinal != null ? String(orc.valorSinal) : '')
        setDescTipo(orc.tipoDesconto === 'VALOR' ? 'R$' : '%')
        setDescValor(orc.descontoValor ? String(orc.descontoValor) : '')
        setValidade(orc.dataValidade ? orc.dataValidade.slice(0, 10) : '')
        setObs(orc.observacoes || '')
      } catch (err) {
        console.error('Erro ao carregar orçamento para edição:', err)
        if (!cancelled) setErroCarregarEdicao(true)
      } finally {
        if (!cancelled) setCarregandoEdicao(false)
      }
    })()
    return () => { cancelled = true }
  }, [editando, id])

  // RN-NOVA-11 — reconsulta estoque sempre que a lista de itens muda (adicionar/remover/alterar
  // quantidade), para que `EstoqueTags`/aviso inline nunca fiquem presos ao snapshot da adição.
  const itensAssinatura = items.map(it => `${it.id}:${it.qtd}`).join(',')
  useEffect(() => {
    if (items.length === 0) {
      setSimulacoes({})
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      orcamentoService.simularEstoque(toSimularItens(items))
        .then(data => {
          if (cancelled) return
          setSimulacoes(Object.fromEntries(data.map(d => [d.produtoId, d])))
        })
        .catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensAssinatura])

  const subtotal = items.reduce((s, it) => s + it.preco * it.qtd + it.customs.reduce((cs, c) => cs + c.valor * c.qtd * it.qtd, 0), 0)
  const descNum = parseFloat(descValor.replace(',', '.')) || 0
  const descontoAplicado = descTipo === '%' ? subtotal * descNum / 100 : Math.min(descNum, subtotal)
  const total = Math.max(0, subtotal - descontoAplicado)
  const sinalNum = parseFloat(sinalValor.replace(',', '.')) || 0
  const sinalAplicado = sinalAtivo ? (sinalTipo === '%' ? total * sinalNum / 100 : Math.min(sinalNum, total)) : 0
  const restante = Math.max(0, total - sinalAplicado)

  // ORC-020 (REVISÃO)/RN-NOVA-22-23 (V0.8.4/#399) — reverte deliberadamente o
  // comportamento anterior (P-F005/#251, RN-054 revisada, 2026-08-16: "nenhum item,
  // catálogo ou avulso, pergunta margem/preço dentro do orçamento"). A partir desta
  // tarefa, os 3 pontos de entrada (produto avulso, customização, item de catálogo)
  // abrem a calculadora de preço (ModalCalculadoraItem) antes de confirmar a adição —
  // decisão explícita do usuário, ciente da reversão. `calculadoraPendente` guarda o
  // item ainda não confirmado; só entra em `items` no `onConfirm` da calculadora.
  type CalculadoraPendente =
    | { tipo: 'avulso'; produto: ProdutoResponse }
    | { tipo: 'catalogo'; item: ItemCatalogoBuscaResponse }

  const [calculadoraPendente, setCalculadoraPendente] = useState<CalculadoraPendente | null>(null)

  // RN-NOVA-11 (revisada) — adicionar item nunca bloqueia, independente de
  // permitirEstoqueNegativo; o estoque exibido (EstoqueTags/aviso inline) vem sempre da simulação
  // ao vivo do efeito de debounce acima, nunca de uma checagem síncrona no momento da adição.
  const handleAddCatalogoItem = (item: ItemCatalogoBuscaResponse) => {
    setCalculadoraPendente({ tipo: 'catalogo', item })
    setProductOpen(false)
  }

  const handleSelectProdutoAvulso = (produto: ProdutoResponse) => {
    setCalculadoraPendente({ tipo: 'avulso', produto })
    setProductOpen(false)
  }

  // RN-NOVA-11 (revisada) — itens do orçamento em construção com estoque insuficiente
  // (qualquer situação != SUFICIENTE, independente de permitirEstoqueNegativo — a criação nunca
  // bloqueia), deduplicados por produtoId. Reaproveita `simulacoes` já obtido pelo efeito de
  // estoque vivo — nenhuma chamada nova ao backend só para montar o checkpoint.
  const calcularItensPendentesAvanco = (): SimulacaoEstoqueProdutoResponse[] => {
    const vistos = new Set<string>()
    const pendentes: SimulacaoEstoqueProdutoResponse[] = []
    for (const it of items) {
      if (!it.produtoId || vistos.has(it.produtoId)) continue
      const sim = simulacoes[it.produtoId]
      if (sim && sim.situacao !== 'SUFICIENTE') {
        vistos.add(it.produtoId)
        pendentes.push(sim)
      }
    }
    return pendentes
  }

  const handleSubmit = () => {
    setPrazoDiasError('')
    setSinalError('')

    if (!cliente) {
      alert('Selecione um cliente')
      return
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um produto')
      return
    }

    if (temPrazoProducao) {
      const prazoDiasNum = parseInt(prazoDias)
      if (!prazoDiasNum || prazoDiasNum < 1) {
        setPrazoDiasError('Prazo obrigatório, mínimo 1 dia')
        return
      }

      if (!inicioImediato && !dataInicioEstimada) {
        alert('Informe a data estimada de início')
        return
      }
    }

    if (sinalAtivo && sinalNum <= 0) {
      setSinalError('Informe um valor de sinal maior que zero')
      return
    }

    if (metodoPagamento === 'OUTRO' && metodoPagamentoObs.length < 50) {
      alert('Descreva o método de pagamento com ao menos 50 caracteres')
      return
    }

    const pendentes = calcularItensPendentesAvanco()
    if (pendentes.length > 0) {
      setSelecionadosProducao(new Set())
      setPendentesAvanco(pendentes)
      return
    }

    salvarOrcamento()
  }

  // Extraído de salvarOrcamento (RN-ORC-VINC-02, P-F004) — reaproveitado também pelo fluxo de
  // vincular produção embutido (só em modo criação, ver P-F007), que precisa criar o orçamento de
  // verdade (obter um id real) antes de poder chamar simular-vincular-producao/vincular-producao
  // (ambos escopados a /orcamentos/{id}).
  const montarPayload = (): OrcamentoRequest => {
    const prazoDiasNum = parseInt(prazoDias)
    return {
      clienteId: cliente!.id,
      itens: items.map(it => ({
        ...(it.itemCatalogoId
          ? { itemCatalogoId: it.itemCatalogoId }
          : { produtoId: it.produtoId, precoUnitario: it.preco }),
        quantidade: it.qtd,
        customizacoes: it.customs.map(c => ({
          produtoId: c.id,
          quantidade: c.qtd,
        })),
      })),
      metodoPagamento: metodoPagamento as MetodoPagamento,
      metodoPagamentoObs: metodoPagamento === 'OUTRO' ? metodoPagamentoObs : undefined,
      temPrazoProducao,
      prazoProducaoDias: temPrazoProducao ? prazoDiasNum : undefined,
      inicioAssimQueAprovado: temPrazoProducao ? inicioImediato : true,
      dataInicioEstimada: temPrazoProducao && !inicioImediato ? dataInicioEstimada : undefined,
      sinalAtivo,
      percentualSinal: sinalAtivo && sinalTipo === '%' ? sinalNum : undefined,
      valorSinal: sinalAtivo && sinalTipo === 'R$' ? sinalNum : undefined,
      tipoDesconto: descNum > 0 ? TIPO_DESCONTO_API[descTipo] : undefined,
      descontoValor: descNum > 0 ? descNum : undefined,
      observacoes: obs || undefined,
      dataValidade: validade ? `${validade}T00:00:00` : undefined,
    }
  }

  // P-F007 (#312+318) — modo edição chama PUT (RN-NOVA-4/ORC-038) em vez de POST; mesmo payload
  // completo dos dois casos (montarPayload não muda). RN-NOVA-11 continua valendo para criação:
  // nunca bloqueada por estoque insuficiente, o checkpoint acima (pendentesAvanco) já cumpriu o
  // papel de aviso antes deste request.
  const salvarOrcamento = async () => {
    if (!cliente) return
    setLoading(true)
    try {
      const payload = montarPayload()
      const result = editando && id
        ? await orcamentoService.editar(id, payload)
        : await orcamentoService.criar(payload)
      navigate(`/orcamentos/${result.id}`)
    } catch (err) {
      console.error(editando ? 'Erro ao editar orçamento:' : 'Erro ao criar orçamento:', err)
      setToast(extractApiError(err, editando ? 'Erro ao salvar alterações. Tente novamente.' : 'Erro ao criar orçamento. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  // RN-ORC-VINC-02 ponto 1 (P-F004) — orçamento ainda não existe neste checkpoint; ao escolher
  // vincular a uma produção existente, o orçamento é criado (uma única vez, id guardado em
  // orcamentoCriadoId) na primeira simulação, para então usar os endpoints reais de
  // simular-vincular-producao/vincular-producao. Continua "embutido" (sem trocar de tela) — só a
  // persistência acontece um pouco antes da confirmação final, não é uma escolha de UX, é
  // consequência de os dois endpoints serem escopados a /orcamentos/{id}.
  const handleSimularVinculo = async (producaoId: string): Promise<AlertaInsumo[]> => {
    let orcId = orcamentoCriadoId
    if (!orcId) {
      const created = await orcamentoService.criar(montarPayload())
      orcId = created.id
      setOrcamentoCriadoId(orcId)
    }
    return orcamentoService.simularVincularProducao(orcId, producaoId)
  }

  // RN-ORC-VINC-02 ponto 1 (P-F005) — mesma criação silenciosa do orçamento de handleSimularVinculo
  // acima: "criar produção nova" e "vincular existente" convergem no mesmo ponto de persistência do
  // orçamento, só o passo seguinte diverge (criar-producao-vinculada em vez de
  // simular/vincular-producao). Sem etapa de simulação — o endpoint não tem variante `simular-`,
  // confirmar já é o único passo (ver ModalVincularProducao).
  const handleCriarProducaoNova = async (dados: CriarProducaoVinculadaRequest) => {
    let orcId = orcamentoCriadoId
    if (!orcId) {
      const created = await orcamentoService.criar(montarPayload())
      orcId = created.id
      setOrcamentoCriadoId(orcId)
    }
    await orcamentoService.criarProducaoVinculada(orcId, dados)
    navigate(`/orcamentos/${orcId}`)
  }

  const handleConfirmarVinculo = async (producaoId: string) => {
    if (!orcamentoCriadoId) return
    setConfirmandoVinculo(true)
    try {
      await orcamentoService.vincularProducao(orcamentoCriadoId, producaoId)
    } catch (err) {
      console.error('Erro ao vincular produção ao orçamento recém-criado:', err)
    } finally {
      setConfirmandoVinculo(false)
      navigate(`/orcamentos/${orcamentoCriadoId}`)
    }
  }

  // Uma vez que o orçamento já foi criado como efeito da pré-visualização acima, não faz sentido
  // continuar no formulário de criação (evita duplicar orçamento se a artesã clicar em "Criar
  // orçamento" de novo) — fechar a modal navega direto para o orçamento já existente.
  const handleFecharModalVincular = () => {
    if (orcamentoCriadoId) {
      navigate(`/orcamentos/${orcamentoCriadoId}`)
      return
    }
    setModalVincular(false)
  }

  // RN-NOVA-12/13 (#375+308) — "Criar produção (N)" do checkpoint: persiste o orçamento (criação
  // ou edição, mesmo mecanismo de salvarOrcamento/montarPayload) e só então cria a produção
  // vinculada cobrindo unicamente os produtoIds selecionados. Erro de persistência usa o mesmo
  // tratamento de salvarOrcamento (toast, sem navegar); erro do passo de vincular fica inline no
  // formulário (mesmo padrão de ModalVincularProducao.handleCriarNova), pra permitir retry sem
  // perder o orçamento já persistido.
  const handleCriarProducaoCheckpoint = async () => {
    if (!formDataTerminoProducaoCheckpoint) {
      setFormErroProducaoCheckpoint('Informe o prazo de término previsto.')
      return
    }
    setCriandoProducaoCheckpoint(true)
    setFormErroProducaoCheckpoint(null)

    let orcId: string
    try {
      if (editando && id) {
        await orcamentoService.editar(id, montarPayload())
        setEdicaoPersistidaCheckpoint(true)
        orcId = id
      } else if (orcamentoCriadoId) {
        orcId = orcamentoCriadoId
      } else {
        const created = await orcamentoService.criar(montarPayload())
        orcId = created.id
        setOrcamentoCriadoId(orcId)
      }
    } catch (err) {
      console.error(editando ? 'Erro ao salvar alterações do orçamento:' : 'Erro ao criar orçamento:', err)
      setToast(extractApiError(err, editando ? 'Erro ao salvar alterações. Tente novamente.' : 'Erro ao criar orçamento. Tente novamente.'))
      setCriandoProducaoCheckpoint(false)
      return
    }

    try {
      await orcamentoService.criarProducaoVinculada(orcId, {
        dataInicio: formDataInicioProducaoCheckpoint || undefined,
        dataTerminoPrevista: formDataTerminoProducaoCheckpoint,
        observacoes: formObsProducaoCheckpoint || undefined,
        produtoIds: Array.from(selecionadosProducao),
      })
      navigate(`/orcamentos/${orcId}`)
    } catch (err) {
      setFormErroProducaoCheckpoint(extractApiError(err, 'Não foi possível criar a produção. Tente novamente.'))
    } finally {
      setCriandoProducaoCheckpoint(false)
    }
  }

  // RN-NOVA-14 ponto 2 — cancelamento do checkpoint: só navega de volta pro orçamento se ele já foi
  // persistido como efeito desta ação (criado agora ou, em edição, com o PUT desta ação já
  // confirmado) — nunca perde o rascunho em memória se nada foi persistido ainda.
  const handleFecharModalCriarProducaoCheckpoint = () => {
    setModalCriarProducaoCheckpoint(false)
    if (orcamentoCriadoId) {
      navigate(`/orcamentos/${orcamentoCriadoId}`)
    } else if (editando && id && edicaoPersistidaCheckpoint) {
      navigate(`/orcamentos/${id}`)
    }
  }

  const summaryProps = {
    subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, onSubmit: handleSubmit, loading,
    submitLabel: editando ? 'Salvar alterações' : 'Criar orçamento',
    submitLabelLoading: editando ? 'Salvando alterações...' : 'Criando orçamento...',
  }

  // Estado de carregamento — modo edição, buscando o orçamento existente.
  if (carregandoEdicao) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-muted">
          Carregando orçamento...
        </div>
      </AppLayout>
    )
  }

  // Estado de erro — modo edição, falha ao buscar o orçamento existente.
  if (erroCarregarEdicao) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-danger">
          Não foi possível carregar este orçamento para edição. Tente novamente.
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="orcamentos" compact>

      {/* TOAST */}
      <Toast message={toast} />

      {/* Header */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mb-[5px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal">
            Orçamentos
          </div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">
            {editando ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
        </div>
      </div>

      {/* Layout duas colunas */}
      <div className="grid grid-cols-[1fr_348px] items-start gap-[22px] max-[860px]:grid-cols-1">

        {/* Coluna esquerda */}
        <div className="flex min-w-0 flex-col gap-[18px]">

          {/* Seção 1: Cliente */}
          <SectionCard step="1" label="Cliente" hint="Quem vai receber este orçamento?">
            <ClienteSelect cliente={cliente} onSelect={setCliente} onClear={() => setCliente(null)} />
          </SectionCard>

          {/* Seção 2: Itens */}
          <SectionCard step="2" label="Itens do orçamento" hint="Produtos e quantidades do pedido.">
            <div className="px-5 pt-3.5">
              <ModoToggle modo={modoItens} onChange={m => { setModoItens(m); setCatalogoFiltro('') }} />
            </div>
            <div className="mt-3.5">
              {items.length === 0 ? (
                <div className="mx-5 mb-5 mt-1 rounded-[14px] border-[1.5px] border-dashed border-line bg-cream px-6 py-10 text-center">
                  <span className="mb-3.5 inline-grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-teal">
                    <ShoppingCart size={17} />
                  </span>
                  <div className="text-[15.5px] font-semibold text-dark">Nenhum produto adicionado</div>
                  <p className="mb-0 mt-1.5 text-[13.5px] text-muted">Comece pelo botão abaixo.</p>
                </div>
              ) : (
                items.map((it, i) => (
                  <ItemLinha
                    key={it.id} linha={it} index={i}
                    simulacao={it.produtoId ? simulacoes[it.produtoId] : undefined}
                    onQtd={v => setItems(arr => arr.map(x => x.id === it.id ? { ...x, qtd: v } : x))}
                    onRemove={() => setItems(arr => arr.filter(x => x.id !== it.id))}
                    onOpenCustom={() => setModalItem(it)}
                  />
                ))
              )}

              {/* Botão adicionar produto */}
              <div ref={prodRef} className={clsx('relative px-5 pb-5 pt-3.5', items.length && 'border-t border-line')}>
                <button
                  onClick={() => setProductOpen(o => !o)}
                  className="flex h-12 w-full items-center justify-center gap-[9px] rounded-input border-[1.5px] border-dashed border-teal/50 bg-teal/[0.05] font-[inherit] text-[14.5px] font-semibold text-teal transition-colors duration-150 hover:bg-teal/10"
                >
                  <Plus size={16} /> Adicionar item
                </button>
                <ItemSearch
                  open={productOpen}
                  onClose={() => setProductOpen(false)}
                  modo={modoItens}
                  buscarItensCatalogo={buscarItensCatalogoOrcamento}
                  buscarProdutos={buscarProdutosOrcamento}
                  catalogos={catalogos}
                  catalogoFiltro={catalogoFiltro}
                  onSelectCatalogoFiltro={setCatalogoFiltro}
                  onSelectCatalogoItem={handleAddCatalogoItem}
                  onSelectProdutoAvulso={handleSelectProdutoAvulso}
                />
              </div>
            </div>
          </SectionCard>

          {/* Seção 3: Prazo de produção */}
          <SectionCard step="3" label="Prazo de produção" hint="Quantos dias úteis para finalizar este pedido.">
            <PrazoSection
              temPrazoProducao={temPrazoProducao} setTemPrazoProducao={setTemPrazoProducao}
              prazoDias={prazoDias} setPrazoDias={setPrazoDias}
              inicioImediato={inicioImediato} setInicioImediato={setInicioImediato}
              dataInicioEstimada={dataInicioEstimada} setDataInicioEstimada={setDataInicioEstimada}
              error={prazoDiasError}
            />
          </SectionCard>

          {/* Seção 4: Pagamento */}
          <SectionCard step="4" label="Condições de pagamento" hint="Quer pedir um sinal (entrada) para começar?">
            <PagamentoSection
              metodoPagamento={metodoPagamento}
              setMetodoPagamento={setMetodoPagamento}
              metodoPagamentoObs={metodoPagamentoObs}
              setMetodoPagamentoObs={setMetodoPagamentoObs}
              ativo={sinalAtivo} setAtivo={setSinalAtivo}
              tipo={sinalTipo} setTipo={setSinalTipo}
              valor={sinalValor} setValor={setSinalValor}
              sinalAplicado={sinalAplicado} restante={restante}
              error={sinalError}
            />
          </SectionCard>

          {/* Resumo inline mobile */}
          <div className="hidden max-[860px]:block">
            <Summary {...summaryProps} />
          </div>
        </div>

        {/* Coluna direita */}
        <div className="sticky top-6 max-[860px]:hidden">
          <Summary {...summaryProps} />
        </div>
      </div>

      {/* Barra mobile */}
      <div className="sticky bottom-0 z-30 hidden items-center justify-between gap-4 border-t border-line bg-white px-5 py-3.5 max-[860px]:flex">
        <div>
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">Total</div>
          <div className="text-[22px] font-bold leading-[1.1] text-teal [font-variant-numeric:tabular-nums]">{BRL(total)}</div>
        </div>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? summaryProps.submitLabelLoading : summaryProps.submitLabel}
        </Button>
      </div>

      {/* Modal customizações */}
      {modalItem && (
        <ModalCustomizacoes
          nomeItem={modalItem.nome}
          customsIniciais={modalItem.customs}
          onClose={() => setModalItem(null)}
          onConfirm={customs => {
            setItems(arr => arr.map(x => x.id === modalItem.id ? { ...x, customs } : x))
            setModalItem(null)
          }}
        />
      )}

      {/* Modal calculadora — produto avulso / item de catálogo (RN-NOVA-22/23, V0.8.4/#399).
          RN-NOVA-1: fechar/cancelar sem confirmar descarta a seleção — não adiciona
          nada, `calculadoraPendente` só volta a null, nenhum item fica pendente. */}
      {calculadoraPendente && (
        <ModalCalculadoraItem
          key={calculadoraPendente.tipo === 'avulso' ? calculadoraPendente.produto.id : calculadoraPendente.item.id}
          carregar={() =>
            calculadoraPendente.tipo === 'avulso'
              ? carregarCalculadoraAvulso(calculadoraPendente.produto.id)
              : carregarCalculadoraCatalogo(calculadoraPendente.item.catalogoId, calculadoraPendente.item.id)
          }
          onClose={() => setCalculadoraPendente(null)}
          onConfirm={precoFinal => {
            if (calculadoraPendente.tipo === 'avulso') {
              const produto = calculadoraPendente.produto
              setItems(arr => [...arr, {
                id: Date.now(),
                nome: produto.nome,
                qtd: 1,
                preco: precoFinal,
                customs: [],
                produtoId: produto.id,
                produtoIdentificador: produto.identificador,
                algumInsumoNaoFracionavel: produto.algumInsumoNaoFracionavel ?? false,
                permitirEstoqueNegativo: produto.permitirEstoqueNegativo,
                estoqueAtual: produto.estoqueAtual,
                fracionavel: produto.fracionavel ?? undefined,
              }])
            } else {
              const item = calculadoraPendente.item
              setItems(arr => [...arr, {
                id: Date.now(),
                nome: item.nome,
                qtd: 1,
                preco: precoFinal,
                customs: [],
                itemCatalogoId: item.id,
                catalogoNome: item.catalogoNome,
                // V0.13.0 — sem estoque/fracionável agregado na busca (N componentes, cada um com
                // o seu); achado registrado em decisoes-catalogo.md.
                algumInsumoNaoFracionavel: item.algumComponenteNaoFracionavel,
                permitirEstoqueNegativo: true,
                estoqueAtual: null,
                fracionavel: item.algumComponenteNaoFracionavel ? false : undefined,
              }])
            }
            setCalculadoraPendente(null)
          }}
        />
      )}


      {/* Modal de checkpoint único de aviso de estoque (RN-NOVA-11 revisada, OpenProject #246/#245)
          — ponto único de aviso ao clicar "Criar orçamento". Nunca bloqueia a criação, independente
          de permitirEstoqueNegativo (a única trava real de negócio é o avanço para Finalizado,
          backend). Cada item tem um checkbox; "Criar produção" cobre os selecionados numa única
          ação (RN-NOVA-5), sem exigir seleção para prosseguir com "Continuar mesmo assim". A modal
          "Orçamento criado com aviso de estoque" (pós-criação) foi removida — este checkpoint já
          cumpre o papel de aviso antes da criação. */}
      {pendentesAvanco && !modalVincular && !modalCriarProducaoCheckpoint && (
        <ModalShell
          open
          onClose={() => setPendentesAvanco(null)}
          title="Itens com estoque insuficiente"
          subtitle={editando ? 'Aviso antes de salvar as alterações' : 'Aviso antes de criar o orçamento'}
          icon={<AlertTriangle size={20} />}
          iconBg="rgba(249,115,22,0.14)"
          iconColor="#A35A26"
          width={560}
          footer={
            <div className="flex w-full flex-col gap-2.5">
              <div className="flex justify-between gap-2.5">
                {/* P-F007 (#312+318) — "Vincular produção existente" fica de fora na edição: o fluxo
                    cria o orçamento como efeito colateral da simulação (só faz sentido quando ainda
                    não existe id). Em edição o orçamento já existe — quem cair aqui pode salvar e
                    usar o caminho já existente na tela de Detalhe (ORC-028, "Criar produção"). */}
                {!editando && (
                  <Button variant="secondary" onClick={() => setModalVincular(true)}>
                    <Factory size={14} /> Vincular produção existente
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={selecionadosProducao.size === 0}
                  onClick={() => {
                    setFormDataInicioProducaoCheckpoint('')
                    setFormDataTerminoProducaoCheckpoint('')
                    setFormObsProducaoCheckpoint('')
                    setFormErroProducaoCheckpoint(null)
                    setModalCriarProducaoCheckpoint(true)
                  }}
                >
                  <Factory size={14} /> Criar produção{selecionadosProducao.size > 0 ? ` (${selecionadosProducao.size})` : ''}
                </Button>
              </div>
              <div className="flex justify-between gap-2.5">
                <Button variant="ghost" onClick={() => setPendentesAvanco(null)}>Revisar itens</Button>
                <Button variant="primary" onClick={() => { setPendentesAvanco(null); salvarOrcamento() }}>
                  {editando ? 'Salvar mesmo assim' : 'Continuar mesmo assim'}
                </Button>
              </div>
            </div>
          }
        >
          <p className="m-0 mb-3.5 text-[13.5px] text-muted">
            {editando
              ? 'Estes itens vão ficar com estoque negativo se as alterações forem salvas assim. Você pode salvar mesmo assim ou selecionar itens para criar uma produção agora, cobrindo a diferença.'
              : 'Estes itens vão ficar com estoque negativo se o orçamento for criado assim. Você pode continuar mesmo assim, vincular a uma produção que já está aguardando início, ou selecionar itens para criar uma produção agora, cobrindo a diferença.'}
          </p>
          <SelecaoProducaoEstoque
            itens={pendentesAvanco.map(p => ({
              produtoId: p.produtoId,
              nomeProduto: p.nomeProduto,
              estoqueAtual: p.estoqueAtual,
              quantidadeNecessaria: p.quantidadeNecessaria,
              quantidadeFaltante: Math.max(0, Math.ceil(p.quantidadeNecessaria - p.estoqueAtual)),
            }))}
            selecionados={selecionadosProducao}
            onToggle={produtoId => setSelecionadosProducao(prev => {
              const next = new Set(prev)
              if (next.has(produtoId)) next.delete(produtoId)
              else next.add(produtoId)
              return next
            })}
          />
        </ModalShell>
      )}

      {!editando && modalVincular && pendentesAvanco && (
        <ModalVincularProducao
          onClose={handleFecharModalVincular}
          jaVinculadasIds={[]}
          onSimular={handleSimularVinculo}
          onConfirmar={handleConfirmarVinculo}
          confirmando={confirmandoVinculo}
          onCriarNova={handleCriarProducaoNova}
        />
      )}

      {/* RN-NOVA-12/13/14 (#375+308) — mini-formulário próprio de "Criar produção (N)" do
          checkpoint, separado do ModalVincularProducao acima: funciona em criação E edição (aquele
          é !editando-only) e cria a produção só com os itens marcados (produtoIds), não todos os
          itens do orçamento. Mesmo padrão visual do modoCriarNova de ModalVincularProducao. */}
      {pendentesAvanco && modalCriarProducaoCheckpoint && (
        <ModalShell
          open
          onClose={handleFecharModalCriarProducaoCheckpoint}
          title="Criar produção"
          subtitle={`Cobre só ${selecionadosProducao.size === 1 ? 'o item selecionado' : `os ${selecionadosProducao.size} itens selecionados`}`}
          icon={<Factory size={18} />}
          iconBg="#EAF1FB"
          iconColor="#2A6FB0"
          footer={
            <>
              <Button variant="ghost" onClick={handleFecharModalCriarProducaoCheckpoint} disabled={criandoProducaoCheckpoint}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleCriarProducaoCheckpoint} disabled={criandoProducaoCheckpoint}>
                {criandoProducaoCheckpoint ? 'Criando...' : 'Criar produção'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[13.5px] text-muted">
              Fica vinculada a este orçamento automaticamente, cobrindo só os produtos marcados no
              checkpoint — nasce em "Aguardando início".
            </p>

            <div className="flex flex-wrap gap-3">
              <label className="block flex-1 basis-[160px]">
                <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                  <Calendar size={15} className="text-teal" /> Início
                </span>
                <input
                  type="date"
                  value={formDataInicioProducaoCheckpoint}
                  onChange={(e) => setFormDataInicioProducaoCheckpoint(e.target.value)}
                  disabled={criandoProducaoCheckpoint}
                  className="h-[44px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                />
              </label>
              <label className="block flex-1 basis-[160px]">
                <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                  <Calendar size={15} className="text-teal" /> Término previsto <span className="text-orange">*</span>
                </span>
                <input
                  type="date"
                  value={formDataTerminoProducaoCheckpoint}
                  min={formDataInicioProducaoCheckpoint || undefined}
                  onChange={(e) => setFormDataTerminoProducaoCheckpoint(e.target.value)}
                  disabled={criandoProducaoCheckpoint}
                  className={clsx(
                    'h-[44px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                    formErroProducaoCheckpoint && !formDataTerminoProducaoCheckpoint ? 'border-danger' : 'border-line'
                  )}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <StickyNote size={15} className="text-teal" /> Observações <span className="text-[11.5px] font-medium text-muted">(opcional)</span>
              </span>
              <textarea
                value={formObsProducaoCheckpoint}
                onChange={(e) => setFormObsProducaoCheckpoint(e.target.value)}
                disabled={criandoProducaoCheckpoint}
                rows={3}
                placeholder="Ex: separar embalagem especial para este pedido"
                className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </label>

            {formErroProducaoCheckpoint && (
              <div className="flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formErroProducaoCheckpoint}</span>
              </div>
            )}
          </div>
        </ModalShell>
      )}

    </AppLayout>
  )
}
