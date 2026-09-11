import { Link2 } from 'lucide-react'
import clsx from 'clsx'

// RN-NOVA-16 (V0.8.3, #375+308) — indicador compartilhado de vínculo Orçamento↔Produção, mesmo
// componente visual nos 2 lados (RN-NOVA-26/#319+387 do lado Orçamento consome este mesmo
// componente, direção invertida do vínculo). `label` nunca hardcoded aqui — varia por direção.
interface VinculoAtivoBadgeProps {
  label: string
  onClick?: () => void
}

export default function VinculoAtivoBadge({ label, onClick }: VinculoAtivoBadgeProps) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick ? (e => { e.stopPropagation(); onClick() }) : undefined}
      className={clsx(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-[#EAF1FB] px-[9px] text-[11.5px] font-semibold text-[#2A6FB0]',
        onClick && 'cursor-pointer transition-colors duration-150 hover:bg-[#DCE9F8]'
      )}
    >
      <Link2 size={12} />
      {label}
    </Tag>
  )
}
