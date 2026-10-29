import { useEffect, useState } from 'react'
import { orcamentoService } from '../../services/orcamentoService'
import { extractApiError } from '../../utils/apiError'
import type { QuantidadeProducao, SugestaoQuantidadeProducao } from '../../types/orcamento'

// RN-NOVA-39 (V0.18.0, #1166) — produto com insumo não fracionável só produz em múltiplos do
// rendimento. A janela de criar produção pergunta, uma vez por produto, a quantidade a produzir:
// já vem preenchida com o menor múltiplo que cobre o pedido e mostra a sobra. Produto sem insumo
// não fracionável não aparece. Compartilhado entre ModalVincularProducao e o "Criar produção (N)"
// do Detalhe.
interface Props {
  orcamentoId: string
  produtoIds?: string[]
  disabled?: boolean
  onChange: (quantidades: QuantidadeProducao[], valido: boolean) => void
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })

export default function QuantidadesProducaoNaoFracionavel({ orcamentoId, produtoIds, disabled, onChange }: Props) {
  const [sugestoes, setSugestoes] = useState<SugestaoQuantidadeProducao[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)

  const chave = produtoIds ? produtoIds.join(',') : ''
  useEffect(() => {
    let cancelado = false
    orcamentoService
      .sugerirQuantidadesProducao(orcamentoId, produtoIds)
      .then((lista) => {
        if (cancelado) return
        setSugestoes(lista)
        setValores(Object.fromEntries(lista.map((s) => [s.produtoId, String(s.quantidadeSugerida)])))
      })
      .catch((err) => {
        if (!cancelado) setErro(extractApiError(err, 'Não foi possível calcular a quantidade a produzir.'))
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId, chave])

  const problema = (s: SugestaoQuantidadeProducao): string | null => {
    const v = Number(valores[s.produtoId])
    if (!valores[s.produtoId] || !Number.isFinite(v) || v <= 0) return 'Informe a quantidade a produzir.'
    const resto = v / s.rendimento
    if (Math.abs(resto - Math.round(resto)) > 1e-9 || v < s.quantidadeSugerida) {
      return `Exige quantidade em múltiplos de ${fmt(s.rendimento)} unidades (mínimo ${fmt(s.quantidadeSugerida)}).`
    }
    return null
  }

  useEffect(() => {
    onChange(
      sugestoes.map((s) => ({ produtoId: s.produtoId, quantidade: Number(valores[s.produtoId]) })),
      sugestoes.every((s) => problema(s) === null)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugestoes, valores])

  if (erro) return <p className="m-0 text-[13px] text-danger">{erro}</p>
  if (sugestoes.length === 0) return null

  return (
    <div className="flex flex-col gap-3" data-testid="quantidades-producao">
      <p className="m-0 text-[13px] text-muted">
        Estes produtos só são feitos em múltiplos da receita. Confirme quanto produzir.
      </p>
      {sugestoes.map((s) => {
        const v = Number(valores[s.produtoId])
        const sobra = Number.isFinite(v) ? v - s.quantidadePedida : 0
        const msg = problema(s)
        return (
          <label key={s.produtoId} className="block" data-testid={`quantidade-producao-${s.produtoId}`}>
            <span className="mb-[7px] block text-[13px] font-semibold text-body">
              Quantidade a produzir de {s.nomeProduto}
            </span>
            <input
              type="number"
              min={s.quantidadeSugerida}
              step={s.rendimento}
              value={valores[s.produtoId] ?? ''}
              onChange={(e) => setValores((prev) => ({ ...prev, [s.produtoId]: e.target.value }))}
              disabled={disabled}
              aria-label={`Quantidade a produzir de ${s.nomeProduto}`}
              className="h-[44px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-hidden focus:border-teal"
            />
            <span className="mt-1 block text-[12.5px] text-muted">
              Pedido de {fmt(s.quantidadePedida)} · a receita rende {fmt(s.rendimento)}
              {!msg && sobra > 0 && ` · Sobram ${fmt(sobra)} unidades no estoque de ${s.nomeProduto}`}
            </span>
            {msg && <span className="mt-1 block text-[12.5px] text-danger">{msg}</span>}
          </label>
        )
      })}
    </div>
  )
}
