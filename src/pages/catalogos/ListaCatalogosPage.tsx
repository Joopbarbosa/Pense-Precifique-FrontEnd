import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Icons } from '../../components/ui/Icons'
import { catalogoService } from '../../services/catalogoService'
import type { CatalogoResponse } from '../../types/catalogo'

function CatalogoStatusBadge({ ativo, small = false }: { ativo: boolean; small?: boolean }) {
  if (!ativo) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: small ? 24 : 28, padding: '0 10px', borderRadius: 999,
      background: '#F1F0EC', color: '#7C786F',
      fontSize: small ? 11.5 : 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      Inativo
    </span>
  )

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: small ? 24 : 28, padding: '0 10px', borderRadius: 999,
      background: 'rgba(42,157,143,0.10)', color: '#2A9D8F',
      fontSize: small ? 11.5 : 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A9D8F' }} />
      Ativo
    </span>
  )
}

function CatalogoRow({ catalogo, index, onVer }: {
  catalogo: CatalogoResponse; index: number; onVer: () => void
}) {
  return (
    <div className="cat-row" onClick={onVer} style={{
      opacity: !catalogo.ativo ? 0.72 : 1,
      animation: 'fadeUp .4s ease both',
      animationDelay: `${index * 0.04}s`,
    }}
      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>
        {catalogo.identificador}
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {catalogo.nome}
      </div>
      <div style={{ fontSize: 14, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>
        {catalogo.margem}%
      </div>
      <div style={{ fontSize: 14, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>
        {catalogo.quantidadeItens} {catalogo.quantidadeItens === 1 ? 'item' : 'itens'}
      </div>
      <div><CatalogoStatusBadge ativo={catalogo.ativo} /></div>
    </div>
  )
}

function CatalogoCard({ catalogo, index, onVer }: {
  catalogo: CatalogoResponse; index: number; onVer: () => void
}) {
  return (
    <div className="cat-card-mobile" onClick={onVer} style={{
      opacity: !catalogo.ativo ? 0.72 : 1,
      animation: 'fadeUp .4s ease both',
      animationDelay: `${index * 0.04}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#A29E96' }}>{catalogo.identificador}</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', marginTop: 2 }}>{catalogo.nome}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <CatalogoStatusBadge ativo={catalogo.ativo} small />
            <span style={{ fontSize: 12.5, color: '#5C594F' }}>
              {catalogo.margem}% de margem
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Itens</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{catalogo.quantidadeItens}</div>
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

  const carregar = useCallback(() => {
    setLoading(true)
    setErro(null)
    catalogoService.listar()
      .then(setCatalogos)
      .catch(() => setErro('Não foi possível carregar os catálogos. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <AppLayout active="catalogos">

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Meus Catálogos</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: '#A29E96' }}>Organize seus produtos em catálogos com margem própria.</p>
        </div>
        <Button variant="primary" icon={<Icons.plus />} onClick={() => navigate('/catalogos/novo')}>
          Novo Catálogo
        </Button>
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando catálogos…
        </div>
      ) : erro ? (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>{erro}</span>
          <Button variant="ghost" onClick={carregar}>Tentar novamente</Button>
        </div>
      ) : catalogos.length === 0 ? (
        <EmptyState
          icon={<Icons.fileStack />}
          title="Nenhum catálogo cadastrado ainda"
          description="Crie seu primeiro catálogo para organizar produtos com uma margem própria."
          action={{ label: 'Criar primeiro catálogo', icon: <Icons.plus />, onClick: () => navigate('/catalogos/novo') }}
        />
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="cat-head">
              {['Identificador', 'Nome', 'Margem', 'Itens', 'Status'].map((h, k) => (
                <div key={k} style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
                  {h}
                </div>
              ))}
            </div>

            {catalogos.map((c, i) => (
              <React.Fragment key={c.id}>
                <CatalogoRow catalogo={c} index={i} onVer={() => navigate(`/catalogos/${c.id}`)} />
                <CatalogoCard catalogo={c} index={i} onVer={() => navigate(`/catalogos/${c.id}`)} />
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, color: '#A29E96', textAlign: 'right' }}>
            {catalogos.length} {catalogos.length === 1 ? 'catálogo' : 'catálogos'}
          </div>
        </>
      )}

    </AppLayout>
  )
}
