import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import AppLayout from '../../../components/layout/AppLayout'
import { Button, Field, Spinner, TextArea } from '../../../components/ui'
import { Toast } from '../../../components/shared'
import { ItemSearch, ClienteSelect, SectionCard, BRL } from '../../../components/venda'
import { orcamentoDescritivoService } from '../../../services/orcamentoDescritivoService'
import { orcamentoService } from '../../../services/orcamentoService'
import { produtoService } from '../../../services/produtoService'
import { clienteService } from '../../../services/clienteService'
import { useToast } from '../../../hooks/useToast'
import { extractApiError } from '../../../utils/apiError'
import { MAX_OPCOES_DESCRITIVO, opcaoParaRequest, precoReferenciaDigitado, validarQuantidadeOpcoes } from '../../../utils/orcamentoDescritivo'
import type { ClienteResponse } from '../../../types/cliente'
import type { ItemCatalogoBuscaResponse } from '../../../types/orcamento'
import type { ProdutoResponse } from '../../../types/produto'

interface LinhaOpcao {
  chave: string
  produtoId?: string
  itemCatalogoId?: string
  nome: string
  precoAtual: number | null
  preco: string
  quantidadeUnidade: string
}

const fmtPreco = (n: number) => n.toFixed(2).replace('.', ',')

/** V0.19.0 #382 (RN-NOVA-44, UC-NOVO-5) — criar/editar o orçamento Descritivo: título, cliente opcional, de 1 a 100 opções. */
export default function DescritivoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [titulo, setTitulo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [linhas, setLinhas] = useState<LinhaOpcao[]>([])
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(!!id)
  const [erro, setErro] = useState('')
  const { toast, setToast } = useToast()
  const wrapRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const d = await orcamentoDescritivoService.buscarPorId(id)
        if (d.status !== 'RASCUNHO') { navigate(`/orcamentos/descritivos/${id}`, { replace: true }); return }
        setTitulo(d.titulo)
        setObservacoes(d.observacoes ?? '')
        if (d.clienteId) setCliente(await clienteService.buscarPorId(d.clienteId))
        setLinhas(d.opcoes.map(o => ({
          chave: `o${seq.current++}`, produtoId: o.produtoId ?? undefined, itemCatalogoId: o.itemCatalogoId ?? undefined,
          nome: o.nome, precoAtual: o.precoAtual, preco: fmtPreco(o.precoReferencia), quantidadeUnidade: o.quantidadeUnidade ?? '',
        })))
      } catch (e) {
        setToast(extractApiError(e, 'Não foi possível carregar o orçamento.'))
      } finally { setCarregando(false) }
    })()
  }, [id, navigate, setToast])

  const buscarItens = useCallback((busca: string | undefined, page: number, size: number) =>
    orcamentoService.buscarItensCatalogo(undefined, busca, page, size, false), [])
  const buscarProdutos = useCallback((busca: string | undefined, page: number, size: number) =>
    produtoService.listar(page, size, 'PRODUTO', busca, false, undefined, false), [])

  const adicionar = (l: Omit<LinhaOpcao, 'chave'>) => {
    if (linhas.length >= MAX_OPCOES_DESCRITIVO) { setErro('Informe de 1 a 100 opções.'); return }
    setErro('')
    setLinhas(arr => [...arr, { ...l, chave: `o${seq.current++}` }])
  }
  const addItem = (i: ItemCatalogoBuscaResponse) =>
    adicionar({ itemCatalogoId: i.id, nome: i.nome, precoAtual: i.precoVenda, preco: fmtPreco(i.precoVenda), quantidadeUnidade: '' })
  const addProduto = (p: ProdutoResponse) =>
    adicionar({ produtoId: p.id, nome: p.nome, precoAtual: p.precoVenda ?? null, preco: p.precoVenda != null ? fmtPreco(p.precoVenda) : '', quantidadeUnidade: '' })

  const salvar = async () => {
    setErro('')
    if (!titulo.trim()) { setErro('Informe o título do orçamento.'); return }
    const limite = validarQuantidadeOpcoes(linhas.length)
    if (limite) { setErro(limite); return }
    const opcoes = []
    for (const l of linhas) {
      const preco = precoReferenciaDigitado(l.preco)
      if (preco === null) { setErro(`Preço de referência inválido em "${l.nome}" (até 2 casas decimais).`); return }
      opcoes.push(opcaoParaRequest({ produtoId: l.produtoId, itemCatalogoId: l.itemCatalogoId, precoReferencia: preco, quantidadeUnidade: l.quantidadeUnidade }))
    }
    const corpo = { titulo: titulo.trim(), ...(cliente ? { clienteId: cliente.id } : {}), ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}), opcoes }
    setSalvando(true)
    try {
      const salvo = id ? await orcamentoDescritivoService.editar(id, corpo) : await orcamentoDescritivoService.criar(corpo)
      navigate(`/orcamentos/descritivos/${salvo.id}`)
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível salvar o orçamento.'))
    } finally { setSalvando(false) }
  }

  if (carregando) return <AppLayout active="orcamentos" compact><div className="flex justify-center py-[60px]"><Spinner /></div></AppLayout>

  return (
    <AppLayout active="orcamentos" compact>
      <button type="button" onClick={() => navigate('/orcamentos/descritivos')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeft size={15} /> Orçamentos descritivos
      </button>
      <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">{id ? 'Editar orçamento descritivo' : 'Novo orçamento descritivo'}</h1>
      <p className="mb-section mt-[7px] text-[14.5px] text-muted">Lista de opções com preço de referência, sem total e sem aprovação. Depois, gere o orçamento de Venda com o que o cliente escolher.</p>
      <div className="flex max-w-[860px] flex-col gap-section">
        <SectionCard step="1" label="Título" hint="Como este orçamento aparece para o cliente.">
          <div className="p-5">
            <Field label="Título" required>
              <input value={titulo} maxLength={200} onChange={e => setTitulo(e.target.value)} aria-label="Título"
                className="h-11 w-full rounded-input border border-line bg-white px-3 text-sm text-dark" />
            </Field>
          </div>
        </SectionCard>
        <SectionCard step="2" label="Cliente" hint="Opcional agora; é obrigatório só para gerar a Venda.">
          <ClienteSelect cliente={cliente} onSelect={setCliente} onClear={() => setCliente(null)} />
        </SectionCard>
        <SectionCard step="3" label="Opções" hint="De 1 a 100. O preço de referência fica gravado e não muda com o cadastro.">
          <div className="flex flex-col gap-3 p-5">
            {linhas.length === 0 && <p className="m-0 text-sm text-muted">Nenhuma opção adicionada.</p>}
            {linhas.map(l => (
              <div key={l.chave} data-testid="linha-opcao" className="grid grid-cols-[1fr_130px_1fr_36px] items-end gap-3 max-[860px]:grid-cols-1">
                <div>
                  <div className="text-sm font-semibold text-dark">{l.nome}</div>
                  {l.precoAtual != null && <div className="text-xs text-muted">Preço atual: {BRL(l.precoAtual)}</div>}
                </div>
                <Field label="Preço de referência">
                  <input value={l.preco} inputMode="decimal" aria-label={`Preço de referência de ${l.nome}`}
                    onChange={e => setLinhas(arr => arr.map(x => x.chave === l.chave ? { ...x, preco: e.target.value } : x))}
                    className="h-10 w-full rounded-input border border-line bg-white px-3 text-sm text-dark" />
                </Field>
                <Field label="Quantidade / unidade" opt>
                  <input value={l.quantidadeUnidade} maxLength={500} aria-label={`Quantidade e unidade de ${l.nome}`}
                    onChange={e => setLinhas(arr => arr.map(x => x.chave === l.chave ? { ...x, quantidadeUnidade: e.target.value } : x))}
                    className="h-10 w-full rounded-input border border-line bg-white px-3 text-sm text-dark" />
                </Field>
                <button type="button" aria-label={`Remover ${l.nome}`} onClick={() => setLinhas(arr => arr.filter(x => x.chave !== l.chave))}
                  className="grid h-10 w-9 place-items-center text-danger"><Trash2 size={16} /></button>
              </div>
            ))}
            <div ref={wrapRef} className="relative">
              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setBuscaAberta(o => !o)}>Adicionar opção</Button>
              <ItemSearch open={buscaAberta} onClose={() => setBuscaAberta(false)} modo="tudo"
                buscarItensCatalogo={buscarItens} buscarProdutos={buscarProdutos}
                onSelectCatalogoItem={addItem} onSelectProdutoAvulso={addProduto} />
            </div>
            <span className="text-xs text-muted">{linhas.length} de {MAX_OPCOES_DESCRITIVO} opções</span>
          </div>
        </SectionCard>
        <SectionCard step="4" label="Observações" hint="Aparecem no PDF.">
          <div className="p-5"><TextArea value={observacoes} onChange={setObservacoes} maxLength={500} rows={3} /></div>
        </SectionCard>
        {erro && <p role="alert" className="m-0 text-sm text-danger-deep">{erro}</p>}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/orcamentos/descritivos')}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar orçamento'}</Button>
        </div>
      </div>
      <Toast message={toast} variant="error" />
    </AppLayout>
  )
}
