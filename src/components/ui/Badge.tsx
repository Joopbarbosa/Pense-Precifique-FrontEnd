import { AlertCircle, Check, Layers, X } from 'lucide-react'
import clsx from 'clsx'
import { formatQuantidade } from '../../utils/quantidade'

type StatusOrcamento =
  | 'Rascunho' | 'Enviado' | 'Aprovado'
  | 'Aguardando Sinal' | 'Sinal Pago'
  | 'Em Produção' | 'Finalizado'
  | 'Entregue' | 'Pago' | 'Cancelado'

type TipoProduto = 'Produto' | 'Customização'

interface StatusBadgeProps {
  status: StatusOrcamento
  size?: 'sm' | 'md'
}

interface TipoProdutoBadgeProps {
  tipo: TipoProduto
  size?: 'sm' | 'md'
}

const STATUS_META: Record<StatusOrcamento, { bg: string; fg: string; dot: string }> = {
  'Rascunho':         { bg: '#F1F0EC', fg: '#7C786F', dot: '#A8A49C' },
  'Enviado':          { bg: '#EAF1FB', fg: '#2A6FB0', dot: '#3A86CE' },
  'Aprovado':         { bg: '#EAF7EF', fg: '#3E9D5A', dot: '#54B36F' },
  'Aguardando Sinal': { bg: '#FFF8EC', fg: '#B07A1F', dot: '#E0A030' },
  'Sinal Pago':       { bg: '#FFF1E8', fg: '#C8721F', dot: '#F97316' },
  'Em Produção':      { bg: '#FFF1E8', fg: '#C8721F', dot: '#F97316' },
  'Finalizado':       { bg: '#E7F4F1', fg: '#1F7A6F', dot: '#2A9D8F' },
  'Entregue':         { bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F' },
  'Pago':             { bg: '#E2F0E6', fg: '#176B43', dot: '#1F8A5B' },
  'Cancelado':        { bg: '#FCF0EC', fg: '#C0492B', dot: '#D06A4E' },
}

const TIPO_META: Record<TipoProduto, { bg: string; fg: string }> = {
  'Produto':      { bg: '#E9F1F9', fg: '#3A6FA0' },
  'Customização': { bg: 'rgba(42,157,143,0.14)', fg: '#2A9D8F' },
}

const badgeSize = {
  sm: 'h-6 px-[9px] text-[11.5px]',
  md: 'h-7 px-[11px] text-[12.5px]',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold', badgeSize[size])}
      style={{ background: meta.bg, color: meta.fg }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: meta.dot }} />
      {status}
    </span>
  )
}

export function TipoProdutoBadge({ tipo, size = 'md' }: TipoProdutoBadgeProps) {
  const meta = TIPO_META[tipo]
  return (
    <span
      className={clsx('inline-flex items-center whitespace-nowrap rounded-full font-semibold', badgeSize[size])}
      style={{ background: meta.bg, color: meta.fg }}
    >
      {tipo}
    </span>
  )
}

// ---------- FracionavelBadge / EstoqueNegativoBadge / EstoqueAtualBadge (#212/#215, estendido em #238) ----------
//
// Variante 'cadastro': Detalhe Produto, Detalhe Insumo, aba Ficha Técnica de Cadastrar/Editar Produto.
// Variante 'busca': listagem compacta de resultados de busca (ex.: busca de produto em Nova Produção).
// #238 — cor semântica verde/laranja (era teal/cinza) e EstoqueTags agrupa as 3 informações
// (fracionável + estoque negativo + estoque atual) num único bloco reutilizável em toda tela que lista
// ou busca Produto/Insumo, por componente individual (não só o agregado do produto).

interface FracionavelBadgeProps {
  fracionavel: boolean
  labelFracionavel?: string
  labelNaoFracionavel?: string
  variant?: 'cadastro' | 'busca'
}

const FRACIONAVEL_SIZE: Record<'cadastro' | 'busca', string> = {
  cadastro: 'h-[27px] px-[11px] text-[12.5px]',
  busca:    'h-[18px] px-[7px] text-[10.5px]',
}

export function FracionavelBadge({
  fracionavel,
  labelFracionavel = 'Fracionável',
  labelNaoFracionavel = 'Não fracionável',
  variant = 'cadastro',
}: FracionavelBadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center whitespace-nowrap rounded-full font-semibold',
      FRACIONAVEL_SIZE[variant],
      fracionavel ? 'bg-success/10 text-success' : 'bg-orange/10 text-orange'
    )}>
      {fracionavel ? labelFracionavel : labelNaoFracionavel}
    </span>
  )
}

interface EstoqueNegativoBadgeProps {
  permitir: boolean
  variant?: 'cadastro' | 'busca'
}

const ESTOQUE_NEGATIVO_SIZE: Record<'cadastro' | 'busca', { pill: string; icon: number }> = {
  cadastro: { pill: 'h-[27px] gap-1.5 px-[11px] text-[12.5px]', icon: 13 },
  busca:    { pill: 'h-[18px] gap-1 px-[7px] text-[10.5px]',    icon: 10 },
}

export function EstoqueNegativoBadge({ permitir, variant = 'cadastro' }: EstoqueNegativoBadgeProps) {
  const s = ESTOQUE_NEGATIVO_SIZE[variant]
  return permitir ? (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full bg-teal/[0.12] font-semibold text-teal', s.pill)}>
      <Check size={s.icon} /> Permite estoque negativo
    </span>
  ) : (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full bg-[#EF4444]/[0.12] font-semibold text-[#EF4444]', s.pill)}>
      <X size={s.icon} /> Bloqueia estoque negativo
    </span>
  )
}

interface EstoqueAtualBadgeProps {
  estoqueAtual: number
  fracionavel: boolean
  unidade?: string
  variant?: 'cadastro' | 'busca'
}

export function EstoqueAtualBadge({ estoqueAtual, fracionavel, unidade, variant = 'cadastro' }: EstoqueAtualBadgeProps) {
  const s = ESTOQUE_NEGATIVO_SIZE[variant]
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full bg-line-soft font-semibold text-body', s.pill)}>
      <Layers size={s.icon} /> {formatQuantidade(estoqueAtual, fracionavel)}{unidade ? ` ${unidade}` : ''} em estoque
    </span>
  )
}

interface EstoqueTagsProps {
  fracionavel: boolean
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
  unidade?: string
  variant?: 'cadastro' | 'busca'
  className?: string
}

/** #238 — tag global fracionável/estoque negativo/estoque atual, um bloco só, reusado por componente. */
export function EstoqueTags({ fracionavel, permitirEstoqueNegativo, estoqueAtual, unidade, variant = 'busca', className }: EstoqueTagsProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-1', className)}>
      <FracionavelBadge fracionavel={fracionavel} variant={variant} />
      <EstoqueNegativoBadge permitir={permitirEstoqueNegativo} variant={variant} />
      <EstoqueAtualBadge estoqueAtual={estoqueAtual} fracionavel={fracionavel} unidade={unidade} variant={variant} />
    </div>
  )
}

// ---------- MultiploRendimentoAviso ----------
//
// Duplicado idêntico entre NovaProducaoPage.tsx/EditarProducaoPage.tsx (ProdutoRow) — PDC-027
// (reversão de PDC-005, #214): insumo não-fracionável na ficha técnica não trava mais a
// quantidade em 1× o rendimento — aceita qualquer múltiplo inteiro, limitado ao estoque
// disponível. O backend valida (mensagem exibida via extractApiError); este aviso só orienta.

export function MultiploRendimentoAviso({ rendimento }: { rendimento: number }) {
  return (
    <div className="mt-1 text-[11.5px] font-medium text-muted">
      Insumo não-fracionável — quantidade deve ser múltiplo de {rendimento}
    </div>
  )
}

export function VencidoBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-[5px] whitespace-nowrap rounded-full bg-[#FCF0EC] px-[9px] text-[11.5px] font-semibold text-danger">
      <AlertCircle size={12} className="text-danger" />
      Vencido
    </span>
  )
}
