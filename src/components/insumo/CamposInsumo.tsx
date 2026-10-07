import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Field from '../ui/Field'
import SegmentedControl from '../ui/SegmentedControl'
import SectionTitle from '../shared/SectionTitle'
import { AlertCircle, AlertTriangle, Calculator, Check, ChevronDown, Info } from 'lucide-react'
import type { FormInsumo } from './useFormInsumo'
import type { RegraPrecoReferencia, TipoExibicaoQuantidade } from '../../types/insumo'

export const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 focus:border-teal focus:ring-4 focus:ring-teal/focus'

// Alternadores Sim/Não do cadastro: pequenos, na altura dos demais campos compactos (#712).
const PEQUENO = { height: 'h-9', display: 'inline-flex' as const, optionWidth: 'w-16', textSize: 'text-[13px]' }

const DICA_REGRA: Record<RegraPrecoReferencia, string> = {
  MEDIA: 'Média do preço pago (pela quantidade) nas compras confirmadas de cada fornecedor nos últimos 12 meses. A lista de compras sugere o fornecedor de menor preço.',
  MENOR_VALOR: 'Menor preço pago nas compras confirmadas de cada fornecedor nos últimos 12 meses.',
  MANUAL: 'O preço que você digitar no vínculo com o fornecedor; as compras não mudam o valor.',
}

const bind = (val: string, set: (v: string) => void) => ({
  value: val,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value),
})

const numBind = (val: string, set: (v: string) => void) => ({
  value: val,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/[^\d.,/]/g, '')),
  inputMode: 'decimal' as const,
})

/**
 * As quatro seções do cadastro de insumo (identificação, medida, estoque e custo, configurações), usadas na
 * página de cadastro/edição e na modal de cadastro da conciliação da nota (#714). `compacto` tira o recuo
 * lateral de card para caber dentro de uma modal.
 */
export default function CamposInsumo({ form, compacto = false }: { form: FormInsumo; compacto?: boolean }) {
  const [unidadeOpen, setUnidadeOpen] = useState(false)
  const unRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unRef.current && !unRef.current.contains(e.target as Node)) setUnidadeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const secao = clsx('border-b border-line', compacto ? 'py-5 first:pt-0' : 'px-[26px] py-6')
  const { editando, qualquerMarca, fracao, tipoExibicao, regraPreco, siglaAtual, unidadeSelecionada } = form

  return (
    <>
      {/* SEÇÃO 1 — Identificação */}
      <div className={secao}>
        <SectionTitle number="1" title="Identificação" subtitle="Como você reconhece este insumo." />
        <Field label="Nome do insumo *">
          <input placeholder="Papel couchê 180g" className={inputBase} {...bind(form.nome, form.setNome)} />
        </Field>
        <div className="mt-3.5 grid grid-cols-1 items-start gap-3.5 md:grid-cols-[auto_1fr]">
          <Field label="Não validar marca" group>
            <SegmentedControl
              options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
              value={qualquerMarca}
              onChange={form.definirQualquerMarca}
              {...PEQUENO}
              className="mt-1.5"
            />
          </Field>
          <Field label="Marca" opt>
            <input placeholder="Suzano"
              className={clsx(inputBase, 'disabled:cursor-not-allowed disabled:bg-line-soft disabled:text-dim')}
              disabled={qualquerMarca} {...bind(form.marca, form.setMarca)} />
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
      <div className={secao}>
        <SectionTitle number="2" title="Medida e fracionamento" subtitle="Como este insumo é medido e consumido." />
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field label="Unidade de medida *">
            {!form.loadingUnidades && form.unidades.length === 0 ? (
              <div className="flex items-center gap-[9px] rounded-[11px] border border-danger-line bg-danger-tint px-3.5 py-3 text-[13px] text-danger-deep">
                <AlertCircle size={15} className="flex-shrink-0" />
                Nenhuma unidade cadastrada.{' '}
                <a href="/configuracoes" className="font-semibold underline underline-offset-2">Cadastre em Configurações</a>.
              </div>
            ) : (
              <div ref={unRef} className="relative">
                <button
                  type="button"
                  disabled={form.loadingUnidades}
                  onClick={() => setUnidadeOpen(o => !o)}
                  className={clsx(
                    inputBase,
                    'flex cursor-pointer items-center justify-between text-left',
                    unidadeOpen && 'border-teal ring-4 ring-teal/[0.12]'
                  )}
                >
                  {form.loadingUnidades ? 'Carregando…' : (unidadeSelecionada ? `${unidadeSelecionada.nome} (${unidadeSelecionada.sigla})` : 'Selecione')}
                  <span className="flex text-muted"><ChevronDown size={16} /></span>
                </button>
                {unidadeOpen && (
                  <div className="absolute inset-x-0 top-[52px] z-30 max-h-64 animate-pop overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]">
                    {form.unidades.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { form.setUnidadeMedidaId(u.id); setUnidadeOpen(false) }}
                        className={clsx(
                          'w-full rounded-lg border-none px-[11px] py-2.5 text-left font-[inherit] text-sm',
                          u.id === form.unidadeMedidaId ? 'bg-teal/[0.08] font-semibold text-teal' : 'font-medium text-dark hover:bg-cream'
                        )}
                      >
                        {u.nome} ({u.sigla})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>
          <Field
            label="Este item pode ser fracionado?"
            hint={fracao ? 'Permite consumo de 0,5g, por exemplo.' : 'Sempre será consumido em quantidades inteiras.'}
            group
          >
            <SegmentedControl
              options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
              value={fracao}
              onChange={form.setFracao}
              {...PEQUENO}
            />
          </Field>
          {fracao && (
            <Field
              label="Como exibir a quantidade?"
              hint={tipoExibicao === 'FRACAO' ? 'Ex.: ⅓ folha.' : 'Ex.: 1ml de tinta.'}
              group
            >
              <SegmentedControl
                options={[
                  { value: 'DECIMAL' as TipoExibicaoQuantidade, label: 'Decimal' },
                  { value: 'FRACAO' as TipoExibicaoQuantidade, label: 'Fração' },
                ]}
                value={tipoExibicao}
                onChange={form.setTipoExibicao}
                {...PEQUENO}
                optionWidth="w-20"
              />
            </Field>
          )}
        </div>
      </div>

      {/* SEÇÃO 3 — Estoque e custo */}
      <div className={secao}>
        <SectionTitle number="3" title="Estoque e custo" subtitle={editando ? 'Gerencie o estoque via baixa manual ou registrando uma compra.' : 'Informe o custo e a quantidade para calcular o custo unitário automaticamente.'} />
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {editando && (
            <Field label="Quantidade em estoque *" hint="O estoque só muda via baixa manual ou compra de lote.">
              <div className="relative">
                <input
                  placeholder="100"
                  readOnly
                  {...numBind(form.estoque, form.setEstoque)}
                  className={clsx(inputBase, 'pr-16 bg-cream text-subtle')}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">
                  {siglaAtual}
                </span>
              </div>
            </Field>
          )}

          {form.pedeCompra && (
            <>
              <Field label="Custo do Insumo *" erro={form.precoErro}>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center rounded-l-input border-r border-line bg-cream text-sm font-semibold text-dim">
                    R$
                  </span>
                  <input
                    placeholder="45,00"
                    {...numBind(form.precoCompra, form.setPrecoCompra)}
                    onBlur={() => form.setPrecoTocado(true)}
                    className={clsx(inputBase, 'pl-14', form.precoErro && 'border-danger-deep focus:border-danger-deep focus:ring-danger-deep/10')}
                  />
                </div>
              </Field>
              <Field label="Quantidade *" erro={form.qtdErro}>
                <div className="relative">
                  <input
                    placeholder="100"
                    {...numBind(form.qtdCompra, form.setQtdCompra)}
                    onBlur={() => form.setQtdTocado(true)}
                    className={clsx(inputBase, 'pr-16', form.qtdErro && 'border-danger-deep focus:border-danger-deep focus:ring-danger-deep/10')}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">
                    {siglaAtual}
                  </span>
                </div>
              </Field>
            </>
          )}

          <Field label="Estoque mínimo para alerta" opt>
            <div className="relative">
              <input placeholder="10" {...numBind(form.minimo, form.setMinimo)} className={clsx(inputBase, 'pr-16')} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-dim">
                {siglaAtual}
              </span>
            </div>
          </Field>
        </div>

        {/* CARD RESULTADO */}
        {(editando || form.custoUnit != null) && (
          <div
            key={form.custoFmt}
            className={clsx(
              'mt-[18px] flex items-center gap-[15px] rounded-2xl border-[1.5px] border-teal/25 bg-[linear-gradient(135deg,rgba(42,157,143,0.12),rgba(42,157,143,0.05))] px-5 py-[18px]',
              form.custoUnit != null && 'animate-flash'
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
                  {form.custoFmt}
                </span>
                {form.custoUnit != null && <span className="text-[15px] font-semibold text-body">/ {siglaAtual}</span>}
              </div>
              {form.custoUnit == null && (
                <div className="mt-0.5 text-[12.5px] text-muted">
                  Atualize o custo registrando uma nova compra na tela de insumos.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 4 — Configurações de estoque */}
      <div className={clsx(secao, compacto && 'border-b-0 pb-0')}>
        <SectionTitle number="4" title="Configurações de estoque" subtitle="Comportamento quando o estoque fica insuficiente." />
        <label onClick={() => form.setPermitirEstoqueNegativo(v => !v)} className="flex cursor-pointer items-start gap-3">
          <span className={clsx(
            'mt-px grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-[1.5px] transition-colors duration-150',
            form.permitirEstoqueNegativo ? 'border-teal bg-teal' : 'border-line bg-white'
          )}>
            {form.permitirEstoqueNegativo && <Check size={14} className="text-white" />}
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold text-dark">Permitir estoque negativo</span>
            <span className="mt-[3px] block text-[12.5px] leading-[1.5] text-muted">
              Se desmarcado, operações que levariam ao estoque negativo serão bloqueadas.
            </span>
          </span>
        </label>
        {/* #590 (RN-NOVA-39) — regra do preço de referência, vale para todos os fornecedores deste insumo. */}
        <div className="mt-5 max-w-[520px]">
          <Field label="Regra do preço de referência" group hint={DICA_REGRA[regraPreco]}>
            <SegmentedControl
              options={[
                { value: 'MEDIA' as RegraPrecoReferencia, label: 'Média' },
                { value: 'MENOR_VALOR' as RegraPrecoReferencia, label: 'Menor valor' },
                { value: 'MANUAL' as RegraPrecoReferencia, label: 'Manual' },
              ]}
              value={regraPreco}
              onChange={form.setRegraPreco}
            />
          </Field>
        </div>
        {form.estoqueNegativoErro && (
          <div className="mt-[18px] flex items-center gap-[15px] rounded-2xl border border-danger-line-soft bg-danger-bg-soft px-5 py-[18px]">
            <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[13px] bg-white text-danger-alt shadow-[0_4px_12px_-4px_rgba(220,38,38,0.25)]">
              <AlertTriangle size={20} />
            </span>
            <p className="m-0 text-[13.5px] font-normal leading-[1.5] text-danger-alt">{form.estoqueNegativoErro}</p>
          </div>
        )}
      </div>
    </>
  )
}

