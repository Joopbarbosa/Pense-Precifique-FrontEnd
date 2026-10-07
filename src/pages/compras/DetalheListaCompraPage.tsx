import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FileText, ListChecks, PackagePlus, Pencil, RefreshCw } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, ModalShell } from '../../components/ui'
import { STATUS_LISTA_LABEL, StatusListaBadge } from '../../components/compra/StatusCompraBadge'
import { useModalErro } from '../../hooks/useModalErro'
import Spinner from '../../components/ui/Spinner'
import Toast from '../../components/shared/Toast'
import { formatarData, moeda, qtd } from '../../components/compra/formato'
import { listaCompraService } from '../../services/compraService'
import { useToast } from '../../hooks/useToast'
import { extractApiError } from '../../utils/apiError'
import type { ListaCompraItemResponse, ListaCompraResponse, StatusListaCompra } from '../../types/compra'

// #546 (RN-NOVA-12/13) — retrato imutável da lista LST-N, agrupado por fornecedor ("Sem fornecedor"
// no fim, como no PDF #547). "Criar compra a partir da lista" abre um rascunho novo sem preços.
// #596 (RN-NOVA-41) — status com troca manual livre (nunca volta para Rascunho; rascunho só vai para
// Cancelada ou é gerado pelo botão). Criar compra só em Gerada e Parcialmente comprada.

const DESTINOS: StatusListaCompra[] = ['GERADA', 'PARCIALMENTE_COMPRADA', 'COMPRADA', 'CANCELADA']

function agrupar(itens: ListaCompraItemResponse[]) {
  const grupos = new Map<string, { nome: string; itens: ListaCompraItemResponse[] }>()
  itens.forEach(i => {
    const k = i.fornecedorId ?? ''
    if (!grupos.has(k)) grupos.set(k, { nome: i.fornecedorNome ?? 'Sem fornecedor', itens: [] })
    grupos.get(k)!.itens.push(i)
  })
  return [...grupos.entries()].sort(([a, ga], [b, gb]) => (a === '' ? 1 : b === '' ? -1 : ga.nome.localeCompare(gb.nome, 'pt-BR'))).map(([, g]) => g)
}

export default function DetalheListaCompraPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, setToast } = useToast()
  const [lista, setLista] = useState<ListaCompraResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [trocandoStatus, setTrocandoStatus] = useState(false)
  const [novoStatus, setNovoStatus] = useState<StatusListaCompra | null>(null)
  const { modalErro, mostrarErro } = useModalErro()

  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) { setToast(msg); navigate(location.pathname, { replace: true, state: null }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    if (!id) return
    listaCompraService.buscar(id).then(setLista).catch(err => setErro(extractApiError(err, 'Não foi possível carregar a lista.')))
  }, [id])

  const criarCompra = async () => {
    if (!lista) return
    setCriando(true)
    try {
      const compra = await listaCompraService.criarCompra(lista.id)
      navigate(`/compras/${compra.id}/editar`)
    } catch (err) {
      mostrarErro(err, 'Não foi possível criar a compra.')
    } finally {
      setCriando(false)
    }
  }

  const gerar = async () => {
    if (!lista) return
    setCriando(true)
    try {
      const gerada = await listaCompraService.gerarRascunho(lista.id)
      setLista(gerada)
      setToast(`Lista ${gerada.identificador} gerada.`)
    } catch (err) {
      mostrarErro(err, 'Não foi possível gerar a lista.')
    } finally {
      setCriando(false)
    }
  }

  const salvarStatus = async () => {
    if (!lista || !novoStatus) return
    setCriando(true)
    try {
      const atualizada = await listaCompraService.alterarStatus(lista.id, novoStatus)
      setLista(atualizada)
      setTrocandoStatus(false)
      setToast(`Lista ${atualizada.identificador}: ${STATUS_LISTA_LABEL[atualizada.status]}.`)
    } catch (err) {
      mostrarErro(err, 'Não foi possível mudar o status.')
    } finally {
      setCriando(false)
    }
  }

  if (erro || !lista) {
    return (
      <AppLayout active="compras" compact>
        {erro
          ? <><div className="rounded-input border border-danger-line bg-danger-tint px-3.5 py-3 text-[13.5px] text-danger-deep">{erro}</div>
              <div className="mt-4"><Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras/lista?aba=historico')}>Voltar</Button></div></>
          : <div className="flex items-center gap-2.5 py-10 text-sm text-muted"><Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando lista…</div>}
      </AppLayout>
    )
  }

  const rascunho = lista.status === 'RASCUNHO'
  const podeCriarCompra = lista.status === 'GERADA' || lista.status === 'PARCIALMENTE_COMPRADA'
  const destinos = rascunho ? (['CANCELADA'] as StatusListaCompra[]) : DESTINOS.filter(d => d !== lista.status)

  return (
    <AppLayout active="compras" compact>
      <Toast message={toast} />
      <div className="mb-3 flex items-center gap-[7px] text-[12.5px] text-muted">
        <span className="cursor-pointer font-medium hover:text-teal" onClick={() => navigate('/compras/lista?aba=historico')}>Lista de compras</span>
        <ChevronRight size={15} className="text-dim" />
        <span className="font-semibold text-body">{lista.identificador}</span>
      </div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-dark">Lista {lista.identificador}</h1>
            <StatusListaBadge status={lista.status} />
          </div>
          <div className="mt-1 text-sm text-muted">
            {rascunho
              ? `Rascunho · ${lista.itens.length} ${lista.itens.length === 1 ? 'insumo' : 'insumos'} · ainda pode ser editado`
              : `Gerada em ${formatarData(lista.geradaEm)} · ${lista.itens.length} ${lista.itens.length === 1 ? 'insumo' : 'insumos'} · retrato do momento da geração`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras/lista?aba=historico')}>Voltar</Button>
          <Button variant="ghost" icon={<FileText size={16} />} onClick={() => navigate(`/compras/lista/${lista.id}/pdf`)}>PDF</Button>
          {destinos.length > 0 && (
            <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={() => { setNovoStatus(destinos[0]); setTrocandoStatus(true) }}>Mudar status</Button>
          )}
          {rascunho && <>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => navigate(`/compras/lista?aba=nova&rascunho=${lista.id}`)}>Editar rascunho</Button>
            <Button variant="primary" icon={criando ? <Spinner size={15} /> : <ListChecks size={16} />} disabled={criando} onClick={gerar}>Gerar lista</Button>
          </>}
          {podeCriarCompra && (
            <Button variant="primary" icon={criando ? <Spinner size={15} /> : <PackagePlus size={16} />} disabled={criando} onClick={criarCompra}>
              Criar compra a partir da lista
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {agrupar(lista.itens).map(g => (
          <div key={g.nome} data-testid="grupo-lista" className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <div className="border-b border-line px-5 py-3 text-[13.5px] font-bold text-dark">{g.nome}</div>
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-3 bg-cream px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim md:grid">
              <span>Insumo</span><span>Estoque na geração</span><span>Comprar</span><span>Preço ref.</span>
            </div>
            {g.itens.map(i => (
              <div key={i.ordem} className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-[13.5px] md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                <span className="col-span-2 font-semibold text-dark md:col-span-1">{i.insumoNome}</span>
                <span className="text-body [font-variant-numeric:tabular-nums]">{qtd(i.estoqueAtual)} {i.unidade}{i.estoqueMinimo != null ? ` (mín. ${qtd(i.estoqueMinimo)})` : ''}</span>
                <span className="font-bold text-teal [font-variant-numeric:tabular-nums]">{i.quantidade != null ? `${qtd(i.quantidade)} ${i.unidade}` : <span className="font-normal italic text-faint">sem quantidade</span>}</span>
                <span className="text-body [font-variant-numeric:tabular-nums]">{i.precoReferencia != null ? `${moeda(i.precoReferencia)} / ${i.unidade}` : '—'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {trocandoStatus && (
        <ModalShell open onClose={() => setTrocandoStatus(false)} title="Mudar o status da lista" subtitle={lista.identificador} icon={<RefreshCw size={16} />} width={460}
          footer={<>
            <Button variant="ghost" onClick={() => setTrocandoStatus(false)} disabled={criando}>Voltar</Button>
            <Button variant="primary" onClick={salvarStatus} disabled={criando || !novoStatus}>{criando ? 'Salvando…' : 'Salvar status'}</Button>
          </>}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13.5px] text-body">
              Status atual: <strong className="text-dark">{STATUS_LISTA_LABEL[lista.status]}</strong>. Use quando souber de compras feitas fora do sistema.
              {rascunho ? ' Um rascunho só pode ser cancelado aqui; para gerar, use "Gerar lista".' : ' Uma lista não volta para Rascunho.'}
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Novo status">
              {destinos.map(d => (
                <label key={d} className="flex cursor-pointer items-center gap-2.5 rounded-input border-[1.5px] border-line px-3.5 py-2.5 hover:bg-cream">
                  <input type="radio" name="status-lista" checked={novoStatus === d} onChange={() => setNovoStatus(d)} className="h-4 w-4 accent-teal" />
                  <StatusListaBadge status={d} size="sm" />
                </label>
              ))}
            </div>
          </div>
        </ModalShell>
      )}
      {modalErro}
    </AppLayout>
  )
}
