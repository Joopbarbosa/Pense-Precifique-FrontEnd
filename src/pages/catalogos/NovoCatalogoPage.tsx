import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import SectionTitle from '../../components/shared/SectionTitle'
import { ChevronRight, Files, Save } from 'lucide-react'
import { catalogoService } from '../../services/catalogoService'
import { empresaService } from '../../services/empresaService'
import type { CatalogoRequest } from '../../types/catalogo'

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const SECTION_STYLE: React.CSSProperties = {
  padding: '24px 26px',
}

export default function NovoCatalogoPage() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [margem, setMargem] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    empresaService.getConfiguracao()
      .then(cfg => setMargem((cfg.margemPadrao ?? 0).toString()))
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [])

  const inputBase = (active: boolean, hasError: boolean): React.CSSProperties => ({
    width: '100%', height: 48, padding: '0 14px',
    border: `1.5px solid ${hasError ? '#E05C3A' : active ? '#2A9D8F' : '#EFEDE8'}`,
    borderRadius: 10, fontSize: 14.5, color: '#3A372F',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    boxShadow: hasError ? '0 0 0 4px rgba(224,92,58,0.10)' : active ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
  })

  const handleSubmit = async () => {
    setError('')
    setFieldErrors({})

    const request: CatalogoRequest = {
      nome: nome.trim(),
      margem: num(margem),
    }

    setLoading(true)
    try {
      const catalogo = await catalogoService.cadastrar(request)
      navigate(`/catalogos/${catalogo.id}`)
    } catch (err: any) {
      const data = err.response?.data
      const msg: string | undefined = data?.message
      const fe: Record<string, string> = { ...(data?.fieldErrors ?? {}) }
      if (msg && /margem/i.test(msg)) {
        fe.margem = msg
        setFieldErrors(fe)
      } else if (msg && /nome/i.test(msg)) {
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

  if (loadingConfig) {
    return (
      <AppLayout active="catalogos">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A29E96', fontSize: 14, padding: '40px 0' }}>
          <span style={{ width: 20, height: 20, border: '2px solid #EFEDE8', borderTopColor: '#2A9D8F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
          Carregando…
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout active="catalogos">

      {/* HEADER + breadcrumb */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#A29E96', marginBottom: 8 }}>
          <span
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate('/catalogos')}
            onMouseEnter={e => e.currentTarget.style.color = '#2A9D8F'}
            onMouseLeave={e => e.currentTarget.style.color = '#A29E96'}
          >
            Catálogos
          </span>
          <ChevronRight size={15} style={{ color: '#CFCBC3' }} />
          <span style={{ color: '#5C594F', fontWeight: 600 }}>Novo Catálogo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Files size={22} />
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: '#3A372F' }}>
            Novo Catálogo
          </h1>
        </div>
      </div>

      {/* CARD FORM */}
      <div style={{ background: '#fff', border: '1px solid #F0EEE9', borderRadius: 'var(--r-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', animation: 'fadeUp .4s ease both', maxWidth: 640 }}>

        <div style={SECTION_STYLE}>
          <SectionTitle title="Dados do catálogo" subtitle="Nome e margem de lucro aplicada aos itens deste catálogo." />
          <div className="two-col">
            <Field label="Nome do catálogo *">
              <input
                placeholder="Catálogo Casamentos 2026"
                value={nome}
                onChange={e => setNome(e.target.value)}
                onFocus={() => setFocus('nome')}
                onBlur={() => setFocus(null)}
                style={inputBase(focus === 'nome', !!fieldErrors.nome)}
              />
              {fieldErrors.nome && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.nome}</span>}
            </Field>
            <Field label="Margem de lucro *">
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="50"
                  inputMode="decimal"
                  value={margem}
                  onChange={e => setMargem(e.target.value.replace(/[^\d.,]/g, ''))}
                  onFocus={() => setFocus('margem')}
                  onBlur={() => setFocus(null)}
                  style={{ ...inputBase(focus === 'margem', !!fieldErrors.margem), paddingRight: 40 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#A8A49C', pointerEvents: 'none' }}>%</span>
              </div>
              {fieldErrors.margem && <span style={{ display: 'block', fontSize: 12.5, color: '#B23A1E', marginTop: 6 }}>{fieldErrors.margem}</span>}
            </Field>
          </div>
        </div>

        {/* BOTÕES */}
        <div style={{ padding: '18px 26px', borderTop: '1px solid #EFEDE8', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <p style={{ margin: 0, fontSize: 13.5, color: '#C0392B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
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
