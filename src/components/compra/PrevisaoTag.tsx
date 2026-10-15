import clsx from 'clsx'
import { formatarData } from './formato'

/**
 * #958 (RN-NOVA-6) — tag da previsão de entrega da compra pendente: "Previsão 20/10" ou, quando a previsão
 * é anterior a hoje, vermelha com "Atrasada há N dias". O backend informa os dias; o front não calcula.
 */
export function PrevisaoTag({ previsao, diasAtraso, size = 'md' }: { previsao: string | null; diasAtraso: number | null; size?: 'sm' | 'md' }) {
  if (!previsao) return null
  const atrasada = diasAtraso != null && diasAtraso > 0
  const [, mes, dia] = previsao.split('-')
  return (
    <span data-testid="tag-previsao" className={clsx(
      'inline-flex items-center whitespace-nowrap rounded-full font-semibold',
      size === 'sm' ? 'h-6 px-[9px] text-[11.5px]' : 'h-7 px-[11px] text-[12.5px]',
      atrasada ? 'bg-danger-bg text-danger' : 'bg-line-soft text-subtle'
    )} title={`Previsão de entrega: ${formatarData(previsao)}`}>
      {atrasada ? `Atrasada há ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}` : `Previsão ${dia}/${mes}`}
    </span>
  )
}
