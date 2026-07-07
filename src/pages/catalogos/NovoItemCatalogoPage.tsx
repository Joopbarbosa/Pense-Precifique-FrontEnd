import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import { produtoService } from '../../services/produtoService'
import { catalogoService } from '../../services/catalogoService'
import { itemCatalogoService } from '../../services/itemCatalogoService'
import type { CatalogoResponse } from '../../types/catalogo'
import type { ItemCatalogoRequest } from '../../types/itemCatalogo'

const num = (s: string) =>
  parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SEM_EXCLUSOES: string[] = []

interface ProdutoSelecionado {
  id: string
  nome: string
  precoCusto: number
  ativo: boolean
}

interface CustomizacaoItem {
  produtoId: string
  nome: string
  precoCusto: number
  quantidade: string
}

// ---------- Field ----------

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
        {label}{required && <span style={{ color: '#F97316', marginLeft: 3 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 6 }}>{hint}</span>}
    </label>
  )
}

const inputBase = (active: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', height: 46, padding: '0 14px',
  border: `1.5px solid ${hasError ? '#E05C3A' : active ? '#2A9D8F' : '#EFEDE8'}`,
  borderRadius: 10, fontSize: 14.5, color: '#3A372F',
  background: '#fff', outline: 'none', fontFamily: 'inherit',
  boxShadow: hasError ? '0 0 0 4px rgba(224,92,58,0.10)' : active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
  transition: 'border-color .15s, box-shadow .15s',
})

// ---------- ProdutoSearch (busca de produtos tipo PRODUTO ou CUSTOMIZACAO) ----------

function ProdutoSearch({ tipo, placeholder, jaAdicionados, onSelect }: {
  tipo: 'PRODUTO' | 'CUSTOMIZACAO'; placeholder: string; jaAdicionados: string[]
  onSelect: (p: { id: string; nome: string; precoCusto: number; ativo: boolean }) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(false)
  const [resultados, setResultados] = useState<{ id: string; nome: string; precoCusto: number; ativo: boolean }[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) { setResultados([]); return }
    const qLower = q.trim().toLowerCase()
    const timer = setTimeout(async () => {
      try {
        const data = await produtoService.listar(0, 20, tipo, q)
        setResultados(
          data.content
            .filter(p => p.nome.toLowerCase().includes(qLower) && !jaAdicionados.includes(p.id))
            .map(p => ({ id: p.id, nome: p.nome, precoCusto: p.precoCusto ?? 0, ativo: p.ativo }))
        )
      } catch {
        // silent
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [q, tipo, jaAdicionados])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: f ? '#2A9D8F' : '#A29E96', display: 'flex' }}>
        <Icons.search width={16} height={16} />
      </span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => { setF(true); setOpen(true) }}
        onBlur={() => setF(false)}
        placeholder={placeholder}
        style={{ ...inputBase(f), paddingLeft: 40 }}
      />
      {open && resultados.length > 0 && (
        <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 14px 34px -10px rgba(0,0,0,0.2)', padding: 6, maxHeight: 280, overflowY: 'auto' }}>
          {resultados.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); setQ(''); setOpen(false); setResultados([]) }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11, width: '100%', textAlign: 'left',
              padding: '10px 11px', borderRadius: 9, border: 'none', background: 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
              <span style={{ fontSize: 12, color: '#A29E96', flexShrink: 0 }}>{moeda(p.precoCusto)} custo</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Página principal ----------

export default function NovoItemCatalogoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const produtoIdParam = searchParams.get('produtoId')
  const catalogoIdParam = searchParams.get('catalogoId')

  const [catalogoId, setCatalogoId] = useState<string | null>(catalogoIdParam)
  const [catalogoInfo, setCatalogoInfo] = useState<CatalogoResponse | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogoResponse[]>([])
  const [loadingContexto, setLoadingContexto] = useState(true)

  const [produto, setProduto] = useState<ProdutoSelecionado | null>(null)
  const [customizacoes, setCustomizacoes] = useState<CustomizacaoItem[]>([])
  const [quantidade, setQuantidade] = useState('1')
  const [quantidadeErro, setQuantidadeErro] = useState<string | null>(null)

  const [precoVenda, setPrecoVenda] = useState('')
  const [precoSugerido, setPrecoSugerido] = useState<number | null>(null)
  const [override, setOverride] = useState(false)
  const [itemId, setItemId] = useState<string | null>(null)

  const [produtoErro, setProdutoErro] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const produtoBloqueadoRef = useRef<string | null>(null)

  // Contexto: catálogo (fixo via query param, ou lista para escolher) + produto pré-selecionado
  useEffect(() => {
    const tarefas: Promise<unknown>[] = []

    if (catalogoIdParam) {
      tarefas.push(
        catalogoService.buscarPorId(catalogoIdParam)
          .then(c => { setCatalogoInfo(c); setCatalogoId(c.id) })
          .catch(() => setErro('Não foi possível carregar o catálogo informado.'))
      )
    } else {
      tarefas.push(
        catalogoService.listar()
          .then(setCatalogos)
          .catch(() => setErro('Não foi possível carregar a lista de catálogos.'))
      )
    }

    if (produtoIdParam) {
      tarefas.push(
        produtoService.buscarPorId(produtoIdParam)
          .then(p => setProduto({ id: p.id, nome: p.nome, precoCusto: p.precoCusto, ativo: p.ativo }))
          .catch(() => setErro('Não foi possível carregar o produto informado.'))
      )
    }

    Promise.all(tarefas).finally(() => setLoadingContexto(false))
  }, [catalogoIdParam, produtoIdParam])

  useEffect(() => {
    const qtd = parseInt(quantidade, 10)
    if (quantidade.trim() !== '' && (!Number.isFinite(qtd) || qtd < 1)) {
      setQuantidadeErro('A quantidade do pacote deve ser um número inteiro maior ou igual a 1.')
    } else {
      setQuantidadeErro(null)
    }
  }, [quantidade])

  const buildRequest = useCallback((): ItemCatalogoRequest | null => {
    if (!produto) return null
    const qtd = parseInt(quantidade, 10)
    if (!Number.isFinite(qtd) || qtd < 1) return null
    return {
      produtoId: produto.id,
      quantidadePacote: qtd,
      precoVenda: precoVenda ? num(precoVenda) : undefined,
      customizacoesAnexadas: customizacoes.map(c => ({ produtoId: c.produtoId, quantidade: num(c.quantidade) || 0 })),
    }
  }, [produto, quantidade, precoVenda, customizacoes])

  const sincronizar = useCallback(async () => {
    if (!catalogoId) return
    const request = buildRequest()
    if (!request) return
    if (produtoBloqueadoRef.current === request.produtoId) return

    setSincronizando(true)
    try {
      const resp = itemId
        ? await itemCatalogoService.editar(catalogoId, itemId, request)
        : await itemCatalogoService.adicionar(catalogoId, request)
      setItemId(resp.id)
      setPrecoSugerido(resp.precoSugerido)
      setOverride(resp.override)
      if (Math.abs(num(precoVenda) - resp.precoVenda) > 0.001) {
        setPrecoVenda(resp.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      }
      setProdutoErro(null)
      setErro(null)
    } catch (err: any) {
      const msg: string | undefined = err.response?.data?.message
      if (msg && /custo calculado/i.test(msg)) {
        produtoBloqueadoRef.current = request.produtoId
        setProdutoErro(msg)
      } else if (msg) {
        setErro(msg)
      } else {
        setErro('Não foi possível calcular o preço sugerido. Tente novamente.')
      }
    } finally {
      setSincronizando(false)
    }
  }, [catalogoId, itemId, buildRequest, precoVenda])

  useEffect(() => {
    if (loadingContexto) return
    const t = setTimeout(() => { sincronizar() }, 500)
    return () => clearTimeout(t)
  }, [loadingContexto, sincronizar])

  const jaAdicionadosCustom = customizacoes.map(c => c.produtoId)

  const addCustomizacao = (p: { id: string; nome: string; precoCusto: number }) => {
    setCustomizacoes(cs => [...cs, { produtoId: p.id, nome: p.nome, precoCusto: p.precoCusto, quantidade: '1' }])
  }
  const removeCustomizacao = (produtoId: string) => {
    setCustomizacoes(cs => cs.filter(c => c.produtoId !== produtoId))
  }
  const setCustomizacaoQtd = (produtoId: string, v: string) => {
    setCustomizacoes(cs => cs.map(c => c.produtoId === produtoId ? { ...c, quantidade: v.replace(/[^\d,]/g, '') } : c))
  }

  const cancelar = async () => {
    if (itemId && catalogoId) {
      try { await itemCatalogoService.remover(catalogoId, itemId) } catch { /* best-effort */ }
    }
    navigate(catalogoId ? `/catalogos/${catalogoId}` : '/catalogos')
  }

  const salvar = async () => {
    setErro(null)
    if (!catalogoId) { setErro('Selecione um catálogo.'); return }
    if (!produto) { setErro('Selecione um produto.'); return }
    const request = buildRequest()
    if (!request) {
      setQuantidadeErro('A quantidade do pacote deve ser um número inteiro maior ou igual a 1.')
      return
    }

    setSalvando(true)
    try {
      if (itemId) {
        await itemCatalogoService.editar(catalogoId, itemId, request)
      } else {
        await itemCatalogoService.adicionar(catalogoId, request)
      }
      navigate(`/catalogos/${catalogoId}`)
    } catch (err: any) {
      const msg: string | undefined = err.response?.data?.message
      if (msg && /custo calculado/i.test(msg)) {
        produtoBloqueadoRef.current = request.produtoId
        setProdutoErro(msg)
      } else {
        setErro(msg || 'Erro ao salvar item do catálogo.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (loadingContexto) {
    return (
      <AppLayout active="catalogos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando…
        </div>
      </AppLayout>
    )
  }

  const podeSalvar = !!produto && !!catalogoId && !quantidadeErro && !produtoErro

  return (
    <AppLayout active="catalogos">

      {/* BREADCRUMB */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 12 }}>
        <span style={{ cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate(catalogoId ? `/catalogos/${catalogoId}` : '/catalogos')}
          onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
          onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
        >{catalogoInfo ? catalogoInfo.nome : 'Catálogos'}</span>
        <Icons.chevron style={{ color: '#CFCBC3' }} />
        <span style={{ color: '#5C594F', fontWeight: 600 }}>Novo Item</span>
      </div>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22 }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          <Icons.fileStack width={26} height={26} />
        </span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>
          Novo Item de Catálogo
        </h1>
      </div>

      <div className="ficha-grid">

        {/* COLUNA ESQUERDA — formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Catálogo */}
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '22px 24px' }}>
            {catalogoInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icons.fileStack style={{ color: '#2A9D8F' }} width={18} height={18} />
                <span style={{ fontSize: 14, color: '#5C594F' }}>
                  Adicionando item ao catálogo <strong style={{ color: '#3A372F', fontWeight: 700 }}>{catalogoInfo.nome}</strong>
                </span>
              </div>
            ) : catalogos.length === 0 ? (
              <div style={{ fontSize: 14, color: '#5C594F' }}>
                Você ainda não tem nenhum catálogo.{' '}
                <span style={{ color: '#2A9D8F', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/catalogos/novo')}>Criar catálogo</span>
              </div>
            ) : (
              <Field label="Catálogo" required>
                <select
                  value={catalogoId ?? ''}
                  onChange={e => {
                    const c = catalogos.find(c => c.id === e.target.value) ?? null
                    setCatalogoId(c?.id ?? null)
                    setCatalogoInfo(null)
                  }}
                  style={{ ...inputBase(false), cursor: 'pointer' }}
                >
                  <option value="" disabled>Selecione um catálogo</option>
                  {catalogos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.margem}% de margem)</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Produto */}
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '22px 24px' }}>
            <Field label="Produto" required>
              {produto ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #EFEDE8', background: '#FBFAF8' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{produto.nome}</div>
                    <div style={{ fontSize: 12, color: '#A29E96' }}>{moeda(produto.precoCusto)} de custo</div>
                  </div>
                  <button onClick={() => { setProduto(null); produtoBloqueadoRef.current = null; setProdutoErro(null) }} aria-label="Trocar produto" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: '#BDB9B1', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <Icons.x width={15} height={15} />
                  </button>
                </div>
              ) : (
                <ProdutoSearch tipo="PRODUTO" placeholder="Buscar produto..." jaAdicionados={SEM_EXCLUSOES} onSelect={p => { setProduto(p); produtoBloqueadoRef.current = null; setProdutoErro(null) }} />
              )}
              {produtoErro && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 8 }}>{produtoErro}</span>}
            </Field>
          </div>

          {/* Quantidade do pacote */}
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '22px 24px' }}>
            <Field label="Quantidade do pacote" required hint="Quantas unidades do produto compõem este item do catálogo.">
              <div style={{ position: 'relative', maxWidth: 160 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                  <Icons.box width={16} height={16} />
                </span>
                <input
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="1"
                  style={{ ...inputBase(false, !!quantidadeErro), paddingLeft: 40 }}
                />
              </div>
              {quantidadeErro && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{quantidadeErro}</span>}
            </Field>
          </div>

          {/* Customizações anexadas */}
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                <Icons.sliders style={{ color: '#F97316' }} width={16} height={16} />
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#3A372F' }}>Customizações anexadas</h3>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#A29E96' }}>(opcional)</span>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#A29E96' }}>Extras opcionais que somam ao custo e ao preço sugerido deste item.</p>
              <ProdutoSearch tipo="CUSTOMIZACAO" placeholder="Buscar customização..." jaAdicionados={jaAdicionadosCustom} onSelect={addCustomizacao} />
            </div>
            {customizacoes.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 40px', gap: 12, padding: '10px 24px', background: '#FBFAF8', borderTop: '1px solid #EFEDE8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
                  <span>Customização</span><span>Quantidade</span><span />
                </div>
                {customizacoes.map(c => (
                  <div key={c.produtoId} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 40px', gap: 12, alignItems: 'center', padding: '12px 24px', borderTop: '1px solid #EFEDE8' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                      <div style={{ fontSize: 12, color: '#A29E96' }}>{moeda(c.precoCusto)}/un</div>
                    </div>
                    <input
                      value={c.quantidade}
                      onChange={e => setCustomizacaoQtd(c.produtoId, e.target.value)}
                      inputMode="decimal"
                      style={{ ...inputBase(false), height: 38, fontSize: 13.5 }}
                    />
                    <button onClick={() => removeCustomizacao(c.produtoId)} aria-label="Remover customização" style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: '#BDB9B1', cursor: 'pointer', display: 'grid', placeItems: 'center', justifySelf: 'end' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FBEDE9'; e.currentTarget.style.color = '#C0492B' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#BDB9B1' }}
                      >
                        <Icons.trash width={15} height={15} />
                      </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AÇÕES */}
          {erro && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5 }}>
              {erro}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 11, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={cancelar} disabled={salvando}>Cancelar</Button>
            <Button variant="primary" onClick={salvar} disabled={salvando || !podeSalvar}>
              {salvando
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />Adicionando…</span>
                : 'Adicionar item ao catálogo'
              }
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA — preço */}
        <div className="calc-card">
          <div style={{ background: '#fff', border: '1.5px solid rgba(42,157,143,0.3)', borderRadius: 'var(--r-card)', boxShadow: '0 8px 26px -12px rgba(42,157,143,0.4)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(42,157,143,0.12), rgba(42,157,143,0.04))', borderBottom: '1px solid rgba(42,157,143,0.18)' }}>
              <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#fff', color: '#2A9D8F', boxShadow: '0 3px 10px -3px rgba(42,157,143,0.4)' }}>
                <Icons.calc />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1F7A6F', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Preço do item</div>
                <div style={{ fontSize: 11.5, color: '#2A9D8F', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  {sincronizando ? 'Calculando…' : 'Calculado pela API'}
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 20px 20px' }}>
              <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(42,157,143,0.14), rgba(42,157,143,0.05))', border: '1.5px solid rgba(42,157,143,0.28)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1F7A6F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preço sugerido</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2A9D8F', letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {precoSugerido != null ? moeda(precoSugerido) : '—'}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>Preço de venda</span>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 46, display: 'grid', placeItems: 'center',
                    fontSize: 15, fontWeight: 700, color: override ? '#F97316' : '#6B6860',
                    background: override ? 'rgba(249,115,22,0.08)' : '#FAF8F5',
                    borderRadius: '10px 0 0 10px',
                    borderRight: `1px solid ${override ? 'rgba(249,115,22,0.3)' : '#EFEDE8'}`,
                    pointerEvents: 'none',
                  }}>R$</span>
                  <input
                    value={precoVenda}
                    onChange={e => setPrecoVenda(e.target.value.replace(/[^\d.,]/g, ''))}
                    inputMode="decimal"
                    disabled={!produto}
                    style={{
                      width: '100%', height: 50, padding: '0 14px 0 58px',
                      border: `1.5px solid ${override ? '#F97316' : '#EFEDE8'}`, borderRadius: 10,
                      fontSize: 19, fontWeight: 700, color: override ? '#F97316' : '#3A372F',
                      background: produto ? '#fff' : '#FAF8F5', outline: 'none', fontFamily: 'inherit',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>

              {override && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '11px 13px', borderRadius: 11, background: '#FFF8F0', border: '1px solid #F6E4CE' }}>
                  <Icons.info style={{ flexShrink: 0, color: '#C8721F', marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.3, color: '#7A5A33', lineHeight: 1.5 }}>
                    Preço ajustado manualmente — este item será salvo com <strong style={{ fontWeight: 700 }}>override</strong>, sem acompanhar mudanças futuras na margem do catálogo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </AppLayout>
  )
}
