import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import ModalShell from '../../components/ui/ModalShell'
import SectionTitle from '../../components/shared/SectionTitle'
import { Icons } from '../../components/ui/Icons'
import { insumoService } from '../../services/insumoService'
import type { InsumoRequest, NovoInsumoRequest } from '../../types/insumo'

const UNIDADES = ['Unidade', 'cm', 'g', 'ml', 'Folha']

const unLabel = (u: string) => u === 'Unidade' ? 'un' : u === 'Folha' ? 'folha' : u

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function Field({ label, opt, hint, erro, children }: { label: string; opt?: boolean; hint?: string; erro?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
        {label}
        {opt && <span style={{ fontSize: 11.5, fontWeight: 500, color: '#A29E96' }}>(opcional)</span>}
      </span>
      {children}
      {erro
        ? <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{erro}</span>
        : hint && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#A29E96', lineHeight: 1.5 }}>{hint}</p>
      }
    </label>
  )
}

function DesativarModal({ onClose }: { onClose: () => void }) {
  const fichas = [
    { nome: 'Kit Convite Casamento', tipo: 'Produto', icon: Icons.cubeSmall },
    { nome: 'Etiqueta personalizada', tipo: 'Produto', icon: Icons.cubeSmall },
    { nome: 'Laminação fosca', tipo: 'Customização', icon: Icons.tag },
  ]

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Atenção — este insumo está em uso"
      icon={<Icons.alertCircle />}
      iconBg="#FFF4E8"
      iconColor="#C8721F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={onClose}>Ver fichas</Button>
          <Button variant="danger" onClick={onClose}>Desativar mesmo assim</Button>
        </>
      }
    >
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5C594F', lineHeight: 1.55 }}>
        Desativar este insumo pode afetar o custo das fichas técnicas abaixo:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {fichas.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 11, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
            <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
              <f.icon />
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#3A372F' }}>{f.nome}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#7C786F', background: '#F1F0EC', padding: '3px 9px', borderRadius: 999 }}>{f.tipo}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

const SECTION_STYLE: React.CSSProperties = {
  padding: '24px 26px',
  borderBottom: '1px solid #EFEDE8',
}

export default function FormInsumoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id

  const [nome, setNome] = useState('')
  const [marca, setMarca] = useState('')
  const [unidade, setUnidade] = useState('Folha')
  const [unidadeOpen, setUnidadeOpen] = useState(false)
  const [fracao, setFracao] = useState(false)
  const [estoque, setEstoque] = useState('')
  const [minimo, setMinimo] = useState('')
  const [precoCompra, setPrecoCompra] = useState('')
  const [qtdCompra, setQtdCompra] = useState('')
  const [precoTocado, setPrecoTocado] = useState(false)
  const [qtdTocado, setQtdTocado] = useState(false)
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(true)
  const [focus, setFocus] = useState<string | null>(null)
  const [modal, setModal] = useState<'desativar' | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [custoUnitarioExistente, setCustoUnitarioExistente] = useState<number | null>(null)
  const unRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editando && id) {
      setLoadingData(true)
      insumoService.buscarPorId(id)
        .then(data => {
          setNome(data.nome)
          setMarca(data.marca ?? '')
          const u = UNIDADES.find(u => u === data.unidadeMedida) ?? data.unidadeMedida
          setUnidade(u)
          setFracao(data.fracionavel ?? true)
          setEstoque(data.estoqueAtual.toString())
          setMinimo(data.estoqueMinimo?.toString() ?? '')
          setCustoUnitarioExistente(data.custoUnitario)
          setPermitirEstoqueNegativo(data.permitirEstoqueNegativo)
        })
        .catch(() => setError('Não foi possível carregar os dados do insumo.'))
        .finally(() => setLoadingData(false))
    }
  }, [editando, id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unRef.current && !unRef.current.contains(e.target as Node)) setUnidadeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const preco = num(precoCompra)
  const qComprada = num(qtdCompra)
  // Em edição: usa custoUnitario existente da API; em cadastro: calcula pelo preço/qtd da compra inicial
  const custoUnit = editando && custoUnitarioExistente !== null
    ? custoUnitarioExistente
    : (qComprada > 0 ? preco / qComprada : null)
  const custoFmt = custoUnit != null
    ? 'R$ ' + custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: custoUnit < 0.1 ? 3 : 2, maximumFractionDigits: 3 })
    : '—'

  // O insumo nasce com a compra inicial já registrada — o backend cria o insumo
  // e a movimentação de ENTRADA/COMPRA em uma única chamada (RN-056).
  const usaLote = !editando && preco > 0 && qComprada > 0
  const precoValido = preco > 0
  const qtdValida = qComprada > 0
  const precoErro = !editando && precoTocado && !precoValido ? 'Preço total da compra é obrigatório' : undefined
  const qtdErro = !editando && qtdTocado && !qtdValida ? 'Quantidade comprada é obrigatória' : undefined
  const podeSubmeter = editando || (precoValido && qtdValida)

  const handleSubmit = async () => {
    if (!editando && !podeSubmeter) {
      setPrecoTocado(true)
      setQtdTocado(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      if (editando && id) {
        const data: InsumoRequest = {
          nome: nome.trim(),
          marca: marca.trim() || undefined,
          unidadeMedida: unidade,
          fracionavel: fracao,
          estoqueAtual: estoque ? num(estoque) : undefined,
          estoqueMinimo: minimo ? num(minimo) : undefined,
          permitirEstoqueNegativo,
        }
        await insumoService.editar(id, data)
        navigate(`/insumos/${id}`)
      } else {
        const data: NovoInsumoRequest = {
          nome: nome.trim(),
          marca: marca.trim() || undefined,
          unidadeMedida: unidade,
          fracionavel: fracao,
          estoqueMinimo: minimo ? num(minimo) : undefined,
          precoTotalCompraInicial: preco,
          quantidadeCompradaInicial: qComprada,
          permitirEstoqueNegativo,
        }
        const novoInsumo = await insumoService.cadastrar(data)
        navigate(`/insumos/${novoInsumo.id}`)
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar. Tente novamente.'
      setError(msg)
      setLoading(false)
    }
  }

  const inputBase = (active: boolean): React.CSSProperties => ({
    width: '100%', height: 48, padding: '0 14px',
    border: `1.5px solid ${active ? '#2A9D8F' : '#EFEDE8'}`,
    borderRadius: 10, fontSize: 14.5, color: '#3A372F',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxShadow: active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  const bind = (k: string, val: string, set: (v: string) => void) => ({
    value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value),
    onFocus: () => setFocus(k),
    onBlur: () => setFocus(null),
    style: inputBase(focus === k),
  })

  const numBind = (k: string, val: string, set: (v: string) => void) => ({
    ...bind(k, val, set),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/[^\d.,]/g, '')),
    inputMode: 'decimal' as const,
  })

  if (loadingData) {
    return (
      <AppLayout active="insumos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando dados do insumo…
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="insumos">

      {/* HEADER + breadcrumb */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 8 }}>
          <span
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate('/insumos')}
            onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
            onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
          >
            Insumos
          </span>
          <Icons.chevron style={{ color: '#CFCBC3' }} />
          <span style={{ color: '#5C594F', fontWeight: 600 }}>{editando ? 'Editar Insumo' : 'Novo Insumo'}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>
          {editando ? 'Editar Insumo' : 'Novo Insumo'}
        </h1>
      </div>

      {/* CARD FORM */}
      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both' }}>

        {/* SEÇÃO 1 — Identificação */}
        <div style={SECTION_STYLE}>
          <SectionTitle number="1" title="Identificação" subtitle="Como você reconhece este insumo." />
          <div className="two-col">
            <Field label="Nome do insumo *">
              <input placeholder="Papel couchê 180g" {...bind('nome', nome, setNome)} />
            </Field>
            <Field label="Marca" opt>
              <input placeholder="Suzano" {...bind('marca', marca, setMarca)} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 14, padding: '11px 13px', borderRadius: 11, background: 'rgba(42,157,143,0.05)', border: '1px solid rgba(42,157,143,0.15)' }}>
            <Icons.info style={{ flexShrink: 0, color: '#2A9D8F', marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12.3, color: '#5C594F', lineHeight: 1.5 }}>
              O par <strong style={{ fontWeight: 600 }}>nome + marca</strong> deve ser único. O mesmo insumo de marcas diferentes pode ser cadastrado separadamente.
            </p>
          </div>
        </div>

        {/* SEÇÃO 2 — Medida e fracionamento */}
        <div style={SECTION_STYLE}>
          <SectionTitle number="2" title="Medida e fracionamento" subtitle="Como este insumo é medido e consumido." />
          <div className="two-col">
            <Field label="Unidade de medida *">
              <div ref={unRef} style={{ position: 'relative' }}>
                <button type="button" onClick={() => setUnidadeOpen(o => !o)} style={{
                  ...inputBase(unidadeOpen),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {unidade}
                  <span style={{ color: '#A29E96', display: 'flex' }}><Icons.caret /></span>
                </button>
                {unidadeOpen && (
                  <div style={{ position: 'absolute', top: 52, left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both' }}>
                    {UNIDADES.map(u => (
                      <button key={u} type="button" onClick={() => { setUnidade(u); setUnidadeOpen(false) }} style={{
                        width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 8,
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                        background: u === unidade ? 'rgba(42,157,143,0.08)' : 'transparent',
                        fontWeight: u === unidade ? 600 : 500,
                        color: u === unidade ? '#2A9D8F' : '#3A372F',
                      }}
                        onMouseEnter={e => { if (u !== unidade) e.currentTarget.style.background = '#F7F5F1' }}
                        onMouseLeave={e => { if (u !== unidade) e.currentTarget.style.background = 'transparent' }}
                      >{u}</button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field
              label="Pode ser usado em frações?"
              hint={fracao ? 'Permite consumo de 0,5g, por exemplo.' : 'Sempre será consumido em quantidades inteiras.'}
            >
              <div style={{ display: 'flex', borderRadius: 10, border: '1.5px solid #EFEDE8', overflow: 'hidden', height: 48 }}>
                {([['Não', false], ['Sim', true]] as [string, boolean][]).map(([lbl, val]) => (
                  <button key={lbl} type="button" onClick={() => setFracao(val)} style={{
                    flex: 1, border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit',
                    background: fracao === val ? (val ? '#2A9D8F' : '#F1F0EC') : '#fff',
                    color: fracao === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                    transition: 'background .14s',
                  }}>{lbl}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* SEÇÃO 3 — Estoque e custo */}
        <div style={SECTION_STYLE}>
          <SectionTitle number="3" title="Estoque e custo" subtitle={editando ? 'Gerencie o estoque via baixa manual ou registrando uma compra.' : 'Informe a compra inicial para calcular o custo unitário automaticamente.'} />
          <div className="two-col">
            <Field
              label="Quantidade em estoque *"
              hint={
                editando
                  ? 'O estoque só muda via baixa manual ou compra de lote.'
                  : usaLote
                    ? `O estoque inicial será definido pela quantidade comprada (${qComprada} ${unLabel(unidade)}).`
                    : 'Informe o preço e a quantidade da compra para calcular o custo unitário.'
              }
            >
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="100"
                  readOnly={editando || usaLote}
                  {...numBind('estoque', usaLote ? qtdCompra : estoque, usaLote ? () => {} : setEstoque)}
                  style={{ ...inputBase(!editando && !usaLote && focus === 'estoque'), paddingRight: 64, background: (editando || usaLote) ? '#FAF8F5' : '#fff', color: (editando || usaLote) ? '#7C786F' : '#3A372F' }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{unLabel(unidade)}</span>
              </div>
            </Field>
            <Field label="Estoque mínimo para alerta" opt>
              <div style={{ position: 'relative' }}>
                <input placeholder="10" {...numBind('minimo', minimo, setMinimo)} style={{ ...inputBase(focus === 'minimo'), paddingRight: 64 }} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{unLabel(unidade)}</span>
              </div>
            </Field>

            {!editando && (
              <>
                <Field label="Preço total da compra *" erro={precoErro}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 44, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, color: '#6B6860', background: '#FAF8F5', borderRadius: '10px 0 0 10px', borderRight: '1px solid #EFEDE8', pointerEvents: 'none' }}>R$</span>
                    <input
                      placeholder="45,00"
                      {...numBind('preco', precoCompra, setPrecoCompra)}
                      onBlur={() => { setFocus(null); setPrecoTocado(true) }}
                      style={{ ...inputBase(focus === 'preco'), paddingLeft: 56, borderColor: precoErro ? '#B23A1E' : (focus === 'preco' ? '#2A9D8F' : '#EFEDE8') }}
                    />
                  </div>
                </Field>
                <Field label="Quantidade comprada *" erro={qtdErro}>
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder="100"
                      {...numBind('qtd', qtdCompra, setQtdCompra)}
                      onBlur={() => { setFocus(null); setQtdTocado(true) }}
                      style={{ ...inputBase(focus === 'qtd'), paddingRight: 64, borderColor: qtdErro ? '#B23A1E' : (focus === 'qtd' ? '#2A9D8F' : '#EFEDE8') }}
                    />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>{unLabel(unidade)}</span>
                  </div>
                </Field>
              </>
            )}
          </div>

          {/* CARD RESULTADO */}
          {(editando || custoUnit != null) && (
            <div key={custoFmt} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 15, padding: '18px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(42,157,143,0.12), rgba(42,157,143,0.05))', border: '1.5px solid rgba(42,157,143,0.25)', animation: custoUnit != null ? 'flash .6s ease' : 'none' }}>
              <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 13, background: '#fff', color: '#2A9D8F', boxShadow: '0 4px 12px -4px rgba(31,122,111,0.3)' }}>
                <Icons.calc />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F7A6F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Custo unitário calculado</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#2A9D8F', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{custoFmt}</span>
                  {custoUnit != null && <span style={{ fontSize: 15, fontWeight: 600, color: '#5C594F' }}>/ {unLabel(unidade)}</span>}
                </div>
                {custoUnit == null && (
                  <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 2 }}>
                    Atualize o custo registrando uma nova compra na tela de insumos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 4 — Configurações de estoque */}
        <div style={SECTION_STYLE}>
          <SectionTitle number="4" title="Configurações de estoque" subtitle="Comportamento quando o estoque fica insuficiente." />
          <label onClick={() => setPermitirEstoqueNegativo(v => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <span style={{
              flexShrink: 0, width: 22, height: 22, marginTop: 1, borderRadius: 6,
              border: `1.5px solid ${permitirEstoqueNegativo ? '#2A9D8F' : '#EFEDE8'}`,
              background: permitirEstoqueNegativo ? '#2A9D8F' : '#fff',
              display: 'grid', placeItems: 'center', transition: 'background .15s, border-color .15s',
            }}>
              {permitirEstoqueNegativo && <Icons.check style={{ color: '#fff', width: 14, height: 14 }} />}
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Permitir estoque negativo</span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#A29E96', marginTop: 3, lineHeight: 1.5 }}>
                Se desmarcado, operações que levariam ao estoque negativo serão bloqueadas.
              </span>
            </span>
          </label>
        </div>

        {/* BOTÕES */}
        <div style={{ padding: '18px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <p style={{ margin: 0, fontSize: 13.5, color: '#C0392B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => navigate('/insumos')}>Cancelar</Button>
            <Button variant="primary" icon={<Icons.save />} disabled={loading || !podeSubmeter} onClick={handleSubmit}>
              {loading ? 'Salvando…' : 'Salvar insumo'}
            </Button>
          </div>
        </div>
      </div>

      {modal === 'desativar' && <DesativarModal onClose={() => setModal(null)} />}

    </AppLayout>
  )
}
