import { useNavigate } from 'react-router-dom'
import { ExternalLink, CalendarDays } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import type { Compromisso } from '../../types/agenda'
import { formatarData } from '../../utils/data'
import { ORIGEM } from './origem'
import { textoAtraso } from './ChipCompromisso'
import PainelDaOrigem from './PainelDaOrigem'

const SITUACAO = { PENDENTE: 'Pendente', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' } as const

/** Tela completa da origem (RN-NOVA-7): Orçamento, Produção e Compra. O compromisso avulso não tem tela de origem. */
export function rotaDaOrigem(c: Compromisso): string | null {
  if (c.origem === 'ORCAMENTO') return `/orcamentos/${c.referenciaId}`
  if (c.origem === 'PRODUCAO') return `/producao/${c.referenciaId}`
  if (c.origem === 'COMPRA') return `/compras/${c.referenciaId}`
  return null
}

/**
 * V0.18.0 (#1034, RN-NOVA-7) — detalhe do compromisso: título, data, horário, origem, situação e o link para a tela completa da
 * origem. Os dados e as ações de cada origem (orçamento, produção, compra, compromisso da usuária) entram por `children`.
 */
export default function DetalheCompromisso({ compromisso: c, onClose, children, rodape }: {
  compromisso: Compromisso
  onClose: () => void
  children?: React.ReactNode
  rodape?: React.ReactNode
}) {
  const navigate = useNavigate()
  const rota = rotaDaOrigem(c)
  const atraso = textoAtraso(c)
  return (
    <ModalShell open onClose={onClose} title={c.titulo} subtitle={ORIGEM[c.origem].rotulo} width={560}
      icon={<CalendarDays size={15} />} footer={rodape}>
      <div className="flex flex-col gap-3 text-sm text-body" data-testid="detalhe-compromisso">
        <dl className="grid grid-cols-[110px_1fr] gap-y-2">
          <dt className="font-semibold text-dark">Data</dt>
          <dd>{formatarData(c.dataOrigem)}{c.horario ? ` às ${c.horario}` : ''}</dd>
          <dt className="font-semibold text-dark">Situação</dt>
          <dd>{SITUACAO[c.situacao]}{atraso ? ` — ${atraso}` : ''}</dd>
          {c.marcacoes.length > 0 && (<><dt className="font-semibold text-dark">Marcação</dt><dd>{c.marcacoes.join(', ')}</dd></>)}
          {c.avisos.map((a, i) => (<><dt key={`t${i}`} className="font-semibold text-dark">Aviso</dt><dd key={`d${i}`} className="text-warning">{a}</dd></>))}
        </dl>
        <PainelDaOrigem compromisso={c} />
        {children}
        {rota && (
          <div>
            <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate(rota)}>
              Abrir {ORIGEM[c.origem].rotulo.toLowerCase()}{c.identificador ? ` ${c.identificador}` : ''}
            </Button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
