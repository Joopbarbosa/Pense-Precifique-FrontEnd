import { useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Ungroup, AlertCircle, Clock, Play } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { extractApiError } from '../../utils/apiError'
import type { ProducaoDetalhe, DesagruparProducaoResponse } from '../../types/producao'

// RN-NOVA-5 (V0.10.0, #450) — inverso de AgruparProducoesModal. DT-NOVA-2: operação atômica de 1
// chamada (POST /producoes/{id}/desagrupar) — a fila "uma pergunta por vez" (estadoDestino por
// produto) é resolvida aqui, no frontend, ANTES de qualquer chamada à API — mesma mecânica de
// estado de ModalConfirmacaoVinculoSequencial (fila local, uma pergunta por vez), mas sem chamar a
// API a cada passo (o componente em si não é reaproveitado — "Mecânica ≠ componente", CLAUDE.md
// seção 5 — o conteúdo por passo é uma escolha de estado, não um Sim/Não de vínculo).
//
// Sem 2ª pergunta de "confirmar estoque negativo": DT-NOVA-2 aceita o fallback automático do
// backend (produto nasce TRAVADA se houver bloqueio/aviso não confirmado) em vez de replicar a
// UI interativa completa de confirmação — escopo consciente, ver decisoes-producao.md.

interface Props {
  producao: ProducaoDetalhe
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

const OPCOES_ESTADO: { value: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO'; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'AGUARDANDO_INICIO', label: 'Aguardando início', hint: 'Fica parada até você iniciar manualmente depois.', icon: <Clock size={16} /> },
  { value: 'EM_ANDAMENTO', label: 'Em andamento', hint: 'Já baixa os insumos agora — se algum insumo estiver bloqueante, a produção nasce travada em vez de falhar.', icon: <Play size={16} /> },
]

export default function DesagruparProducaoModal({ producao, onClose, onSuccess }: Props) {
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<{ produtoId: string; estadoDestino: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO' }[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const produtos = producao.produtos
  const produtoAtual = produtos[indice]
  if (!produtoAtual) return null

  const enviar = async (todasRespostas: { produtoId: string; estadoDestino: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO' }[]) => {
    setEnviando(true)
    setErro(null)
    try {
      const resultado: DesagruparProducaoResponse = await producaoService.desagrupar(producao.id, { itens: todasRespostas })
      const identificadores = resultado.producoesNovas.map(p => p.identificador).join(', ')
      onSuccess(`Produção desagrupada em ${resultado.producoesNovas.length} nova(s): ${identificadores}.`)
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao desagrupar produção.'))
      setEnviando(false)
    }
  }

  const responder = (estadoDestino: 'AGUARDANDO_INICIO' | 'EM_ANDAMENTO') => {
    const proximasRespostas = [...respostas, { produtoId: produtoAtual.produtoId, estadoDestino }]
    if (indice + 1 >= produtos.length) {
      void enviar(proximasRespostas)
      return
    }
    setRespostas(proximasRespostas)
    setIndice(i => i + 1)
  }

  const progresso = produtos.length > 1 ? `Produto ${indice + 1} de ${produtos.length}` : undefined

  return (
    <ModalShell
      open
      onClose={enviando ? () => {} : onClose}
      title="Desagrupar produção"
      subtitle={progresso}
      icon={<Ungroup size={17} />}
      iconBg="rgba(42,157,143,0.10)"
      iconColor="#2A9D8F"
      footer={
        <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.6] text-body">
        Esta produção agrupada vira <strong>{produtos.length} produções novas</strong>, uma por
        produto — a produção agrupada original passa a não realizada. Qual status{' '}
        <strong>{produtoAtual.nomeProduto}</strong> (×{produtoAtual.quantidade}) deve assumir?
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {OPCOES_ESTADO.map(op => (
          <button
            key={op.value}
            type="button"
            disabled={enviando}
            onClick={() => responder(op.value)}
            className="flex items-start gap-3 rounded-[11px] border-[1.5px] border-line bg-white px-3.5 py-3 text-left transition-colors duration-150 hover:border-teal hover:bg-teal/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
              {op.icon}
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-dark">{op.label}</span>
              <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-muted">{op.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {enviando && (
        <div className="mt-3 text-[13px] text-muted">Desagrupando…</div>
      )}
      {erro && (
        <div className="mt-3 flex items-center gap-[5px] text-[13px] text-danger">
          <AlertCircle size={13} /> {erro}
        </div>
      )}
    </ModalShell>
  )
}
