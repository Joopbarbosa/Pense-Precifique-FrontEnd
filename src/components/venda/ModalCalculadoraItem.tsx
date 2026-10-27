import { useState, useEffect } from 'react'
import { Calculator, ExternalLink } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import CalculadoraPreco, { LinhaCalculadora } from '../shared/CalculadoraPreco'
import type { DadosCalculadoraItem } from './types'
import { BRL } from './formato'

// RN-NOVA-22 (REVISÃO)/RN-NOVA-23/RN-NOVA-1/RN-NOVA-2 (V0.8.4/#399, DECISOES_V0.8.4.md) —
// calculadora de preço ao adicionar produto avulso, customização ou item de catálogo ao
// orçamento. Reaproveita o componente CalculadoraPreco já usado por Produto/Catálogo
// (RN-NOVA-23: "os dois endpoints já existentes, sem mudança de contrato de Backend").
//
// Diferença desta tela para Produto/Catálogo: a comparação de cor aqui é EXATA (sem
// tolerância de arredondamento) — RN-NOVA-22 (REVISÃO). Produto/Catálogo mantêm suas
// próprias tolerâncias (0.005/0.001), não alteradas por esta tarefa.
export default function ModalCalculadoraItem({ carregar, onClose, onConfirm, confirmLabel = 'Adicionar ao orçamento' }: {
  /** Busca os dados (Backend) e monta o breakdown — lança erro em qualquer falha,
   *  inclusive composição inconsistente (RN-NOVA-3), pra cair no estado de BLOQUEIO
   *  único (RN-NOVA-2: sem fallback pro preço cadastrado). */
  carregar: () => Promise<DadosCalculadoraItem>
  onClose: () => void
  /** `precoFinal` é o total da quantidade informada (#1104); o chamador divide por `quantidade` para o preço unitário. */
  onConfirm: (precoFinal: number, quantidade: number) => void
  confirmLabel?: string
}) {
  const [estado, setEstado] = useState<'carregando' | 'erro' | 'ok'>('carregando')
  const [dados, setDados] = useState<DadosCalculadoraItem | null>(null)
  const [precoFinal, setPrecoFinal] = useState('')
  const [quantidade, setQuantidade] = useState('1')

  useEffect(() => {
    let cancelado = false
    setEstado('carregando')
    carregar()
      .then(d => {
        if (cancelado) return
        setDados(d)
        setPrecoFinal(d.precoInicial.toFixed(2).replace('.', ','))
        setEstado('ok')
      })
      .catch(() => { if (!cancelado) setEstado('erro') })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const numLocal = (v: string) => parseFloat(v.replace(',', '.')) || 0
  const pf = numLocal(precoFinal)
  // #1104 — Quantidade é o primeiro campo; custo, mão de obra, margem e sugerido acompanham. Quantidade vazia
  // ou inválida conta como 1 nos cálculos, e o botão só confirma com número inteiro ≥ 1.
  const qtdNum = Math.floor(numLocal(quantidade))
  const qtdValida = qtdNum >= 1
  const qtd = qtdValida ? qtdNum : 1
  const sugeridoTotal = dados ? Math.round(dados.sugerido * qtd * 100) / 100 : 0
  const mudarQuantidade = (v: string) => {
    const limpo = v.replace(/\D/g, '').slice(0, 5)
    const nova = Math.max(1, parseInt(limpo || '1', 10))
    // mantém o preço por unidade que a usuária já definiu: o total acompanha a nova quantidade
    setPrecoFinal(((pf / qtd) * nova).toFixed(2).replace('.', ','))
    setQuantidade(limpo)
  }
  // RN-NOVA-22 (REVISÃO) — comparação exata sobre o valor exibido (2 casas), sem
  // tolerância — diferente do overrideAtivo de Produto/Catálogo (0.005/0.001).
  const diff = dados ? Math.round((pf - sugeridoTotal) * 100) / 100 : 0
  const overrideAtivo = diff !== 0

  return (
    <ModalShell
      open
      onClose={onClose}
      title={dados?.titulo ?? 'Calculadora de preço'}
      subtitle="Calculadora de preço"
      icon={<Calculator size={20} />}
      footer={estado === 'ok' ? (
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!qtdValida} onClick={() => onConfirm(pf, qtd)}>{confirmLabel}</Button>
        </>
      ) : undefined}
    >
      {estado === 'carregando' && (
        <div className="py-8 text-center text-sm text-muted">Carregando dados de preço…</div>
      )}
      {/* RN-NOVA-2 (V0.8.4) — falha ao carregar bloqueia a adição; sem fallback pro
          preço cadastrado sem calculadora (decisão explícita, evita reintroduzir RN-054
          silenciosamente). Cobre também RN-NOVA-3 (composição de item de catálogo com
          customização anexada inativa/excluída — o `carregar()` do item de catálogo
          lança erro nesse caso). */}
      {estado === 'erro' && (
        <div className="py-4 text-center">
          <div className="text-sm font-semibold text-danger">Não foi possível carregar os dados de preço deste item.</div>
          <div className="mt-1 text-[13px] text-muted">Tente novamente em instantes.</div>
        </div>
      )}
      {estado === 'ok' && dados && (
        <>
        {dados.linkProduto && (
          <a
            href={dados.linkProduto}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="calculadora-ver-produto"
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            <ExternalLink size={14} /> Ver produto
          </a>
        )}
        <label className="mb-3 block">
          <span className="mb-1 block text-[13px] font-semibold">Quantidade</span>
          <input
            type="text"
            inputMode="numeric"
            data-testid="calculadora-quantidade"
            aria-label="Quantidade"
            value={quantidade}
            onChange={e => mudarQuantidade(e.target.value)}
            className="h-10 w-28 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <CalculadoraPreco
          titulo={dados.titulo}
          sugerido={sugeridoTotal}
          precoFinal={precoFinal}
          onPrecoFinalChange={setPrecoFinal}
          overrideAtivo={overrideAtivo}
          diffOverride={overrideAtivo ? diff : null}
        >
          {dados.breakdown.map(({ unitario, ...linha }, i) => (
            <LinhaCalculadora key={i} {...linha} value={unitario !== undefined ? BRL(unitario * qtd) : linha.value} />
          ))}
        </CalculadoraPreco>
        {/* #1154 — o preço unitário (preço final ÷ quantidade) fica sempre à vista, inclusive com Quantidade 1. */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-sm" data-testid="calculadora-preco-unitario">
          <span className="font-semibold">Preço unitário</span>
          <span className="font-bold">{BRL(pf / qtd)}</span>
        </div>
        </>
      )}
    </ModalShell>
  )
}
