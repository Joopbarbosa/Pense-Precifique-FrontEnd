import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, MoneyInput } from '../ui'
import Spinner from '../ui/Spinner'
import ConfirmacaoModal from '../shared/ConfirmacaoModal'
import { FornecedorBusca, InsumoPicker } from './Pickers'
import { formatarData, moeda4, paraCampo, parseDecimal } from './formato'
import { fornecedorInsumoService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import type { CadastroRef, FornecedorInsumoResponse } from '../../types/compra'

/**
 * #540 (RN-NOVA-6) — vínculo Fornecedor↔Insumo com preço de referência. Mesmo componente nas duas
 * pontas: aba "Fornecedores" do insumo (`modo="insumo"`) e aba "Insumos" do fornecedor
 * (`modo="fornecedor"`). A confirmação de compra também cria/atualiza o vínculo sozinha.
 */
export default function VinculosFornecedorInsumo({ modo, id }: { modo: 'insumo' | 'fornecedor'; id: string }) {
  const [vinculos, setVinculos] = useState<FornecedorInsumoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [novoAlvo, setNovoAlvo] = useState<{ id: string; nome: string } | null>(null)
  const [novoPreco, setNovoPreco] = useState('')
  const [editando, setEditando] = useState<{ id: string; preco: string } | null>(null)
  const [remover, setRemover] = useState<FornecedorInsumoResponse | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true); setErro(null)
    const p = modo === 'insumo' ? fornecedorInsumoService.listarPorInsumo(id) : fornecedorInsumoService.listarPorFornecedor(id)
    p.then(setVinculos).catch(err => setErro(extractApiError(err, 'Não foi possível carregar os vínculos.'))).finally(() => setLoading(false))
  }, [modo, id])

  useEffect(() => { carregar() }, [carregar])

  const fecharAdicao = () => { setAdicionando(false); setNovoAlvo(null); setNovoPreco(''); setErroAcao(null) }

  const criar = async () => {
    if (!novoAlvo) return
    setSalvando(true); setErroAcao(null)
    try {
      const [fornecedorId, insumoId] = modo === 'insumo' ? [novoAlvo.id, id] : [id, novoAlvo.id]
      await fornecedorInsumoService.criar(fornecedorId, insumoId, parseDecimal(novoPreco))
      fecharAdicao()
      carregar()
    } catch (err) {
      setErroAcao(extractApiError(err, 'Não foi possível criar o vínculo.'))
    } finally {
      setSalvando(false)
    }
  }

  const salvarPreco = async () => {
    if (!editando) return
    setSalvando(true); setErroAcao(null)
    try {
      const atualizado = await fornecedorInsumoService.atualizarPreco(editando.id, parseDecimal(editando.preco))
      setVinculos(prev => prev.map(v => v.id === atualizado.id ? atualizado : v))
      setEditando(null)
    } catch (err) {
      setErroAcao(extractApiError(err, 'Não foi possível salvar o preço.'))
    } finally {
      setSalvando(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!remover) return
    try {
      await fornecedorInsumoService.remover(remover.id)
      setVinculos(prev => prev.filter(v => v.id !== remover.id))
    } catch (err) {
      setErroAcao(extractApiError(err, 'Não foi possível remover o vínculo.'))
    } finally {
      setRemover(null)
    }
  }

  const outraPonta = (v: FornecedorInsumoResponse): CadastroRef | { id: string; identificador: string; nome: string; ativa: boolean } =>
    modo === 'insumo' ? v.fornecedor : { id: v.insumo.id, identificador: v.insumo.identificador, nome: v.insumo.nome, ativa: v.insumo.ativo }
  const linkOutra = (v: FornecedorInsumoResponse) => modo === 'insumo' ? `/clientes/${v.fornecedor.id}` : `/insumos/${v.insumo.id}`
  const unidade = (v: FornecedorInsumoResponse) => v.insumo.unidade

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="m-0 text-[13px] text-muted">
          {modo === 'insumo' ? 'De quem você compra este insumo e o último preço pago.' : 'Insumos que este fornecedor vende e o último preço pago.'}
          {' '}Confirmar uma compra atualiza o preço sozinho.
        </p>
        {!adicionando && (
          <Button variant="ghost" size="sm" icon={<Plus size={15} />} onClick={() => setAdicionando(true)}>
            {modo === 'insumo' ? 'Vincular fornecedor' : 'Vincular insumo'}
          </Button>
        )}
      </div>

      {adicionando && (
        <div className="flex flex-col gap-3 border-b border-line bg-cream px-5 py-4 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            {novoAlvo ? (
              <div className="flex h-11 items-center justify-between gap-2 rounded-input border-[1.5px] border-teal/30 bg-teal/[0.06] px-3 text-sm font-semibold text-dark">
                {novoAlvo.nome}
                <button type="button" aria-label="Trocar" onClick={() => setNovoAlvo(null)} className="grid h-7 w-7 place-items-center rounded-md border-none bg-transparent text-muted hover:text-danger"><X size={15} /></button>
              </div>
            ) : modo === 'insumo' ? (
              <FornecedorBusca size="sm" onSelect={f => setNovoAlvo({ id: f.id, nome: f.nome })} />
            ) : (
              <InsumoPicker size="sm" excluir={vinculos.map(v => v.insumo.id)} onSelect={i => setNovoAlvo({ id: i.id, nome: i.nome })} />
            )}
          </div>
          <div className="w-full md:w-[180px]">
            <MoneyInput size="sm" value={novoPreco} onChange={setNovoPreco} placeholder="Preço (opcional)" ariaLabel="Preço de referência" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fecharAdicao} disabled={salvando}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={criar} disabled={!novoAlvo || salvando}>{salvando ? 'Salvando…' : 'Vincular'}</Button>
          </div>
        </div>
      )}

      {erroAcao && <div role="alert" className="border-b border-line bg-danger-bg px-5 py-2.5 text-[13px] text-danger-deep">{erroAcao}</div>}

      {loading ? (
        <div className="flex items-center gap-2.5 px-5 py-8 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
      ) : erro ? (
        <div className="flex items-center justify-center gap-3 px-5 py-8 text-sm text-danger">{erro} <Button variant="ghost" size="sm" onClick={carregar}>Tentar de novo</Button></div>
      ) : vinculos.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted">
          {modo === 'insumo' ? 'Nenhum fornecedor vinculado a este insumo.' : 'Nenhum insumo vinculado a este fornecedor.'}
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[2fr_1.2fr_1fr_110px] gap-4 bg-cream px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim md:grid">
            <span>{modo === 'insumo' ? 'Fornecedor' : 'Insumo'}</span><span>Preço de referência</span><span>Atualizado em</span><span />
          </div>
          {vinculos.map(v => {
            const o = outraPonta(v)
            const emEdicao = editando?.id === v.id
            return (
              <div key={v.id} data-testid="vinculo" className="grid grid-cols-1 gap-2 border-t border-line px-5 py-3 text-[13.5px] md:grid-cols-[2fr_1.2fr_1fr_110px] md:items-center md:gap-4">
                <div className="min-w-0">
                  <span className="mr-2 text-[12px] font-semibold text-muted">{o.identificador}</span>
                  <Link to={linkOutra(v)} className="font-semibold text-dark no-underline hover:text-teal">{o.nome}</Link>
                  {!o.ativa && <span className="ml-2 text-[11px] font-semibold text-danger">inativo</span>}
                </div>
                <div>
                  {emEdicao ? (
                    <MoneyInput size="sm" value={editando.preco} onChange={p => setEditando({ id: v.id, preco: p })} ariaLabel="Novo preço de referência" autoFocus />
                  ) : (
                    <span className="font-semibold [font-variant-numeric:tabular-nums]">
                      {v.precoReferencia != null ? `${moeda4(v.precoReferencia)} / ${unidade(v)}` : <span className="font-normal italic text-faint">Sem preço</span>}
                    </span>
                  )}
                </div>
                <div className="text-muted">{formatarData(v.updatedAt)}</div>
                <div className="flex justify-end gap-1">
                  {emEdicao ? (
                    <>
                      <button type="button" aria-label="Salvar preço" onClick={salvarPreco} disabled={salvando} className="grid h-8 w-8 place-items-center rounded-lg border-none bg-transparent text-teal hover:bg-teal/10"><Check size={16} /></button>
                      <button type="button" aria-label="Cancelar edição" onClick={() => setEditando(null)} className="grid h-8 w-8 place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-cream"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" aria-label={`Editar preço de ${o.nome}`} onClick={() => setEditando({ id: v.id, preco: paraCampo(v.precoReferencia, 4) })} className="grid h-8 w-8 place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-cream hover:text-teal"><Pencil size={15} /></button>
                      <button type="button" aria-label={`Remover vínculo com ${o.nome}`} onClick={() => setRemover(v)} className="grid h-8 w-8 place-items-center rounded-lg border-none bg-transparent text-muted hover:bg-danger-bg hover:text-danger"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      <ConfirmacaoModal
        open={!!remover}
        onClose={() => setRemover(null)}
        onConfirm={confirmarRemocao}
        variant="danger"
        title="Remover o vínculo?"
        icon={<Trash2 size={16} />}
        width={420}
        confirmLabel="Remover"
        description={remover ? `${remover.fornecedor.nome} deixa de aparecer como fornecedor de ${remover.insumo.nome} na lista de compras. As compras já feitas não mudam.` : ''}
      />
    </div>
  )
}
