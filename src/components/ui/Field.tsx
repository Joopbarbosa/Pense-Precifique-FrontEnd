import { useId, type ReactNode } from 'react'

interface FieldProps {
  label: string
  opt?: boolean
  required?: boolean
  hint?: string
  erro?: string
  /**
   * Herdado das 4 implementações duplicadas de `Field` que existiam antes da unificação
   * (Insumo, Produto, Catálogo, Item de Catálogo) — cada uma tinha um espaçamento/tamanho
   * de rótulo ligeiramente diferente. 'sm' preserva o padrão original de Insumo/Catálogo
   * (13px, mb 7px), 'md' preserva o de Produto/Item de Catálogo (13.5px, mb 8px). Default
   * 'sm' mantém o comportamento de quem não passava essa distinção antes.
   */
  size?: 'sm' | 'md'
  /**
   * Quando o campo agrupa múltiplos botões (ex. toggle Sim/Não, seletor de tipo): evita
   * envolver os botões num <label> — o HTML associa implicitamente o <label> só ao primeiro
   * descendente labelable, fazendo esse botão herdar o texto do campo inteiro como nome
   * acessível em vez do próprio texto. Um <div role="group"> rotulado via aria-labelledby
   * não tem esse efeito. Ver OpenProject #186.
   */
  group?: boolean
  children: ReactNode
}

export default function Field({ label, opt, required, hint, erro, size = 'sm', group, children }: FieldProps) {
  const labelId = useId()
  const labelClassName = size === 'md'
    ? 'mb-2 block text-[13.5px] font-semibold text-body'
    : 'mb-[7px] flex items-center gap-1.5 text-[13px] font-semibold text-body'
  const optClassName = size === 'md'
    ? 'ml-1.5 text-xs font-medium text-faint'
    : 'text-[11.5px] font-medium text-muted'

  const content = (
    <>
      <span id={group ? labelId : undefined} className={labelClassName}>
        {label}
        {required && <span className="ml-[3px] text-orange">*</span>}
        {opt && <span className={optClassName}>(opcional)</span>}
      </span>
      {children}
      {erro
        ? <span className="mt-1.5 block text-[12.5px] text-danger-deep">{erro}</span>
        : hint && (
          size === 'md'
            ? <span className="mt-1.5 block text-xs text-muted">{hint}</span>
            : <p className="mt-1.5 mb-0 text-xs leading-[1.5] text-muted">{hint}</p>
        )
      }
    </>
  )

  return group
    ? <div className="block" role="group" aria-labelledby={labelId}>{content}</div>
    : <label className="block">{content}</label>
}
