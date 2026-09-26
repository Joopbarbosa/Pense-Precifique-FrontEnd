import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { CalendarDays, TrendingDown, TrendingUp, Truck, Wallet } from 'lucide-react'
import Spinner from '../ui/Spinner'
import GraficoPrecoInsumos from './GraficoPrecoInsumos'
import { formatarData, moeda4 } from './formato'
import { BRL } from '../venda/formato'
import { compraService } from '../../services/compraService'
import { extractApiError } from '../../utils/apiError'
import type { DashboardComprasResponse } from '../../types/compra'

// #548 (RN-NOVA-15) — cards do topo de "Minhas compras". Só compras CONFIRMADAS entram (backend).

function Card({ icone, titulo, children, detalhe }: { icone: ReactNode; titulo: string; children: ReactNode; detalhe?: ReactNode }) {
  return (
    <div data-testid="card-dashboard" className="rounded-card border border-[#F0EEE9] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">{icone}{titulo}</div>
      <div className="mt-2 text-[22px] font-bold tracking-[-0.01em] text-dark [font-variant-numeric:tabular-nums]">{children}</div>
      {detalhe && <div className="mt-0.5 text-[12.5px] text-muted">{detalhe}</div>}
    </div>
  )
}

const SEM_DADOS = <span className="text-[15px] font-semibold text-faint">Sem dados suficientes</span>

export default function DashboardCompras() {
  const [d, setD] = useState<DashboardComprasResponse | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    compraService.dashboard().then(setD).catch(err => setErro(extractApiError(err, 'Não foi possível carregar o resumo das compras.')))
  }, [])

  if (erro) return <div role="alert" className="rounded-input border border-[#F2D4CF] bg-[#FBF0EE] px-4 py-3 text-[13.5px] text-danger-deep">{erro}</div>
  if (!d) return <div className="flex items-center gap-2.5 py-6 text-sm text-muted"><Spinner size={18} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando resumo…</div>

  const aumento = d.insumoMaiorAumento
  const subiu = aumento ? aumento.variacaoPercentual > 0 : false
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icone={<Wallet size={14} />} titulo="Gasto no mês" detalhe="Compras confirmadas, pagas ou não">{BRL(d.totalGastoMes)}</Card>
        <Card icone={<CalendarDays size={14} />} titulo="Gasto no ano">{BRL(d.totalGastoAno)}</Card>
        <Card icone={<Truck size={14} />} titulo="Fornecedor mais usado"
          detalhe={d.fornecedorMaisUsado ? `${d.fornecedorMaisUsado.quantidadeCompras} ${d.fornecedorMaisUsado.quantidadeCompras === 1 ? 'compra' : 'compras'}` : undefined}>
          {d.fornecedorMaisUsado
            ? <Link to={`/clientes/${d.fornecedorMaisUsado.fornecedor.id}`} className="text-[18px] text-dark no-underline hover:text-teal">{d.fornecedorMaisUsado.fornecedor.nome}</Link>
            : SEM_DADOS}
        </Card>
        <Card icone={subiu ? <TrendingUp size={14} /> : <TrendingDown size={14} />} titulo="Maior aumento em 90 dias"
          detalhe={aumento ? <>{aumento.insumo.nome}: {moeda4(aumento.precoInicial)} ({formatarData(aumento.dataInicial)}) → {moeda4(aumento.precoFinal)} ({formatarData(aumento.dataFinal)})</> : undefined}>
          {aumento
            ? <span className={clsx(subiu ? 'text-warning-alt' : 'text-success')}>{aumento.variacaoPercentual > 0 ? '+' : ''}{aumento.variacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span>
            : SEM_DADOS}
        </Card>
      </div>
      <GraficoPrecoInsumos inicial={aumento ? { id: aumento.insumo.id, nome: aumento.insumo.nome, unidade: aumento.insumo.unidade } : null} />
    </div>
  )
}
