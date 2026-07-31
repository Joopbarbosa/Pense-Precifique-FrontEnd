import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Factory, Box, Calendar, AlertTriangle } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { getBadgeEstado } from '../../utils/badges'
import type { ProducaoResumo } from '../../types/producao'

interface Props {
  producao: ProducaoResumo
  onClose: () => void
}

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function ModalDetalheResumidoProducao({ producao, onClose }: Props) {
  const navigate = useNavigate()
  const badge = getBadgeEstado(producao.estado, producao.historicoStatus)
  const alertasRelevantes = producao.alertasInsumos.filter(a => a.situacao !== 'SUFICIENTE')

  return (
    <ModalShell
      open
      onClose={onClose}
      title={producao.identificador}
      subtitle="Produção"
      icon={<Factory size={18} />}
      closeLabel={`Fechar detalhes de ${producao.identificador}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={() => { navigate(`/producao/${producao.id}`); onClose() }}>
            Ver detalhes completos
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <span
          className="inline-flex h-7 w-fit items-center whitespace-nowrap rounded-full px-[11px] text-[12.5px] font-semibold"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
            <Box size={13} /> Produtos
          </div>
          <div className="flex flex-col gap-2">
            {producao.produtos.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-cream px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-dark">{p.nomeProduto}</div>
                  <div className="text-[12px] text-muted">{p.tipoProduto}</div>
                </div>
                <span className="flex-shrink-0 text-[13.5px] font-bold text-dark [font-variant-numeric:tabular-nums]">
                  ×{p.quantidade}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
              <Calendar size={13} /> Início
            </div>
            <div className="mt-0.5 text-sm font-semibold text-dark">{fmtData(producao.dataInicio)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
              <Calendar size={13} /> Término previsto
            </div>
            <div className="mt-0.5 text-sm font-semibold text-dark">{fmtData(producao.dataTerminoPrevista)}</div>
          </div>
        </div>

        {alertasRelevantes.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
              <AlertTriangle size={13} /> Alertas de insumos
            </div>
            <div className="flex flex-col gap-2">
              {alertasRelevantes.map((a, i) => {
                const bloqueio = a.situacao === 'BLOQUEIO_FUTURO'
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex items-start gap-2.5 rounded-input border px-3.5 py-3 text-[13.5px]',
                      bloqueio ? 'border-danger/40 bg-danger-bg text-danger' : 'border-orange/30 bg-orange/[0.08] text-warning-alt'
                    )}
                  >
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{a.nomeInsumo}:</strong> necessário {a.quantidadeNecessaria}, disponível {a.estoqueAtual}
                      {bloqueio && ' (bloqueará ao iniciar)'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
