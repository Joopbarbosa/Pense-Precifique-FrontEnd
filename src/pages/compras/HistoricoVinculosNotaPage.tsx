import ModalDestinoVinculoNota from '../../components/compra/nota/ModalDestinoVinculoNota'
import { useEffect, useMemo, useState } from 'react'
import { History, Pencil, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Button, EmptyState, Field, ModalShell } from '../../components/ui'
import Spinner from '../../components/ui/Spinner'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import Toast from '../../components/shared/Toast'
import { FornecedorSelect, InsumoPicker } from '../../components/compra/Pickers'
import { formatarData, ORIGENS_VINCULO_NOTA, paraCampo, parseDecimal, qtd } from '../../components/compra/formato'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useModalErro } from '../../hooks/useModalErro'
import { useToast } from '../../hooks/useToast'
import { vinculoNotaService } from '../../services/vinculoNotaService'
import type { CadastroRef } from '../../types/compra'
import type { InsumoProposto } from '../../types/compraNota'
import type { VinculoNotaResponse } from '../../types/vinculoNota'
import type { PageResponse } from '../../types/shared'

type Acao = { tipo: 'editar' | 'desmarcar' | 'ignorar' | 'desfazer'; vinculo: VinculoNotaResponse }
const campo = 'h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3 text-sm text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/10'

export default function HistoricoVinculosNotaPage() {
  const navigate = useNavigate()
  const { toast, setToast } = useToast()
  const { modalErro, mostrarErro } = useModalErro()
  const [busca, setBusca] = useState('')
  const termo = useDebouncedValue(busca)
  const [cnpj, setCnpj] = useState('')
  const emitenteCnpj = useDebouncedValue(cnpj)
  const [fornecedor, setFornecedor] = useState<CadastroRef | null>(null)
  const [insumoFiltro, setInsumoFiltro] = useState<InsumoProposto | null>(null)
  const [estado, setEstado] = useState('')
  const [ordem, setOrdem] = useState('updatedAt,desc')
  const filtros = useMemo(() => ({ busca: termo.trim() || undefined, fornecedorId: fornecedor?.id, insumoId: insumoFiltro?.id, emitenteCnpj: emitenteCnpj.trim() || undefined,
    ignorar: estado === '' ? undefined : estado === 'ignorados', sort: ordem }), [termo, fornecedor, insumoFiltro, emitenteCnpj, estado, ordem])
  // A página volta a 0 quando os filtros mudam, sem efeito extra (que disparava uma requisição com a página antiga).
  const [estadoPagina, setEstadoPagina] = useState({ filtros, valor: 0 })
  const pagina = estadoPagina.filtros === filtros ? estadoPagina.valor : 0
  const setPagina = (atualizar: (atual: number) => number) =>
    setEstadoPagina(e => ({ filtros, valor: atualizar(e.filtros === filtros ? e.valor : 0) }))
  const [resultado, setResultado] = useState<PageResponse<VinculoNotaResponse> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroLista, setErroLista] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [acao, setAcao] = useState<Acao | null>(null)
  // #716 (RN-NOVA-24) — clique no registro: modal "Ir para…" (compra, fornecedor ou insumo).
  const [destinoDe, setDestinoDe] = useState<VinculoNotaResponse | null>(null)
  const [destino, setDestino] = useState<InsumoProposto | null>(null)
  const [fator, setFator] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Página explícita e descarte de respostas obsoletas: filtros/ações não podem restaurar dados antigos.
  useEffect(() => {
    let vigente = true
    setCarregando(true); setErroLista(false)
    vinculoNotaService.listar(pagina, 20, filtros).then(dados => {
      if (!vigente) return
      if (pagina > 0 && dados.content.length === 0) { setPagina(p => p - 1); return }
      setResultado(dados)
    }).catch(() => { if (vigente) { setResultado(null); setErroLista(true) } }).finally(() => { if (vigente) setCarregando(false) })
    return () => { vigente = false }
  }, [pagina, filtros, rodada])
  const abrir = (tipo: Acao['tipo'], vinculo: VinculoNotaResponse) => {
    setDestino(vinculo.insumo); setFator(paraCampo(vinculo.fator)); setAcao({ tipo, vinculo })
  }
  const executar = async () => {
    if (!acao) return
    setSalvando(true)
    try {
      const id = acao.vinculo.id
      if (acao.tipo === 'desfazer') await vinculoNotaService.desfazer(id)
      else if (acao.tipo === 'ignorar') await vinculoNotaService.ignorar(id, { ignorar: true })
      else if (acao.tipo === 'desmarcar') await vinculoNotaService.ignorar(id, { ignorar: false, insumoId: destino?.id ?? null, fator: parseDecimal(fator) })
      else await vinculoNotaService.editar(id, { insumoId: destino?.id ?? null, fator: parseDecimal(fator) })
      setAcao(null); setToast('Vínculo atualizado. A mudança vale para as próximas notas.'); setRodada(r => r + 1)
    } catch (err) { mostrarErro(err, 'Não foi possível atualizar o vínculo.') }
    finally { setSalvando(false) }
  }
  const fechar = () => { if (!salvando && !modalErro) setAcao(null) }
  const editando = acao?.tipo === 'editar' || acao?.tipo === 'desmarcar'
  return <AppLayout active="compras" compact>
    <Toast message={toast} />
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Histórico de Nota Fiscal</h1>
        <p className="mt-2 text-sm text-muted">Itens das notas associados aos seus insumos, por fornecedor. Clique num registro para abrir a compra, o fornecedor ou o insumo. Alterações valem para as próximas notas.</p></div>
      <Button variant="secondary" onClick={() => navigate('/compras/nota')}>Ler nota fiscal</Button>
    </div>
    <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Field label="Buscar vínculo"><input className={campo} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Item da nota, fornecedor ou insumo" /></Field>
      <Field label="Fornecedor" group><FornecedorSelect value={fornecedor} onChange={setFornecedor} permitirInativos /></Field>
      <Field label="Insumo" group>{insumoFiltro ? <div className="flex h-12 items-center gap-2 rounded-input border border-line bg-white px-3">
        <span className="min-w-0 flex-1 truncate text-sm">{insumoFiltro.nome}</span><button aria-label="Remover filtro de insumo" onClick={() => setInsumoFiltro(null)} className="text-muted hover:text-danger"><X size={16} /></button>
      </div> : <InsumoPicker placeholder="Filtrar por insumo…" permitirInativos onSelect={i => setInsumoFiltro({ id: i.id, identificador: i.identificador ?? '', nome: i.nome, marca: i.marca ?? null, unidade: i.unidadeMedida })} />}</Field>
      <Field label="CNPJ do emitente"><input className={campo} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="Com ou sem cadastro" /></Field>
      <Field label="Situação"><select className={campo} value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option><option value="vinculados">Vinculados</option><option value="ignorados">Ignorados</option></select></Field>
    </div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted">{resultado ? `${resultado.totalElements} vínculos` : ''}</p>
      <Field label="Ordenar por"><select className={campo} value={ordem} onChange={e => setOrdem(e.target.value)}>
        <option value="updatedAt,desc">Mais recentes</option><option value="nomeItem,asc">Nome do item</option><option value="emitenteNome,asc">Fornecedor</option>
      </select></Field>
    </div>
    {carregando ? <div className="grid min-h-48 place-items-center"><Spinner /></div> : erroLista ? <div role="alert" className="rounded-input border border-line bg-white p-6">
      <p>Não foi possível carregar os vínculos.</p><Button variant="secondary" onClick={() => setRodada(r => r + 1)}>Tentar novamente</Button>
    </div> : !resultado?.content.length ? <EmptyState icon={<History size={26} />} title="Nenhum vínculo encontrado" description="Os vínculos aparecem aqui depois que você confere e salva uma compra por nota." /> : <>
      <div className="overflow-x-auto rounded-card border border-line bg-white"><table className="w-full min-w-[850px] text-left text-sm" aria-label="Histórico de Nota Fiscal">
        <thead className="bg-cream text-muted"><tr>{['Item da nota', 'Fornecedor', 'Insumo', 'Fator', 'Atualizado em', 'Origem', 'Ações'].map(t => <th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead>
        <tbody>{resultado.content.map(v => <tr key={v.id} data-testid={`vinculo-${v.id}`} onClick={() => setDestinoDe(v)} className="cursor-pointer border-t border-line hover:bg-cream/60">
          <td className="px-4 py-4 font-semibold text-dark"><button type="button" aria-label={`Abrir destinos de ${v.nomeItem}`} className="border-none bg-transparent p-0 text-left font-[inherit] font-semibold text-dark">{v.nomeItem}</button></td>
          <td className="px-4 py-4"><div>{v.fornecedorNome}</div><div className="text-xs text-muted">{v.emitenteCnpj}</div></td>
          <td className="px-4 py-4">{v.ignorar ? <span className="rounded-full bg-cream px-2 py-1 text-muted">Ignorado</span> : <><div>{v.insumo?.nome ?? '—'}</div><div className="text-xs text-muted">{v.insumo?.identificador}</div></>}</td>
          <td className="px-4 py-4">{qtd(v.fator)}{v.insumo?.unidade ? ` ${v.insumo.unidade}` : ''}</td><td className="px-4 py-4">{formatarData(v.updatedAt)}</td><td className="px-4 py-4">{ORIGENS_VINCULO_NOTA[v.origem]}</td>
          <td className="px-4 py-4" onClick={e => e.stopPropagation()}><div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => abrir(v.ignorar ? 'desmarcar' : 'editar', v)}>{v.ignorar ? 'Vincular insumo' : 'Editar'}</Button>
            {!v.ignorar && <Button variant="ghost" size="sm" onClick={() => abrir('ignorar', v)}>Ignorar</Button>}
            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => abrir('desfazer', v)}>Desfazer</Button>
          </div></td>
        </tr>)}</tbody>
      </table></div>
      <div className="mt-4 flex items-center justify-between gap-3"><Button variant="ghost" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
        <span className="text-sm text-muted">Página {resultado.number + 1} de {resultado.totalPages}</span>
        <Button variant="ghost" disabled={resultado.last} onClick={() => setPagina(p => p + 1)}>Próxima</Button></div>
    </>}
    {editando && acao && <ModalShell open title={acao.tipo === 'desmarcar' ? 'Vincular insumo' : 'Editar vínculo'} onClose={fechar} width={520}
      footer={<><Button variant="ghost" onClick={fechar} disabled={salvando}>Cancelar</Button><Button variant="primary" disabled={salvando} onClick={() => void executar()}>{salvando ? 'Salvando…' : 'Salvar vínculo'}</Button></>}>
      <div className="flex flex-col gap-4 p-5"><p className="m-0 text-sm text-body">{acao.vinculo.nomeItem} · {acao.vinculo.fornecedorNome}</p>
        <p className="m-0 text-sm text-muted">Compras já registradas permanecem como estão. Esta escolha vale para as próximas notas.</p>
        <Field label="Insumo do vínculo" group>{destino ? <div className="flex items-center gap-2 rounded-input border border-line p-3"><span className="flex-1 text-sm">{destino.nome}</span>
          <Button variant="ghost" size="sm" onClick={() => setDestino(null)}>Trocar insumo</Button></div> : <InsumoPicker placeholder="Escolher insumo do vínculo…" onSelect={i => setDestino({ id: i.id, identificador: i.identificador ?? '', nome: i.nome, marca: i.marca ?? null, unidade: i.unidadeMedida })} />}</Field>
        <Field label="Fator de conversão" hint="Quantidade do insumo para cada unidade do item da nota."><input className={campo} inputMode="decimal" value={fator} onChange={e => setFator(e.target.value)} /></Field>
      </div>
    </ModalShell>}
    <ConfirmacaoModal open={acao?.tipo === 'desfazer' || acao?.tipo === 'ignorar'} title={acao?.tipo === 'desfazer' ? 'Desfazer vínculo?' : 'Ignorar item nas próximas notas?'}
      description={acao?.tipo === 'desfazer' ? 'A próxima nota pedirá uma nova ligação para este item e fornecedor. Compras já registradas permanecem como estão.' : 'Este item e fornecedor serão lembrados como ignorados. Compras já registradas permanecem como estão.'}
      onClose={fechar} onConfirm={() => void executar()} confirmLabel={acao?.tipo === 'desfazer' ? 'Desfazer vínculo' : 'Ignorar item'} confirming={salvando} variant={acao?.tipo === 'desfazer' ? 'danger' : 'default'} />
    {destinoDe && <ModalDestinoVinculoNota vinculo={destinoDe} onIr={rota => { setDestinoDe(null); navigate(rota) }} onClose={() => setDestinoDe(null)} />}
    {modalErro}
  </AppLayout>
}
