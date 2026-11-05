import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import ModalBaixa from './ModalBaixa'
import LinhaVencimento from './LinhaVencimento'
import { GraficoEntrouSaiu, GraficoSaldoProjetado } from './GraficosResumo'
import { BRL } from '../venda/formato'
import { financeiroService } from '../../services/financeiroService'
import { extractApiError } from '../../utils/apiError'
import {
  MENSAGEM_SEM_VENCIMENTOS, formatarPercentual, larguraBarra, mesDaData, mudarMes, rotuloMes, rotuloVerTodas,
} from '../../utils/financeiro'
import type { ResumoFinanceiro } from '../../types/financeiro'

function Cartao({ titulo, valor, destaque, children, testid }: { titulo: string; valor: number; destaque?: boolean; children?: React.ReactNode; testid: string }) {
  return (
    <div className={clsx('rounded-input border px-4 py-3', destaque ? 'border-teal bg-white' : 'border-line bg-white')} data-testid={testid}>
      <div className="text-[12.5px] font-medium text-muted">{titulo}</div>
      <div className={clsx('text-[22px] font-bold [font-variant-numeric:tabular-nums]', valor < 0 ? 'text-danger-deep' : 'text-dark')}>{BRL(valor)}</div>
      {children && <div className="mt-1 text-[12.5px] text-muted">{children}</div>}
    </div>
  )
}

/**
 * PP-524 (F5, RN-NOVA-17 a 23) — resumo do mês: cinco indicadores, previsto x realizado, próximos vencimentos, gráficos
 * e maiores despesas por categoria. Todos os números vêm prontos da API; a tela só mostra.
 */
export default function ResumoFinanceiroPainel() {
  const [mes, setMes] = useState(() => mesDaData())
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [baixando, setBaixando] = useState<import('../../types/financeiro').ParcelaFinanceira | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setResumo(await financeiroService.resumo(mes))
      setErro(null)
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível carregar o resumo do mês.'))
    } finally {
      setCarregando(false)
    }
  }, [mes])

  useEffect(() => { void carregar() }, [carregar])

  const maior = resumo ? Math.max(0, ...resumo.maioresDespesas.map(c => c.valor)) : 0

  return (
    <section aria-label="Resumo do mês" className="mb-6" data-testid="resumo-financeiro">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => setMes(m => mudarMes(m, -1))}><ChevronLeft size={16} /></Button>
        <h2 className="m-0 min-w-[170px] text-center text-[17px] font-bold capitalize text-dark" data-testid="mes-resumo">{rotuloMes(mes)}</h2>
        <Button variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => setMes(m => mudarMes(m, 1))}><ChevronRight size={16} /></Button>
        {mes !== mesDaData() && <Button variant="ghost" size="sm" onClick={() => setMes(mesDaData())}>Mês atual</Button>}
      </div>

      {carregando && !resumo && <div className="flex justify-center py-8"><Spinner /></div>}
      {erro && (
        <div role="alert" className="mb-3 flex flex-col items-start gap-3 rounded-input border border-danger-line bg-danger-bg px-4 py-3 text-[14px] text-danger-deep">
          {erro}
          <Button variant="secondary" size="sm" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      )}

      {resumo && !erro && (
        <div className="flex flex-col gap-4">
          {resumo.avisoSaldoInicial && <p role="status" className="m-0 text-[13px] text-muted" data-testid="aviso-saldo-inicial">{resumo.avisoSaldoInicial}</p>}
          {resumo.semMovimentos && resumo.mensagemSemMovimentos && <p className="m-0 text-[14px] font-semibold text-muted" data-testid="sem-movimentos">{resumo.mensagemSemMovimentos}</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cartao testid="indicador-saldo" titulo="Saldo final do mês" valor={resumo.saldoFinal} destaque>
              Começou com {BRL(resumo.saldoInicial)} · entrou {BRL(resumo.entradasRealizadas)} · saiu {BRL(resumo.saidasRealizadas)}
              <div data-testid="movimento-periodo">Movimento do mês: {BRL(resumo.movimentoPeriodo)}</div>
            </Cartao>
            <Cartao testid="indicador-a-receber" titulo="A receber" valor={resumo.aReceber.emAberto}>
              Vencido: <span data-testid="receber-vencido">{BRL(resumo.aReceber.vencido)}</span>
            </Cartao>
            <Cartao testid="indicador-a-pagar" titulo="A pagar" valor={resumo.aPagar.emAberto}>
              Vencido: <span data-testid="pagar-vencido">{BRL(resumo.aPagar.vencido)}</span>
            </Cartao>
            <div className="rounded-input border border-line bg-white px-4 py-3" data-testid="indicador-previsto-realizado">
              <div className="text-[12.5px] font-medium text-muted">Previsto x realizado</div>
              <table className="mt-1 w-full border-collapse text-[13px]">
                <caption className="sr-only">Previsto e realizado do mês</caption>
                <thead><tr className="text-muted"><th scope="col" className="text-left font-medium"> </th><th scope="col" className="text-right font-medium">Previsto</th><th scope="col" className="text-right font-medium">Realizado</th></tr></thead>
                <tbody className="[font-variant-numeric:tabular-nums]">
                  <tr><th scope="row" className="text-left font-medium">Entradas</th><td className="text-right">{BRL(resumo.previstoRealizado.previstoEntradas)}</td><td className="text-right">{BRL(resumo.previstoRealizado.realizadoEntradas)}</td></tr>
                  <tr><th scope="row" className="text-left font-medium">Saídas</th><td className="text-right">{BRL(resumo.previstoRealizado.previstoSaidas)}</td><td className="text-right">{BRL(resumo.previstoRealizado.realizadoSaidas)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <section aria-labelledby="titulo-proximos" data-testid="proximos-vencimentos">
            <h2 id="titulo-proximos" className="m-0 mb-2 text-[16px] font-bold text-dark">Próximos vencimentos</h2>
            {resumo.proximosVencimentos.itens.length === 0 ? (
              <p className="m-0 text-[14px] text-muted" data-testid="vencimentos-vazio">{resumo.proximosVencimentos.mensagemVazio || MENSAGEM_SEM_VENCIMENTOS}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {resumo.proximosVencimentos.itens.map(p => <LinhaVencimento key={p.id} parcela={p} onBaixar={setBaixando} />)}
              </ul>
            )}
            {resumo.proximosVencimentos.temMais && (
              <Link to="/financeiro/vencimentos" className="mt-2 inline-block text-[14px] font-semibold text-teal no-underline hover:underline" data-testid="ver-todas-vencimentos">
                {rotuloVerTodas(resumo.proximosVencimentos.total)}
              </Link>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GraficoEntrouSaiu semanas={resumo.entrouSaiu} semMovimentos={resumo.semMovimentos} />
            <GraficoSaldoProjetado projecao={resumo.projecao} />
          </div>

          <section aria-labelledby="titulo-despesas" className="rounded-input border border-line bg-white p-4" data-testid="maiores-despesas">
            <h2 id="titulo-despesas" className="m-0 mb-2 text-[16px] font-bold text-dark">Maiores despesas por categoria</h2>
            {resumo.maioresDespesas.length === 0 ? (
              <p className="m-0 text-[14px] text-muted" data-testid="despesas-vazio">Sem despesas com categoria neste mês.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {resumo.maioresDespesas.map(c => (
                  <li key={c.categoriaId ?? 'outras'} data-testid="linha-categoria" className="text-[14px]">
                    <div className="flex justify-between gap-3"><span className="font-medium text-dark">{c.nome}</span>
                      <span className="text-body [font-variant-numeric:tabular-nums]">{BRL(c.valor)} · {formatarPercentual(c.percentual)}</span></div>
                    <div className="mt-1 h-2 rounded bg-line" aria-hidden="true"><div className="h-2 rounded" style={{ width: `${larguraBarra(c.valor, maior)}%`, background: c.outras ? '#A29E96' : '#2A9D8F' }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <ModalBaixa parcela={baixando} onClose={() => setBaixando(null)} onBaixada={() => { setBaixando(null); void carregar() }} />
    </section>
  )
}
