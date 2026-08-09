import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import SectionTitle from '../../components/shared/SectionTitle'
import { ChevronRight, Files, Save } from 'lucide-react'
import { catalogoService } from '../../services/catalogoService'
import type { CatalogoRequest } from '../../types/catalogo'

const inputClass = (hasError?: boolean) =>
  `h-12 w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-[border-color,box-shadow] duration-150 ${
    hasError ? 'border-warning-alt shadow-[0_0_0_4px_rgba(224,92,58,0.10)]' : 'border-line focus:border-teal focus:ring-4 focus:ring-teal/[0.12]'
  }`

export default function NovoCatalogoPage() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    setError('')
    setFieldErrors({})

    const request: CatalogoRequest = {
      nome: nome.trim(),
    }

    setLoading(true)
    try {
      const catalogo = await catalogoService.cadastrar(request)
      navigate(`/catalogos/${catalogo.id}`)
    } catch (err: any) {
      const data = err.response?.data
      const msg: string | undefined = data?.message
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (msg && /nome/i.test(msg)) {
        fe.nome = msg
        setFieldErrors(fe)
      } else {
        setFieldErrors(fe)
        setError(msg || 'Erro ao salvar catálogo. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout active="catalogos" compact>

      {/* HEADER + breadcrumb */}
      <div className="mb-[22px]">
        <div className="mb-2 flex items-center gap-[7px] text-[12.5px] text-muted">
          <span
            className="cursor-pointer font-medium transition-colors duration-150 hover:text-teal"
            onClick={() => navigate('/catalogos')}
          >
            Catálogos
          </span>
          <ChevronRight size={15} className="text-dim" />
          <span className="font-semibold text-body">Novo Catálogo</span>
        </div>
        <div className="flex items-center gap-[15px]">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[13px] bg-teal/10 text-teal">
            <Files size={22} />
          </span>
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-dark">
            Novo Catálogo
          </h1>
        </div>
      </div>

      {/* CARD FORM */}
      <div className="max-w-[640px] animate-fade-up rounded-card border border-[#F0EEE9] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">

        <div className="px-[26px] py-6">
          <SectionTitle title="Dados do catálogo" subtitle="Nome deste catálogo de produtos." />
          <div className="grid grid-cols-1 gap-3.5">
            <Field label="Nome do catálogo *">
              <input
                placeholder="Catálogo Casamentos 2026"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className={inputClass(!!fieldErrors.nome)}
              />
              {fieldErrors.nome && <span className="mt-1.5 block text-[12.5px] text-danger-deep">{fieldErrors.nome}</span>}
            </Field>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="flex flex-col gap-3 border-t border-line px-[26px] py-[18px]">
          {error && (
            <p className="m-0 rounded-lg border border-[#FECACA] bg-danger-bg-soft px-3.5 py-2.5 text-[13.5px] text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate('/catalogos')} disabled={loading}>Cancelar</Button>
            <Button variant="primary" icon={<Save size={16} />} disabled={loading} onClick={handleSubmit}>
              {loading ? 'Salvando…' : 'Salvar catálogo'}
            </Button>
          </div>
        </div>
      </div>

    </AppLayout>
  )
}
