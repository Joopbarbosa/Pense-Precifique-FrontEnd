import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertCircle, Check } from 'lucide-react'
import { empresaService } from '../../services/empresaService'
import { ICON_TIPO_METODO_PAGAMENTO, rotuloMetodoPagamento } from '../../constants/metodoPagamentoConfiguravel'
import type { MetodoPagamentoRef } from '../../types/compra'
import type { MetodoPagamentoConfiguravelResponse } from '../../types/empresa'

/**
 * #550 (RN-NOVA-23) — escolha do método de pagamento da compra entre os métodos ATIVOS do cadastro
 * do Caixa. O método já salvo (`salvo`) continua na lista mesmo se inativado depois (RN-NOVA-2).
 * Obrigatoriedade quando Pago é validada pelo backend ("Escolha como a compra foi paga.").
 * #597 (RN-NOVA-42) — com `onParcelas`, método do tipo Cartão de crédito mostra "Em quantas vezes?"
 * (1 até a parcela máxima do método; sem máximo cadastrado, 12 — mesmo limite que o backend valida).
 */
export const PARCELAS_MAX_PADRAO = 12

export default function MetodoPagamentoEscolha({ value, onChange, salvo, parcelas, onParcelas }: {
  value: string | null
  onChange: (id: string) => void
  salvo?: MetodoPagamentoRef | null
  parcelas?: number | null
  onParcelas?: (n: number | null) => void
}) {
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[] | null>(null)
  useEffect(() => { empresaService.listarMetodosPagamento().then(setMetodos).catch(() => setMetodos([])) }, [])

  const opcoes = useMemo(() => {
    const lista: MetodoPagamentoRef[] = (metodos ?? []).filter(m => m.ativo)
      .map(m => ({ id: m.id, tipo: m.tipo, nome: rotuloMetodoPagamento(m.tipo, m.nome), ativo: true }))
    if (salvo && !lista.some(m => m.id === salvo.id)) lista.push(salvo)
    return lista
  }, [metodos, salvo])

  const escolhido = opcoes.find(m => m.id === value)
  const credito = escolhido?.tipo === 'CARTAO_CREDITO'
  const maxMetodo = (metodos ?? []).find(m => m.id === value)?.maxParcelas
  const maxParcelas = maxMetodo && maxMetodo > 0 ? maxMetodo : PARCELAS_MAX_PADRAO

  // Troca de método: crédito começa em 1x; outros métodos não guardam parcelas.
  useEffect(() => {
    if (!onParcelas || metodos === null) return
    if (credito && (parcelas == null || parcelas > maxParcelas)) onParcelas(1)
    if (!credito && parcelas != null) onParcelas(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, credito, maxParcelas, metodos])

  if (metodos === null) return <div className="text-sm text-muted">Carregando métodos…</div>
  if (opcoes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13px] text-danger-deep">
        <AlertCircle size={15} /> Nenhum método de pagamento ativo. <a href="/configuracoes" className="font-semibold underline">Cadastre em Configurações</a>.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2">
      {opcoes.map(m => {
        const on = value === m.id
        return (
          <button key={m.id} type="button" aria-pressed={on} onClick={() => onChange(m.id)}
            className={clsx('inline-flex h-12 items-center gap-2 rounded-input border-[1.5px] px-4 font-[inherit] text-[14px] font-semibold transition-colors',
              on ? 'border-teal bg-teal/[0.08] text-teal' : 'border-line bg-white text-body hover:bg-cream')}>
            {ICON_TIPO_METODO_PAGAMENTO[m.tipo]} {m.nome}
            {!m.ativo && <span className="text-[11px] font-medium text-danger">(inativo)</span>}
            {on && <Check size={15} />}
          </button>
        )
      })}
    </div>
    {onParcelas && credito && (
      <label className="flex max-w-[260px] flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold text-body">Em quantas vezes?<span className="ml-[3px] text-orange">*</span></span>
        <select aria-label="Em quantas vezes?" value={parcelas ?? 1} onChange={e => onParcelas(Number(e.target.value))}
          className="h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus">
          {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
        </select>
      </label>
    )}
    </div>
  )
}
