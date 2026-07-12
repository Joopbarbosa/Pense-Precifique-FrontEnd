import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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

const inputBase = (active: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', height: 46, padding: '0 14px',
  border: `1.5px solid ${hasError ? '#E05C3A' : active ? '#2A9D8F' : '#EFEDE8'}`,
  borderRadius: 10, fontSize: 14.5, color: '#3A372F',
  background: '#fff', outline: 'none', fontFamily: 'inherit',
  boxShadow: hasError ? '0 0 0 4px rgba(224,92,58,0.10)' : active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
  transition: 'border-color .15s, box-shadow .15s',
})

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }

function EditarCatalogoModal({ catalogo, onClose, onSuccess }: {
  catalogo: CatalogoResponse
  onClose: () => void
  onSuccess: (atualizado: CatalogoResponse) => void
}) {
  const [nome, setNome] = useState(catalogo.nome)
  const [margem, setMargem] = useState(catalogo.margem.toString())
  const [focus, setFocus] = useState<string | null>(null)
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          <span style={fieldLabel}>Nome do catálogo *</span>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onFocus={() => setFocus('nome')}
            onBlur={() => setFocus(null)}
            style={inputBase(focus === 'nome', !!fieldErrors.nome)}
          />
          {fieldErrors.nome && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.nome}</span>}
        </label>
        <label>
          <span style={fieldLabel}>Margem de lucro *</span>
          <div style={{ position: 'relative' }}>
            <input
              value={margem}
              onChange={e => setMargem(e.target.value.replace(/[^\d.,]/g, ''))}
              onFocus={() => setFocus('margem')}
              onBlur={() => setFocus(null)}
              inputMode="decimal"
              style={{ ...inputBase(focus === 'margem', !!fieldErrors.margem), paddingRight: 40 }}
            />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>%</span>
          </div>
          {fieldErrors.margem && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.margem}</span>}
          <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 6 }}>Itens sem preço ajustado manualmente recalculam automaticamente.</span>
        </label>
        {erro && (
          <p style={{ margin: 0, fontSize: 13.5, color: '#C0392B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
            {erro}
          </p>
        )}
      </div>
    </ModalShell>
  )
}

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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
    <div className="cat-card-mobile" onClick={onVer} style={{
      opacity: !catalogo.ativo ? 0.72 : 1,
      animation: 'fadeUp .4s ease both',
      animationDelay: `${index * 0.04}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#A29E96' }}>{catalogo.identificador}</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', marginTop: 2 }}>{catalogo.nome}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <CatalogoStatusBadge ativo={catalogo.ativo} small />
            <span style={{ fontSize: 12.5, color: '#5C594F' }}>
              {catalogo.margem}% de margem
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Itens</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{catalogo.quantidadeItens}</div>
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
  const [buscaFocus, setBuscaFocus] = useState(false)
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Meus Catálogos</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: '#A29E96' }}>Organize seus produtos em catálogos com margem própria.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/catalogos/novo')}>
          Novo Catálogo
        </Button>
      </div>

      {erroAcao && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: '#FBF0EE', border: '1px solid #F2D4CF', color: '#B23A1E', fontSize: 13.5 }}>
          {erroAcao}
        </div>
      )}

      {/* BUSCA */}
      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 18 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: buscaFocus ? '#2A9D8F' : '#A8A49C', display: 'flex' }}>
          <Search size={18} />
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
          icon={<Files size={22} />}
          title={busca.trim() ? 'Nenhum catálogo encontrado' : 'Nenhum catálogo cadastrado ainda'}
          description={busca.trim() ? 'Nenhum catálogo encontrado para essa busca.' : 'Crie seu primeiro catálogo para organizar produtos com uma margem própria.'}
          action={!busca.trim() ? { label: 'Criar primeiro catálogo', icon: <Plus size={16} />, onClick: () => navigate('/catalogos/novo') } : undefined}
        />
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="cat-head">
              {COLUNAS.map((col, k) => {
                const ativa = col.campo != null && ordenarPor === col.campo
                return (
                  <div
                    key={k}
                    onClick={col.campo ? () => handleSort(col.campo!) : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: ativa ? '#2A9D8F' : '#A8A49C',
                      cursor: col.campo ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    {col.label}
                    {ativa && (
                      <ArrowDown size={11} style={{ transform: direcao === 'ASC' ? 'rotate(180deg)' : 'none' }} />
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

          <div style={{ marginTop: 14, fontSize: 12.5, color: '#A29E96', textAlign: 'right' }}>
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
