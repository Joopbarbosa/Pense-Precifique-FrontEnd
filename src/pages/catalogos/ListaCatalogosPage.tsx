import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ModalShell from '../../components/ui/ModalShell'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { Files, Save, Pencil, Copy, Power, Plus, Search, ArrowDown } from 'lucide-react'
import { catalogoService } from '../../services/catalogoService'
import type { CatalogoResponse } from '../../types/catalogo'

type CampoOrdenacao = 'numero' | 'nome' | 'margem' | 'quantidadeItens'

const COLUNAS: { label: string; campo: CampoOrdenacao | null }[] = [
  { label: 'Identificador', campo: 'numero' },
  { label: 'Nome', campo: 'nome' },
  { label: 'Margem', campo: 'margem' },
  { label: 'Itens', campo: 'quantidadeItens' },
  { label: 'Status', campo: null },
  { label: '', campo: null },
]

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const inputClass = (hasError?: boolean) => clsx(
  'h-[46px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150',
  hasError ? 'border-[#E05C3A] shadow-[0_0_0_4px_rgba(224,92,58,0.10)]' : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
)

function EditarCatalogoModal({ catalogo, onClose, onSuccess }: {
  catalogo: CatalogoResponse
  onClose: () => void
  onSuccess: (atualizado: CatalogoResponse) => void
}) {
  const [nome, setNome] = useState(catalogo.nome)
  const [margem, setMargem] = useState(catalogo.margem.toString())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const salvar = async () => {
    setErro('')
    setFieldErrors({})
    setSalvando(true)
    try {
      const atualizado = await catalogoService.editar(catalogo.id, { nome: nome.trim(), margem: num(margem) })
      onSuccess(atualizado)
    } catch (err: any) {
      const data = err.response?.data
      const msg: string | undefined = data?.message
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (msg && /margem/i.test(msg)) {
        fe.margem = msg
        setFieldErrors(fe)
      } else if (msg && /nome/i.test(msg)) {
        fe.nome = msg
        setFieldErrors(fe)
      } else {
        setFieldErrors(fe)
        setErro(msg || 'Erro ao salvar catálogo. Tente novamente.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Editar catálogo"
      subtitle={catalogo.identificador}
      icon={<Files size={22} />}
      iconBg="rgba(42,157,143,0.10)"
      iconColor="#2A9D8F"
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button variant="primary" icon={<Save size={16} />} disabled={salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label>
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Nome do catálogo *</span>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            className={inputClass(!!fieldErrors.nome)}
          />
          {fieldErrors.nome && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.nome}</span>}
        </label>
        <label>
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Margem de lucro *</span>
          <div className="relative">
            <input
              value={margem}
              onChange={e => setMargem(e.target.value.replace(/[^\d.,]/g, ''))}
              inputMode="decimal"
              className={clsx(inputClass(!!fieldErrors.margem), 'pr-10')}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#A8A49C]">%</span>
          </div>
          {fieldErrors.margem && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.margem}</span>}
          <span className="mt-1.5 block text-xs text-muted">Itens sem preço ajustado manualmente recalculam automaticamente.</span>
        </label>
        {erro && (
          <p className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-[#C0392B]">
            {erro}
          </p>
        )}
      </div>
    </ModalShell>
  )
}

function CatalogoStatusBadge({ ativo, small = false }: { ativo: boolean; small?: boolean }) {
  if (!ativo) return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-line-soft px-2.5 font-semibold text-subtle',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      Inativo
    </span>
  )

  return (
    <span className={clsx(
      'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-teal/10 px-2.5 font-semibold text-teal',
      small ? 'h-6 text-[11.5px]' : 'h-7 text-[12.5px]'
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      Ativo
    </span>
  )
}

interface CatalogoAcoesProps {
  onVer: () => void
  onEditar: () => void
  onDuplicar: () => void
  onDesativar: () => void
  onReativar: () => void
}

function montarMenuItems(catalogo: CatalogoResponse, { onEditar, onDuplicar, onDesativar, onReativar }: Omit<CatalogoAcoesProps, 'onVer'>): ActionMenuItem[] {
  return catalogo.ativo
    ? [
        { label: 'Editar',    icon: <Pencil size={16} />, onClick: onEditar },
        { label: 'Duplicar',  icon: <Copy size={16} />,   onClick: onDuplicar },
        { label: 'Desativar', icon: <Power size={16} />,  onClick: onDesativar, danger: true, dividerBefore: true },
      ]
    : [
        { label: 'Editar',   icon: <Pencil size={16} />, onClick: onEditar },
        { label: 'Duplicar', icon: <Copy size={16} />,   onClick: onDuplicar },
        { label: 'Reativar', icon: <Power size={16} />,  onClick: onReativar, dividerBefore: true },
      ]
}

function CatalogoRow({ catalogo, index, onVer, onEditar, onDuplicar, onDesativar, onReativar }: CatalogoAcoesProps & {
  catalogo: CatalogoResponse; index: number
}) {
  const menuItems = montarMenuItems(catalogo, { onEditar, onDuplicar, onDesativar, onReativar })

  return (
    <div
      className={clsx(
        'hidden cursor-pointer grid-cols-[0.8fr_2.2fr_0.8fr_0.9fr_0.9fr_40px] items-center gap-3 border-b border-line px-[18px] py-[13px] transition-colors duration-100 last:border-b-0 hover:bg-[#FCFBF9] sm:grid',
        !catalogo.ativo && 'opacity-[0.72]'
      )}
      onClick={onVer}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
    >
      <div className="text-[13.5px] font-semibold text-body [font-variant-numeric:tabular-nums]">
        {catalogo.identificador}
      </div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-dark">
        {catalogo.nome}
      </div>
      <div className="text-sm text-body [font-variant-numeric:tabular-nums]">
        {catalogo.margem}%
      </div>
      <div className="text-sm text-body [font-variant-numeric:tabular-nums]">
        {catalogo.quantidadeItens} {catalogo.quantidadeItens === 1 ? 'item' : 'itens'}
      </div>
      <div><CatalogoStatusBadge ativo={catalogo.ativo} /></div>
      <div className="flex justify-end">
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function CatalogoCard({ catalogo, index, onVer, onEditar, onDuplicar, onDesativar, onReativar }: CatalogoAcoesProps & {
  catalogo: CatalogoResponse; index: number
}) {
  const menuItems = montarMenuItems(catalogo, { onEditar, onDuplicar, onDesativar, onReativar })

  return (
    <div
      className={clsx('block cursor-pointer border-b border-line px-[18px] py-4 sm:hidden', !catalogo.ativo && 'opacity-[0.72]')}
      onClick={onVer}
      style={{ animation: 'fadeUp .4s ease both', animationDelay: `${index * 0.04}s` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted">{catalogo.identificador}</div>
          <div className="mt-0.5 text-[14.5px] font-semibold text-dark">{catalogo.nome}</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <CatalogoStatusBadge ativo={catalogo.ativo} small />
            <span className="text-[12.5px] text-body">
              {catalogo.margem}% de margem
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-start gap-1">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Itens</div>
            <div className="text-sm font-semibold text-dark [font-variant-numeric:tabular-nums]">{catalogo.quantidadeItens}</div>
          </div>
          <ActionMenu items={menuItems} align="right" />
        </div>
      </div>
    </div>
  )
}

export default function ListaCatalogosPage() {
  const navigate = useNavigate()
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [modalCatalogo, setModalCatalogo] = useState<{ tipo: 'editar' | 'desativar'; catalogo: CatalogoResponse } | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  const [busca, setBusca] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<CampoOrdenacao | null>(null)
  const [direcao, setDirecao] = useState<'ASC' | 'DESC'>('ASC')

  const carregar = useCallback(() => {
    setLoading(true)
    setErro(null)
    catalogoService.listar({
      busca: busca.trim() || undefined,
      ordenarPor: ordenarPor ?? undefined,
      direcao,
    })
      .then(setCatalogos)
      .catch(() => setErro('Não foi possível carregar os catálogos. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [busca, ordenarPor, direcao])

  useEffect(() => {
    const delay = busca.trim() ? 300 : 0
    const t = setTimeout(() => carregar(), delay)
    return () => clearTimeout(t)
  }, [carregar])

  const handleSort = (campo: CampoOrdenacao) => {
    if (ordenarPor === campo) {
      setDirecao(prev => prev === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setOrdenarPor(campo)
      setDirecao('ASC')
    }
  }

  const handleEditarSucesso = (atualizado: CatalogoResponse) => {
    setCatalogos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
    setModalCatalogo(null)
  }

  const handleDuplicar = async (catalogo: CatalogoResponse) => {
    setErroAcao(null)
    setProcessando(true)
    try {
      const novo = await catalogoService.duplicar(catalogo.id)
      setCatalogos(prev => [novo, ...prev])
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao duplicar catálogo. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const handleReativar = async (catalogo: CatalogoResponse) => {
    setErroAcao(null)
    setProcessando(true)
    try {
      const atualizado = await catalogoService.reativar(catalogo.id)
      setCatalogos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao reativar catálogo. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const handleDesativarConfirm = async () => {
    if (!modalCatalogo) return
    setErroAcao(null)
    setProcessando(true)
    try {
      const atualizado = await catalogoService.desativar(modalCatalogo.catalogo.id)
      setCatalogos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c))
      setModalCatalogo(null)
    } catch (err: any) {
      setErroAcao(err.response?.data?.message || 'Erro ao desativar catálogo. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <AppLayout active="catalogos">

      {/* HEADER */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.02em] text-dark">Meus Catálogos</h1>
          <p className="mb-0 mt-1.5 text-[14.5px] text-muted">Organize seus produtos em catálogos com margem própria.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/catalogos/novo')}>
          Novo Catálogo
        </Button>
      </div>

      {erroAcao && (
        <div className="mb-4 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          {erroAcao}
        </div>
      )}

      {/* BUSCA */}
      <div className="group relative mb-[18px] max-w-[420px]">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-[#A8A49C] group-focus-within:text-teal">
          <Search size={18} />
        </span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white py-0 pl-[42px] pr-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-teal" />
          Carregando catálogos…
        </div>
      ) : erro ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">
          <span>{erro}</span>
          <Button variant="ghost" onClick={carregar}>Tentar novamente</Button>
        </div>
      ) : catalogos.length === 0 ? (
        <EmptyState
          icon={<Files size={22} />}
          title={busca.trim() ? 'Nenhum catálogo encontrado' : 'Nenhum catálogo cadastrado ainda'}
          description={busca.trim() ? 'Nenhum catálogo encontrado para essa busca.' : 'Crie seu primeiro catálogo para organizar produtos com uma margem própria.'}
          action={!busca.trim() ? { label: 'Criar primeiro catálogo', icon: <Plus size={16} />, onClick: () => navigate('/catalogos/novo') } : undefined}
        />
      ) : (
        <>
          <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="hidden grid-cols-[0.8fr_2.2fr_0.8fr_0.9fr_0.9fr_40px] gap-3 border-b border-line px-[18px] py-[13px] sm:grid">
              {COLUNAS.map((col, k) => {
                const ativa = col.campo != null && ordenarPor === col.campo
                return (
                  <div
                    key={k}
                    onClick={col.campo ? () => handleSort(col.campo!) : undefined}
                    className={clsx(
                      'flex select-none items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.04em]',
                      col.campo ? 'cursor-pointer' : 'cursor-default',
                      ativa ? 'text-teal' : 'text-[#A8A49C]'
                    )}
                  >
                    {col.label}
                    {ativa && (
                      <ArrowDown size={11} className={direcao === 'ASC' ? 'rotate-180' : ''} />
                    )}
                  </div>
                )
              })}
            </div>

            {catalogos.map((c, i) => (
              <React.Fragment key={c.id}>
                <CatalogoRow
                  catalogo={c} index={i}
                  onVer={() => navigate(`/catalogos/${c.id}`)}
                  onEditar={() => setModalCatalogo({ tipo: 'editar', catalogo: c })}
                  onDuplicar={() => handleDuplicar(c)}
                  onDesativar={() => setModalCatalogo({ tipo: 'desativar', catalogo: c })}
                  onReativar={() => handleReativar(c)}
                />
                <CatalogoCard
                  catalogo={c} index={i}
                  onVer={() => navigate(`/catalogos/${c.id}`)}
                  onEditar={() => setModalCatalogo({ tipo: 'editar', catalogo: c })}
                  onDuplicar={() => handleDuplicar(c)}
                  onDesativar={() => setModalCatalogo({ tipo: 'desativar', catalogo: c })}
                  onReativar={() => handleReativar(c)}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3.5 text-right text-[12.5px] text-muted">
            {catalogos.length} {catalogos.length === 1 ? 'catálogo' : 'catálogos'}
          </div>
        </>
      )}

      {modalCatalogo?.tipo === 'editar' && (
        <EditarCatalogoModal
          catalogo={modalCatalogo.catalogo}
          onClose={() => setModalCatalogo(null)}
          onSuccess={handleEditarSucesso}
        />
      )}

      <ConfirmacaoModal
        open={modalCatalogo?.tipo === 'desativar'}
        onClose={() => setModalCatalogo(null)}
        onConfirm={handleDesativarConfirm}
        variant="danger"
        title={`Desativar "${modalCatalogo?.catalogo.nome}"?`}
        icon={<Power size={16} />}
        width={440}
        confirmLabel="Desativar catálogo"
        confirmingLabel="Desativando…"
        confirming={processando}
        description="Todos os itens deste catálogo ficam bloqueados para venda enquanto ele estiver inativo. Nada é excluído e você pode reativar quando quiser."
      />

    </AppLayout>
  )
}
