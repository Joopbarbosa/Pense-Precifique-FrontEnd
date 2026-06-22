import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { Icons } from '../../components/ui/Icons'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { tipoProdutoBadge } from '../../utils/badges'
import { produtoService } from '../../services/produtoService'
import type { ProdutoResponse } from '../../types/produto'

const CATS = ['Todos', 'Produto', 'Produto Base', 'Customização', 'Inativos']

const CAT_TO_TIPO: Record<string, string | undefined> = {
  'Todos': undefined,
  'Produto': 'PRODUTO',
  'Produto Base': 'PRODUTO_BASE',
  'Customização': 'CUSTOMIZACAO',
  'Inativos': undefined,
}

const BRL = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ProductCard({ p, index, onVer, onEditar, onDuplicar, onDesativar, onReativar }: {
  p: ProdutoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDuplicar: () => void
  onDesativar: () => void
  onReativar: () => void
}) {
  const isCustom = p.tipo === 'CUSTOMIZACAO'
  const inativo = !p.ativo
  const semEstoque = p.estoqueAtual === 0
  const badge = tipoProdutoBadge(p.tipo)
  const [hover, setHover] = useState(false)

  const menuItems: ActionMenuItem[] = inativo
    ? [
        { label: 'Ver detalhes', icon: <Icons.eye />,   onClick: onVer },
        { label: 'Reativar',     icon: <Icons.power />, onClick: onReativar, dividerBefore: true },
      ]
    : [
        { label: 'Ver detalhes', icon: <Icons.eye />,   onClick: onVer },
        { label: 'Editar',       icon: <Icons.edit />,  onClick: onEditar },
        { label: 'Duplicar',     icon: <Icons.copy />,  onClick: onDuplicar },
        { label: 'Desativar',    icon: <Icons.power />, onClick: onDesativar, danger: true, dividerBefore: true },
      ]

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #F0EEE9',
        borderRadius: 'var(--r-card)',
        boxShadow: hover ? '0 10px 26px -10px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: inativo ? 0.72 : 1,
        animation: inativo ? 'none' : 'fadeUp .4s ease both',
        animationDelay: `${index * 0.05}s`,
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow .18s, transform .18s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* FOTO */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: 'linear-gradient(135deg, #F6F4F0, #EEEBE5)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {p.foto ? (
            <img
              src={p.foto}
              alt={p.nome}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(0,0,0,0.018) 13px, rgba(0,0,0,0.018) 26px)',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#C2BEB5' }}>
                <Icons.camera />
                <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>Sem foto</span>
              </div>
            </>
          )}
        </div>
        {inativo && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(120,118,112,0.2)', pointerEvents: 'none' }} />
        )}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <ActionMenu items={menuItems} align="right" />
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {inativo ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              height: 25, padding: '0 11px', borderRadius: 999,
              background: '#FBEDE7', border: '1px solid #F2D8CF',
              color: '#C0492B', fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.01em', boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
            }}>
              Inativo
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              height: 25, padding: '0 11px', borderRadius: 999,
              background: badge.bg, backdropFilter: 'blur(4px)',
              color: badge.fg, fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.01em', boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
            }}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* CORPO */}
      <div style={{ padding: '15px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, color: '#3A372F', letterSpacing: '-0.01em' }}>
          {p.nome}
        </h3>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F4F2EE',
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
              {isCustom ? 'Valor adicional' : 'Preço de venda'}
            </div>
            <div style={{
              fontSize: 20, fontWeight: 700,
              color: isCustom ? '#2A9D8F' : '#3A372F',
              marginTop: 3, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
            }}>
              {p.precoVenda != null
                ? (isCustom ? '+ ' + BRL(p.precoVenda) : BRL(p.precoVenda))
                : <span style={{ fontSize: 15, color: '#C2BEB5' }}>—</span>
              }
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
              Estoque
            </div>
            {isCustom ? (
              <div style={{ marginTop: 7, fontSize: 15, fontWeight: 600, color: '#C2BEB5' }}>—</div>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5,
                height: 26, padding: '0 10px', borderRadius: 999,
                fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                background: semEstoque ? '#F1F0EC' : 'rgba(42,157,143,0.10)',
                color: semEstoque ? '#9A968E' : '#2A9D8F',
              }}>
                <Icons.stack /> {p.estoqueAtual} un
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListaProdutosPage() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState<ProdutoResponse[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaFocus, setBuscaFocus] = useState(false)
  const [cat, setCat] = useState('Todos')

  useEffect(() => {
    setLoading(true)
    setProdutos([])
    setPage(0)
    setHasNext(false)
    produtoService.listar(0, 20, CAT_TO_TIPO[cat])
      .then(data => {
        setProdutos(data.content)
        setHasNext(!data.last)
        setTotalElements(data.totalElements)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cat])

  const carregarMais = () => {
    const nextPage = page + 1
    setLoadingMore(true)
    produtoService.listar(nextPage, 20, CAT_TO_TIPO[cat])
      .then(data => {
        setProdutos(prev => [...prev, ...data.content])
        setHasNext(!data.last)
        setPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false))
  }

  const desativar = async (id: string) => {
    try {
      await produtoService.inativar(id)
      setProdutos(prev => prev.filter(p => p.id !== id))
      setTotalElements(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCatChange = (c: string) => {
    if (c === cat) return
    setCat(c)
  }

  const filtered = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : produtos

  const counts = (c: string) => c === cat ? totalElements : 0

  return (
    <AppLayout active="produtos">

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Meus Produtos</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: '#A29E96' }}>O coração do seu negócio — tudo o que você cria e vende.</p>
        </div>
        <Button variant="primary" icon={<Icons.plus />} onClick={() => navigate('/produtos/novo')}>
          Novo Produto
        </Button>
      </div>

      {/* BUSCA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220, maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: buscaFocus ? '#2A9D8F' : '#A8A49C', display: 'flex' }}>
            <Icons.search />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setBuscaFocus(true)}
            onBlur={() => setBuscaFocus(false)}
            placeholder="Buscar por nome..."
            style={{
              width: '100%', height: 46, padding: '0 14px 0 42px',
              border: `1.5px solid ${buscaFocus ? '#2A9D8F' : '#EFEDE8'}`,
              borderRadius: 10, fontSize: 14.5, color: '#3A372F',
              background: '#fff', outline: 'none', fontFamily: 'inherit',
              boxShadow: buscaFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          />
        </div>
      </div>

      {/* CHIPS DE CATEGORIA */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 24, overflowX: 'auto' }}>
        {CATS.map(c => {
          const active = cat === c
          return (
            <button
              key={c}
              onClick={() => handleCatChange(c)}
              style={{
                height: 36, padding: '0 15px', borderRadius: 999,
                border: `1.5px solid ${active ? 'transparent' : '#EFEDE8'}`,
                background: active ? '#F97316' : '#fff',
                color: active ? '#fff' : '#5C594F',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all .14s',
                boxShadow: active ? '0 6px 14px -7px rgba(249,115,22,0.8)' : 'none',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#FAF8F5'; e.currentTarget.style.borderColor = '#DEDBD4' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#EFEDE8' } }}
            >
              {c}
              <span style={{
                fontSize: 11.5, fontWeight: 700, opacity: 0.85,
                background: active ? 'rgba(255,255,255,0.25)' : '#F1F0EC',
                color: active ? '#fff' : '#9A968E',
                borderRadius: 999, padding: '1px 7px',
              }}>
                {counts(c)}
              </span>
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando produtos…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Icons.box />}
          title={cat === 'Inativos' ? 'Nenhum produto inativo' : 'Seu catálogo começa aqui'}
          description={cat === 'Inativos' ? 'Nenhum produto inativo no momento.' : 'Você ainda não cadastrou produtos. Comece criando seu primeiro!'}
          action={cat !== 'Inativos' ? { label: 'Criar primeiro produto', icon: <Icons.plus />, onClick: () => navigate('/produtos/novo') } : undefined}
        />
      ) : (
        <>
          <div className="prod-grid">
            {filtered.map((p, i) => (
              <ProductCard
                key={p.id}
                p={p}
                index={i}
                onVer={() => navigate(`/produtos/${p.id}`)}
                onEditar={() => navigate(`/produtos/${p.id}/editar`)}
                onDuplicar={() => {}}
                onDesativar={() => desativar(p.id)}
                onReativar={() => {}}
              />
            ))}
          </div>

          {/* Contador + Carregar mais */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#A29E96', alignSelf: 'flex-end', width: '100%', textAlign: 'right' }}>
              {filtered.length} de {totalElements} {totalElements === 1 ? 'produto' : 'produtos'}
            </div>
            {hasNext && !busca.trim() && (
              <button
                onClick={carregarMais}
                disabled={loadingMore}
                style={{
                  height: 44, padding: '0 24px', borderRadius: 10,
                  border: '1.5px solid #EFEDE8', background: '#fff',
                  color: '#2A9D8F', fontSize: 14, fontWeight: 600,
                  fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: loadingMore ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = 'rgba(42,157,143,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
              >
                {loadingMore
                  ? <><span style={{ width: 16, height: 16, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} /> Carregando…</>
                  : <>Carregar mais <Icons.chevron style={{ transform: 'rotate(90deg)' }} /></>
                }
              </button>
            )}
          </div>
        </>
      )}

    </AppLayout>
  )
}
