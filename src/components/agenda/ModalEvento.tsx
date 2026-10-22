import { useState } from 'react'
import clsx from 'clsx'
import { CalendarPlus, X } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Field from '../ui/Field'
import SegmentedControl from '../ui/SegmentedControl'
import ComboBusca from '../compra/ComboBusca'
import { insumoService } from '../../services/insumoService'
import { orcamentoService } from '../../services/orcamentoService'
import { agendaService } from '../../services/agendaService'
import { extractApiError } from '../../utils/apiError'
import { dataLocalIso } from '../../utils/data'
import type { CompromissoUsuariaDetalhe, DiaSemanaApi, EscopoEdicao, RecorrenciaCompromisso } from '../../types/agenda'

const DIAS: { valor: DiaSemanaApi; rotulo: string }[] = [
  { valor: 'MONDAY', rotulo: 'Seg' }, { valor: 'TUESDAY', rotulo: 'Ter' }, { valor: 'WEDNESDAY', rotulo: 'Qua' },
  { valor: 'THURSDAY', rotulo: 'Qui' }, { valor: 'FRIDAY', rotulo: 'Sex' }, { valor: 'SATURDAY', rotulo: 'Sáb' }, { valor: 'SUNDAY', rotulo: 'Dom' },
]

const OPCOES_RECORRENCIA = [
  { value: 'NENHUMA' as RecorrenciaCompromisso, label: 'Não repete' },
  { value: 'SEMANAL' as RecorrenciaCompromisso, label: 'Semanal' },
  { value: 'MENSAL' as RecorrenciaCompromisso, label: 'Mensal' },
]

export interface VinculoInicial { orcamento?: { id: string; identificador: string } | null; insumo?: { id: string; nome: string } | null }

/**
 * V0.18.0 (#1039, RN-NOVA-19 a RN-NOVA-21) — "Novo evento" e a edição do compromisso da usuária. Título (até 120) e data são
 * obrigatórios; horário, orçamento e insumo são opcionais (a busca só oferece registros ativos); a recorrência semanal ou mensal vale
 * só na criação. Na edição de uma série, `escopo` diz se a mudança vale para a ocorrência ou para a série inteira (a data só muda por
 * ocorrência). Os bloqueios de regra vêm do servidor e aparecem na própria modal.
 */
export default function ModalEvento({ edicao, escopo, vinculoInicial, dataInicial, horarioInicial, horarioFimInicial, onClose, onSalvo }: {
  /** Quando informado, a modal edita essa ocorrência; senão, cria um evento novo. */
  edicao?: CompromissoUsuariaDetalhe
  escopo?: EscopoEdicao
  /** Vínculos que já vêm preenchidos (por exemplo, o orçamento de onde o evento foi aberto). */
  vinculoInicial?: VinculoInicial
  dataInicial?: string
  /** Horário que já vem preenchido (criar clicando num horário vazio da grade, #1064). */
  horarioInicial?: string
  horarioFimInicial?: string
  onClose: () => void
  onSalvo: () => void
}) {
  const [titulo, setTitulo] = useState(edicao?.titulo ?? '')
  const [data, setData] = useState(edicao?.data ?? dataInicial ?? dataLocalIso())
  const [horario, setHorario] = useState(edicao?.horario ?? horarioInicial ?? '')
  const [horarioFim, setHorarioFim] = useState(edicao?.horarioFim ?? horarioFimInicial ?? '')
  const [orcamento, setOrcamento] = useState<{ id: string; identificador: string } | null>(
    edicao?.orcamento ? { id: edicao.orcamento.id, identificador: edicao.orcamento.identificador } : vinculoInicial?.orcamento ?? null)
  const [insumo, setInsumo] = useState<{ id: string; nome: string } | null>(
    edicao?.insumo && !edicao.insumo.removido ? { id: edicao.insumo.id, nome: edicao.insumo.nome } : vinculoInicial?.insumo ?? null)
  const [recorrencia, setRecorrencia] = useState<RecorrenciaCompromisso>('NENHUMA')
  const [dias, setDias] = useState<DiaSemanaApi[]>([])
  const [indefinida, setIndefinida] = useState(true)
  const [quantidade, setQuantidade] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const serieInteira = edicao != null && escopo === 'SERIE'
  const alternarDia = (d: DiaSemanaApi) => setDias(atual => atual.includes(d) ? atual.filter(x => x !== d) : [...atual, d])

  const salvar = async () => {
    const e: Record<string, string> = {}
    if (!titulo.trim()) e.titulo = 'Informe o título'
    if (!data && !serieInteira) e.data = 'Informe a data'
    if (horarioFim && !horario) e.horarioFim = 'Informe o horário de início para definir o término'
    else if (horarioFim && horarioFim <= horario) e.horarioFim = 'O término deve ser depois do início'
    if (!edicao && recorrencia === 'SEMANAL' && dias.length === 0) e.diasSemana = 'Escolha pelo menos um dia da semana'
    const n = Number(quantidade)
    if (!edicao && recorrencia !== 'NENHUMA' && !indefinida && (!Number.isInteger(n) || n < 2 || n > 365)) e.quantidade = 'A quantidade de ocorrências vai de 2 a 365'
    setErros(e); setErroGeral(null)
    if (Object.keys(e).length > 0) return
    setSalvando(true)
    try {
      if (edicao) {
        await agendaService.editarCompromisso(edicao.id, edicao.dataOriginal, {
          escopo, titulo: titulo.trim(), data: serieInteira ? undefined : data, horario: horario || null,
          horarioFim: horario && horarioFim ? horarioFim : null, orcamentoId: orcamento?.id ?? null, insumoId: insumo?.id ?? null,
        })
      } else {
        await agendaService.criarCompromisso({
          titulo: titulo.trim(), data, horario: horario || null, horarioFim: horario && horarioFim ? horarioFim : null, orcamentoId: orcamento?.id ?? null, insumoId: insumo?.id ?? null,
          recorrencia, diasSemana: recorrencia === 'SEMANAL' ? dias : undefined,
          quantidadeOcorrencias: recorrencia !== 'NENHUMA' && !indefinida ? n : undefined,
        })
      }
      onSalvo()
    } catch (err) {
      const fe = (err as { response?: { data?: { fieldErrors?: Record<string, string> } } })?.response?.data?.fieldErrors
      if (fe && Object.keys(fe).length > 0) setErros({ titulo: fe.titulo, data: fe.data, horarioFim: fe.horarioFim, diasSemana: fe.diasSemana, quantidade: fe.quantidadeOcorrencias, insumo: fe.insumoId } as Record<string, string>)
      setErroGeral(extractApiError(err, 'Não foi possível salvar o evento.'))
    } finally {
      setSalvando(false)
    }
  }

  const inputBase = 'h-[46px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[15px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus'
  return (
    <ModalShell open onClose={onClose} width={560} icon={<CalendarPlus size={15} />}
      title={edicao ? (serieInteira ? 'Editar a série inteira' : 'Editar compromisso') : 'Novo evento'}
      subtitle={serieInteira ? 'Vale para as ocorrências ainda pendentes; a data só muda por ocorrência.' : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Fechar</Button><Button disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</Button></>}>
      <div className="flex flex-col gap-4" data-testid="modal-evento">
        <Field label="Título" required erro={erros.titulo}>
          <input value={titulo} maxLength={120} onChange={e => setTitulo(e.target.value)} aria-label="Título" placeholder="Ex.: Comprar linha de bordar"
            className={clsx(inputBase, erros.titulo ? 'border-danger' : 'border-line')} />
        </Field>
        <div className="grid grid-cols-3 gap-3 max-[480px]:grid-cols-1">
          {!serieInteira && (
            <Field label="Data" required erro={erros.data}>
              <input type="date" value={data} onChange={e => setData(e.target.value)} aria-label="Data" className={clsx(inputBase, erros.data ? 'border-danger' : 'border-line')} />
            </Field>
          )}
          <Field label="Horário" opt>
            <input type="time" value={horario} onChange={e => setHorario(e.target.value)} aria-label="Horário" className={clsx(inputBase, 'border-line')} />
          </Field>
          <Field label="Término" opt erro={erros.horarioFim}>
            <input type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)} aria-label="Término"
              className={clsx(inputBase, erros.horarioFim ? 'border-danger' : 'border-line')} />
          </Field>
        </div>
        <Field label="Orçamento" opt>
          {orcamento ? (
            <Escolhido rotulo={orcamento.identificador} onRemover={() => setOrcamento(null)} />
          ) : (
            <ComboBusca<{ id: string; identificador: string; nomeCliente: string }>
              ariaLabel="Buscar orçamento" placeholder="Buscar orçamento por cliente ou número" vazio="Nenhum orçamento encontrado" size="sm"
              buscar={async termo => (await orcamentoService.listar(0, 8, undefined, termo || undefined)).content}
              getKey={o => o.id} renderItem={o => <span>{o.identificador} — {o.nomeCliente}</span>}
              onSelect={o => setOrcamento({ id: o.id, identificador: o.identificador })} />
          )}
        </Field>
        <Field label="Insumo (para registrar um &quot;comprar até&quot;)" opt erro={erros.insumo}>
          {insumo ? (
            <Escolhido rotulo={insumo.nome} onRemover={() => setInsumo(null)} />
          ) : (
            <ComboBusca<{ id: string; nome: string; marca?: string }>
              ariaLabel="Buscar insumo" placeholder="Buscar insumo" vazio="Nenhum insumo encontrado" size="sm"
              buscar={async termo => (await insumoService.listar(0, 8, termo || undefined, true)).content}
              getKey={i => i.id} renderItem={i => <span>{i.nome}{i.marca ? ` — ${i.marca}` : ''}</span>}
              onSelect={i => setInsumo({ id: i.id, nome: i.nome })} />
          )}
        </Field>
        {!edicao && (
          <Field label="Repetição" group>
            <SegmentedControl options={OPCOES_RECORRENCIA} value={recorrencia} onChange={setRecorrencia} height="h-10" textSize="text-sm"
              activeColors={['bg-teal text-white', 'bg-teal text-white', 'bg-teal text-white']} />
            {recorrencia === 'SEMANAL' && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Dias da semana">
                {DIAS.map(d => (
                  <button key={d.valor} type="button" aria-pressed={dias.includes(d.valor)} onClick={() => alternarDia(d.valor)}
                    className={clsx('h-9 min-w-12 rounded-full border-[1.5px] px-3 text-[13px] font-semibold',
                      dias.includes(d.valor) ? 'border-teal bg-teal text-white' : 'border-line bg-white text-body hover:bg-cream')}>
                    {d.rotulo}
                  </button>
                ))}
              </div>
            )}
            {erros.diasSemana && <p className="mt-2 text-[13px] text-danger">{erros.diasSemana}</p>}
            {recorrencia !== 'NENHUMA' && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SegmentedControl options={[{ value: true, label: 'Sem fim' }, { value: false, label: 'Termina após' }]} value={indefinida} onChange={setIndefinida}
                  height="h-10" display="inline-flex" optionWidth="whitespace-nowrap px-4" textSize="text-sm"
                  activeColors={['bg-teal text-white', 'bg-teal text-white']} />
                {!indefinida && (
                  <label className="flex items-center gap-2 text-sm text-body">
                    <input value={quantidade} inputMode="numeric" aria-label="Quantidade de ocorrências" onChange={e => setQuantidade(e.target.value.replace(/\D/g, ''))}
                      className={clsx(inputBase, 'w-24 text-center', erros.quantidade ? 'border-danger' : 'border-line')} />
                    ocorrências
                  </label>
                )}
              </div>
            )}
            {erros.quantidade && <p className="mt-2 text-[13px] text-danger">{erros.quantidade}</p>}
          </Field>
        )}
        {erroGeral && <p className="rounded-card border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-danger-deep" role="alert">{erroGeral}</p>}
      </div>
    </ModalShell>
  )
}

function Escolhido({ rotulo, onRemover }: { rotulo: string; onRemover: () => void }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-input border-[1.5px] border-teal/40 bg-teal/6 px-3.5 text-sm font-semibold text-teal-deep">
      <span className="truncate">{rotulo}</span>
      <button type="button" onClick={onRemover} aria-label={`Remover ${rotulo}`} className="ml-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-teal hover:bg-teal/15"><X size={14} /></button>
    </div>
  )
}
