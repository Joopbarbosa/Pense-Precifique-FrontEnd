import { useState, useEffect } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { CheckCircle2 } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import type { ProducaoDetalhe } from '../../types/producao'

interface Props {
  producaoId: string
  producao?: ProducaoDetalhe
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

export default function FinalizarProducaoModal({ producaoId, producao: producaoProp, onClose, onSuccess }: Props) {
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(producaoProp ?? null)
  const [carregando, setCarregando] = useState(!producaoProp)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [perdas, setPerdas] = useState<Record<string, number>>({})

  useEffect(() => {
    if (producaoProp) return
    producaoService.buscarPorId(producaoId)
      .then(setProducao)
      .catch(() => setErro('Não foi possível carregar a produção.'))
      .finally(() => setCarregando(false))
  }, [producaoId, producaoProp])

  const handlePerdaChange = (produtoId: string, valor: string) => {
    const raw = parseInt(valor, 10)
    setPerdas(prev => ({ ...prev, [produtoId]: isNaN(raw) ? 0 : Math.max(raw, 0) }))
  }

  const produtosComExcesso = (producao?.produtos ?? []).filter(p => (perdas[p.produtoId] ?? 0) > p.quantidade)

  const handleConfirmar = async () => {
    if (!producao || produtosComExcesso.length > 0) return
    setSalvando(true)
    setErro(null)
    try {
      const perdasParaEnviar = producao.produtos
        .filter(p => (perdas[p.produtoId] ?? 0) > 0)
        .map(p => ({ produtoId: p.produtoId, quantidadePerdida: perdas[p.produtoId] }))
      await producaoService.finalizar(producaoId, perdasParaEnviar.length > 0 ? { perdas: perdasParaEnviar } : undefined)
      onSuccess('Produção finalizada — estoque atualizado.')
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao finalizar produção.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Finalizar produção"
      icon={<CheckCircle2 size={18} />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={carregando || salvando || !producao || produtosComExcesso.length > 0} onClick={handleConfirmar}>
            {salvando ? 'Finalizando...' : 'Confirmar finalização'}
          </Button>
        </>
      }
    >
      {carregando || !producao ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          <p className="mb-3 mt-0 text-[13.5px] text-body">
            Estes produtos serão adicionados ao estoque. Se houve perda, informe a quantidade por produto:
          </p>
          <div className="flex flex-col gap-2.5">
            {producao.produtos.map((p) => {
              const perda = perdas[p.produtoId] ?? 0
              const excedeu = perda > p.quantidade
              return (
                <div key={p.produtoId} className="rounded-[10px] border border-line bg-[#FCFBF9] px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-dark">{p.nomeProduto}</div>
                      <div className="text-[12.5px] text-muted">Planejado: ×{p.quantidade}</div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <label htmlFor={`perda-${p.produtoId}`} className="text-[12.5px] text-muted">Perda</label>
                      <input
                        id={`perda-${p.produtoId}`}
                        type="number"
                        min={0}
                        max={p.quantidade}
                        step={1}
                        value={perda}
                        onChange={e => handlePerdaChange(p.produtoId, e.target.value)}
                        className="h-10 w-[76px] rounded-input border-[1.5px] border-line bg-white px-2 text-center font-[inherit] text-[14px] font-semibold text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
                      />
                    </div>
                  </div>
                  {excedeu && (
                    <div className="mt-2 text-[12.5px] text-danger">
                      Perda não pode ser maior que a quantidade planejada ({p.quantidade}).
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      {erro && <div className="mt-2 text-[13px] text-danger">{erro}</div>}
    </ModalShell>
  )
}
