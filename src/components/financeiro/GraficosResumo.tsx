import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BRL } from '../venda/formato'
import { GRAFICO_EIXO, GRAFICO_GRID, PALETA_SERIES } from '../../constants/graficos'
import { MENSAGEM_SEM_MOVIMENTOS_GRAFICO, diaMes, primeiroDiaNegativo } from '../../utils/financeiro'
import type { ProjecaoResumo, SemanaResumo } from '../../types/financeiro'

// PP-524 (RN-NOVA-22) — dois gráficos com tabela alternativa legível. Cor nunca é o único canal:
// legenda em texto, marcos com rótulo e tabela com os mesmos números.
const eixo = { fontSize: 11.5, fill: GRAFICO_EIXO }
const reais = (v: number) => BRL(Number(v)).replace(',00', '')
const COR_ENTROU = PALETA_SERIES[0]
const COR_SAIU = PALETA_SERIES[1]
const COR_SALDO = PALETA_SERIES[2]

function Vazio() {
  return <div className="py-10 text-center text-sm text-muted" data-testid="grafico-vazio">{MENSAGEM_SEM_MOVIMENTOS_GRAFICO}</div>
}

/** Entrou x saiu por semana, com a linha do saldo acumulado. */
export function GraficoEntrouSaiu({ semanas, semMovimentos }: { semanas: SemanaResumo[]; semMovimentos: boolean }) {
  const dados = semanas.map(s => ({ ...s, nome: `Dias ${s.rotulo}` }))
  return (
    <section className="rounded-input border border-line bg-white p-4" aria-labelledby="titulo-entrou-saiu" data-testid="grafico-entrou-saiu">
      <h2 id="titulo-entrou-saiu" className="m-0 mb-2 text-[16px] font-bold text-dark">Entrou x saiu por semana</h2>
      {semMovimentos || dados.length === 0 ? <Vazio /> : (
        <>
          <div style={{ height: 260 }} role="img" aria-label="Gráfico de barras: entradas e saídas por semana, com a linha do saldo acumulado. Os mesmos números estão na tabela abaixo.">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={reais} tick={eixo} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={(v) => BRL(Number(v))} labelFormatter={(l) => `Dias ${l}`} />
                <Legend />
                <Bar dataKey="entradas" name="Entrou" fill={COR_ENTROU} radius={[3, 3, 0, 0]} />
                <Bar dataKey="saidas" name="Saiu" fill={COR_SAIU} radius={[3, 3, 0, 0]} />
                <Line dataKey="saldoAcumulado" name="Saldo acumulado" type="monotone" stroke={COR_SALDO} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-teal">Ver como tabela</summary>
            <table className="mt-2 w-full border-collapse text-[13px]" data-testid="tabela-entrou-saiu">
              <caption className="sr-only">Entradas, saídas e saldo acumulado por semana</caption>
              <thead><tr className="text-left text-muted"><th scope="col" className="py-1">Semana</th><th scope="col" className="text-right">Entrou</th><th scope="col" className="text-right">Saiu</th><th scope="col" className="text-right">Saldo acumulado</th></tr></thead>
              <tbody>
                {semanas.map(s => (
                  <tr key={s.numero} className="border-t border-line">
                    <th scope="row" className="py-1 text-left font-medium">Dias {s.rotulo}</th>
                    <td className="text-right [font-variant-numeric:tabular-nums]">{BRL(s.entradas)}</td>
                    <td className="text-right [font-variant-numeric:tabular-nums]">{BRL(s.saidas)}</td>
                    <td className="text-right [font-variant-numeric:tabular-nums]">{BRL(s.saldoAcumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}

/** Saldo projetado: linha tracejada dos próximos 90 dias, marcos de 30/60/90, linha do zero. */
export function GraficoSaldoProjetado({ projecao }: { projecao: ProjecaoResumo }) {
  const serie = projecao.serie.map(p => ({ ...p, rotulo: diaMes(p.data) }))
  const negativo = primeiroDiaNegativo(projecao.serie)
  return (
    <section className="rounded-input border border-line bg-white p-4" aria-labelledby="titulo-saldo-projetado" data-testid="grafico-saldo-projetado">
      <h2 id="titulo-saldo-projetado" className="m-0 mb-2 text-[16px] font-bold text-dark">Saldo projetado (próximos 90 dias)</h2>
      {projecao.semDados || serie.length === 0 ? <Vazio /> : (
        <>
          {negativo && <p role="status" className="m-0 mb-2 text-[13px] font-semibold text-danger-deep" data-testid="alerta-saldo-negativo">O saldo fica negativo a partir de {diaMes(negativo)}.</p>}
          <div style={{ height: 260 }} role="img" aria-label="Gráfico de linha: saldo projetado dos próximos 90 dias, com marcos em 30, 60 e 90 dias. Os mesmos números estão na tabela abaixo.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRAFICO_GRID} />
                <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} interval={14} />
                <YAxis tickFormatter={reais} tick={eixo} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={(v) => BRL(Number(v))} labelFormatter={(l) => `Dia ${l}`} />
                <ReferenceLine y={0} stroke={PALETA_SERIES[1]} strokeDasharray="2 2" />
                <Line dataKey="saldo" name="Saldo projetado" type="monotone" stroke={COR_SALDO} strokeWidth={2} strokeDasharray="6 4" dot={false} />
                {projecao.marcos.map(m => (
                  <ReferenceDot key={m.dias} x={diaMes(m.data)} y={m.saldo} r={5} fill={COR_SALDO} stroke="#fff"
                    label={{ value: `${m.dias} dias`, position: 'top', fontSize: 11.5, fill: GRAFICO_EIXO }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-teal">Ver como tabela</summary>
            <table className="mt-2 w-full border-collapse text-[13px]" data-testid="tabela-saldo-projetado">
              <caption className="sr-only">Saldo atual e saldo esperado em 30, 60 e 90 dias</caption>
              <thead><tr className="text-left text-muted"><th scope="col" className="py-1">Quando</th><th scope="col">Data</th><th scope="col" className="text-right">Saldo</th></tr></thead>
              <tbody>
                <tr className="border-t border-line"><th scope="row" className="py-1 text-left font-medium">Hoje</th><td>—</td><td className="text-right [font-variant-numeric:tabular-nums]">{BRL(projecao.saldoAtual)}</td></tr>
                {projecao.marcos.map(m => (
                  <tr key={m.dias} className="border-t border-line">
                    <th scope="row" className="py-1 text-left font-medium">Em {m.dias} dias</th>
                    <td>{diaMes(m.data)}</td>
                    <td className="text-right [font-variant-numeric:tabular-nums]">{BRL(m.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}
