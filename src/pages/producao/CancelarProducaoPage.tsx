import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Spinner } from '../../components/ui'
import { Ban, StickyNote } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import ConsumoRealSection, { chaveConsumo } from '../../components/producao/ConsumoRealSection'
import type { ProducaoDetalhe, ConsumoRealItem } from '../../types/producao'

const MIN_CHARS = 30

export default function CancelarProducaoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [valores, setValores] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    producaoService.buscarPorId(id)
      .then(setProducao)
      .catch(() => setErroCarregar(true))
      .finally(() => setCarregando(false))
  }, [id])

  useEffect(() => {
    if (!carregando && producao && producao.estado !== 'EM_ANDAMENTO' && producao.estado !== 'TRAVADA') {
      navigate(`/producao/${producao.id}`, { replace: true })
    }
  }, [carregando, producao, navigate])

  const len = justificativa.length
  const valido = len >= MIN_CHARS

  const handleConfirmar = async () => {
    if (!id || !producao || !valido) return
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
      await producaoService.cancelar(id, {
        justificativa,
        consumoReal: producao.insumosConsumidos.length > 0 ? consumoReal : undefined,
      })
      navigate('/producao')
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao cancelar produção.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <AppLayout active="producao">
        <div className="flex justify-center py-24"><Spinner /></div>
      </AppLayout>
    )
  }

  if (erroCarregar || !producao) {
    return (
      <AppLayout active="producao">
        <div className="px-5 py-10 text-center text-danger">Produção não encontrada</div>
      </AppLayout>
    )
  }

  if (producao.estado !== 'EM_ANDAMENTO' && producao.estado !== 'TRAVADA') {
    return (
      <AppLayout active="producao">
        <div className="flex justify-center py-24"><Spinner /></div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="producao">
      <div className="mb-[22px]">
        <div className="mb-[5px] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal">
          Produção / {producao.identificador} / Cancelar
        </div>
        <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Cancelar produção {producao.identificador}</h1>
      </div>

      <div className="mx-auto flex max-w-[720px] flex-col gap-[18px]">
        {producao.insumosConsumidos.length > 0 && (
          <div className="rounded-card border border-[#F0EEE9] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <p className="m-0 mb-4 text-[13.5px] leading-[1.55] text-body">
              Declare quanto foi realmente consumido. O que não foi consumido será devolvido ao estoque.
            </p>
            <ConsumoRealSection
              insumosConsumidos={producao.insumosConsumidos}
              valores={valores}
              onChange={(chave, valor) => setValores(v => ({ ...v, [chave]: valor }))}
            />
          </div>
        )}

        <div className="rounded-card border border-[#F0EEE9] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
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
        </div>

        {erro && <div className="text-[13px] text-danger">{erro}</div>}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(`/producao/${producao.id}`)}>Voltar</Button>
          <Button variant="danger" icon={<Ban size={16} />} disabled={!valido || salvando} onClick={handleConfirmar}>
            {salvando ? 'Cancelando...' : 'Cancelar produção'}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
