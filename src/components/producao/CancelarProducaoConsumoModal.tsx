import { useState, useEffect } from 'react'
import clsx from 'clsx'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { Ban, StickyNote, AlertCircle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { extractApiError } from '../../utils/apiError'
import ConsumoRealSection, { chaveConsumo } from './ConsumoRealSection'
import type { ProducaoDetalhe, ConsumoRealItem } from '../../types/producao'

interface Props {
  producaoId: string
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

const MIN_CHARS = 30

export default function CancelarProducaoConsumoModal({ producaoId, onClose, onSuccess }: Props) {
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [valores, setValores] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    producaoService.buscarPorId(producaoId)
      .then(setProducao)
      .catch(() => setErroCarregar(true))
      .finally(() => setCarregando(false))
  }, [producaoId])

  const len = justificativa.length
  const valido = len >= MIN_CHARS

  const handleConfirmar = async () => {
    if (!producao || !valido) return
    setSalvando(true)
    setErro(null)
    try {
      const consumoReal: ConsumoRealItem[] = producao.insumosConsumidos
        .filter(item => {
          const chave = chaveConsumo(item)
          const valor = valores[chave] ?? item.quantidade
          return valor !== item.quantidade
        })
        .map(item => {
          const chave = chaveConsumo(item)
          const valor = valores[chave] ?? item.quantidade
          return item.produtoBaseId
            ? { produtoBaseId: item.produtoBaseId, quantidadeConsumida: valor }
            : { insumoId: item.insumoId!, quantidadeConsumida: valor }
        })
      await producaoService.cancelar(producaoId, {
        justificativa,
        consumoReal: producao.insumosConsumidos.length > 0 ? consumoReal : undefined,
      })
      onSuccess('Produção cancelada')
    } catch (err: any) {
      setErro(extractApiError(err, 'Erro ao cancelar produção.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Cancelar produção"
      icon={<Ban size={18} />}
      iconBg="#FCF0EC"
      iconColor="#C0492B"
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="danger" disabled={!valido || salvando || carregando || erroCarregar} onClick={handleConfirmar}>
            {salvando ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </>
      }
    >
      {carregando ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : erroCarregar || !producao ? (
        <div className="py-6 text-center text-sm text-danger">Não foi possível carregar a produção.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[13.5px] leading-[1.55] text-body">Esta ação não pode ser desfeita.</p>

          {producao.insumosConsumidos.length > 0 && (
            <div>
              <p className="m-0 mb-3 text-[13.5px] leading-[1.55] text-body">
                Declare quanto foi realmente consumido. O que não foi consumido será devolvido ao estoque.
              </p>
              <ConsumoRealSection
                insumosConsumidos={producao.insumosConsumidos}
                valores={valores}
                onChange={(chave, valor) => setValores(v => ({ ...v, [chave]: valor }))}
              />
            </div>
          )}

          <label className="block">
            <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
              <span className="flex items-center gap-[7px]"><StickyNote size={15} /> Justificativa <span className="text-orange">*</span></span>
              <span className={clsx('font-normal', valido ? 'text-[#3E9D5A]' : 'text-muted')}>
                {len}/{MIN_CHARS} mín.
              </span>
            </span>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={4}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </label>

          {erro && (
            <div className="flex items-center gap-[5px] text-[13px] text-danger">
              <AlertCircle size={13} /> {erro}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  )
}
