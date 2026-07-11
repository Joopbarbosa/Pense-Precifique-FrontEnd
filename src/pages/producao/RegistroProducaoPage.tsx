import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Icons } from '../../components/ui/Icons'
import ActionMenu, { ActionMenuItem } from '../../components/shared/ActionMenu'
import { producaoService } from '../../services/producaoService'
import { produtoService } from '../../services/produtoService'
import type { ProducaoResponse, ProducaoDetalheResponse, InsumoConsumidoResponse, LancarProducaoRequest } from '../../types/producao'
import type { ProdutoResponse, ProdutoDetalheResponse } from '../../types/produto'
import type { TipoProduto } from '../../types'

/* ── helpers ─────────────────────────────────────────────────── */

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const TIPO_LABELS: { label: string; value: TipoProduto }[] = [
  { label: 'Produto',      value: 'PRODUTO'      },
  { label: 'Produto Base', value: 'PRODUTO_BASE' },
  { label: 'Customização', value: 'CUSTOMIZACAO' },
]

/* ── Counter ─────────────────────────────────────────────────── */

function Counter({ value, setValue }: { value: number; setValue: (n: number) => void }) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => { setRaw(String(value)) }, [value])

  const btn = (icon: React.ReactNode, fn: () => void, disabled: boolean) => (
    <button onClick={fn} disabled={disabled} aria-label="ajustar" style={{
      width: 44, height: 44, borderRadius: 11, border: '1.5px solid #EFEDE8',
      background: disabled ? '#F8F7F4' : '#fff', color: disabled ? '#CFCBC3' : '#5C594F',
      cursor: disabled ? 'default' : 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = '#2A9D8F'; e.currentTarget.style.color = '#2A9D8F' } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = '#EFEDE8'; e.currentTarget.style.color = '#5C594F' } }}
    >{icon}</button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {btn(<Icons.minus />, () => setValue(Math.max(1, value - 1)), value <= 1)}
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          setRaw(v)
          const n = parseInt(v, 10)
          if (!isNaN(n) && n >= 1) setValue(n)
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#2A9D8F'; e.currentTarget.select() }}
        onBlur={e => {
          e.currentTarget.style.borderColor = '#EFEDE8'
          const n = parseInt(raw, 10)
          const valid = !isNaN(n) && n >= 1 ? n : 1
          setValue(valid)
          setRaw(String(valid))
        }}
        style={{
          width: 68, textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#3A372F',
          fontVariantNumeric: 'tabular-nums', border: '1.5px solid #EFEDE8', borderRadius: 8,
          height: 44, outline: 'none', fontFamily: 'inherit', background: '#fff', padding: 0,
          transition: 'border-color .15s',
        }}
      />
      {btn(<Icons.plus />, () => setValue(value + 1), false)}
    </div>
  )
}

/* ── ProdutoBuscador ─────────────────────────────────────────── */

function ProdutoBuscador({ tipoItem, value, onChange }: {
  tipoItem: TipoProduto
  value: ProdutoResponse | null
  onChange: (p: ProdutoResponse) => void
}) {
  const [busca, setBusca] = useState('')
  const [opts, setOpts] = useState<ProdutoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const delay = busca ? 300 : 0
    const t = setTimeout(async () => {
      try {
        const res = await produtoService.listar(0, 20, tipoItem, busca || undefined)
        const ativos = res.content.filter(p => p.ativo)
        if (busca.trim()) {
          const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          const q = norm(busca.trim())
          setOpts(ativos.filter(p => norm(p.nome).includes(q)))
        } else {
          setOpts(ativos)
        }
      } catch {
        setOpts([])
      } finally {
        setLoading(false)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [busca, tipoItem, open])

  useEffect(() => {
    setBusca('')
    setOpen(false)
  }, [tipoItem])

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={handleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        border: `1.5px solid ${open ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10,
        background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        boxShadow: open ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          <Icons.cube />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>{value.nome}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Clique para trocar</span>
            </>
          ) : (
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 400, color: '#A29E96' }}>Selecione um produto...</span>
          )}
        </span>
        <span style={{ color: '#A29E96', display: 'flex' }}><Icons.caret /></span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 14px 34px -10px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'pop .14s ease both' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F4F2EE' }}>
            <input
              ref={inputRef}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              style={{ width: '100%', height: 38, padding: '0 12px', border: '1.5px solid #EFEDE8', borderRadius: 8, fontSize: 14, color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2A9D8F' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EFEDE8' }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: 6 }}>
            {loading ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 13, color: '#A29E96' }}>Buscando...</div>
            ) : opts.length === 0 ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 13, color: '#A29E96' }}>Nenhum produto encontrado</div>
            ) : opts.map(p => {
              const on = value?.id === p.id
              return (
                <button key={p.id} onClick={() => { onChange(p); setOpen(false); setBusca('') }} style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                  padding: '10px 11px', borderRadius: 9, border: 'none',
                  background: on ? 'rgba(42,157,143,0.08)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#F7F5F1' }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? 'rgba(42,157,143,0.08)' : 'transparent' }}
                >
                  <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}><Icons.cube /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: on ? '#2A9D8F' : '#3A372F' }}>{p.nome}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#A29E96' }}>Estoque: {p.estoqueAtual}</span>
                  </span>
                  {on && <span style={{ color: '#2A9D8F', display: 'flex' }}><Icons.check /></span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── QuantidadeProduzidaInput ────────────────────────────────── */

function QuantidadeProduzidaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [f, setF] = useState(false)
  return (
    <div style={{ position: 'relative', width: 140 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        placeholder="1"
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          width: '100%', height: 44, padding: '0 40px 0 14px', textAlign: 'right',
          border: `1.5px solid ${f ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10,
          fontSize: 18, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums',
          background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          boxShadow: f ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none', transition: 'border-color .15s, box-shadow .15s',
        }}
      />
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>un</span>
    </div>
  )
}

/* ── ConfirmEstoqueModal ─────────────────────────────────────── */

function ConfirmEstoqueModal({ insumos, onCancel, onConfirm, confirming }: {
  insumos: InsumoConsumidoResponse[]
  onCancel: () => void
  onConfirm: () => void
  confirming: boolean
}) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.5)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 100%)', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(192,73,43,0.12)', color: '#C0492B' }}>
            <Icons.alertTriangle width={22} height={22} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Saldo insuficiente de insumo</div>
            <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>O estoque do insumo pode ficar negativo.</div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: '#5C594F', lineHeight: 1.5 }}>
            {insumos.length === 1 ? 'Este insumo não tem' : 'Estes insumos não têm'} saldo suficiente para esta produção:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#B23A1E', lineHeight: 1.7 }}>
            {insumos.map(i => (
              <li key={i.insumoId}>
                <strong style={{ fontWeight: 700 }}>{i.nomeInsumo}{i.marca ? ` (${i.marca})` : ''}</strong>
                {' — precisa '}{i.quantidade} {i.unidadeMedida}, disponível {i.estoqueAntes ?? 0} {i.unidadeMedida}
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, fontSize: 12.5, color: '#A29E96', lineHeight: 1.5 }}>
            Deseja continuar mesmo assim? O sistema pode rejeitar a produção se o saldo não permitir.
          </p>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onCancel} disabled={confirming}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Confirmando...' : 'Continuar mesmo assim'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── NovaProducaoModal ───────────────────────────────────────── */

function NovaProducaoModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (p: ProducaoDetalheResponse) => void
}) {
  const [tipoAtivo, setTipoAtivo] = useState<TipoProduto>('PRODUTO')
  const [produto, setProduto] = useState<ProdutoResponse | null>(null)
  const [produtoDetalhe, setProdutoDetalhe] = useState<ProdutoDetalheResponse | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [qtdInput, setQtdInput] = useState('1')
  const [previewInsumos, setPreviewInsumos] = useState<InsumoConsumidoResponse[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmEstoque, setConfirmEstoque] = useState(false)

  const trocaTipo = (v: TipoProduto) => {
    setTipoAtivo(v)
    setProduto(null)
    setProdutoDetalhe(null)
    setPreviewInsumos(null)
    setErro(null)
  }

  const selecionaProduto = (p: ProdutoResponse) => {
    setProduto(p)
    setProdutoDetalhe(null)
    setQtdInput('1')
    setErro(null)
  }

  useEffect(() => {
    if (!produto) { setProdutoDetalhe(null); return }
    setLoadingDetalhe(true)
    produtoService.buscarPorId(produto.id)
      .then(setProdutoDetalhe)
      .catch(() => setProdutoDetalhe(null))
      .finally(() => setLoadingDetalhe(false))
  }, [produto])

  const fracionavel = !produtoDetalhe?.algumInsumoNaoFracionavel
  const rendimento = produtoDetalhe?.rendimento ?? null
  const lotesNum = parseInt(qtdInput, 10) || 0
  const quantidadeNum = parseFloat(qtdInput.replace(',', '.')) || 0
  const quantidadeFinal = fracionavel ? quantidadeNum : lotesNum * (rendimento ?? 0)

  useEffect(() => {
    if (!produto || !produtoDetalhe || quantidadeFinal <= 0) { setPreviewInsumos(null); return }
    setLoadingPreview(true)
    const t = setTimeout(async () => {
      try {
        const res = await producaoService.preview(produto.id, quantidadeFinal)
        setPreviewInsumos(res)
      } catch {
        setPreviewInsumos(null)
      } finally {
        setLoadingPreview(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [produto, produtoDetalhe, quantidadeFinal])

  const doLancar = async () => {
    if (!produto) return
    setSubmitting(true)
    setErro(null)
    try {
      const payload: LancarProducaoRequest = fracionavel
        ? { produtoId: produto.id, quantidade: quantidadeNum, confirmarEstoqueNegativo: temFalta }
        : { produtoId: produto.id, lotes: lotesNum, confirmarEstoqueNegativo: temFalta }
      const result = await producaoService.lancar(payload)
      onSuccess(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao lançar produção.'
      setErro(msg)
    } finally {
      setSubmitting(false)
      setConfirmEstoque(false)
    }
  }

  const temFalta = previewInsumos?.some(i => i.estoqueInsuficiente) ?? false

  const handleConfirmarClick = () => {
    if (temFalta) { setConfirmEstoque(true); return }
    doLancar()
  }

  const podeConfirmar = !!produto && !!produtoDetalhe && !submitting && !loadingDetalhe && quantidadeFinal > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 'min(680px, 100%)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both', margin: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
              <Icons.factory width={24} height={24} />
            </span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Nova Produção</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Produza antecipado e baixe os insumos do estoque.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E9E7E2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F1F0EC')}
          ><Icons.x /></button>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>Tipo do item produzido</span>
            <div style={{ display: 'flex', padding: 4, background: '#F1F0EC', borderRadius: 10, gap: 3 }}>
              {TIPO_LABELS.map(({ label, value }) => {
                const on = tipoAtivo === value
                return (
                  <button key={value} type="button" onClick={() => trocaTipo(value)} style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: on ? '#fff' : 'transparent', color: on ? '#3A372F' : '#8A8780', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 4px', boxShadow: on ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all .14s' }}>{label}</button>
                )
              })}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 8 }}>
              {tipoAtivo === 'PRODUTO_BASE' ? 'Produto base a produzir' : tipoAtivo === 'CUSTOMIZACAO' ? 'Customização a produzir' : 'Produto a produzir'}
            </span>
            <ProdutoBuscador tipoItem={tipoAtivo} value={produto} onChange={selecionaProduto} />
          </div>

          {produto && loadingDetalhe ? (
            <div style={{ fontSize: 13, color: '#A29E96' }}>Carregando dados do produto...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F' }}>
                    {fracionavel ? 'Quantidade produzida' : 'Quantos lotes você produziu?'}
                  </span>
                  {!fracionavel && rendimento != null && (
                    <span style={{ display: 'block', fontSize: 12, color: '#A29E96', marginTop: 2 }}>1 lote = {rendimento} unidades</span>
                  )}
                </div>
                {fracionavel
                  ? <QuantidadeProduzidaInput value={qtdInput} onChange={setQtdInput} />
                  : <Counter value={lotesNum || 1} setValue={n => setQtdInput(String(n))} />
                }
              </div>

              {!fracionavel && rendimento == null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#C0492B' }}>
                  <Icons.alertCircle width={13} height={13} /> Este produto não tem rendimento definido — edite o produto antes de lançar produção.
                </div>
              )}

              {!fracionavel && rendimento != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(42,157,143,0.06)', border: '1px dashed rgba(42,157,143,0.3)' }}>
                  <span style={{ fontSize: 13, color: '#5C594F' }}>Quantidade final ({lotesNum} {lotesNum === 1 ? 'lote' : 'lotes'} × {rendimento} un)</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>{quantidadeFinal} unidades</span>
                </div>
              )}
            </div>
          )}

          {produto && (
            <div style={{ borderRadius: 14, background: 'rgba(42,157,143,0.05)', border: '1.5px solid rgba(42,157,143,0.22)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid rgba(42,157,143,0.18)' }}>
                <span style={{ display: 'flex', color: '#2A9D8F' }}><Icons.layers /></span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1E7268' }}>Insumos que serão consumidos para {quantidadeFinal} {quantidadeFinal === 1 ? 'unidade' : 'unidades'}</span>
              </div>
              {loadingPreview ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#A29E96' }}>Calculando consumo...</div>
              ) : previewInsumos && previewInsumos.length > 0 ? (
                <div>
                  {previewInsumos.map((ins, i) => (
                    <div key={ins.insumoId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(42,157,143,0.12)', animation: 'rowIn .25s ease both' }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: ins.estoqueInsuficiente ? '#FBEDE9' : '#E8F5EE', color: ins.estoqueInsuficiente ? '#C0492B' : '#1F8A5B' }}>
                        {ins.estoqueInsuficiente ? <Icons.alertCircle width={13} height={13} /> : <Icons.check width={13} height={13} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.8, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ins.nomeInsumo}{ins.marca ? ` (${ins.marca})` : ''}
                        </div>
                        {ins.estoqueAntes !== undefined && (
                          <div style={{ fontSize: 12, color: '#A29E96', marginTop: 1 }}>
                            Disponível: <strong style={{ fontWeight: 600, color: ins.estoqueInsuficiente ? '#C0492B' : '#5C594F' }}>{ins.estoqueAntes} {ins.unidadeMedida}</strong>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{ins.quantidade} {ins.unidadeMedida}</div>
                        {ins.estoqueInsuficiente
                          ? <div style={{ fontSize: 11, fontWeight: 700, color: '#C0492B', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 1 }}><Icons.alertCircle width={11} height={11} /> Saldo insuficiente</div>
                          : <div style={{ fontSize: 11, fontWeight: 600, color: '#1F8A5B', marginTop: 1 }}>OK</div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : previewInsumos?.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#A29E96' }}>Sem insumos vinculados a este produto</div>
              ) : null}
            </div>
          )}

          {temFalta && (
            <div style={{ animation: 'fadeUp .3s ease both' }}>
              <div style={{ display: 'flex', gap: 10, padding: '13px 15px', borderRadius: 12, background: '#FFF8F0', border: '1px solid #F6E4CE' }}>
                <span style={{ flexShrink: 0, color: '#C8721F', marginTop: 1 }}><Icons.alertTriangle width={16} height={16} /></span>
                <p style={{ margin: 0, fontSize: 12.8, color: '#7A5A33', lineHeight: 1.55 }}>Um ou mais insumos estão com <strong style={{ fontWeight: 700 }}>saldo insuficiente</strong>. Ao confirmar, vamos pedir uma confirmação extra antes de enviar.</p>
              </div>
            </div>
          )}

          {erro && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderRadius: 10, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
              <span style={{ flexShrink: 0, color: '#C0492B', display: 'flex', marginTop: 1 }}><Icons.alertCircle width={16} height={16} /></span>
              <p style={{ margin: 0, fontSize: 13, color: '#C0492B', lineHeight: 1.5 }}>{erro}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <button
            onClick={handleConfirmarClick}
            disabled={!podeConfirmar}
            style={{ height: 46, padding: '0 22px', borderRadius: 10, border: 'none', background: podeConfirmar ? '#F97316' : '#E7E4DE', color: podeConfirmar ? '#fff' : '#B0ACA4', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: podeConfirmar ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxShadow: podeConfirmar ? '0 8px 18px -8px rgba(249,115,22,0.7)' : 'none', transition: 'all .15s' }}
            onMouseEnter={e => { if (podeConfirmar) e.currentTarget.style.filter = 'brightness(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            <Icons.factory width={17} height={17} />
            {submitting ? 'Lançando...' : 'Confirmar produção'}
          </button>
        </div>
      </div>

      {confirmEstoque && (
        <ConfirmEstoqueModal
          insumos={(previewInsumos ?? []).filter(i => i.estoqueInsuficiente)}
          onCancel={() => setConfirmEstoque(false)}
          onConfirm={doLancar}
          confirming={submitting}
        />
      )}
    </div>
  )
}

/* ── CancelarProducaoModal ───────────────────────────────────── */

function CancelarProducaoModal({ prod, onClose, onSuccess }: {
  prod: ProducaoResponse
  onClose: () => void
  onSuccess: () => void
}) {
  const [obs, setObs] = useState('')
  const [focus, setFocus] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const podeConfirmar = obs.trim().length >= 50 && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setErro(null)
    try {
      await producaoService.cancelar(prod.id, obs)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao cancelar produção.'
      setErro(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px', borderBottom: '1px solid #EFEDE8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
            <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: 'rgba(192,73,43,0.12)', color: '#C0492B' }}>
              <Icons.alertCircle />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em' }}>Cancelar produção #{prod.numero}</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>Esta ação não pode ser desfeita.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E9E7E2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F1F0EC')}
          ><Icons.x /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 16px', borderRadius: 12, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#B23A1E', marginBottom: 8 }}>Esta ação irá:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#8A5A4C', lineHeight: 1.6 }}>
              <li>Subtrair <strong style={{ fontWeight: 700 }}>{prod.quantidade} unid.</strong> do estoque de <strong style={{ fontWeight: 700 }}>{prod.nomeProduto}</strong></li>
              <li>Devolver ao estoque os insumos consumidos nesta produção</li>
              <li>Marcar a produção como <strong style={{ fontWeight: 700 }}>Cancelada</strong> (não pode ser reativada)</li>
            </ul>
          </div>

          <label>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              Motivo do cancelamento <span style={{ color: '#F97316' }}>*</span>
              <span style={{ fontWeight: 400, color: obs.length >= 50 ? '#3E9D5A' : '#A29E96', marginLeft: 8 }}>
                {obs.length}/50 caracteres mín.
              </span>
            </span>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="Descreva o motivo do cancelamento (ex: quantidade registrada foi incorreta, era para ser outro produto)"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px',
                border: `1.5px solid ${obs.length > 0 && obs.length < 50 ? '#F2B8A6' : (focus ? '#2A9D8F' : '#EFEDE8')}`,
                borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                resize: 'vertical', lineHeight: 1.5,
                boxShadow: focus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                transition: 'border-color .15s, box-shadow .15s',
                boxSizing: 'border-box',
              }}
            />
            {obs.length > 0 && obs.length < 50 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12.5, color: '#C0492B' }}>
                <Icons.alertCircle width={13} height={13} /> Mínimo de 50 caracteres. Faltam {50 - obs.length}.
              </div>
            )}
          </label>

          {erro && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderRadius: 10, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
              <span style={{ flexShrink: 0, color: '#C0492B', display: 'flex', marginTop: 1 }}><Icons.alertCircle width={16} height={16} /></span>
              <p style={{ margin: 0, fontSize: 13, color: '#C0492B', lineHeight: 1.5 }}>{erro}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEDE8', display: 'flex', gap: 11, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Voltar</Button>
          <Button variant="danger" disabled={!podeConfirmar} onClick={handleSubmit}>
            {submitting ? 'Cancelando...' : 'Cancelar produção'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── ProducaoDetalhe ─────────────────────────────────────────── */

function ProducaoDetalhe({ prod, onBack }: { prod: ProducaoDetalheResponse; onBack: () => void }) {
  const cancelada = prod.status === 'CANCELADA'

  return (
    <div style={{ animation: 'fadeUp .35s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px 0 12px', borderRadius: 10, border: '1.5px solid #EFEDE8', background: '#fff', color: '#5C594F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FAF8F5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Icons.chevron /></span> Voltar para Produção
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 22, flexWrap: 'wrap' }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
          <Icons.factory width={24} height={24} />
        </span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Produção #{prod.numero} — {fmtData(prod.dataProducao)}</h1>
            {cancelada && (
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 27, padding: '0 11px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 12.5, fontWeight: 700 }}>
                Cancelada
              </span>
            )}
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: '#A29E96' }}>
            {cancelada ? 'Esta produção foi cancelada e seus efeitos no estoque foram revertidos.' : 'Baixa de insumos registrada no estoque.'}
          </p>
        </div>
      </div>

      {cancelada && prod.observacaoCancelamento && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, padding: '13px 15px', borderRadius: 12, background: '#FBEDE9', border: '1px solid #F2D8CF' }}>
          <span style={{ flexShrink: 0, color: '#C0492B', marginTop: 1 }}><Icons.alertCircle /></span>
          <p style={{ margin: 0, fontSize: 12.8, color: '#8A5A4C', lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 700 }}>Motivo do cancelamento:</strong> {prod.observacaoCancelamento}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '18px 20px', marginBottom: 18, opacity: cancelada ? 0.65 : 1 }}>
        <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
          <Icons.cube width={22} height={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', letterSpacing: '-0.01em', textDecoration: cancelada ? 'line-through' : 'none' }}>{prod.nomeProduto}</div>
          <div style={{ fontSize: 13, color: '#A29E96', marginTop: 2 }}>Produzido em {fmtData(prod.dataProducao)}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: cancelada ? '#A29E96' : '#2A9D8F', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textDecoration: cancelada ? 'line-through' : 'none' }}>{prod.quantidade}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#A29E96', marginTop: 3 }}>unidades produzidas</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', opacity: cancelada ? 0.65 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', borderBottom: '1px solid #EFEDE8' }}>
          <span style={{ display: 'flex', color: '#2A9D8F' }}><Icons.layers /></span>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#5C594F', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Insumos consumidos</h2>
        </div>
        {prod.insumosConsumidos.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', fontSize: 13, color: '#A29E96' }}>Nenhum insumo registrado</div>
        ) : prod.insumosConsumidos.map((row, i) => (
          <div key={row.insumoId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid #F4F2EE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: '#F1F0EC', color: '#9A968E' }}>
                <Icons.box width={16} height={16} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', textDecoration: cancelada ? 'line-through' : 'none' }}>
                {row.nomeInsumo}{row.marca ? ` (${row.marca})` : ''}
              </span>
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: cancelada ? 'line-through' : 'none' }}>
              {row.quantidade} {row.unidadeMedida}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── página principal ────────────────────────────────────────── */

export default function RegistroProducaoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()

  const [producoes, setProducoes] = useState<ProducaoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [busca, setBusca] = useState('')
  const [buscaFocus, setBuscaFocus] = useState(false)
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [detalhe, setDetalhe] = useState<ProducaoDetalheResponse | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [cancelarProd, setCancelarProd] = useState<ProducaoResponse | null>(null)

  const carregarLista = useCallback(async (page: number, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const res = await producaoService.listar(page, 20)
      setProducoes(prev => reset ? res.content : [...prev, ...res.content])
      setHasNext(!res.last)
      setCurrentPage(page)
    } catch {
      // silent — erros de auth tratados pelo interceptor axios
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!id) { carregarLista(0, true) }
  }, [id, carregarLista])

  useEffect(() => {
    if (!id) { setDetalhe(null); return }
    setLoadingDetalhe(true)
    producaoService.buscarPorId(id)
      .then(d => setDetalhe(d))
      .catch(() => navigate('/producao'))
      .finally(() => setLoadingDetalhe(false))
  }, [id, navigate])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSuccess = (p: ProducaoDetalheResponse) => {
    const novaProd: ProducaoResponse = {
      id: p.id,
      numero: p.numero,
      produtoId: p.produtoId,
      nomeProduto: p.nomeProduto,
      tipoProduto: p.tipoProduto,
      quantidade: p.quantidade,
      dataProducao: p.dataProducao,
      status: p.status,
    }
    setProducoes(prev => [novaProd, ...prev])
    setModal(false)
    setToast('Produção lançada com sucesso!')
  }

  const handleCancelSuccess = () => {
    if (!cancelarProd) return
    setProducoes(prev => prev.map(p =>
      p.id === cancelarProd.id ? { ...p, status: 'CANCELADA' as const } : p
    ))
    setCancelarProd(null)
    setToast('Produção cancelada com sucesso.')
  }

  const filtrado = producoes.filter(h =>
    busca.trim() === '' || h.nomeProduto.toLowerCase().includes(busca.trim().toLowerCase())
  )

  const menuItems = (h: ProducaoResponse): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { label: 'Ver detalhes', icon: <Icons.eye />, onClick: () => navigate(`/producao/${h.id}`) },
    ]
    if (h.status === 'ATIVA') {
      items.push({
        label: 'Cancelar produção',
        icon: <Icons.ban />,
        onClick: () => setCancelarProd(h),
        danger: true,
        dividerBefore: true,
      })
    }
    return items
  }

  // Vista de detalhe
  if (id) {
    return (
      <AppLayout active="producao">
        {loadingDetalhe || !detalhe ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A29E96', fontSize: 15 }}>
            {loadingDetalhe ? 'Carregando produção...' : ''}
          </div>
        ) : (
          <ProducaoDetalhe prod={detalhe} onBack={() => navigate('/producao')} />
        )}
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao">

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, padding: '12px 20px', borderRadius: 10, background: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px -8px rgba(42,157,143,0.6)', animation: 'fadeUp .25s ease both', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', color: '#3A372F' }}>Registro de Produção</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: '#A29E96' }}>Registre o que você produziu para dar baixa nos insumos e atualizar o estoque dos seus produtos.</p>
        </div>
        <button onClick={() => setModal(true)} style={{ height: 46, padding: '0 20px', borderRadius: 10, border: 'none', background: '#F97316', color: '#fff', fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap', boxShadow: '0 8px 18px -8px rgba(249,115,22,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <Icons.plus /> Nova Produção
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 380 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: buscaFocus ? '#2A9D8F' : '#A8A49C', display: 'flex' }}>
            <Icons.search />
          </span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setBuscaFocus(true)}
            onBlur={() => setBuscaFocus(false)}
            placeholder="Buscar por produto..."
            style={{ width: '100%', height: 46, padding: '0 14px 0 42px', border: `1.5px solid ${buscaFocus ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10, fontSize: 14.5, color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit', boxShadow: buscaFocus ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none', transition: 'border-color .15s, box-shadow .15s' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ display: 'flex', color: '#A8A49C' }}><Icons.factory width={17} height={17} /></span>
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#5C594F', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Histórico de produções</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#A29E96', fontSize: 15 }}>Carregando...</div>
      ) : filtrado.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#A29E96', fontSize: 15 }}>
          {busca ? 'Nenhuma produção encontrada para essa busca.' : 'Nenhuma produção registrada ainda.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="prod-head">
            {['Data', 'Produto', 'Quantidade', 'Status', ''].map((h, k) => (
              <div key={k} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A8A49C', textAlign: k === 4 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {filtrado.map((h) => (
            <React.Fragment key={h.id}>
              <div className="prod-row" style={{ animation: 'fadeUp .35s ease both', opacity: h.status === 'CANCELADA' ? 0.65 : 1 }}
                onClick={() => navigate(`/producao/${h.id}`)}
              >
                <div style={{ fontSize: 13, color: '#5C594F', fontVariantNumeric: 'tabular-nums' }}>{fmtData(h.dataProducao)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
                    <Icons.cube />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nomeProduto}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#3A372F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{h.quantidade} unid.</div>
                <div>
                  {h.status === 'CANCELADA'
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 11, fontWeight: 700 }}>Cancelada</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 999, background: '#E8F5EE', color: '#1F8A5B', fontSize: 11, fontWeight: 700 }}>Ativa</span>
                  }
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <ActionMenu items={menuItems(h)} align="right" />
                </div>
              </div>

              <div className="prod-card" style={{ padding: '16px 18px', borderTop: '1px solid #EFEDE8', animation: 'fadeUp .35s ease both', opacity: h.status === 'CANCELADA' ? 0.65 : 1 }}
                onClick={() => navigate(`/producao/${h.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
                      <Icons.cube />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{h.nomeProduto}</span>
                      {h.status === 'CANCELADA' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 999, background: '#FBEDE7', color: '#C0492B', fontSize: 11, fontWeight: 700, marginLeft: 8 }}>Cancelada</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2A9D8F', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{h.quantidade} unid.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
                  <span style={{ fontSize: 12, color: '#A29E96', fontVariantNumeric: 'tabular-nums' }}>{fmtData(h.dataProducao)}</span>
                  <div onClick={e => e.stopPropagation()}>
                    <ActionMenu items={menuItems(h)} align="right" />
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}

          {hasNext && !busca && (
            <div style={{ padding: '16px 18px', borderTop: '1px solid #EFEDE8', textAlign: 'center' }}>
              <button
                onClick={() => carregarLista(currentPage + 1, false)}
                disabled={loadingMore}
                style={{ height: 40, padding: '0 20px', borderRadius: 10, border: '1.5px solid #EFEDE8', background: '#fff', color: '#5C594F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = '#FAF8F5' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      )}

      {modal && <NovaProducaoModal onClose={() => setModal(false)} onSuccess={handleSuccess} />}
      {cancelarProd && (
        <CancelarProducaoModal
          prod={cancelarProd}
          onClose={() => setCancelarProd(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </AppLayout>
  )
}
