import { useState, useEffect } from 'react'
import clsx from 'clsx'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { Layers, Calendar, StickyNote } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { getBadgeEstado } from '../../utils/badges'
import ConsumoRealSection, { chaveConsumo } from './ConsumoRealSection'
import type { ProducaoResumo, ProducaoDetalhe, EstadoProducao, ConsumoRealItem } from '../../types/producao'

interface Props {
  producoes: ProducaoResumo[]
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

const MIN_CHARS = 30

const ESTADOS_DESTINO: { value: EstadoProducao; label: string }[] = [
  { value: 'AGUARDANDO_INICIO', label: 'Aguardando início' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'TRAVADA', label: 'Travada' },
]

const consumoAtivo = (estado: EstadoProducao) => estado === 'EM_ANDAMENTO' || estado === 'TRAVADA'

/** Réplica de RN-074 (backend, `Comparator.comparing(..., nullsFirst)`): a mais recente entre as
 * `dataInicio` selecionadas — null nunca vence numa comparação de "mais recente". */
function dataInicioMaisRecente(producoes: ProducaoResumo[]): string {
  let maisRecente: string | null = null
  for (const p of producoes) {
    if (p.dataInicio != null && (maisRecente == null || p.dataInicio > maisRecente)) {
      maisRecente = p.dataInicio
    }
  }
  return maisRecente ? maisRecente.split('T')[0] : ''
}

export default function AgruparProducoesModal({ producoes, onClose, onSuccess }: Props) {
  const [estadoDestino, setEstadoDestino] = useState<EstadoProducao>('AGUARDANDO_INICIO')
  const [dataInicio, setDataInicio] = useState(() => dataInicioMaisRecente(producoes))
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [detalhes, setDetalhes] = useState<Record<string, ProducaoDetalhe>>({})
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(true)
  const [valores, setValores] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const producoesComConsumo = producoes.filter(p => consumoAtivo(p.estado))

  useEffect(() => {
    if (producoesComConsumo.length === 0) {
      setCarregandoDetalhes(false)
      return
    }
    Promise.all(producoesComConsumo.map(p => producaoService.buscarPorId(p.id)))
      .then(results => setDetalhes(Object.fromEntries(results.map(r => [r.id, r]))))
      .finally(() => setCarregandoDetalhes(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const len = justificativa.length
  const valido = len >= MIN_CHARS

  const handleAgrupar = async () => {
    if (!valido) return
    setSalvando(true)
    setErro(null)
    try {
      const consumoRealPorProducao: Record<string, ConsumoRealItem[]> = {}
      for (const p of producoesComConsumo) {
        const detalhe = detalhes[p.id]
        if (!detalhe) continue
        consumoRealPorProducao[p.id] = detalhe.insumosConsumidos
          .filter(item => {
            const chave = `${p.id}:${chaveConsumo(item)}`
            const valor = valores[chave] ?? item.quantidade
            return valor !== item.quantidade
          })
          .map(item => {
            const chave = `${p.id}:${chaveConsumo(item)}`
            const valor = valores[chave] ?? item.quantidade
            return item.produtoBaseId
              ? { produtoBaseId: item.produtoBaseId, quantidadeConsumida: valor }
              : { insumoId: item.insumoId!, quantidadeConsumida: valor }
          })
      }

      const result = await producaoService.agrupar({
        producaoIds: producoes.map(p => p.id),
        estadoDestino,
        dataInicio: dataInicio || undefined,
        dataTerminoPrevista: dataTerminoPrevista || undefined,
        justificativa,
        consumoRealPorProducao: producoesComConsumo.length > 0 ? consumoRealPorProducao : undefined,
      })
      onSuccess(`Produções agrupadas em ${result.producaoNova.identificador}`)
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao agrupar produções.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Agrupar produções"
      icon={<Layers size={18} />}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valido || salvando || carregandoDetalhes} onClick={handleAgrupar}>
            {salvando ? 'Agrupando...' : 'Agrupar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-[7px] text-[13px] font-semibold text-body">Produções selecionadas</div>
          <div className="flex flex-col gap-2">
            {producoes.map(p => {
              const badge = getBadgeEstado(p.estado)
              return (
                <div key={p.id} className="flex items-center justify-between rounded-[10px] border border-line bg-[#FCFBF9] px-3.5 py-2.5">
                  <span className="text-sm font-semibold text-dark">{p.identificador}</span>
                  <span
                    className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-[9px] text-[11.5px] font-semibold"
                    style={{ background: badge.bg, color: badge.fg }}
                  >
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-[7px] block text-[13px] font-semibold text-body">Estado destino <span className="text-orange">*</span></span>
          <select
            value={estadoDestino}
            onChange={e => setEstadoDestino(e.target.value as EstadoProducao)}
            className="h-11 w-full cursor-pointer rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          >
            {ESTADOS_DESTINO.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="block flex-1">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <Calendar size={15} className="text-teal" /> Data de início
            </span>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              placeholder="Herda da produção mais recente"
              className="h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
            <span className="mt-1 block text-[12px] text-muted">Herda da produção mais recente se vazio</span>
          </label>
          <label className="block flex-1">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <Calendar size={15} className="text-teal" /> Término previsto
            </span>
            <input
              type="date"
              value={dataTerminoPrevista}
              onChange={e => setDataTerminoPrevista(e.target.value)}
              placeholder="Herda da produção mais recente"
              className="h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
            <span className="mt-1 block text-[12px] text-muted">Herda da produção mais recente se vazio</span>
          </label>
        </div>

        {carregandoDetalhes ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : producoesComConsumo.length > 0 && (
          <div>
            <p className="m-0 mb-3 text-[13.5px] leading-[1.55] text-body">
              Declare quanto foi realmente consumido nas produções em andamento/travadas. O que não foi consumido será devolvido ao estoque.
            </p>
            <div className="flex flex-col gap-4">
              {producoesComConsumo.map(p => {
                const detalhe = detalhes[p.id]
                if (!detalhe || detalhe.insumosConsumidos.length === 0) return null
                return (
                  <ConsumoRealSection
                    key={p.id}
                    titulo={p.identificador}
                    insumosConsumidos={detalhe.insumosConsumidos}
                    valores={Object.fromEntries(
                      detalhe.insumosConsumidos.map(item => {
                        const chaveLocal = chaveConsumo(item)
                        const chaveGlobal = `${p.id}:${chaveLocal}`
                        return [chaveLocal, valores[chaveGlobal] ?? item.quantidade]
                      })
                    )}
                    onChange={(chaveLocal, valor) => setValores(v => ({ ...v, [`${p.id}:${chaveLocal}`]: valor }))}
                  />
                )
              })}
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
            <span className="flex items-center gap-[7px]"><StickyNote size={15} /> Justificativa <span className="text-orange">*</span></span>
            <span className={clsx('font-normal', valido ? 'text-[#3E9D5A]' : 'text-muted')}>
              {len}/{MIN_CHARS} mín.
            </span>
          </span>
          <textarea
            value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo do agrupamento..."
            className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
          />
        </label>

        {erro && <div className="text-[13px] text-danger">{erro}</div>}
      </div>
    </ModalShell>
  )
}
