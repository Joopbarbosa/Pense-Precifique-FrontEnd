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
 */
export default function MetodoPagamentoEscolha({ value, onChange, salvo }: {
  value: string | null
  onChange: (id: string) => void
  salvo?: MetodoPagamentoRef | null
}) {
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[] | null>(null)
  useEffect(() => { empresaService.listarMetodosPagamento().then(setMetodos).catch(() => setMetodos([])) }, [])

  const opcoes = useMemo(() => {
    const lista: MetodoPagamentoRef[] = (metodos ?? []).filter(m => m.ativo)
      .map(m => ({ id: m.id, tipo: m.tipo, nome: rotuloMetodoPagamento(m.tipo, m.nome), ativo: true }))
    if (salvo && !lista.some(m => m.id === salvo.id)) lista.push(salvo)
    return lista
  }, [metodos, salvo])

  if (metodos === null) return <div className="text-sm text-muted">Carregando métodos…</div>
  if (opcoes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-3.5 py-3 text-[13px] text-danger-deep">
        <AlertCircle size={15} /> Nenhum método de pagamento ativo. <a href="/configuracoes" className="font-semibold underline">Cadastre em Configurações</a>.
      </div>
    )
  }
  return (
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
  )
}
