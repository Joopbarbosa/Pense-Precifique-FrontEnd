import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Dica, eixo, vazio } from './graficos'
import { PALETA_SERIES, GRAFICO_EIXO, GRAFICO_GRID } from '../../constants/graficos'
import { pct } from './periodo'
import type { ItemAbc } from '../../types/dashboardCadastros'

// V0.17.0 — #969 e #972 (RN-NOVA-24): cada gráfico usa o tipo que responde à pergunta dele. Todos entregam o dado clicado à página, que
// abre a modal de listagem (RN-NOVA-23); o componente não decide o que abrir. Sem rótulos de texto junto às fatias do donut.

export interface PontoGrafico { id: string; rotulo: string; valor: number; extra?: string }
type AoClicar = (id: string, rotulo: string) => void

const COR_CLASSE: Record<'A' | 'B' | 'C', string> = { A: PALETA_SERIES[0], B: PALETA_SERIES[1], C: GRAFICO_EIXO }

/** Donut sem rótulos nas fatias; nomes e valores ficam numa legenda clicável (cada item abre a modal). */
export function DonutComLegenda({ dados, formato, onClique, testid }: { dados: PontoGrafico[]; formato: (v: number) => string; onClique: AoClicar; testid: string }) {
  if (dados.length === 0) return vazio('Nenhuma venda no período.')
  const cor = (i: number) => PALETA_SERIES[i % PALETA_SERIES.length]
  return (
    <div data-testid={testid}>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="rotulo" innerRadius={50} outerRadius={85} cursor="pointer"
              onClick={(p: { id?: string; rotulo?: string }) => p.id && onClique(p.id, p.rotulo ?? '')}>
              {dados.map((d, i) => <Cell key={d.id} fill={cor(i)} />)}
            </Pie>
            <Tooltip content={<Dica formato={formato} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul aria-label="Legenda" className="mt-3 flex flex-col gap-1.5 text-[13px]">
        {dados.map((d, i) => (
          <li key={d.id}>
            <button type="button" onClick={() => onClique(d.id, d.rotulo)} className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left font-[inherit] text-body hover:text-teal">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor(i) }} />
              <span>{d.rotulo}: <strong className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{formato(d.valor)}</strong>{d.extra ? ` (${d.extra})` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras verticais, uma por item; o clique abre a modal daquele item. */
export function BarrasVerticais({ dados, formato, cor, onClique, testid }: { dados: PontoGrafico[]; formato: (v: number) => string; cor: string; onClique: AoClicar; testid: string }) {
  if (dados.length === 0) return vazio('Nenhuma venda no período.')
  return (
    <div className="h-[240px]" data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
          <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} interval={0} />
          <YAxis width={72} tickFormatter={v => formato(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
          <Tooltip content={<Dica formato={formato} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
          <Bar dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} maxBarSize={48} cursor="pointer"
            onClick={(d: { payload?: PontoGrafico }) => d.payload && onClique(d.payload.id, d.payload.rotulo)} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Barras horizontais ordenadas, com o valor ao fim de cada barra; o clique abre a modal daquele item. `corDe` colore cada barra
 * (ex.: pela classe da curva ABC). #990 e #991 (RN-NOVA-24, alteração): substituem o Pareto e o treemap.
 */
export function BarrasHorizontaisComValor({ dados, formato, cor, corDe, onClique, testid }: {
  dados: PontoGrafico[]; formato: (v: number) => string; cor: string; corDe?: (d: PontoGrafico) => string; onClique: AoClicar; testid: string
}) {
  if (dados.length === 0) return vazio('Sem dados no período')
  return (
    <div style={{ height: Math.max(120, dados.length * 38 + 20) }} data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 84, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRAFICO_GRID} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="rotulo" width={150} tick={{ ...eixo, fill: '#5B5750' }} axisLine={false} tickLine={false} interval={0} />
          <Tooltip content={<Dica formato={formato} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={24} cursor="pointer"
            onClick={(d: { payload?: PontoGrafico }) => d.payload && onClique(d.payload.id, d.payload.rotulo)}>
            {dados.map(d => <Cell key={d.id} fill={corDe ? corDe(d) : cor} />)}
            <LabelList dataKey="valor" position="right" formatter={(v: unknown) => formato(Number(v))} style={{ fontSize: 12, fill: '#2B2825', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Curva ABC: barras horizontais do maior para o menor lucro, coloridas pela classe, com a legenda das classes; o acumulado fica na tabela. */
export function BarrasAbc({ itens, formato, onClique, testid }: { itens: ItemAbc[]; formato: (v: number) => string; onClique: AoClicar; testid: string }) {
  if (itens.length === 0) return null
  const classeDe = new Map(itens.map(i => [i.id ?? i.identificador, i.classe ?? 'C' as const]))
  const dados: PontoGrafico[] = itens.map(i => ({ id: i.id ?? i.identificador, rotulo: i.nome, valor: i.lucro }))
  const legenda: { classe: 'A' | 'B' | 'C'; texto: string }[] = [
    { classe: 'A', texto: 'A: os produtos que juntos dão até 80% do lucro' },
    { classe: 'B', texto: 'B: os que levam o total até 95%' },
    { classe: 'C', texto: 'C: os demais, 5% finais do lucro' },
  ]
  return (
    <div data-testid={testid}>
      <ul aria-label="Legenda das classes" className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-body">
        {legenda.map(l => (
          <li key={l.classe} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COR_CLASSE[l.classe] }} />{l.texto}
          </li>
        ))}
      </ul>
      <BarrasHorizontaisComValor testid={`${testid}-barras`} cor={PALETA_SERIES[0]} formato={formato} dados={dados} onClique={onClique}
        corDe={d => COR_CLASSE[classeDe.get(d.id) ?? 'C']} />
    </div>
  )
}

/** Barras divergentes: aumento e queda em cores e lados diferentes, em torno de zero. */
export function BarrasDivergentes({ dados, onClique, testid }: { dados: PontoGrafico[]; onClique: AoClicar; testid: string }) {
  if (dados.length === 0) return vazio("Sem dados no período")
  return (
    <div style={{ height: Math.max(120, dados.length * 34 + 20) }} data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRAFICO_GRID} />
          <XAxis type="number" tickFormatter={v => pct(Number(v))} tick={eixo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="rotulo" width={140} tick={{ ...eixo, fill: '#5B5750' }} axisLine={false} tickLine={false} />
          <Tooltip content={<Dica formato={pct} />} cursor={{ fill: 'rgba(42,157,143,0.06)' }} />
          <Bar dataKey="valor" maxBarSize={22} cursor="pointer"
            onClick={(d: { payload?: { id: string; rotulo: string } }) => d.payload && onClique(d.payload.id, d.payload.rotulo)}>
            {dados.map(d => <Cell key={d.id} fill={d.valor >= 0 ? PALETA_SERIES[1] : PALETA_SERIES[0]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
