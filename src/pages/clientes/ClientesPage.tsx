import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import { Pencil, Ban, Power, Phone, Plus, Users, Search, Mail } from 'lucide-react'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../hooks/useToast'
import { useDebounceSearch } from '../../hooks/useDebounceSearch'
import { extractApiError } from '../../utils/apiError'
import { mascararDocumento } from '../../utils/documento'
import { InativoBadge, PapelTags } from '../../components/cliente/PapelTags'
import type { ClienteContagensResponse, ClienteFiltros, ClienteResponse } from '../../types/cliente'

// V0.15.0 (#537, #536, #538) — cadastro único "Clientes e Fornecedores" (RN-NOVA-1/2/17). A rota e
// o service continuam `clientes` (DT-NOVA-1); só a interface muda de nome.

type FiltroId = 'todos' | 'clientes' | 'fornecedores' | 'inativos'

// Filtro server-side (mesmo padrão de ListaInsumosPage/#336): "Todos" = ativos dos dois papéis.
const FILTROS: { id: FiltroId; label: string; filtros: ClienteFiltros; contagem: keyof ClienteContagensResponse }[] = [
  { id: 'todos',        label: 'Todos',        filtros: {},                      contagem: 'ativos' },
  { id: 'clientes',     label: 'Clientes',     filtros: { papel: 'CLIENTE' },    contagem: 'clientes' },
  { id: 'fornecedores', label: 'Fornecedores', filtros: { papel: 'FORNECEDOR' }, contagem: 'fornecedores' },
  { id: 'inativos',     label: 'Inativos',     filtros: { ativo: false },        contagem: 'inativos' },
]

// ---------- Avatar ----------

function Avatar({ nome, inativa }: { nome: string; inativa: boolean }) {
  return (
    <span className={clsx(
      'grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-full text-base font-bold',
      inativa ? 'bg-line-deep text-dim opacity-70' : 'bg-teal/[0.13] text-teal'
    )}>
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// ---------- CadastroRow ----------

function CadastroRow({ cliente, index, rowZIndex, onAbrir, onEdit, onInativar, onReativar }: {
  cliente: ClienteResponse
  index: number
  rowZIndex: number
  onAbrir: (c: ClienteResponse) => void
  onEdit: (c: ClienteResponse) => void
  onInativar: (c: ClienteResponse) => void
  onReativar: (c: ClienteResponse) => void
}) {
  const inativa = !cliente.ativa
  const contato = cliente.whatsapp || cliente.telefone

  const menuItems: ActionMenuItem[] = [
    { label: 'Editar', icon: <Pencil size={16} />, onClick: () => onEdit(cliente) },
    inativa
      ? { label: 'Reativar', icon: <Power size={16} />, onClick: () => onReativar(cliente), dividerBefore: true }
      : { label: 'Inativar', icon: <Ban size={16} />,   onClick: () => onInativar(cliente), danger: true, dividerBefore: true },
  ]

  return (
    <div
      data-testid="cadastro-row"
      className={clsx(
        'relative block cursor-pointer rounded-card border border-[#F0EEE9] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-colors duration-100',
        'mb-3 md:mb-0 md:grid md:grid-cols-[2fr_1.2fr_1.2fr_46px] md:items-center md:gap-4 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-line md:p-0 md:px-[18px] md:py-3.5 md:shadow-none',
        inativa ? 'bg-cream' : 'bg-white md:bg-transparent',
        'hover:bg-line'
      )}
      style={{
        zIndex: rowZIndex,
        animation: 'fadeUp .4s ease both',
        animationDelay: `${index * 0.05}s`,
      }}
      onClick={() => onAbrir(cliente)}
    >
      {/* Nome + papéis */}
      <div className="flex min-w-0 items-center gap-[13px]">
        <Avatar nome={cliente.nome} inativa={inativa} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {cliente.identificador && (
              <span className="flex-shrink-0 text-[12.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">
                {cliente.identificador}
              </span>
            )}
            <span className={clsx(
              'overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold',
              inativa ? 'text-dim' : 'text-dark'
            )}>
              {cliente.nome}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PapelTags cliente={cliente} />
            {inativa && <InativoBadge />}
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="mt-2.5 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">Contato</span>
        <span className="inline-flex min-w-0 items-center gap-[7px] text-sm text-body">
          {contato ? (
            <><span className="flex text-teal"><Phone size={16} /></span>{contato}</>
          ) : cliente.email ? (
            <><span className="flex text-teal"><Mail size={16} /></span><span className="truncate">{cliente.email}</span></>
          ) : (
            <span className="text-[13.5px] italic text-faint">Não informado</span>
          )}
        </span>
      </div>

      {/* Documento */}
      <div className="mt-2 md:mt-0">
        <span className="mr-1.5 inline text-[11px] font-semibold uppercase tracking-[0.04em] text-faint md:hidden">CPF/CNPJ</span>
        {cliente.documento ? (
          <span className="text-sm text-body [font-variant-numeric:tabular-nums]">
            {mascararDocumento(cliente.documento, cliente.tipoPessoa)}
          </span>
        ) : (
          <span className="text-[13.5px] italic text-faint">Não informado</span>
        )}
      </div>

      {/* Menu de ações */}
      <div className="mt-2 flex justify-end md:mt-0" onClick={e => e.stopPropagation()}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

// ---------- ClientesPage ----------

export default function ClientesPage() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<FiltroId>('todos')
  const isFirstFiltro = useRef(true)
  const [contagens, setContagens] = useState<ClienteContagensResponse | null>(null)
  const filtroAtual = FILTROS.find(f => f.id === filtro)!

  const {
    items: cadastros,
    setItems: setCadastros,
    hasMore: hasNext,
    loading,
    loadingMore,
    loadMore,
    query,
    setQuery,
    reset: carregar,
  } = useDebounceSearch({
    fetcher: (page, size, q) => clienteService.listar(page, size, q, filtroAtual.filtros),
  })
  const { toast, setToast } = useToast()
  const [confirmInativar, setConfirmInativar] = useState<ClienteResponse | null>(null)

  const carregarContagens = () => {
    clienteService.contagens().then(setContagens).catch(() => {})
  }

  useEffect(() => { carregarContagens() }, [])

  useEffect(() => {
    if (isFirstFiltro.current) { isFirstFiltro.current = false; return }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const handleInativar = async () => {
    if (!confirmInativar) return
    const alvo = confirmInativar
    try {
      await clienteService.inativar(alvo.id)
      setCadastros(prev => prev.filter(c => c.id !== alvo.id))
      carregarContagens()
      setToast(`${alvo.nome} inativado.`)
    } catch (err) {
      setToast(extractApiError(err, 'Erro ao inativar. Tente novamente.'))
    } finally {
      setConfirmInativar(null)
    }
  }

  const handleReativar = async (alvo: ClienteResponse) => {
    try {
      await clienteService.reativar(alvo.id)
      setCadastros(prev => prev.filter(c => c.id !== alvo.id))
      carregarContagens()
      setToast(`${alvo.nome} reativado.`)
    } catch (err) {
      setToast(extractApiError(err, 'Erro ao reativar. Tente novamente.'))
    }
  }

  const openNova = () => navigate('/clientes/novo')
  const openEdit = (c: ClienteResponse) => navigate(`/clientes/${c.id}/editar`)
  const openDetalhe = (c: ClienteResponse) => navigate(`/clientes/${c.id}/editar`)

  // Estado "primeiro uso": nenhum cadastro na conta (ativo ou inativo).
  const semCadastros = contagens != null && contagens.ativos === 0 && contagens.inativos === 0 && !loading && !query.trim()

  return (
    <AppLayout active="clientes" compact>

      <Toast message={toast} />

      {/* HEADER */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Clientes e Fornecedores</h1>
          <p className="mt-[7px] mb-0 text-[14.5px] leading-[1.5] text-muted">
            Quem compra de você e de quem você compra, num cadastro só.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openNova}>
          Novo cadastro
        </Button>
      </div>

      {semCadastros ? (
        <div className="mt-[26px]">
          <EmptyState
            icon={<Users size={20} />}
            title="Nenhum cadastro ainda"
            description="Cadastre clientes para criar orçamentos e fornecedores para registrar compras."
            action={{ label: 'Fazer o primeiro cadastro', icon: <Plus size={16} />, onClick: openNova }}
          />
        </div>
      ) : (
        <>
          {/* FILTROS + BUSCA */}
          <div className="my-[22px] mb-[18px] flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-2">
              {FILTROS.map(f => {
                const on = filtro === f.id
                const count = contagens?.[f.contagem]
                return (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    aria-pressed={on}
                    className={clsx(
                      'inline-flex h-[34px] items-center gap-[7px] rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13px] font-semibold transition-all duration-150',
                      on ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream'
                    )}
                  >
                    {f.label}
                    {count != null && (
                      <span className={clsx(
                        'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[11px] font-bold',
                        on ? 'bg-white/[0.28] text-white' : 'bg-line-soft text-body'
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ"
                className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white pl-[42px] pr-4 font-[inherit] text-[14.5px] text-dark shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
              <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
              Carregando…
            </div>
          ) : (
            <div className="rounded-none border-0 bg-transparent shadow-none md:rounded-card md:border md:border-[#F0EEE9] md:bg-white md:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="hidden border-b border-line px-[18px] py-[13px] md:grid md:grid-cols-[2fr_1.2fr_1.2fr_46px] md:gap-4">
                {['Cadastro', 'Contato', 'CPF/CNPJ', ''].map((h, k) => (
                  <div key={k} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">{h}</div>
                ))}
              </div>

              {cadastros.length > 0 ? (
                cadastros.map((c, i) => (
                  <CadastroRow
                    key={c.id}
                    cliente={c}
                    index={i}
                    rowZIndex={cadastros.length - i}
                    onAbrir={openDetalhe}
                    onEdit={openEdit}
                    onInativar={setConfirmInativar}
                    onReativar={handleReativar}
                  />
                ))
              ) : (
                <EmptyState
                  compact
                  title={query.trim() ? `Nenhum cadastro encontrado para "${query}"` : filtro === 'inativos' ? 'Nenhum cadastro inativo' : 'Nenhum cadastro neste filtro'}
                  description={query.trim() ? 'Ajuste o termo de busca ou o filtro.' : 'Troque o filtro para ver os demais cadastros.'}
                />
              )}
            </div>
          )}

          {/* CARREGAR MAIS */}
          {hasNext && !loading && (
            <div className="mt-5 flex justify-center">
              <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore
                  ? <span className="flex items-center gap-2">
                      <Spinner size={15} color="#2A9D8F" trackColor="#EFEDE8" />
                      Carregando…
                    </span>
                  : 'Carregar mais'
                }
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmacaoModal
        open={!!confirmInativar}
        onClose={() => setConfirmInativar(null)}
        onConfirm={handleInativar}
        variant="danger"
        title={`Inativar "${confirmInativar?.nome}"?`}
        icon={<Ban size={16} />}
        width={420}
        confirmLabel="Inativar"
        description="O cadastro deixa de aparecer na escolha de cliente e de fornecedor. Orçamentos, vendas e compras que já usam este cadastro continuam iguais. Você pode reativá-lo depois, pelo filtro Inativos."
      />

    </AppLayout>
  )
}
