import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { Search, X, Factory, Check, AlertCircle, AlertTriangle, ArrowLeft, Calendar, StickyNote, Plus } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import { producaoService } from '../../services/producaoService'
import { getBadgeEstado } from '../../utils/badges'
import { extractApiError } from '../../utils/apiError'
import type { ProducaoResumo, AlertaInsumo } from '../../types/producao'
import type { CriarProducaoVinculadaRequest } from '../../types/orcamento'

// P-F004/#320 (RN-ORC-VINC-02/RN-PROD-VINC-02/03) — compartilhado entre CriarOrcamentoPage (ponto
// 1, orçamento pode ainda não existir — `onSimular`/`onConfirmar` resolvem isso do lado de fora) e
// DetalheOrcamentoPage (ponto 2, orçamento já existe). Só lista produções `AGUARDANDO_INICIO`
// (única elegível para vínculo novo, RN-PROD-VINC-02) e sempre mostra o alerta combinado antes de
// confirmar (RN-PROD-VINC-03) — nunca vincula direto ao clicar na produção.
//
// P-F005 (RN-ORC-VINC-02 ponto 1/2) — `onCriarNova` embute o mini-formulário de "criar produção
// nova já vinculada" (POST /orcamentos/{id}/criar-producao-vinculada) direto nesta modal, em vez de
// navegar para /producao/nova (caminho antigo, sem vínculo formal). Sem endpoint de simulação para
// este caminho (diferente de "vincular existente") — confirmar já é o único passo.
interface ModalVincularProducaoProps {
  onClose: () => void
  jaVinculadasIds: string[]
  onSimular: (producaoId: string) => Promise<AlertaInsumo[]>
  onConfirmar: (producaoId: string) => Promise<void>
  confirmando: boolean
  onCriarNova?: (dados: CriarProducaoVinculadaRequest) => Promise<void>
}

export default function ModalVincularProducao({
  onClose,
  jaVinculadasIds,
  onSimular,
  onConfirmar,
  confirmando,
  onCriarNova,
}: ModalVincularProducaoProps) {
  const [busca, setBusca] = useState('')
  const [producoes, setProducoes] = useState<ProducaoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [selecionada, setSelecionada] = useState<ProducaoResumo | null>(null)
  const [simulando, setSimulando] = useState(false)
  const [alertas, setAlertas] = useState<AlertaInsumo[] | null>(null)
  const [erroSimulacao, setErroSimulacao] = useState<string | null>(null)

  const [modoCriarNova, setModoCriarNova] = useState(false)
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataTermino, setFormDataTermino] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formErro, setFormErro] = useState<string | null>(null)
  const [criandoNova, setCriandoNova] = useState(false)

  useEffect(() => {
    if (selecionada) return
    let cancelled = false
    setLoading(true)
    setErro(null)
    const timer = setTimeout(async () => {
      try {
        const data = await producaoService.listar({ busca: busca || undefined, estado: 'AGUARDANDO_INICIO', size: 20, sort: 'numero,desc' })
        if (!cancelled) setProducoes(data.content)
      } catch {
        if (!cancelled) setErro('Não deu pra carregar as produções. Tente de novo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, busca ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [busca, selecionada])

  const handleSelecionar = async (p: ProducaoResumo) => {
    setSelecionada(p)
    setSimulando(true)
    setErroSimulacao(null)
    setAlertas(null)
    try {
      const result = await onSimular(p.id)
      setAlertas(result)
    } catch (err) {
      setErroSimulacao(extractApiError(err, 'Não foi possível calcular o impacto desse vínculo. Tente de novo.'))
    } finally {
      setSimulando(false)
    }
  }

  const handleVoltar = () => {
    setSelecionada(null)
    setAlertas(null)
    setErroSimulacao(null)
  }

  // P-F005 — desabilita o botão assim que clicado (guarda local, independente do estado do
  // chamador) e só reabilita depois que a Promise resolve ou rejeita — nunca permite 2 chamadas
  // simultâneas do mesmo clique.
  const handleCriarNova = async () => {
    if (!onCriarNova || criandoNova) return
    if (!formDataTermino) {
      setFormErro('Informe o prazo de término previsto.')
      return
    }
    setCriandoNova(true)
    setFormErro(null)
    try {
      await onCriarNova({
        dataInicio: formDataInicio || undefined,
        dataTerminoPrevista: formDataTermino,
        observacoes: formObservacoes || undefined,
      })
    } catch (err) {
      setFormErro(extractApiError(err, 'Não foi possível criar a produção. Tente novamente.'))
    } finally {
      setCriandoNova(false)
    }
  }

  if (modoCriarNova) {
    return (
      <ModalShell
        open
        onClose={onClose}
        title="Criar produção nova"
        subtitle="Fica vinculada a este orçamento automaticamente"
        icon={<Factory size={18} />}
        iconBg="#EAF1FB"
        iconColor="#2A6FB0"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModoCriarNova(false)} disabled={criandoNova}>
              <ArrowLeft size={14} /> Voltar
            </Button>
            <Button variant="primary" onClick={handleCriarNova} disabled={criandoNova}>
              {criandoNova ? 'Criando...' : 'Criar produção'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[13.5px] text-muted">
            Os produtos deste orçamento entram automaticamente nessa produção — nasce em
            "Aguardando início".
          </p>

          <div className="flex flex-wrap gap-3">
            <label className="block flex-1 basis-[160px]">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <Calendar size={15} className="text-teal" /> Início
              </span>
              <input
                type="date"
                value={formDataInicio}
                onChange={(e) => setFormDataInicio(e.target.value)}
                disabled={criandoNova}
                className="h-[44px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
              />
            </label>
            <label className="block flex-1 basis-[160px]">
              <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                <Calendar size={15} className="text-teal" /> Término previsto <span className="text-orange">*</span>
              </span>
              <input
                type="date"
                value={formDataTermino}
                min={formDataInicio || undefined}
                onChange={(e) => setFormDataTermino(e.target.value)}
                disabled={criandoNova}
                className={clsx(
                  'h-[44px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]',
                  formErro && !formDataTermino ? 'border-danger' : 'border-line'
                )}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <StickyNote size={15} className="text-teal" /> Observações <span className="text-[11.5px] font-medium text-muted">(opcional)</span>
            </span>
            <textarea
              value={formObservacoes}
              onChange={(e) => setFormObservacoes(e.target.value)}
              disabled={criandoNova}
              rows={3}
              placeholder="Ex: separar embalagem especial para este pedido"
              className="w-full resize-y rounded-input border-[1.5px] border-line bg-white px-3.5 py-2.5 font-[inherit] text-sm leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
            />
          </label>

          {formErro && (
            <div className="flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{formErro}</span>
            </div>
          )}
        </div>
      </ModalShell>
    )
  }

  if (selecionada) {
    const relevantes = (alertas ?? []).filter(a => a.situacao !== 'SUFICIENTE')

    return (
      <ModalShell
        open
        onClose={onClose}
        title="Confirmar vínculo"
        subtitle={`Produção ${selecionada.identificador}`}
        icon={<Factory size={18} />}
        iconBg="#EAF1FB"
        iconColor="#2A6FB0"
        footer={
          <>
            <Button variant="ghost" onClick={handleVoltar} disabled={confirmando}>
              <ArrowLeft size={14} /> Voltar
            </Button>
            <Button variant="primary" onClick={() => onConfirmar(selecionada.id)} disabled={confirmando || simulando || !!erroSimulacao}>
              {confirmando ? 'Vinculando...' : 'Confirmar vínculo'}
            </Button>
          </>
        }
      >
        {simulando && (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted">
            <Spinner size={16} color="#2A9D8F" trackColor="rgba(42,157,143,0.18)" />
            Calculando o que essa produção vai precisar...
          </div>
        )}

        {!simulando && erroSimulacao && (
          <div className="flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{erroSimulacao}</span>
          </div>
        )}

        {!simulando && !erroSimulacao && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13.5px] text-muted">
              Os produtos deste orçamento serão somados aos produtos já lançados nessa produção.
            </p>
            {relevantes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {relevantes.map((a, i) => {
                  const bloqueio = a.situacao === 'BLOQUEIO_FUTURO'
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-start gap-2.5 rounded-input border px-3.5 py-3 text-[13.5px]',
                        bloqueio ? 'border-danger/40 bg-danger-bg text-danger' : 'border-orange/30 bg-orange/[0.08] text-warning-alt'
                      )}
                    >
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{a.nomeInsumo}:</strong> necessário {a.quantidadeNecessaria}, disponível {a.estoqueAtual}
                        {bloqueio && ' (vai bloquear o início dessa produção)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-input border border-teal/30 bg-teal/[0.06] px-3.5 py-3 text-[13.5px] text-teal">
                <Check size={16} className="mt-0.5 flex-shrink-0" />
                <span>Estoque de insumo suficiente para essa soma, sem alertas.</span>
              </div>
            )}
          </div>
        )}
      </ModalShell>
    )
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Vincular produção"
      subtitle="Escolha uma produção aguardando início"
      icon={<Factory size={18} />}
      iconBg="#EAF1FB"
      iconColor="#2A6FB0"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {onCriarNova && (
        <button
          onClick={() => setModoCriarNova(true)}
          className="mb-3.5 flex h-11 w-full items-center justify-center gap-[7px] rounded-input border-[1.5px] border-dashed border-teal/50 bg-teal/[0.05] font-[inherit] text-[13.5px] font-semibold text-teal transition-colors duration-150 hover:bg-teal/10"
        >
          <Plus size={15} /> Criar produção nova
        </button>
      )}

      <div className="relative mb-3.5">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por produto ou número da produção..."
          className="w-full rounded-input border-[1.5px] border-line bg-white py-2.5 pl-9 pr-3.5 font-[inherit] text-[13.5px] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-body"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted">
          <Spinner size={16} color="#2A9D8F" trackColor="rgba(42,157,143,0.18)" />
          Carregando produções...
        </div>
      )}

      {!loading && erro && (
        <div className="flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {!loading && !erro && producoes.length === 0 && (
        <EmptyState
          compact
          icon={<Factory size={26} />}
          title="Nenhuma produção aguardando início"
          description={
            busca
              ? 'Tente buscar por outro nome de produto ou número.'
              : onCriarNova
                ? 'Use o botão acima para criar uma produção nova já vinculada a este orçamento.'
                : 'Não há nenhuma produção aguardando início para vincular agora.'
          }
        />
      )}

      {!loading && !erro && producoes.length > 0 && (
        <div className="-mx-1 flex max-h-[320px] flex-col gap-1.5 overflow-y-auto px-1 py-0.5">
          {producoes.map((p) => {
            const jaVinculada = jaVinculadasIds.includes(p.id)
            const badge = getBadgeEstado(p.estado, p.historicoStatus)
            return (
              <button
                key={p.id}
                onClick={() => handleSelecionar(p)}
                disabled={jaVinculada}
                className={clsx(
                  'flex items-center justify-between gap-3 rounded-input border px-3.5 py-3 text-left transition-colors duration-150',
                  jaVinculada
                    ? 'cursor-default border-line bg-app/60'
                    : 'border-line bg-white hover:border-teal/40 hover:bg-teal/[0.04] disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-dark">{p.identificador}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-muted">
                    {p.produtos.map((prod) => `${prod.nomeProduto} (${prod.quantidade})`).join(', ')}
                  </div>
                </div>
                {jaVinculada ? (
                  <span className="flex flex-shrink-0 items-center gap-1 text-[12px] font-semibold text-teal">
                    <Check size={14} /> Vinculada
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-[12px] font-semibold text-teal">Vincular</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </ModalShell>
  )
}
