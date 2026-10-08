import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import ModalShell from '../../components/ui/ModalShell'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import CamposInsumo from '../../components/insumo/CamposInsumo'
import { useFormInsumo } from '../../components/insumo/useFormInsumo'
import Spinner from '../../components/ui/Spinner'
import { Box, Tag, AlertCircle, ChevronRight, Save } from 'lucide-react'
import { insumoService } from '../../services/insumoService'
import { extractApiError } from '../../utils/apiError'

function DesativarModal({ onClose }: { onClose: () => void }) {
  const fichas = [
    { nome: 'Kit Convite Casamento', tipo: 'Produto', icon: Box, size: 16 },
    { nome: 'Etiqueta personalizada', tipo: 'Produto', icon: Box, size: 16 },
    { nome: 'Laminação fosca', tipo: 'Customização', icon: Tag, size: 17 },
  ]

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Atenção — este insumo está em uso"
      icon={<AlertCircle size={15} />}
      iconBg="#FFF4E8"
      iconColor="#C8721F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={onClose}>Ver fichas</Button>
          <Button variant="danger" onClick={onClose}>Desativar mesmo assim</Button>
        </>
      }
    >
      <p className="mb-4 mt-0 text-sm leading-[1.55] text-body">
        Desativar este insumo pode afetar o custo das fichas técnicas abaixo:
      </p>
      <div className="flex flex-col gap-[9px]">
        {fichas.map((f, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[11px] border border-line bg-cream px-3.5 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
              <f.icon size={f.size} />
            </span>
            <span className="flex-1 text-sm font-semibold text-dark">{f.nome}</span>
            <span className="rounded-full bg-line-soft px-[9px] py-[3px] text-[11.5px] font-semibold text-subtle">
              {f.tipo}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

export default function FormInsumoPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editando = !!id

  const form = useFormInsumo({ editando })
  const [modal, setModal] = useState<'desativar' | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (form.erroUnidades) setError(form.erroUnidades)
  }, [form.erroUnidades])

  useEffect(() => {
    if (editando && id) {
      setLoadingData(true)
      insumoService.buscarPorId(id)
        .then(form.carregar)
        .catch(() => setError('Não foi possível carregar os dados do insumo.'))
        .finally(() => setLoadingData(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, id])

  const handleSubmit = async () => {
    if (form.pedeCompra && !form.podeSubmeter) {
      form.tocarObrigatorios()
      return
    }
    if (editando && !form.podeSubmeter) return
    setLoading(true)
    setError('')
    try {
      if (editando && id) {
        await insumoService.editar(id, form.pedidoEdicao())
        navigate(`/insumos/${id}`)
      } else {
        const novoInsumo = await insumoService.cadastrar(form.pedidoNovo())
        navigate(`/insumos/${novoInsumo.id}`)
      }
    } catch (err: any) {
      const msg = extractApiError(err, 'Erro ao salvar. Tente novamente.')
      setError(msg)
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <AppLayout active="insumos" compact>
        <div className="flex items-center gap-2.5 py-10 text-sm text-muted">
          <Spinner size={20} color="#2A9D8F" trackColor="#EFEDE8" />
          Carregando dados do insumo…
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="insumos" compact>

      {/* HEADER + breadcrumb */}
      <div className="mb-[22px]">
        <div className="mb-2 flex items-center gap-[7px] text-[12.5px] text-muted">
          <span
            className="cursor-pointer font-medium hover:text-teal"
            onClick={() => navigate('/insumos')}
          >
            Insumos
          </span>
          <ChevronRight size={15} className="text-dim" />
          <span className="font-semibold text-body">{editando ? 'Editar Insumo' : 'Novo Insumo'}</span>
        </div>
        <h1 className="m-0 text-[28px] font-bold tracking-tight text-dark">
          {editando ? 'Editar Insumo' : 'Novo Insumo'}
        </h1>
      </div>

      {/* CARD FORM */}
      <div className="animate-[fadeUp_.4s_ease_both] rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

        <CamposInsumo form={form} />

        {/* BOTÕES */}
        <div className="flex flex-col gap-3 px-[26px] py-section">
          {error && (
            <p className="m-0 rounded-lg border border-danger-line-soft bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate('/insumos')}>Cancelar</Button>
            <Button variant="primary" icon={<Save size={16} />} disabled={loading || !form.podeSubmeter} onClick={handleSubmit}>
              {loading ? 'Salvando…' : 'Salvar insumo'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmacaoModal open={form.confirmarMarca} onClose={() => form.setConfirmarMarca(false)}
        title="Não validar marca" description={`A marca ${form.marca} será apagada`}
        confirmLabel="Apagar marca e confirmar"
        onConfirm={form.confirmarApagarMarca} />
      {modal === 'desativar' && <DesativarModal onClose={() => setModal(null)} />}

    </AppLayout>
  )
}
