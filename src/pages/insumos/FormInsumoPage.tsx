import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import ModalShell from '../../components/ui/ModalShell'
import SectionTitle from '../../components/shared/SectionTitle'
import Spinner from '../../components/ui/Spinner'
import { Box, Tag, AlertCircle, ChevronRight, Info, ChevronDown, Calculator, Check, AlertTriangle, Save } from 'lucide-react'
import { insumoService } from '../../services/insumoService'
import type { InsumoRequest, NovoInsumoRequest } from '../../types/insumo'

const UNIDADES = ['Unidade', 'cm', 'g', 'ml', 'Folha']

const unLabel = (u: string) => u === 'Unidade' ? 'un' : u === 'Folha' ? 'folha' : u

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'

function Field({ label, opt, hint, erro, children }: { label: string; opt?: boolean; hint?: string; erro?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-[7px] flex items-center gap-1.5 text-[13px] font-semibold text-body">
        {label}
        {opt && <span className="text-[11.5px] font-medium text-muted">(opcional)</span>}
      </span>
      {children}
      {erro
        ? <span className="mt-1.5 block text-[12.5px] text-danger-deep">{erro}</span>
        : hint && <p className="mt-1.5 mb-0 text-xs leading-[1.5] text-muted">{hint}</p>
      }
    </label>
  )
}

function DesativarModal({ onClose }: { onClose: () => void }) {
  const fichas = [
    { nome: 'Kit Convite Casamento', tipo: 'Produto', icon: Box, size: 16 },
    { nome: 'Etiqueta personalizada', tipo: 'Produto', icon: Box, size: 16 },
    { nome: 'Laminação fosca', tipo: 'Customização', icon: Tag, size: 17 },
  ]

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Atenção — este insumo está em uso"
      icon={<AlertCircle size={15} />}
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
      <p className="mb-4 mt-0 text-sm leading-[1.55] text-body">
        Desativar este insumo pode afetar o custo das fichas técnicas abaixo:
      </p>
      <div className="flex flex-col gap-[9px]">
        {fichas.map((f, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[11px] border border-line bg-[#FCFBF9] px-3.5 py-3">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
              <f.icon size={f.size} />
            </span>
            <span className="flex-1 text-sm font-semibold text-dark">{f.nome}</span>
            <span className="rounded-full bg-line-soft px-[9px] py-[3px] text-[11.5px] font-semibold text-subtle">
              {f.tipo}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  )
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
  // Estoque já negativo não pode ter "permitir estoque negativo" desmarcado sem regularizar antes.
  const bloqueioEstoqueNegativo = editando && !permitirEstoqueNegativo && num(estoque) < 0
  const estoqueNegativoErro = bloqueioEstoqueNegativo
    ? 'Não é possível desmarcar "Permitir estoque negativo" pois este insumo está com estoque negativo. Regularize o estoque antes de desmarcar esta opção.'
    : undefined
  const podeSubmeter = editando ? !bloqueioEstoqueNegativo : (precoValido && qtdValida)

  const handleSubmit = async () => {
    if (!editando && !podeSubmeter) {
      setPrecoTocado(true)
      setQtdTocado(true)
      return
    }
    if (editando && !podeSubmeter) return
    setLoading(true)
    setError('')
    try {
      if (editando && id) {
        // estoqueAtual não é enviado: o campo é somente leitura nesta tela — o
        // saldo só muda via baixa manual ou compra de lote (RN-052/RN-056).
        const data: InsumoRequest = {
          nome: nome.trim(),
          marca: marca.trim() || undefined,
          unidadeMedida: unidade,
          fracionavel: fracao,
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

  const bind = (val: string, set: (v: string) => void) => ({
    value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value),
  })

  const numBind = (val: string, set: (v: string) => void) => ({
    value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/[^\d.,]/g, '')),
    inputMode: 'decimal' as const,
  })

  if (loadingData) {
    return (
      <AppLayout active="insumos">
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando dados do insumo…
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="insumos">

      {/* HEADER + breadcrumb */}
      <div className="mb-[22px]">
        <div className="mb-2 flex items-center gap-[7px] text-[12.5px] text-muted">
          <span
            className="cursor-pointer font-medium hover:text-teal"
            onClick={() => navigate('/insumos')}
          >
            Insumos
          </span>
          <ChevronRight size={15} className="text-[#CFCBC3]" />
          <span className="font-semibold text-body">{editando ? 'Editar Insumo' : 'Novo Insumo'}</span>
        </div>
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-dark">
          {editando ? 'Editar Insumo' : 'Novo Insumo'}
        </h1>
      </div>

      {/* CARD FORM */}
      <div className="animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

        {/* SEÇÃO 1 — Identificação */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="1" title="Identificação" subtitle="Como você reconhece este insumo." />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nome do insumo *">
              <input placeholder="Papel couchê 180g" className={inputBase} {...bind(nome, setNome)} />
            </Field>
            <Field label="Marca" opt>
              <input placeholder="Suzano" className={inputBase} {...bind(marca, setMarca)} />
            </Field>
          </div>
          <div className="mt-3.5 flex gap-[9px] rounded-[11px] border border-teal/[0.15] bg-teal/[0.05] px-[13px] py-[11px]">
            <Info size={15} className="mt-px flex-shrink-0 text-teal" />
            <p className="m-0 text-[12.3px] leading-[1.5] text-body">
              O par <strong className="font-semibold">nome + marca</strong> deve ser único. O mesmo insumo de marcas diferentes pode ser cadastrado separadamente.
            </p>
          </div>
        </div>

        {/* SEÇÃO 2 — Medida e fracionamento */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="2" title="Medida e fracionamento" subtitle="Como este insumo é medido e consumido." />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Unidade de medida *">
              <div ref={unRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUnidadeOpen(o => !o)}
                  className={clsx(
                    inputBase,
                    'flex cursor-pointer items-center justify-between text-left',
                    unidadeOpen && 'border-teal ring-4 ring-teal/[0.12]'
                  )}
                >
                  {unidade}
                  <span className="flex text-muted"><ChevronDown size={16} /></span>
                </button>
                {unidadeOpen && (
                  <div className="absolute inset-x-0 top-[52px] z-30 animate-pop rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
                    {UNIDADES.map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => { setUnidade(u); setUnidadeOpen(false) }}
                        className={clsx(
                          'w-full rounded-lg border-none px-[11px] py-2.5 text-left font-[inherit] text-sm',
                          u === unidade ? 'bg-teal/[0.08] font-semibold text-teal' : 'font-medium text-dark hover:bg-[#F7F5F1]'
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field
              label="Pode ser usado em frações?"
              hint={fracao ? 'Permite consumo de 0,5g, por exemplo.' : 'Sempre será consumido em quantidades inteiras.'}
            >
              <div className="flex h-12 overflow-hidden rounded-input border-[1.5px] border-line">
                {([['Não', false], ['Sim', true]] as [string, boolean][]).map(([lbl, val]) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setFracao(val)}
                    className={clsx(
                      'flex-1 border-none font-[inherit] text-[14.5px] font-semibold transition-colors duration-150',
                      fracao === val
                        ? val ? 'bg-teal text-white' : 'bg-line-soft text-body'
                        : 'bg-white text-[#A8A49C]'
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* SEÇÃO 3 — Estoque e custo */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="3" title="Estoque e custo" subtitle={editando ? 'Gerencie o estoque via baixa manual ou registrando uma compra.' : 'Informe a compra inicial para calcular o custo unitário automaticamente.'} />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
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
              <div className="relative">
                <input
                  placeholder="100"
                  readOnly={editando || usaLote}
                  {...numBind(usaLote ? qtdCompra : estoque, usaLote ? () => {} : setEstoque)}
                  className={clsx(inputBase, 'pr-16', (editando || usaLote) && 'bg-[#FAF8F5] text-subtle')}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#A8A49C]">
                  {unLabel(unidade)}
                </span>
              </div>
            </Field>
            <Field label="Estoque mínimo para alerta" opt>
              <div className="relative">
                <input placeholder="10" {...numBind(minimo, setMinimo)} className={clsx(inputBase, 'pr-16')} />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#A8A49C]">
                  {unLabel(unidade)}
                </span>
              </div>
            </Field>

            {!editando && (
              <>
                <Field label="Preço total da compra *" erro={precoErro}>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center rounded-l-input border-r border-line bg-[#FAF8F5] text-sm font-semibold text-[#6B6860]">
                      R$
                    </span>
                    <input
                      placeholder="45,00"
                      {...numBind(precoCompra, setPrecoCompra)}
                      onBlur={() => setPrecoTocado(true)}
                      className={clsx(inputBase, 'pl-14', precoErro && 'border-danger-deep focus:border-danger-deep focus:ring-danger-deep/10')}
                    />
                  </div>
                </Field>
                <Field label="Quantidade comprada *" erro={qtdErro}>
                  <div className="relative">
                    <input
                      placeholder="100"
                      {...numBind(qtdCompra, setQtdCompra)}
                      onBlur={() => setQtdTocado(true)}
                      className={clsx(inputBase, 'pr-16', qtdErro && 'border-danger-deep focus:border-danger-deep focus:ring-danger-deep/10')}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#A8A49C]">
                      {unLabel(unidade)}
                    </span>
                  </div>
                </Field>
              </>
            )}
          </div>

          {/* CARD RESULTADO */}
          {(editando || custoUnit != null) && (
            <div
              key={custoFmt}
              className={clsx(
                'mt-[18px] flex items-center gap-[15px] rounded-2xl border-[1.5px] border-teal/25 bg-[linear-gradient(135deg,rgba(42,157,143,0.12),rgba(42,157,143,0.05))] px-5 py-[18px]',
                custoUnit != null && 'animate-flash'
              )}
            >
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-white text-teal shadow-[0_4px_12px_-4px_rgba(31,122,111,0.3)]">
                <Calculator size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[#1F7A6F]">
                  Custo unitário calculado
                </div>
                <div className="mt-[3px] flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-[-0.01em] text-teal [font-variant-numeric:tabular-nums]">
                    {custoFmt}
                  </span>
                  {custoUnit != null && <span className="text-[15px] font-semibold text-body">/ {unLabel(unidade)}</span>}
                </div>
                {custoUnit == null && (
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    Atualize o custo registrando uma nova compra na tela de insumos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 4 — Configurações de estoque */}
        <div className="border-b border-line px-[26px] py-6">
          <SectionTitle number="4" title="Configurações de estoque" subtitle="Comportamento quando o estoque fica insuficiente." />
          <label onClick={() => setPermitirEstoqueNegativo(v => !v)} className="flex cursor-pointer items-start gap-3">
            <span className={clsx(
              'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-colors duration-150',
              permitirEstoqueNegativo ? 'border-teal bg-teal' : 'border-line bg-white'
            )}>
              {permitirEstoqueNegativo && <Check size={14} className="text-white" />}
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-dark">Permitir estoque negativo</span>
              <span className="mt-[3px] block text-[12.5px] leading-[1.5] text-muted">
                Se desmarcado, operações que levariam ao estoque negativo serão bloqueadas.
              </span>
            </span>
          </label>
          {estoqueNegativoErro && (
            <div className="mt-[18px] flex items-center gap-[15px] rounded-2xl border border-[#FECACA] bg-danger-bg-soft px-5 py-[18px]">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-white text-[#DC2626] shadow-[0_4px_12px_-4px_rgba(220,38,38,0.25)]">
                <AlertTriangle size={20} />
              </span>
              <p className="m-0 text-[13.5px] font-normal leading-[1.5] text-[#DC2626]">{estoqueNegativoErro}</p>
            </div>
          )}
        </div>

        {/* BOTÕES */}
        <div className="flex flex-col gap-3 px-[26px] py-[18px]">
          {error && (
            <p className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate('/insumos')}>Cancelar</Button>
            <Button variant="primary" icon={<Save size={16} />} disabled={loading || !podeSubmeter} onClick={handleSubmit}>
              {loading ? 'Salvando…' : 'Salvar insumo'}
            </Button>
          </div>
        </div>
      </div>

      {modal === 'desativar' && <DesativarModal onClose={() => setModal(null)} />}

    </AppLayout>
  )
}
