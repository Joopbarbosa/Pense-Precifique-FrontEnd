import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ModalShell from '../../components/ui/ModalShell'
import Spinner from '../../components/ui/Spinner'
import ActionMenu from '../../components/shared/ActionMenu'
import { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import SortableHeader from '../../components/shared/SortableHeader'
import Toast from '../../components/shared/Toast'
import { EstoqueTags } from '../../components/ui/Badge'
import {
  AlertCircle, Eye, Pencil, Power, ShoppingCart, Plus, Search, Trash2,
  Layers, Box, CheckCircle, ChevronRight, Repeat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InsumoContagensResponse, InsumoResponse, ProdutoRelacionadoResponse } from '../../types/insumo'
import { insumoService } from '../../services/insumoService'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import { useToast } from '../../hooks/useToast'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import { formatQuantidade } from '../../utils/quantidade'
import { extractApiError } from '../../utils/apiError'
import { BRL } from '../../components/venda/formato'

const TIPO_PRODUTO_LABEL: Record<string, string> = {
  PRODUTO: 'Produto',
  PRODUTO_BASE: 'Produto base',
  CUSTOMIZACAO: 'Customização',
}

const FILTERS = ['Todos', 'Ativos', 'Inativos', 'Estoque baixo', 'Estoque negativo', 'Estoque positivo']

// #295 (V0.14.0, RN-NOVA-2) — mesmo allowlist de `InsumoService.CAMPOS_ORDENACAO_INSUMO`
// (backend). Default (sem interação do usuário): 'numero' decrescente.
type CampoOrdenacaoInsumo = 'numero' | 'nome' | 'custoUnitario' | 'estoqueAtual'

const COLUNAS: { label: string; campo: CampoOrdenacaoInsumo | null }[] = [
  { label: 'Identificador', campo: 'numero' },
  { label: 'Insumo', campo: 'nome' },
  { label: 'Unidade', campo: null },
  { label: 'Estoque atual', campo: 'estoqueAtual' },
  { label: 'Estoque mín.', campo: null },
  { label: 'Custo unitário', campo: 'custoUnitario' },
  { label: 'Status', campo: null },
  { label: '', campo: null },
]

const isLow = (o: InsumoResponse) =>
  o.ativo && o.estoqueMinimo != null && o.estoqueAtual < o.estoqueMinimo

const isNegative = (o: InsumoResponse) => o.estoqueAtual < 0

const isPositive = (o: InsumoResponse) => o.estoqueAtual > 0


// #603 (RN-NOVA-33): sempre 2 casas na tela; o custo unitário continua com 4 por dentro.
const moeda = BRL

function InsumoStatusBadge({ insumo, small = false }: { insumo: InsumoResponse; small?: boolean }) {
  const low = isLow(insumo)

  if (low) return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-warning-bg px-2.5 font-semibold text-warning',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      <AlertCircle size={13} /> Estoque baixo
    </span>
  )

  if (!insumo.ativo) return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] rounded-full bg-line-soft px-2.5 font-semibold text-subtle',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      Inativo
    </span>
  )

  return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] rounded-full bg-teal/10 px-2.5 font-semibold text-teal',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      Ativo
    </span>
  )
}

function montarMenuItems(insumo: InsumoResponse, { onVer, onEditar, onInativar, onReativar, onExcluir }: {
  onVer: () => void
  onEditar: () => void
  onInativar: () => void
  onReativar: () => void
  onExcluir: () => void
}): ActionMenuItem[] {
  return [
    { label: 'Ver detalhes', icon: <Eye size={18} />,    onClick: onVer },
    { label: 'Editar',       icon: <Pencil size={16} />, onClick: onEditar },
    insumo.ativo
      ? { label: 'Inativar', icon: <Power size={16} />,  onClick: onInativar, dividerBefore: true }
      : { label: 'Reativar', icon: <Power size={16} />,  onClick: onReativar, dividerBefore: true },
    { label: 'Excluir', icon: <Trash2 size={16} />, onClick: onExcluir, danger: true },
  ]
}

function InsumoRow({ insumo, index, onVer, onEditar, onInativar, onReativar, onExcluir }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onInativar: () => void
  onReativar: () => void
  onExcluir: () => void
}) {
  const low = isLow(insumo)

  const menuItems = montarMenuItems(insumo, { onVer, onEditar, onInativar, onReativar, onExcluir })

  return (
    <div
      className={clsx(
        'hidden cursor-pointer grid-cols-[0.7fr_2fr_0.55fr_0.85fr_0.8fr_1fr_1fr_40px] items-center gap-3 border-b border-line px-section py-[13px] transition-colors duration-100 last:border-b-0 hover:bg-line sm:grid',
        !insumo.ativo && 'opacity-65'
      )}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
      onClick={onVer}
      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
    >
      <div className="text-[13.5px] font-semibold text-body [font-variant-numeric:tabular-nums]">
        {insumo.identificador}
      </div>

      <div className="min-w-0">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-dark">
          {insumo.nome}
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted">{insumo.marca}</div>
        <EstoqueTags
          className="mt-1.5"
          fracionavel={insumo.fracionavel}
          permitirEstoqueNegativo={insumo.permitirEstoqueNegativo}
          estoqueAtual={insumo.estoqueAtual}
          unidade={insumo.unidadeMedida ?? undefined}
          variant="busca"
        />
      </div>

      <div className="text-[13.5px] text-body">{insumo.unidadeMedida}</div>

      <div className={clsx('text-sm font-semibold [font-variant-numeric:tabular-nums]', low ? 'text-warning' : 'text-dark')}>
        {formatQuantidade(insumo.estoqueAtual, insumo.fracionavel, insumo.tipoExibicaoQuantidade)}
        {low && <span className="ml-[5px] text-[11px] text-[#E8973A]">⚠</span>}
      </div>

      <div className="text-[13.5px] text-muted [font-variant-numeric:tabular-nums]">
        {insumo.estoqueMinimo ?? '—'}
      </div>

      <div className="text-[13.5px] font-semibold text-body [font-variant-numeric:tabular-nums]">
        {moeda(insumo.custoUnitario)}/{insumo.unidadeMedida}
      </div>

      <div><InsumoStatusBadge insumo={insumo} /></div>

      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function InsumoCard({ insumo, index, onVer, onEditar, onInativar, onReativar, onExcluir }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onInativar: () => void
  onReativar: () => void
  onExcluir: () => void
}) {
  const low = isLow(insumo)

  const menuItems = montarMenuItems(insumo, { onVer, onEditar, onInativar, onReativar, onExcluir })

  return (
    <div
      className={clsx('block cursor-pointer border-b border-line px-section py-4 sm:hidden', !insumo.ativo && 'opacity-65')}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
      onClick={onVer}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">{insumo.identificador}</div>
          <div className="mt-0.5 text-[14.5px] font-semibold text-dark">{insumo.nome}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{insumo.marca}</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <InsumoStatusBadge insumo={insumo} small />
            <span className="flex items-center gap-1 text-[12.5px] text-body">
              Estoque: <strong className={clsx('font-semibold', low ? 'text-warning' : 'text-dark')}>{formatQuantidade(insumo.estoqueAtual, insumo.fracionavel, insumo.tipoExibicaoQuantidade)} {insumo.unidadeMedida}</strong>
            </span>
          </div>
          <EstoqueTags
            className="mt-1.5"
            fracionavel={insumo.fracionavel}
            permitirEstoqueNegativo={insumo.permitirEstoqueNegativo}
            estoqueAtual={insumo.estoqueAtual}
            unidade={insumo.unidadeMedida ?? undefined}
            variant="busca"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Custo</div>
            <div className="text-sm font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(insumo.custoUnitario)}/{insumo.unidadeMedida}</div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <ActionMenu items={menuItems} align="right" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SeletorInsumoSubstituto({ produto, insumoAtualId, selecionado, onSelect }: {
  produto: ProdutoRelacionadoResponse
  insumoAtualId: string
  selecionado: InsumoResponse | null
  onSelect: (insumo: InsumoResponse | null) => void
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<InsumoResponse[]>([])
  const [open, setOpen] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!open) return
    setCarregando(true)
    const delay = busca.trim() ? 300 : 0
    const timer = setTimeout(() => {
      insumoService.buscarParaCarrinho(busca.trim())
        .then(data => setResultados(data))
        .catch(() => setResultados([]))
        .finally(() => setCarregando(false))
    }, delay)
    return () => clearTimeout(timer)
  }, [busca, open])

  const disponiveis = resultados.filter(i => i.ativo && i.id !== insumoAtualId)

  return (
    <div className="rounded-xl border border-line bg-cream px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
          <Box size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {produto.identificador && (
              <span className="text-[12px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{produto.identificador}</span>
            )}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-dark">{produto.nome}</span>
          </div>
        </div>
      </div>

      {selecionado ? (
        <div className="flex items-center justify-between gap-2 rounded-[9px] border-[1.5px] border-teal/40 bg-teal/5 px-3 py-2.5">
          <span className="text-[13.5px] font-semibold text-dark">{selecionado.nome}</span>
          <button onClick={() => onSelect(null)} className="flex border-none bg-transparent text-faint hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
            <Search size={14} />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar insumo substituto…"
            className="h-[40px] w-full rounded-[9px] border-[1.5px] border-line bg-white pl-8 pr-3 font-[inherit] text-[13px] text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12"
          />
          {open && (
            <div className="absolute inset-x-0 top-[44px] z-20 max-h-[220px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
              {carregando ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
              ) : disponiveis.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum insumo encontrado</div>
              ) : disponiveis.map(i => (
                <button
                  key={i.id}
                  onMouseDown={() => onSelect(i)}
                  className="flex w-full flex-col items-start gap-1 rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
                >
                  <span className="flex w-full items-center justify-between gap-2.5">
                    <span className="text-[13.5px] font-semibold text-dark">{i.nome}</span>
                    <span className="shrink-0 text-xs text-muted">{i.unidadeMedida}</span>
                  </span>
                  <EstoqueTags
                    fracionavel={i.fracionavel}
                    permitirEstoqueNegativo={i.permitirEstoqueNegativo}
                    estoqueAtual={i.estoqueAtual}
                    unidade={i.unidadeMedida ?? undefined}
                    variant="busca"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// V0.13.0 (DT-NOVA-1) — Insumo ganhou um 2º tipo de vínculo (componente de Item de Catálogo,
// RN-NOVA-1 — antes desta versão Insumo nunca podia ser componente de item de catálogo). O
// vinculoId é sempre ItemCatalogoComponente.id, não o id do próprio Insumo.
interface VinculoCatalogoInsumoUI {
  vinculoId: string
  catalogoNome: string
  catalogoIdentificador: string
}

/** Mesmo padrão de `carregarVinculosCatalogo` (ListaProdutosPage.tsx): não existe endpoint
 * dedicado de "catálogos vinculados" para Insumo — cruza todos os catálogos contra seus itens. */
async function carregarVinculosCatalogoInsumo(insumoId: string): Promise<VinculoCatalogoInsumoUI[]> {
  const catalogos = await catalogoService.listar({ size: 100 }).then(d => d.content)
  const listas = await Promise.all(
    catalogos.map(c => itemCatalogoService.listar(c.id).then(itens => ({ catalogo: c, itens })))
  )
  const vinculos: VinculoCatalogoInsumoUI[] = []
  for (const { catalogo, itens } of listas) {
    for (const item of itens) {
      for (const comp of item.componentes) {
        if (comp.insumoId === insumoId) {
          vinculos.push({ vinculoId: comp.id, catalogoNome: catalogo.nome, catalogoIdentificador: catalogo.identificador })
        }
      }
    }
  }
  return vinculos
}

function SeletorInsumoSubstitutoVinculo({ label, insumoAtualId, selecionado, onSelect }: {
  label: string
  insumoAtualId: string
  selecionado: InsumoResponse | null
  onSelect: (insumo: InsumoResponse | null) => void
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<InsumoResponse[]>([])
  const [open, setOpen] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!open) return
    setCarregando(true)
    const delay = busca.trim() ? 300 : 0
    const timer = setTimeout(() => {
      insumoService.buscarParaCarrinho(busca.trim())
        .then(data => setResultados(data))
        .catch(() => setResultados([]))
        .finally(() => setCarregando(false))
    }, delay)
    return () => clearTimeout(timer)
  }, [busca, open])

  const disponiveis = resultados.filter(i => i.ativo && i.id !== insumoAtualId)

  return (
    <div className="rounded-xl border border-line bg-cream px-4 py-3.5">
      <div className="mb-2.5 text-[13.5px] font-semibold text-dark">{label}</div>
      {selecionado ? (
        <div className="flex items-center justify-between gap-2 rounded-[9px] border-[1.5px] border-teal/40 bg-teal/5 px-3 py-2.5">
          <span className="text-[13.5px] font-semibold text-dark">{selecionado.nome}</span>
          <button onClick={() => onSelect(null)} className="flex border-none bg-transparent text-faint hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
            <Search size={14} />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar insumo substituto…"
            className="h-[40px] w-full rounded-[9px] border-[1.5px] border-line bg-white pl-8 pr-3 font-[inherit] text-[13px] text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12"
          />
          {open && (
            <div className="absolute inset-x-0 top-[44px] z-20 max-h-[220px] animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
              {carregando ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Buscando...</div>
              ) : disponiveis.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-[13px] text-muted">Nenhum insumo encontrado</div>
              ) : disponiveis.map(i => (
                <button
                  key={i.id}
                  onMouseDown={() => onSelect(i)}
                  className="flex w-full flex-col items-start gap-1 rounded-lg border-none bg-transparent px-[11px] py-2.5 text-left font-[inherit] hover:bg-cream"
                >
                  <span className="flex w-full items-center justify-between gap-2.5">
                    <span className="text-[13.5px] font-semibold text-dark">{i.nome}</span>
                    <span className="shrink-0 text-xs text-muted">{i.unidadeMedida}</span>
                  </span>
                  <EstoqueTags
                    fracionavel={i.fracionavel}
                    permitirEstoqueNegativo={i.permitirEstoqueNegativo}
                    estoqueAtual={i.estoqueAtual}
                    unidade={i.unidadeMedida ?? undefined}
                    variant="busca"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SecaoVinculoInsumo({ titulo, resumo, acao, onAcaoChange, children }: {
  titulo: string
  resumo: string
  acao: 'REMOVER_VINCULOS' | 'SUBSTITUIR'
  onAcaoChange: (a: 'REMOVER_VINCULOS' | 'SUBSTITUIR') => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-bold text-dark">{titulo}</div>
          <div className="text-[12.5px] text-muted">{resumo}</div>
        </div>
        <div className="flex gap-[3px] rounded-[9px] bg-line-soft p-[3px]">
          {([['REMOVER_VINCULOS', 'Remover'], ['SUBSTITUIR', 'Substituir']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => onAcaoChange(v)}
              className={clsx(
                'h-[30px] whitespace-nowrap rounded-[7px] border-none px-3 font-[inherit] text-xs font-semibold',
                acao === v ? 'bg-white text-dark shadow-[0_1px_4px_rgba(0,0,0,0.1)]' : 'bg-transparent text-dim'
              )}
            >{l}</button>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}

function InsumoResolverVinculosModal({ insumo, operacao, produtos, catalogoVinculos, loading, onClose, onSuccess, onError }: {
  insumo: InsumoResponse
  operacao: 'INATIVAR' | 'EXCLUIR'
  produtos: ProdutoRelacionadoResponse[]
  catalogoVinculos: VinculoCatalogoInsumoUI[]
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (mensagem: string) => void
}) {
  const [acaoFicha, setAcaoFicha] = useState<'REMOVER_VINCULOS' | 'SUBSTITUIR'>('REMOVER_VINCULOS')
  const [acaoCatalogo, setAcaoCatalogo] = useState<'REMOVER_VINCULOS' | 'SUBSTITUIR'>('REMOVER_VINCULOS')
  const [substitutosFicha, setSubstitutosFicha] = useState<Record<string, InsumoResponse | null>>({})
  const [substitutosCatalogo, setSubstitutosCatalogo] = useState<Record<string, InsumoResponse | null>>({})
  const [processando, setProcessando] = useState(false)

  const temFicha = produtos.length > 0
  const temCatalogo = catalogoVinculos.length > 0

  const podeConfirmar = !loading && !processando &&
    (!temFicha || acaoFicha === 'REMOVER_VINCULOS' || produtos.every(p => substitutosFicha[p.id])) &&
    (!temCatalogo || acaoCatalogo === 'REMOVER_VINCULOS' || catalogoVinculos.every(v => substitutosCatalogo[v.vinculoId]))

  const executar = async () => {
    setProcessando(true)
    try {
      await insumoService.resolverVinculos(insumo.id, {
        operacao,
        fichaTecnica: temFicha ? {
          acao: acaoFicha,
          substituicoes: acaoFicha === 'SUBSTITUIR'
            ? produtos.map(p => ({ produtoId: p.id, novoInsumoId: substitutosFicha[p.id]!.id }))
            : undefined,
        } : undefined,
        catalogo: temCatalogo ? {
          acao: acaoCatalogo,
          substituicoes: acaoCatalogo === 'SUBSTITUIR'
            ? catalogoVinculos.map(v => ({ vinculoId: v.vinculoId, novoInsumoId: substitutosCatalogo[v.vinculoId]!.id }))
            : undefined,
        } : undefined,
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      onError(extractApiError(err, 'Erro ao resolver vínculos. Tente novamente.'))
    } finally {
      setProcessando(false)
    }
  }

  const tituloAcao = operacao === 'INATIVAR' ? 'inativar' : 'excluir'

  return (
    <ModalShell
      open
      onClose={onClose}
      title={`Não foi possível ${tituloAcao}`}
      subtitle={insumo.nome}
      icon={<AlertCircle size={17} />}
      iconBg="rgba(192,73,43,0.10)"
      iconColor="#C0492B"
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={processando}>Cancelar</Button>
          <Button variant="primary" icon={processando ? undefined : <Repeat size={16} />} onClick={executar} disabled={!podeConfirmar}>
            {processando
              ? <span className="flex items-center gap-2"><Spinner size={16} trackColor="rgba(255,255,255,0.3)" /> Aplicando…</span>
              : 'Confirmar'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2.5 px-5 py-8 text-sm text-muted">
          <Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando vínculos…
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm leading-[1.6] text-body">
            Este insumo está vinculado. Escolha como resolver cada vínculo antes de continuar.
          </p>

          {temFicha && (
            <SecaoVinculoInsumo
              titulo="Vínculo de ficha técnica"
              resumo={`${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`}
              acao={acaoFicha}
              onAcaoChange={setAcaoFicha}
            >
              {acaoFicha === 'REMOVER_VINCULOS' ? (
                <div className="overflow-hidden rounded-[14px] border border-line">
                  {produtos.map((p, i) => (
                    <div key={p.id} className={clsx('flex items-center gap-3.5 bg-white px-4 py-3.5', i > 0 && 'border-t border-line')}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-teal/10 text-teal">
                        <Box size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {p.identificador && (
                            <span className="shrink-0 text-[12px] font-semibold text-muted [font-variant-numeric:tabular-nums]">{p.identificador}</span>
                          )}
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-dark">{p.nome}</span>
                        </div>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-line-soft px-2.5 py-1 text-[11px] font-semibold text-subtle">
                        {TIPO_PRODUTO_LABEL[p.tipo] ?? p.tipo}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {produtos.map(p => (
                    <SeletorInsumoSubstituto
                      key={p.id}
                      produto={p}
                      insumoAtualId={insumo.id}
                      selecionado={substitutosFicha[p.id] ?? null}
                      onSelect={i => setSubstitutosFicha(prev => ({ ...prev, [p.id]: i }))}
                    />
                  ))}
                </div>
              )}
            </SecaoVinculoInsumo>
          )}

          {temCatalogo && (
            <SecaoVinculoInsumo
              titulo="Vínculo de catálogo"
              resumo={`${catalogoVinculos.length} ${catalogoVinculos.length === 1 ? 'vínculo' : 'vínculos'}`}
              acao={acaoCatalogo}
              onAcaoChange={setAcaoCatalogo}
            >
              {acaoCatalogo === 'REMOVER_VINCULOS' ? (
                <div className="overflow-hidden rounded-[14px] border border-line">
                  {catalogoVinculos.map((v, i) => (
                    <div key={v.vinculoId} className={clsx('flex items-center gap-3.5 bg-white px-4 py-3.5', i > 0 && 'border-t border-line')}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-teal/10 text-teal">
                        <Layers size={15} />
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-dark">{v.catalogoNome}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {catalogoVinculos.map(v => (
                    <SeletorInsumoSubstitutoVinculo
                      key={v.vinculoId}
                      label={`${v.catalogoNome} · Componente do item`}
                      insumoAtualId={insumo.id}
                      selecionado={substitutosCatalogo[v.vinculoId] ?? null}
                      onSelect={i => setSubstitutosCatalogo(prev => ({ ...prev, [v.vinculoId]: i }))}
                    />
                  ))}
                </div>
              )}
            </SecaoVinculoInsumo>
          )}
        </div>
      )}
    </ModalShell>
  )
}

// #336 (V0.10.0) — dimensão que precisa virar filtro server-side (bug original: "Ativos"/
// "Inativos" filtravam client-side sobre a janela paginada). "Estoque baixo/negativo/positivo"
// continuam client-side, escopo consciente — ver contrato-insumo.md.
const FILTRO_TO_ATIVO: Record<string, boolean | undefined> = {
  Todos: undefined,
  Ativos: true,
  Inativos: false,
}

export default function ListaInsumosPage() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState('Todos')
  const isFirstFiltro = useRef(true)
  // #295 (V0.14.0, RN-NOVA-2) — default identificador decrescente, sem interação do usuário.
  const [ordenarPor, setOrdenarPor] = useState<CampoOrdenacaoInsumo>('numero')
  const [direcao, setDirecao] = useState<'ASC' | 'DESC'>('DESC')
  const isFirstSort = useRef(true)
  const [confirmAcao, setConfirmAcao] = useState<{ tipo: 'inativar' | 'excluir'; insumo: InsumoResponse } | null>(null)
  const [processandoAcao, setProcessandoAcao] = useState(false)
  const [bloqueio, setBloqueio] = useState<{ insumo: InsumoResponse; operacao: 'INATIVAR' | 'EXCLUIR'; produtos: ProdutoRelacionadoResponse[]; catalogoVinculos: VinculoCatalogoInsumoUI[]; loading: boolean } | null>(null)
  // RN-NOVA-4 (V0.10.0, #336) — contadores por filtro, agregados no backend (não sobre a janela
  // paginada já carregada no cliente).
  const [contadores, setContadores] = useState<InsumoContagensResponse | null>(null)
  const { toast, setToast } = useToast()

  const {
    items: insumos,
    setItems: setInsumos,
    hasMore: hasNext,
    loading,
    loadingMore,
    loadMore: carregarMais,
    query,
    setQuery,
    reset: carregar,
  } = useDebounceSearch({
    fetcher: (page, size, q) => insumoService.listar(page, size, q, FILTRO_TO_ATIVO[filtro], `${ordenarPor},${direcao.toLowerCase()}`, false),
  })

  const carregarContadores = () => {
    insumoService.contagens().then(setContadores).catch(() => {})
  }

  useEffect(() => {
    carregarContadores()
  }, [])

  useEffect(() => {
    if (isFirstFiltro.current) { isFirstFiltro.current = false; return }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  useEffect(() => {
    if (isFirstSort.current) { isFirstSort.current = false; return }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenarPor, direcao])

  const handleSort = (campo: CampoOrdenacaoInsumo) => {
    if (ordenarPor === campo) {
      setDirecao(prev => prev === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setOrdenarPor(campo)
      setDirecao('ASC')
    }
  }

  const handleQueryChange = (novaQuery: string) => {
    setQuery(novaQuery)
  }

  const handleConfirmarAcao = async () => {
    if (!confirmAcao) return
    const { tipo, insumo } = confirmAcao
    setProcessandoAcao(true)
    try {
      if (tipo === 'inativar') {
        await insumoService.inativar(insumo.id)
        setInsumos(prev => prev.map(x => x.id === insumo.id ? { ...x, ativo: false } : x))
        setToast('Insumo inativado.')
      } else {
        await insumoService.excluir(insumo.id)
        setInsumos(prev => prev.filter(x => x.id !== insumo.id))
        setToast('Insumo excluído.')
      }
      setConfirmAcao(null)
      carregarContadores()
    } catch (err: any) {
      const mensagem = err?.response?.data?.message as string | undefined
      if (err?.response?.status === 400 && mensagem?.includes('vinculado')) {
        setConfirmAcao(null)
        const operacao = tipo === 'inativar' ? 'INATIVAR' : 'EXCLUIR'
        setBloqueio({ insumo, operacao, produtos: [], catalogoVinculos: [], loading: true })
        try {
          const [produtos, catalogoVinculos] = await Promise.all([
            insumoService.listarProdutosRelacionados(insumo.id),
            carregarVinculosCatalogoInsumo(insumo.id),
          ])
          setBloqueio({ insumo, operacao, produtos, catalogoVinculos, loading: false })
        } catch (err2) {
          console.error(err2)
          setBloqueio(null)
          setToast('Erro ao verificar produtos vinculados. Tente novamente.')
        }
      } else {
        console.error(err)
        setToast(extractApiError(err, tipo === 'inativar' ? 'Erro ao inativar. Tente novamente.' : 'Erro ao excluir. Tente novamente.'))
        setConfirmAcao(null)
      }
    } finally {
      setProcessandoAcao(false)
    }
  }

  const handleReativar = async (insumo: InsumoResponse) => {
    try {
      await insumoService.reativar(insumo.id)
      setInsumos(prev => prev.map(x => x.id === insumo.id ? { ...x, ativo: true } : x))
      setToast('Insumo reativado.')
      carregarContadores()
    } catch (err) {
      console.error(err)
      setToast(extractApiError(err, 'Erro ao reativar. Tente novamente.'))
    }
  }

  // "Ativos"/"Inativos" já vêm filtrados do servidor (FILTRO_TO_ATIVO no fetcher) — só as 3 abas
  // de estoque continuam filtrando sobre a janela carregada (escopo consciente, ver #336 acima).
  let lista = insumos
  if (filtro === 'Estoque baixo')     lista = lista.filter(isLow)
  if (filtro === 'Estoque negativo')  lista = lista.filter(isNegative)
  if (filtro === 'Estoque positivo')  lista = lista.filter(isPositive)

  const empty = !loading && insumos.length === 0

  // RN-NOVA-4 (#336) — contador exibido no badge de cada aba, sempre do endpoint agregado (nunca
  // recalculado sobre a janela carregada) — só null enquanto a 1ª chamada não voltou.
  const contagemPorFiltro: Record<string, number | undefined> = contadores ? {
    Todos: contadores.todos,
    Ativos: contadores.ativos,
    Inativos: contadores.inativos,
    'Estoque baixo': contadores.estoqueBaixo,
    'Estoque negativo': contadores.estoqueNegativo,
    'Estoque positivo': contadores.estoquePositivo,
  } : {}

  const chipConfig: Record<string, {
    icon: LucideIcon
    textClass: string
    activeClass: string
    badgeBgClass: string
    badgeTextClass: string
  }> = {
    'Estoque baixo':    { icon: AlertCircle, textClass: 'text-warning', activeClass: 'border-warning bg-warning', badgeBgClass: 'bg-warning-bg', badgeTextClass: 'text-warning' },
    'Estoque negativo': { icon: AlertCircle, textClass: 'text-danger',  activeClass: 'border-danger bg-danger',   badgeBgClass: 'bg-danger-bg',  badgeTextClass: 'text-danger' },
    'Estoque positivo': { icon: CheckCircle, textClass: 'text-success', activeClass: 'border-success bg-success', badgeBgClass: 'bg-success-bg', badgeTextClass: 'text-success' },
  }

  return (
    <AppLayout active="insumos" compact>

      {/* TOAST */}
      <Toast message={toast} />

      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Meus Insumos</h1>
          <p className="mt-[7px] mb-0 text-[14.5px] text-muted">
            A base de toda precificação justa começa aqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* V0.15.0 (#542, RN-NOVA-4) — a compra passou para o módulo Compras; o modal carrinho saiu. */}
          <Button variant="secondary" icon={<ShoppingCart size={17} />} onClick={() => navigate('/compras/nova')}>
            Registrar compra
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/insumos/novo')}>
            Novo Insumo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando insumos…
        </div>
      ) : empty ? (
        <EmptyState
          icon={<Box size={20} />}
          title="Nenhum insumo cadastrado ainda"
          description="Cadastre o primeiro para começar a montar suas fichas técnicas."
          action={{ label: 'Cadastrar primeiro insumo', icon: <Plus size={16} />, onClick: () => navigate('/insumos/novo') }}
        />
      ) : (
        <>
          <div className="mb-section flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => {
                const on = filtro === f
                const chip = chipConfig[f]
                const count = contagemPorFiltro[f]
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={clsx(
                      'inline-flex h-[34px] items-center gap-[7px] rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on
                        ? chip ? clsx(chip.activeClass, 'text-white') : 'border-teal bg-teal text-white'
                        : 'border-line bg-white text-body hover:bg-cream'
                    )}
                  >
                    {chip && (
                      <span className={clsx('flex', on ? 'text-white' : chip.textClass)}>
                        <chip.icon size={14} />
                      </span>
                    )}
                    {f}
                    {count != null && (
                      <span className={clsx(
                        'grid h-section min-w-section place-items-center rounded-full px-1.5 text-[11px] font-bold',
                        on
                          ? 'bg-white/[0.28] text-white'
                          : chip ? clsx(chip.badgeBgClass, chip.badgeTextClass) : 'bg-line-soft text-body'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="relative max-w-[440px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-muted">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Buscar por nome ou marca…"
                className="h-11 w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-sm text-dark outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12"
              />
            </div>
          </div>

          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="hidden grid-cols-[0.7fr_2fr_0.55fr_0.85fr_0.8fr_1fr_1fr_40px] gap-3 border-b border-line px-section py-[13px] sm:grid">
              {COLUNAS.map((col, k) => (
                <div key={k} className={clsx(!col.campo && 'flex items-center text-[11.5px] font-semibold uppercase tracking-[0.04em] text-dim')}>
                  {col.campo ? (
                    <SortableHeader
                      label={col.label}
                      field={col.campo}
                      activeField={ordenarPor}
                      dir={direcao === 'ASC' ? 'asc' : 'desc'}
                      onSort={handleSort}
                    />
                  ) : col.label}
                </div>
              ))}
            </div>

            {lista.length === 0 ? (
              <EmptyState compact title="Nenhum insumo encontrado" description="Ajuste os filtros ou a busca." />
            ) : lista.map((o, i) => (
              <React.Fragment key={o.id}>
                <InsumoRow
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onInativar={() => setConfirmAcao({ tipo: 'inativar', insumo: o })}
                  onReativar={() => handleReativar(o)}
                  onExcluir={() => setConfirmAcao({ tipo: 'excluir', insumo: o })}
                />
                <InsumoCard
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onInativar={() => setConfirmAcao({ tipo: 'inativar', insumo: o })}
                  onReativar={() => handleReativar(o)}
                  onExcluir={() => setConfirmAcao({ tipo: 'excluir', insumo: o })}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3.5 flex flex-col items-center gap-3">
            <div className="w-full text-right text-[12.5px] text-muted">
              {lista.length} {lista.length === 1 ? 'insumo' : 'insumos'}
            </div>
            {hasNext && (
              <button
                onClick={carregarMais}
                disabled={loadingMore}
                className={clsx(
                  'inline-flex h-11 items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-6 font-[inherit] text-sm font-semibold text-teal transition-colors duration-100',
                  loadingMore ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-teal/6'
                )}
              >
                {loadingMore
                  ? <><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</>
                  : <>Carregar mais <ChevronRight size={15} className="rotate-90" /></>
                }
              </button>
            )}
          </div>
        </>
      )}

      {/* MODAL: confirmar inativação (reversível) */}
      <ConfirmacaoModal
        open={confirmAcao?.tipo === 'inativar'}
        onClose={() => setConfirmAcao(null)}
        onConfirm={handleConfirmarAcao}
        variant="danger"
        title={`Inativar "${confirmAcao?.insumo.nome}"?`}
        icon={<Power size={16} />}
        width={420}
        confirmLabel="Inativar insumo"
        confirmingLabel="Inativando…"
        confirming={processandoAcao}
        description="O insumo ficará inativo e não poderá ser usado em novas fichas técnicas. Você pode reativá-lo quando quiser."
      />

      {/* MODAL: confirmar exclusão (permanente) */}
      <ConfirmacaoModal
        open={confirmAcao?.tipo === 'excluir'}
        onClose={() => setConfirmAcao(null)}
        onConfirm={handleConfirmarAcao}
        variant="danger"
        title={`Excluir "${confirmAcao?.insumo.nome}" permanentemente?`}
        icon={<Trash2 size={16} />}
        width={420}
        confirmLabel="Excluir insumo"
        confirmingLabel="Excluindo…"
        confirming={processandoAcao}
        description='Esta ação exclui o insumo definitivamente e não pode ser desfeita. Se quiser apenas suspender o uso dele, use "Inativar".'
      />

      {/* MODAL: bloqueio ao inativar/excluir insumo em uso — resolução via inativar vinculados ou substituir */}
      {bloqueio && (
        <InsumoResolverVinculosModal
          insumo={bloqueio.insumo}
          operacao={bloqueio.operacao}
          produtos={bloqueio.produtos}
          catalogoVinculos={bloqueio.catalogoVinculos}
          loading={bloqueio.loading}
          onClose={() => setBloqueio(null)}
          onSuccess={() => {
            const { insumo, operacao } = bloqueio
            if (operacao === 'INATIVAR') {
              setInsumos(prev => prev.map(x => x.id === insumo.id ? { ...x, ativo: false } : x))
              setToast('Insumo inativado.')
            } else {
              setInsumos(prev => prev.filter(x => x.id !== insumo.id))
              setToast('Insumo excluído.')
            }
            setBloqueio(null)
          }}
          onError={mensagem => setToast(mensagem)}
        />
      )}

    </AppLayout>
  )
}
