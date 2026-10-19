import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, X } from 'lucide-react'
import { eixo, reaisCurto, vazio } from './graficos'
import { PALETA_SERIES, GRAFICO_GRID } from '../../constants/graficos'
import { rotuloMes } from './periodo'
import { BRL } from '../venda/formato'
import { dashboardCadastrosService } from '../../services/dashboardCadastrosService'
import type { EvolucaoPreco } from '../../types/dashboardCadastros'

/** Limite de insumos ao mesmo tempo (RN-NOVA-29); o servidor valida o mesmo limite. */
export const MAX_INSUMOS_EVOLUCAO = 5

export interface InsumoEscolhivel { id: string; nome: string }

interface Props {
  insumos: InsumoEscolhivel[]
  de: string
  ate: string
  /** Insumo que o servidor já devolveu como padrão (o mais comprado no período). */
  inicial: EvolucaoPreco | null
  /** Clique num ponto: o insumo e o mês (primeiro dia) abrem as compras dele. */
  onPonto: (insumo: { id: string; nome: string }, mes: string) => void
}

/** Cor de cada insumo: a primeira da paleta ainda livre, mantida enquanto o insumo estiver escolhido. */
function corLivre(cores: Record<string, string>): string {
  const usadas = new Set(Object.values(cores))
  return PALETA_SERIES.find(c => !usadas.has(c)) ?? PALETA_SERIES[0]
}

/**
 * #989 (RN-NOVA-29, CEN-NOVO-91 e 92): evolução do preço médio mensal de 1 a 5 insumos, uma linha e uma cor por insumo, legenda
 * com a unidade, clique no ponto abre as compras do insumo no mês. O cálculo é do servidor; aqui só se escolhe e se desenha.
 */
export default function EvolucaoPrecoVariosInsumos({ insumos, de, ate, inicial, onPonto }: Props) {
  const [escolhidos, setEscolhidos] = useState<string[]>(inicial ? [inicial.insumoId] : [])
  const [cores, setCores] = useState<Record<string, string>>(inicial ? { [inicial.insumoId]: PALETA_SERIES[0] } : {})
  const [series, setSeries] = useState<EvolucaoPreco[]>(inicial ? [inicial] : [])
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState('')
  const caixa = useRef<HTMLDivElement>(null)
  const primeiraCarga = useRef(true)

  // período novo: o servidor devolve de novo o insumo padrão; o que já estava escolhido continua escolhido
  useEffect(() => {
    if (primeiraCarga.current) { primeiraCarga.current = false; return }
    if (escolhidos.length === 0) { setSeries([]); return }
    dashboardCadastrosService.evolucaoPrecoInsumos(escolhidos, de, ate).then(r => setSeries(r.series)).catch(() => setSeries([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de, ate, escolhidos.join(',')])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const alternar = (id: string) => {
    setAviso('')
    if (escolhidos.includes(id)) {
      setEscolhidos(e => e.filter(x => x !== id))
      setCores(c => { const n = { ...c }; delete n[id]; return n })
      return
    }
    if (escolhidos.length >= MAX_INSUMOS_EVOLUCAO) { setAviso(`Escolha no máximo ${MAX_INSUMOS_EVOLUCAO} insumos`); return }
    setCores(c => ({ ...c, [id]: corLivre(c) }))
    setEscolhidos(e => [...e, id])
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? insumos.filter(i => i.nome.toLowerCase().includes(termo)) : insumos
  }, [insumos, busca])

  const meses = useMemo(() => [...new Set(series.flatMap(s => s.pontos.map(p => p.mes)))].sort(), [series])
  const dados = meses.map(mes => {
    const linha: Record<string, string | number> = { mes, rotulo: rotuloMes(mes) }
    series.forEach(s => { const p = s.pontos.find(x => x.mes === mes); if (p) linha[s.insumoId] = p.precoMedio })
    return linha
  })
  const rotuloLegenda = (s: EvolucaoPreco) => `${s.insumo}${s.marca ? ` ${s.marca}` : ''}${s.unidade ? ` (${s.unidade.toLowerCase()})` : ''}`

  return (
    <div data-testid="evolucao-varios-insumos">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative" ref={caixa}>
          <button type="button" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto(a => !a)}
            className="flex h-8 items-center gap-1.5 rounded-input border-[1.5px] border-line bg-white px-2.5 text-[12.5px] text-body hover:border-teal">
            Insumos ({escolhidos.length}/{MAX_INSUMOS_EVOLUCAO}) <ChevronDown size={14} />
          </button>
          {aberto && (
            <div role="listbox" aria-multiselectable="true" aria-label="Insumos da evolução de preço"
              className="absolute left-0 top-9 z-20 w-[260px] rounded-input border border-line bg-white p-2 shadow-card">
              <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar insumo" aria-label="Buscar insumo"
                className="mb-2 h-8 w-full rounded-input border-[1.5px] border-line px-2 text-[12.5px] outline-hidden focus:border-teal" />
              <ul className="m-0 max-h-[220px] list-none overflow-y-auto p-0">
                {filtrados.length === 0 && <li className="px-2 py-2 text-[12.5px] text-muted">Nenhum insumo encontrado.</li>}
                {filtrados.map(i => (
                  <li key={i.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-body hover:bg-cream">
                      <input type="checkbox" role="option" aria-selected={escolhidos.includes(i.id)} checked={escolhidos.includes(i.id)} onChange={() => alternar(i.id)} />
                      <span>{i.nome}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {escolhidos.map(id => {
          const nome = insumos.find(i => i.id === id)?.nome ?? series.find(s => s.insumoId === id)?.insumo ?? ''
          return (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-2 pr-1 text-[12px] text-body">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cores[id] }} />{nome}
              <button type="button" aria-label={`Remover ${nome}`} onClick={() => alternar(id)} className="grid h-5 w-5 place-items-center border-none bg-transparent p-0 text-muted hover:text-danger"><X size={12} /></button>
            </span>
          )
        })}
      </div>
      {aviso && <p role="alert" className="mb-2 mt-0 text-[12.5px] font-semibold text-danger-deep">{aviso}</p>}

      {escolhidos.length === 0 ? vazio('Escolha um insumo') : series.every(s => s.pontos.length === 0) ? vazio('Sem compras no período') : (
        <>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis width={64} tickFormatter={v => reaisCurto(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
                <Tooltip content={<DicaVarios series={series} cores={cores} />} />
                {series.map(s => (
                  <Line key={s.insumoId} dataKey={s.insumoId} name={s.insumo} stroke={cores[s.insumoId]} strokeWidth={2} connectNulls isAnimationActive={false}
                    dot={(p: { cx?: number; cy?: number; payload?: { mes?: string }; value?: number; index?: number }) => p.value == null || p.cx == null || p.cy == null ? <g key={`vazio-${s.insumoId}-${p.index}`} /> : (
                      <circle key={`${s.insumoId}-${p.payload?.mes}`} data-testid={`ponto-${s.insumoId}`} cx={p.cx} cy={p.cy} r={5} fill="#fff" stroke={cores[s.insumoId]} strokeWidth={2} style={{ cursor: 'pointer' }}
                        onClick={() => p.payload?.mes && onPonto({ id: s.insumoId, nome: s.insumo }, p.payload.mes)} />
                    )} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul aria-label="Legenda da evolução de preço" className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-body">
            {series.map(s => (
              <li key={s.insumoId} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cores[s.insumoId] }} />{rotuloLegenda(s)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function DicaVarios({ active, label, payload, series, cores }: {
  active?: boolean; label?: string; payload?: { dataKey?: string; value?: number }[]; series: EvolucaoPreco[]; cores: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-input border border-line bg-white px-3 py-2 text-[12.5px] shadow-card">
      <div className="font-semibold text-dark">{label}</div>
      {payload.filter(p => p.value != null).map(p => {
        const s = series.find(x => x.insumoId === p.dataKey)
        return s ? (
          <div key={s.insumoId} className="flex items-center gap-1.5 text-body [font-variant-numeric:tabular-nums]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cores[s.insumoId] }} />{s.insumo}: {BRL(Number(p.value))}
          </div>
        ) : null
      })}
    </div>
  )
}
