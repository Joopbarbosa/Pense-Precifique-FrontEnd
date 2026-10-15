import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BRL } from '../venda/formato'
import { GRAFICO_EIXO, GRAFICO_GRID } from '../../constants/graficos'

// V0.17.0 — #615 (DT-NOVA-10): peças de gráfico comuns dos dashboards, extraídas de `DashboardCompras.tsx`.

export const eixo = { fontSize: 11.5, fill: GRAFICO_EIXO }
export const reaisCurto = (v: number) => BRL(Number(v)).replace(',00', '')
export const vazio = (texto: string) => <div className="py-10 text-center text-sm text-muted">{texto}</div>

export function Dica({ active, payload, formato }: {
  active?: boolean
  payload?: { payload: { rotulo: string; extra?: string }; value: number }[]
  formato: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-input border border-line bg-white px-3 py-2 text-[12.5px] shadow-card">
      <div className="font-semibold text-dark">{p.payload.rotulo}</div>
      <div className="text-body [font-variant-numeric:tabular-nums]">{formato(p.value)}</div>
      {p.payload.extra && <div className="text-muted">{p.payload.extra}</div>}
    </div>
  )
}

/** Ranking horizontal (10 maiores); o clique na barra abre a listagem daquele item. */
export function Ranking({ dados, cor, formato, onClique, testid }: {
  dados: { id: string; rotulo: string; valor: number; extra?: string }[]
  cor: string
  formato: (v: number) => string
  onClique: (id: string, rotulo: string) => void
  testid: string
}) {
  return (
    <div style={{ height: Math.max(120, dados.length * 34 + 20) }} data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRAFICO_GRID} />
          <XAxis type="number" tickFormatter={v => formato(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="rotulo" width={140} tick={{ ...eixo, fill: '#5B5750' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Dica formato={formato} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22} cursor="pointer"
            onClick={(d: { payload?: { id: string; rotulo: string } }) => d.payload && onClique(d.payload.id, d.payload.rotulo)}>
            {dados.map(d => <Cell key={d.id} fill={cor} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
