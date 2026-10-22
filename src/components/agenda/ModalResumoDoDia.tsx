import { useEffect, useState, type ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Spinner from '../ui/Spinner'
import { agendaService } from '../../services/agendaService'
import type { Compromisso, InsumoFaltante, ResumoDoDia } from '../../types/agenda'
import { formatarData } from '../../utils/data'
import { moeda } from '../compra/formato'
import ChipCompromisso from './ChipCompromisso'

const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

function Secao({ titulo, testid, resumo, children }: { titulo: string; testid: string; resumo?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testid}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-bold text-dark">{titulo}</h3>
        {resumo && <span className="text-xs font-semibold text-body">{resumo}</span>}
      </div>
      {children}
    </section>
  )
}

const Vazio = ({ texto }: { texto: string }) => <p className="m-0 text-sm text-subtle">{texto}</p>

function Lista({ itens, vazio, onAbrir }: { itens: Compromisso[]; vazio: string; onAbrir: (c: Compromisso) => void }) {
  if (itens.length === 0) return <Vazio texto={vazio} />
  return <div className="flex flex-col gap-1.5">{itens.map(c => <ChipCompromisso key={c.chave} compromisso={c} onAbrir={onAbrir} />)}</div>
}

function LinhaInsumo({ i }: { i: InsumoFaltante }) {
  const un = i.siglaUnidade ? ` ${i.siglaUnidade}` : ''
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-input border border-line bg-white px-3 py-2 text-sm">
      <span className="font-semibold text-dark">{i.nome}</span>
      <span className="text-body">faltam <strong className="text-danger-deep">{numero(i.falta)}{un}</strong> (precisa de {numero(i.necessario)}{un}, tem {numero(i.emEstoque)}{un})</span>
    </li>
  )
}

/**
 * V0.18.0 (#1071, RN-NOVA-27) — o Resumo do dia: o que é de hoje e o que está atrasado, por assunto (a receber, a pagar, entregas,
 * produção, insumos que faltam). Calculado no servidor, sem IA; cada compromisso abre o seu detalhe.
 */
export default function ModalResumoDoDia({ onClose, onAbrir }: { onClose: () => void; onAbrir: (c: Compromisso) => void }) {
  const [resumo, setResumo] = useState<ResumoDoDia | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    agendaService.resumoDoDia().then(r => { if (ativo) setResumo(r) }).catch(() => { if (ativo) setErro('Não foi possível carregar o resumo do dia.') })
    return () => { ativo = false }
  }, [])

  const subtitulo = resumo
    ? `${formatarData(resumo.data)} · ${resumo.paraHoje} para hoje · ${resumo.atrasados} ${resumo.atrasados === 1 ? 'atrasado' : 'atrasados'}`
    : 'Hoje e o que está atrasado'

  return (
    <ModalShell open onClose={onClose} title="Resumo do dia" subtitle={subtitulo} width={680} icon={<ClipboardList size={15} />}>
      {erro ? <p className="py-6 text-center text-sm text-danger">{erro}</p>
        : !resumo ? <div className="flex justify-center py-8"><Spinner color="#2A9D8F" trackColor="rgba(42,157,143,0.2)" size={22} /></div>
        : (
          <div className="flex flex-col gap-5" data-testid="resumo-do-dia">
            <Secao titulo="A receber" testid="resumo-a-receber"
              resumo={resumo.aReceber.itens.length > 0 && <>Total {moeda(resumo.aReceber.total)}{(resumo.aReceber.totalAtrasado ?? 0) > 0 && <> · {moeda(resumo.aReceber.totalAtrasado)} atrasado</>}</>}>
              <Lista itens={resumo.aReceber.itens} vazio="Nada a receber hoje nem atrasado." onAbrir={onAbrir} />
            </Secao>
            <Secao titulo="A pagar" testid="resumo-a-pagar">
              {resumo.aPagar.disponivel
                ? <Lista itens={resumo.aPagar.itens} vazio="Nada a pagar hoje nem atrasado." onAbrir={onAbrir} />
                : <Vazio texto="Disponível quando o módulo Financeiro chegar." />}
            </Secao>
            <Secao titulo="Entregas e recebimentos" testid="resumo-entregas">
              <Lista itens={resumo.entregas} vazio="Nenhuma entrega hoje nem atrasada." onAbrir={onAbrir} />
            </Secao>
            <Secao titulo="Produção" testid="resumo-producoes">
              <Lista itens={resumo.producoes} vazio="Nenhuma produção para hoje nem atrasada." onAbrir={onAbrir} />
            </Secao>
            <Secao titulo="Insumos que faltam para as produções" testid="resumo-insumos">
              {resumo.insumosFaltantes.length === 0
                ? <Vazio texto="O estoque cobre as produções de hoje e as atrasadas." />
                : <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{resumo.insumosFaltantes.map(i => <LinhaInsumo key={i.nome} i={i} />)}</ul>}
            </Secao>
            <Secao titulo="Outros compromissos" testid="resumo-outros">
              <Lista itens={resumo.outros} vazio="Nenhum outro compromisso para hoje nem atrasado." onAbrir={onAbrir} />
            </Secao>
          </div>
        )}
    </ModalShell>
  )
}
