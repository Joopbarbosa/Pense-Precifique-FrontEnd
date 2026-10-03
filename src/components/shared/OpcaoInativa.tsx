import type { ReactNode } from 'react'
import { InativoBadge } from '../cliente/PapelTags'

/**
 * V0.15.0 (#583/#616, RN-NOVA-40) — cadastro inativo na lista de um seletor: aparece depois dos ativos,
 * com o nome riscado e a etiqueta vermelha "Inativo". Não pode ser escolhido (clicar não faz nada) e passar
 * o mouse não mostra nada; para usar, a pessoa reativa o cadastro na tela dele.
 */
export default function OpcaoInativa({ children, className = 'px-3 py-2.5' }: { children: ReactNode; className?: string }) {
  return (
    <div data-search-row data-testid="opcao-inativa" aria-disabled="true"
      className={`flex w-full cursor-default items-center gap-3 rounded-lg text-left ${className}`}>
      <div className="min-w-0 flex-1 text-dim line-through decoration-dim/70">{children}</div>
      <span className="flex-shrink-0 no-underline"><InativoBadge /></span>
    </div>
  )
}
