import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import SegmentedControl from '../../components/ui/SegmentedControl'
import FaixaResumo from '../../components/agenda/FaixaResumo'
import GradeMes from '../../components/agenda/GradeMes'
import GradeHoras from '../../components/agenda/GradeHoras'
import ModalAtrasados from '../../components/agenda/ModalAtrasados'
import ModalDia from '../../components/agenda/ModalDia'
import DetalheCompromisso from '../../components/agenda/DetalheCompromisso'
import ModalEvento from '../../components/agenda/ModalEvento'
import { agendaService } from '../../services/agendaService'
import { empresaService } from '../../services/empresaService'
import type { AgendaResumo, Compromisso, VisaoAgenda } from '../../types/agenda'
import type { HorarioFuncionamento } from '../../types/empresa'
import { dataLocalIso } from '../../utils/data'
import { lerPreferencia, gravarPreferencia } from '../../utils/preferenciaLocal'
import { distribuirPorDia, navegar, periodoDaVisao, tituloDoPeriodo } from '../../utils/agenda'

const OPCOES_VISAO = [
  { value: 'DIA' as VisaoAgenda, label: 'Dia' },
  { value: 'SEMANA' as VisaoAgenda, label: 'Semana' },
  { value: 'MES' as VisaoAgenda, label: 'Mês' },
]

/** Horas de abertura mais cedo e de último fechamento entre os dias em que a empresa abre; nulo sem horário configurado (RN-NOVA-2). */
function faixaDeFuncionamento(horarios: HorarioFuncionamento[] | undefined): { inicio: number; fim: number } | null {
  const abertos = (horarios ?? []).filter(h => !h.fechado && h.horaAbertura && h.horaFechamento)
  if (abertos.length === 0) return null
  const inicio = Math.min(...abertos.map(h => Number(h.horaAbertura!.slice(0, 2))))
  const fim = Math.max(...abertos.map(h => {
    const [hh, mm] = h.horaFechamento!.split(':').map(Number)
    return mm > 0 ? hh : Math.max(hh - 1, 0)
  }))
  return { inicio, fim: Math.max(fim, inicio) }
}

/**
 * V0.18.0 (#1034, RN-NOVA-1 a RN-NOVA-7) — a Agenda: visões Dia, Semana (a que abre) e Mês, faixa de atrasados e de hoje,
 * "+N" no mês e detalhe do compromisso. Os compromissos são calculados no servidor a cada consulta; a tela só os exibe.
 */
export default function AgendaPage() {
  const [hoje, setHoje] = useState(() => dataLocalIso())
  const [sinalHoje, setSinalHoje] = useState(0)
  // RN-NOVA-2/RN-NOVA-23: a última visão escolhida é lembrada por pessoa; a Semana é a que abre quando não há escolha
  const [visao, setVisaoEstado] = useState<VisaoAgenda>(() => {
    const salva = lerPreferencia('agenda:visao')
    return salva === 'DIA' || salva === 'MES' || salva === 'SEMANA' ? salva : 'SEMANA'
  })
  const setVisao = (v: VisaoAgenda) => { setVisaoEstado(v); gravarPreferencia('agenda:visao', v) }
  const [referencia, setReferencia] = useState(hoje)
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [resumo, setResumo] = useState<AgendaResumo | null>(null)
  const [horarios, setHorarios] = useState<HorarioFuncionamento[] | undefined>(undefined)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [atrasadosAberto, setAtrasadosAberto] = useState(false)
  const [diaAberto, setDiaAberto] = useState<string | null>(null)
  const [aberto, setAberto] = useState<Compromisso | null>(null)
  const [novoEvento, setNovoEvento] = useState(false)

  const periodo = useMemo(() => periodoDaVisao(visao, referencia), [visao, referencia])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [lista, faixa] = await Promise.all([agendaService.compromissos(periodo.de, periodo.ate), agendaService.resumo()])
      setCompromissos(lista)
      setResumo(faixa)
      setErro(null)
    } catch {
      setErro('Não foi possível carregar a agenda.')
    } finally {
      setCarregando(false)
    }
  }, [periodo.de, periodo.ate])

  useEffect(() => { void carregar() }, [carregar])
  // o atraso por horário muda com o relógio: reconsulta a cada minuto e ao voltar para a aba (RN-NOVA-2 v2)
  useEffect(() => {
    const atualizar = () => { setHoje(dataLocalIso()); void carregar() }
    const id = window.setInterval(atualizar, 60_000)
    const aoVoltar = () => { if (document.visibilityState === 'visible') atualizar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [carregar])
  useEffect(() => { empresaService.getEmpresa().then(e => setHorarios(e?.horarios)).catch(() => setHorarios(undefined)) }, [])

  // RN-NOVA-4 v2: o atrasado entra em todos os dias do período entre a origem e hoje
  const porDia = useMemo(() => distribuirPorDia(compromissos, periodo.dias), [compromissos, periodo.dias])

  // o atalho "para hoje" abre o dia, mas não troca a visão lembrada da pessoa
  const irParaHoje = () => { setVisaoEstado('DIA'); setReferencia(hoje); setSinalHoje(n => n + 1) }
  const abrir = (c: Compromisso) => { setDiaAberto(null); setAtrasadosAberto(false); setAberto(c) }
  const vazio = !carregando && !erro && compromissos.length === 0

  return (
    <AppLayout active="agenda" compact>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-dark">Agenda</h1>
        <Button icon={<CalendarPlus size={16} />} onClick={() => setNovoEvento(true)}>Novo evento</Button>
      </div>

      <FaixaResumo resumo={resumo} onAtrasados={() => setAtrasadosAberto(true)} onHoje={irParaHoje} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setReferencia(navegar(visao, referencia, -1))}>Anterior</Button>
          <Button variant="ghost" size="sm" onClick={() => { setReferencia(hoje); setSinalHoje(n => n + 1) }}>Hoje</Button>
          <Button variant="ghost" size="sm" iconRight={<ChevronRight size={16} />} onClick={() => setReferencia(navegar(visao, referencia, 1))}>Próximo</Button>
          <span className="ml-2 text-[15px] font-semibold capitalize text-dark" data-testid="titulo-periodo">{tituloDoPeriodo(visao, referencia)}</span>
        </div>
        <SegmentedControl options={OPCOES_VISAO} value={visao} onChange={setVisao} height="h-9" display="inline-flex"
          optionWidth="whitespace-nowrap px-4" textSize="text-[13.5px]" />
      </div>

      {erro && <p className="rounded-card border border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger-deep">{erro}</p>}
      {carregando && compromissos.length === 0 && !erro ? (
        <div className="flex justify-center py-16"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={24} /></div>
      ) : visao === 'MES' ? (
        <GradeMes dias={periodo.dias} mesDeReferencia={referencia} hoje={hoje} porDia={porDia} onAbrir={abrir} onVerDia={setDiaAberto} />
      ) : (
        <GradeHoras dias={periodo.dias} hoje={hoje} porDia={porDia} faixa={faixaDeFuncionamento(horarios)} onAbrir={abrir} sinalHoje={sinalHoje} />
      )}
      {vazio && <p className="mt-3 text-center text-sm text-subtle" data-testid="agenda-vazia">Nenhum compromisso neste período</p>}

      {atrasadosAberto && <ModalAtrasados onClose={() => setAtrasadosAberto(false)} onAbrir={abrir} />}
      {diaAberto && <ModalDia dia={diaAberto} compromissos={porDia.get(diaAberto) ?? []} onClose={() => setDiaAberto(null)} onAbrir={abrir} />}
      {novoEvento && <ModalEvento dataInicial={referencia} onClose={() => setNovoEvento(false)} onSalvo={() => { setNovoEvento(false); void carregar() }} />}
      {aberto && <DetalheCompromisso compromisso={aberto} onClose={() => setAberto(null)} onAlterado={() => { setAberto(null); void carregar() }} />}
    </AppLayout>
  )
}
