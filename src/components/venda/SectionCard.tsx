import React from 'react'

/**
 * Card numerado (nº + rótulo + dica) usado como invólucro de cada seção de uma venda/orçamento —
 * usado por Orçamento e Caixa (#502, V0.12.0). Extraído de `CriarOrcamentoPage.tsx` (função local
 * `QuoteCard`) sem mudança de comportamento — só o nome, já que deixou de ser exclusivo de
 * orçamento.
 */
export default function SectionCard({ step, label, hint, children }: {
  step: string
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-teal/[0.12] text-[13.5px] font-bold text-teal">{step}</span>
        <div>
          <div className="text-[15.5px] font-bold text-dark">{label}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  )
}
