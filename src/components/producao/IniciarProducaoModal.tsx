import { useState, useEffect } from 'react'
import clsx from 'clsx'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { Play, AlertTriangle, Lock } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { isDivisaoResponse, isConfirmacaoEstoqueNegativoResponse } from '../../types/producao'
import type { ProducaoDetalhe, DivisaoResponse, ConfirmacaoEstoqueNegativoResponse, AvisoEstoqueNegativo } from '../../types/producao'
import ModalDivisao from './ModalDivisao'
import ConfirmarEstoqueNegativoModal from './ConfirmarEstoqueNegativoModal'

interface Props {
  producaoId: string
  producao?: ProducaoDetalhe
  onClose: () => void
  onSuccess: (mensagem: string) => void
}

export default function IniciarProducaoModal({ producaoId, producao: producaoProp, onClose, onSuccess }: Props) {
  const [producao, setProducao] = useState<ProducaoDetalhe | null>(producaoProp ?? null)
  const [carregando, setCarregando] = useState(!producaoProp)
  const [etapa, setEtapa] = useState<'confirmar' | 'travada' | 'divisao'>('confirmar')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [justificativaTrava, setJustificativaTrava] = useState<string | null>(null)
  const [divisao, setDivisao] = useState<DivisaoResponse | null>(null)
  const [avisoPendente, setAvisoPendente] = useState<AvisoEstoqueNegativo[] | null>(null)
  const [avisoAcao, setAvisoAcao] = useState<'iniciar' | 'dividir' | null>(null)
  const [confirmandoAviso, setConfirmandoAviso] = useState(false)

  useEffect(() => {
    if (producaoProp) return
    producaoService.buscarPorId(producaoId)
      .then(setProducao)
      .catch(() => setErro('Não foi possível carregar a produção.'))
      .finally(() => setCarregando(false))
  }, [producaoId, producaoProp])

  const tratarResultadoIniciar = (result: ProducaoDetalhe | DivisaoResponse | ConfirmacaoEstoqueNegativoResponse) => {
    if (isConfirmacaoEstoqueNegativoResponse(result)) {
      setAvisoPendente(result.avisos)
      setAvisoAcao('iniciar')
    } else if (isDivisaoResponse(result)) {
      setDivisao(result)
      setEtapa('divisao')
    } else if (result.estado === 'TRAVADA') {
      const travas = result.historicoStatus.filter(h => h.statusNovo === 'TRAVADA')
      setJustificativaTrava(travas[travas.length - 1]?.justificativa ?? null)
      setEtapa('travada')
    } else {
      onSuccess('Produção iniciada.')
    }
  }

  const handleIniciar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const result = await producaoService.iniciar(producaoId)
      tratarResultadoIniciar(result)
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao iniciar produção.')
    } finally {
      setSalvando(false)
    }
  }

  const tratarResultadoDividir = (result: ProducaoDetalhe | DivisaoResponse | ConfirmacaoEstoqueNegativoResponse) => {
    if (isConfirmacaoEstoqueNegativoResponse(result)) {
      setAvisoPendente(result.avisos)
      setAvisoAcao('dividir')
    } else if (isDivisaoResponse(result)) {
      setDivisao(result)
      setEtapa('divisao')
    } else if (result.estado === 'EM_ANDAMENTO') {
      onSuccess('Produção retomada.')
    }
  }

  const handleDividir = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const result = await producaoService.retomar(producaoId, { dividir: true })
      tratarResultadoDividir(result)
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Não foi possível dividir a produção.')
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarAviso = async () => {
    if (!avisoPendente || !avisoAcao) return
    setConfirmandoAviso(true)
    setErro(null)
    try {
      const confirmarEstoqueNegativoInsumoIds = avisoPendente.map(a => a.componenteId)
      if (avisoAcao === 'iniciar') {
        const result = await producaoService.iniciar(producaoId, { confirmarEstoqueNegativoInsumoIds })
        setAvisoPendente(null)
        setAvisoAcao(null)
        tratarResultadoIniciar(result)
      } else {
        const result = await producaoService.retomar(producaoId, { dividir: true, confirmarEstoqueNegativoInsumoIds })
        setAvisoPendente(null)
        setAvisoAcao(null)
        tratarResultadoDividir(result)
      }
    } catch (err: any) {
      setErro(err.response?.data?.message || 'Erro ao confirmar produção.')
    } finally {
      setConfirmandoAviso(false)
    }
  }

  if (avisoPendente) {
    return (
      <ConfirmarEstoqueNegativoModal
        avisos={avisoPendente}
        confirming={confirmandoAviso}
        onClose={() => { setAvisoPendente(null); setAvisoAcao(null) }}
        onConfirm={handleConfirmarAviso}
      />
    )
  }

  if (etapa === 'divisao' && divisao) {
    return (
      <ModalDivisao
        producaoOriginal={divisao.producaoOriginal}
        producaoA={divisao.producaoA}
        producaoB={divisao.producaoB}
        onClose={() => onSuccess('Produção dividida.')}
      />
    )
  }

  if (etapa === 'travada') {
    return (
      <ModalShell
        open
        onClose={() => onSuccess('Produção travada automaticamente — insumos insuficientes.')}
        title="Produção travada automaticamente"
        icon={<Lock size={18} />}
        iconBg="#FCF0EC"
        iconColor="#C0492B"
        footer={
          <>
            <Button variant="ghost" onClick={() => onSuccess('Produção travada automaticamente — insumos insuficientes.')}>
              Fechar
            </Button>
            <Button variant="primary" disabled={salvando} onClick={handleDividir}>
              {salvando ? 'Dividindo...' : 'Dividir produção'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 rounded-input border border-danger/40 bg-danger-bg px-3.5 py-3 text-[13.5px] text-danger">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{justificativaTrava || 'Insumo(s) bloqueante(s) impediram o início da produção.'}</span>
          </div>
          {erro && <div className="text-[13px] text-danger">{erro}</div>}
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Iniciar produção"
      icon={<Play size={18} />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={carregando || salvando || !producao} onClick={handleIniciar}>
            {salvando ? 'Iniciando...' : 'Confirmar início'}
          </Button>
        </>
      }
    >
      {carregando || !producao ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {producao.produtos.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-[10px] border border-line bg-[#FCFBF9] px-3.5 py-3">
              <span className="text-sm font-medium text-dark">{p.nomeProduto}</span>
              <span className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">×{p.quantidade}</span>
            </div>
          ))}

          {producao.alertasInsumos.filter(a => a.situacao !== 'SUFICIENTE').length > 0 && (
            <div className="mt-1 flex flex-col gap-2">
              {producao.alertasInsumos.filter(a => a.situacao !== 'SUFICIENTE').map((a, i) => {
                const bloqueio = a.situacao === 'BLOQUEIO_FUTURO'
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex items-start gap-2.5 rounded-input border px-3.5 py-3 text-[13.5px]',
                      bloqueio ? 'border-danger/40 bg-danger-bg text-danger' : 'border-orange/30 bg-orange/[0.08] text-[#A35A26]'
                    )}
                  >
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{a.nomeInsumo}:</strong> necessário {a.quantidadeNecessaria}, disponível {a.estoqueAtual}
                      {bloqueio && ' (bloqueará ao iniciar)'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {erro && <div className="text-[13px] text-danger">{erro}</div>}
        </div>
      )}
    </ModalShell>
  )
}
