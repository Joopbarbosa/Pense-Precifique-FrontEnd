import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ActionMenu from '../../components/shared/ActionMenu'
import { ActionMenuItem } from '../../components/shared/ActionMenu'
import { Icons } from '../../components/ui/Icons'
import type { InsumoResponse } from '../../types/insumo'
import type { ImpactoAgregadoResponse } from '../../types/loteCompra'
import { insumoService } from '../../services/insumoService'
import { loteCompraService } from '../../services/loteCompraService'

interface ItemCarrinho {
  insumo: InsumoResponse
  qtd: string
  preco: string
}

const FILTERS = ['Todos', 'Ativos', 'Inativos', 'Estoque baixo']

const isLow = (o: InsumoResponse) =>
  o.ativo && o.estoqueMinimo != null && o.estoqueAtual < o.estoqueMinimo

const BRL4 = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: n < 1 ? 3 : 2, maximumFractionDigits: 4 })

const num = (s: string) => parseFloat((s || '').toString().replace(/\./g, '').replace(',', '.')) || 0

const moeda = (n: number, dec?: number) =>
  'R$ ' + n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2),
    maximumFractionDigits: dec != null ? dec : 3,
  })

function InsumoStatusBadge({ insumo, small = false }: { insumo: InsumoResponse; small?: boolean }) {
  const low = isLow(insumo)

  if (low) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: small ? 24 : 28, padding: '0 10px', borderRadius: 999,
      background: '#FFF1E8', color: '#C8721F',
      fontSize: small ? 11.5 : 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Icons.alertCircle width={13} height={13} /> Estoque baixo
    </span>
  )

  if (!insumo.ativo) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: small ? 24 : 28, padding: '0 10px', borderRadius: 999,
      background: '#F1F0EC', color: '#7C786F',
      fontSize: small ? 11.5 : 12.5, fontWeight: 600,
    }}>
      Inativo
    </span>
  )

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: small ? 24 : 28, padding: '0 10px', borderRadius: 999,
      background: 'rgba(42,157,143,0.10)', color: '#2A9D8F',
      fontSize: small ? 11.5 : 12.5, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A9D8F' }} />
      Ativo
    </span>
  )
}

function InsumoRow({ insumo, index, onVer, onEditar, onDesativar }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDesativar: () => void
}) {
  const low = isLow(insumo)

  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <Icons.eye />,  onClick: onVer },
    { label: 'Editar',       icon: <Icons.edit />, onClick: onEditar },
    { label: 'Desativar',    icon: <Icons.power />, onClick: onDesativar, danger: true, dividerBefore: true },
  ]

  return (
    <div className="i-row" style={{
      opacity: !insumo.ativo ? 0.65 : 1,
      animation: `fadeUp .4s ease both`,
      animationDelay: `${index * 0.04}s`,
    }}
      onAnimationEnd={e => { e.currentTarget.style.animation = 'none' }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {insumo.nome}
        </div>
        <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>{insumo.marca}</div>
      </div>

      <div style={{ fontSize: 13.5, color: '#5C594F' }}>{insumo.unidadeMedida}</div>

      <div style={{ fontSize: 14, fontWeight: 600, color: low ? '#C8721F' : '#3A372F', fontVariantNumeric: 'tabular-nums' }}>
        {insumo.estoqueAtual}
        {low && <span style={{ fontSize: 11, marginLeft: 5, color: '#E8973A' }}>⚠</span>}
      </div>

      <div style={{ fontSize: 13.5, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>
        {insumo.estoqueMinimo ?? '—'}
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>
        {BRL4(insumo.custoUnitario)}/{insumo.unidadeMedida}
      </div>

      <div><InsumoStatusBadge insumo={insumo} /></div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ActionMenu items={menuItems} align="right" />
      </div>
    </div>
  )
}

function InsumoCard({ insumo, index, onVer, onEditar, onDesativar }: {
  insumo: InsumoResponse
  index: number
  onVer: () => void
  onEditar: () => void
  onDesativar: () => void
}) {
  const low = isLow(insumo)

  const menuItems: ActionMenuItem[] = [
    { label: 'Ver detalhes', icon: <Icons.eye />,  onClick: onVer },
    { label: 'Editar',       icon: <Icons.edit />, onClick: onEditar },
    { label: 'Desativar',    icon: <Icons.power />, onClick: onDesativar, danger: true, dividerBefore: true },
  ]

  return (
    <div className="i-card-mobile" style={{
      opacity: !insumo.ativo ? 0.65 : 1,
      animation: `fadeUp .4s ease both`,
      animationDelay: `${index * 0.04}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{insumo.nome}</div>
          <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>{insumo.marca}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <InsumoStatusBadge insumo={insumo} small />
            <span style={{ fontSize: 12.5, color: '#5C594F', display: 'flex', alignItems: 'center', gap: 4 }}>
              Estoque: <strong style={{ fontWeight: 600, color: low ? '#C8721F' : '#3A372F' }}>{insumo.estoqueAtual} {insumo.unidadeMedida}</strong>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Custo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>{BRL4(insumo.custoUnitario)}/{insumo.unidadeMedida}</div>
          </div>
          <ActionMenu items={menuItems} align="right" />
        </div>
      </div>
    </div>
  )
}

function CompraLoteModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (impacto: ImpactoAgregadoResponse) => void
}) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<InsumoResponse[]>([])
  const [openList, setOpenList] = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)

  useEffect(() => {
    if (!busca.trim()) {
      setResultadosBusca([])
      setOpenList(false)
      return
    }
    const timer = setTimeout(() => {
      insumoService.buscarParaCarrinho(busca)
        .then(data => {
          setResultadosBusca(data)
          setOpenList(true)
        })
        .catch(console.error)
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const disponiveis = resultadosBusca.filter(i =>
    i.ativo && !itens.find(it => it.insumo.id === i.id)
  )

  const addItem = (insumo: InsumoResponse) => {
    setItens(prev => [...prev, { insumo, qtd: '', preco: '' }])
    setBusca('')
    setOpenList(false)
    setResultadosBusca([])
  }

  const updateItem = (id: string, field: 'qtd' | 'preco', value: string) => {
    setItens(prev => prev.map(it =>
      it.insumo.id === id ? { ...it, [field]: value.replace(/[^\d.,]/g, '') } : it
    ))
  }

  const removeItem = (id: string) => setItens(prev => prev.filter(it => it.insumo.id !== id))

  const podeConfirmar = itens.length > 0 && itens.every(it => num(it.qtd) > 0 && num(it.preco) > 0)

  const confirmar = async () => {
    setLoadingConfirm(true)
    try {
      const response = await loteCompraService.registrar({
        itens: itens.map(it => ({
          insumoId: it.insumo.id,
          quantidadeComprada: num(it.qtd),
          precoTotalPago: num(it.preco),
        })),
      })
      onSuccess(response)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingConfirm(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(620px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
              <Icons.cart />
            </span>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Registrar compras</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Adicione os insumos que você comprou.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icons.x />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                <Icons.search width={16} height={16} />
              </span>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onFocus={() => { if (busca.trim() && resultadosBusca.length > 0) setOpenList(true) }}
                onBlur={() => setTimeout(() => setOpenList(false), 150)}
                placeholder="Buscar insumo para adicionar…"
                style={{
                  width: '100%', height: 46, padding: '0 14px 0 40px',
                  border: '1.5px solid #EFEDE8', borderRadius: 10, fontSize: 14,
                  color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit',
                }}
                onFocusCapture={e => { e.target.style.borderColor = '#2A9D8F'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,143,0.12)' }}
              />
            </div>
            {openList && disponiveis.length > 0 && (
              <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both', maxHeight: 200, overflowY: 'auto' }}>
                {disponiveis.slice(0, 6).map(i => (
                  <button key={i.id} onMouseDown={() => addItem(i)} style={{
                    width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 8,
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3A372F' }}>{i.nome}</span>
                    <span style={{ fontSize: 12, color: '#A29E96' }}>{moeda(i.custoUnitario)} /{i.unidadeMedida}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {itens.length === 0 ? (
            <div style={{ marginTop: 16, padding: '28px', textAlign: 'center', border: '1.5px dashed #EFEDE8', borderRadius: 12, color: '#A29E96', fontSize: 13.5 }}>
              Nenhum insumo adicionado ainda. Use a busca acima.
            </div>
          ) : (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {itens.map(it => {
                const q = num(it.qtd)
                const p = num(it.preco)
                const novoCusto = q > 0 ? p / q : null

                return (
                  <div key={it.insumo.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #EFEDE8', background: '#FCFBF9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{it.insumo.nome}</span>
                      <button onClick={() => removeItem(it.insumo.id)} style={{ border: 'none', background: 'transparent', color: '#B7B4AD', cursor: 'pointer', display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C0492B'}
                        onMouseLeave={e => e.currentTarget.style.color = '#B7B4AD'}
                      >
                        <Icons.trash />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: '1 1 110px' }}>
                        <input
                          value={it.qtd}
                          onChange={e => updateItem(it.insumo.id, 'qtd', e.target.value)}
                          inputMode="decimal"
                          placeholder="Qtd"
                          style={{ width: '100%', height: 42, padding: '0 50px 0 12px', border: '1.5px solid #EFEDE8', borderRadius: 9, fontSize: 14, color: '#3A372F', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12.5, fontWeight: 600, color: '#A8A49C' }}>{it.insumo.unidadeMedida}</span>
                      </div>
                      <div style={{ position: 'relative', flex: '1 1 130px' }}>
                        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 38, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: '#6B6860', background: '#FAF8F5', borderRadius: '9px 0 0 9px', borderRight: '1px solid #EFEDE8' }}>R$</span>
                        <input
                          value={it.preco}
                          onChange={e => updateItem(it.insumo.id, 'preco', e.target.value)}
                          inputMode="decimal"
                          placeholder="0,00"
                          style={{ width: '100%', height: 42, padding: '0 12px 0 46px', border: '1.5px solid #EFEDE8', borderRadius: 9, fontSize: 14, color: '#3A372F', outline: 'none', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ flex: '1 1 130px', textAlign: 'right' }}>
                        {novoCusto != null ? (
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2A9D8F' }}>
                            {moeda(novoCusto)} /{it.insumo.unidadeMedida}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12.5, color: '#A29E96' }}>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose} disabled={loadingConfirm}>Cancelar</Button>
          <Button variant="primary" disabled={!podeConfirmar || loadingConfirm} iconRight={loadingConfirm ? undefined : <Icons.arrowRight />} onClick={confirmar}>
            {loadingConfirm
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} /> Registrando…</span>
              : `Confirmar${itens.length > 0 ? ` (${itens.length})` : ''} e ver impacto`
            }
          </Button>
        </div>
      </div>
    </div>
  )
}

function ImpactoLoteModal({ impacto, onClose }: {
  impacto: ImpactoAgregadoResponse
  onClose: () => void
}) {
  const { insumosAtualizados } = impacto

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(42,157,143,0.12)', color: '#2A9D8F' }}>
              <Icons.layers />
            </span>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Compra registrada!</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>
                {insumosAtualizados.length} {insumosAtualizados.length === 1 ? 'insumo atualizado' : 'insumos atualizados'}.
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icons.x />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ border: '1px solid #EFEDE8', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '11px 16px', background: '#FBFAF8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
              <span>Insumo</span><span style={{ textAlign: 'right' }}>Custo unitário</span>
            </div>
            {insumosAtualizados.map((item) => {
              const subiu = item.custoUnitarioNovo > item.custoUnitarioAnterior
              const igual = item.custoUnitarioNovo === item.custoUnitarioAnterior
              return (
                <div key={item.insumoId} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '14px 16px', borderTop: '1px solid #EFEDE8' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{item.nomeInsumo}</div>
                    <div style={{ fontSize: 11.5, color: '#A29E96', marginTop: 2 }}>
                      +{item.quantidadeAdicionada} {item.unidadeMedida}
                      {item.marca ? ` · ${item.marca}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: 13.5, color: '#A29E96', textDecoration: igual ? 'none' : 'line-through' }}>
                      {BRL4(item.custoUnitarioAnterior)}
                    </span>
                    {!igual && (
                      <>
                        <Icons.arrowRight style={{ color: '#A8A49C' }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14.5, fontWeight: 700, color: subiu ? '#C0492B' : '#1F8A5B' }}>
                          {subiu
                            ? <Icons.arrowDown style={{ transform: 'rotate(180deg)' }} />
                            : <Icons.arrowDown />
                          }
                          {BRL4(item.custoUnitarioNovo)}
                        </span>
                      </>
                    )}
                    {igual && (
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: '#3A372F' }}>
                        {BRL4(item.custoUnitarioNovo)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </div>
  )
}

export default function ListaInsumosPage() {
  const navigate = useNavigate()
  const [insumos, setInsumos] = useState<InsumoResponse[]>([])
  const [filtro, setFiltro] = useState('Todos')
  const [query, setQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [modalCompra, setModalCompra] = useState(false)
  const [impactoLote, setImpactoLote] = useState<ImpactoAgregadoResponse | null>(null)

  const carregar = useCallback((resetar: boolean) => {
    if (resetar) {
      setLoading(true)
      setInsumos([])
      setPage(0)
      insumoService.listar(0)
        .then(data => {
          setInsumos(data.content)
          setHasNext(!data.last)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [])

  useEffect(() => {
    carregar(true)
  }, [carregar])

  const handleQueryChange = (novaQuery: string) => {
    setQuery(novaQuery)
    setInsumos([])
    setPage(0)
    setLoading(true)
    insumoService.listar(0)
      .then(data => {
        setInsumos(data.content)
        setHasNext(!data.last)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const carregarMais = () => {
    const nextPage = page + 1
    setLoadingMore(true)
    insumoService.listar(nextPage)
      .then(data => {
        setInsumos(prev => [...prev, ...data.content])
        setHasNext(!data.last)
        setPage(nextPage)
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false))
  }

  const desativar = async (id: string) => {
    try {
      await insumoService.inativar(id)
      setInsumos(prev => prev.filter(x => x.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCompraSuccess = (impacto: ImpactoAgregadoResponse) => {
    setModalCompra(false)
    setImpactoLote(impacto)
  }

  const handleImpactoClose = () => {
    setImpactoLote(null)
    carregar(true)
  }

  let lista = insumos
  if (filtro === 'Ativos')        lista = lista.filter(o => o.ativo)
  if (filtro === 'Inativos')      lista = lista.filter(o => !o.ativo)
  if (filtro === 'Estoque baixo') lista = lista.filter(isLow)
  if (query.trim()) lista = lista.filter(o =>
    o.nome.toLowerCase().includes(query.toLowerCase()) ||
    (o.marca?.toLowerCase().includes(query.toLowerCase()) ?? false)
  )

  const lowCount = insumos.filter(isLow).length
  const empty = !loading && insumos.length === 0

  return (
    <AppLayout active="insumos">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 29, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>Meus Insumos</h1>
          <p style={{ margin: '7px 0 0', fontSize: 14.5, color: '#A29E96' }}>
            A base de toda precificação justa começa aqui.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<Icons.cart />} onClick={() => setModalCompra(true)}>
            Registrar compras
          </Button>
          <Button variant="primary" icon={<Icons.plus />} onClick={() => navigate('/insumos/novo')}>
            Novo Insumo
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando insumos…
        </div>
      ) : empty ? (
        <EmptyState
          icon={<Icons.box />}
          title="Nenhum insumo cadastrado ainda"
          description="Cadastre o primeiro para começar a montar suas fichas técnicas."
          action={{ label: 'Cadastrar primeiro insumo', icon: <Icons.plus />, onClick: () => navigate('/insumos/novo') }}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map(f => {
                const on = filtro === f
                const isLowChip = f === 'Estoque baixo'
                return (
                  <button key={f} onClick={() => setFiltro(f)} style={{
                    height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    border: `1.5px solid ${on ? (isLowChip ? '#E8973A' : '#2A9D8F') : '#EFEDE8'}`,
                    background: on ? (isLowChip ? '#F2913C' : '#2A9D8F') : '#fff',
                    color: on ? '#fff' : '#5C594F',
                    transition: 'all .14s',
                  }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#FAF8F5' }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff' }}
                  >
                    {isLowChip && (
                      <span style={{ display: 'flex', color: on ? '#fff' : '#E8973A' }}>
                        <Icons.alertCircle width={14} height={14} />
                      </span>
                    )}
                    {f}
                    {isLowChip && lowCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                        display: 'grid', placeItems: 'center',
                        fontSize: 11, fontWeight: 700,
                        background: on ? 'rgba(255,255,255,0.28)' : '#FFF1E8',
                        color: on ? '#fff' : '#C8721F',
                      }}>{lowCount}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ position: 'relative', maxWidth: 440 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                <Icons.search />
              </span>
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Buscar por nome ou marca…"
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                style={{
                  width: '100%', height: 44, padding: '0 16px 0 42px',
                  border: `1.5px solid ${searchFocus ? '#2A9D8F' : '#EFEDE8'}`,
                  borderRadius: 10, fontSize: 14, color: '#3A372F',
                  background: '#fff', outline: 'none', fontFamily: 'inherit',
                  boxShadow: searchFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
              />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="i-head">
              {['Insumo', 'Unidade', 'Estoque atual', 'Estoque mín.', 'Custo unitário', 'Status', ''].map((h, k) => (
                <div key={k} style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C' }}>
                  {h}
                </div>
              ))}
            </div>

            {lista.length === 0 ? (
              <EmptyState compact title="Nenhum insumo encontrado" description="Ajuste os filtros ou a busca." />
            ) : lista.map((o, i) => (
              <React.Fragment key={o.id}>
                <InsumoRow
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onDesativar={() => desativar(o.id)}
                />
                <InsumoCard
                  insumo={o} index={i}
                  onVer={() => navigate(`/insumos/${o.id}`)}
                  onEditar={() => navigate(`/insumos/${o.id}/editar`)}
                  onDesativar={() => desativar(o.id)}
                />
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12.5, color: '#A29E96', alignSelf: 'flex-end', width: '100%', textAlign: 'right' }}>
              {lista.length} {lista.length === 1 ? 'insumo' : 'insumos'}
            </div>
            {hasNext && (
              <button onClick={carregarMais} disabled={loadingMore} style={{
                height: 44, padding: '0 24px', borderRadius: 10,
                border: '1.5px solid #EFEDE8', background: '#fff',
                color: '#2A9D8F', fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: loadingMore ? 0.7 : 1,
              }}
                onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = 'rgba(42,157,143,0.06)' }}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
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

      {modalCompra && (
        <CompraLoteModal
          onClose={() => setModalCompra(false)}
          onSuccess={handleCompraSuccess}
        />
      )}
      {impactoLote && (
        <ImpactoLoteModal impacto={impactoLote} onClose={handleImpactoClose} />
      )}

    </AppLayout>
  )
}
