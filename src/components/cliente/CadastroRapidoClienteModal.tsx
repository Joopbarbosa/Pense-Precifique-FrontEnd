import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Field, ModalShell, TextArea } from '../ui'
import { clienteService } from '../../services/clienteService'
import type { ClienteRequest, ClienteResponse } from '../../types/cliente'
import { extrairErroExplicado } from '../../utils/apiError'

const vazio: ClienteRequest = { nome: '', ehCliente: true, ehFornecedor: false, tipoPessoa: 'FISICA' }

export default function CadastroRapidoClienteModal({ onCriado, triggerClassName }: { onCriado: (cliente: ClienteResponse) => void; triggerClassName?: string }) {
  const [aberta, setAberta] = useState(false)
  const [form, setForm] = useState<ClienteRequest>(vazio)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const temDados = Object.entries(form).some(([k, v]) => k === 'ehCliente' ? false : typeof v === 'string' && !!v.trim())
  const fechar = () => {
    if (temDados && !window.confirm('Descartar o cadastro?')) return
    setAberta(false); setForm(vazio); setErro('')
  }
  const salvar = async () => {
    setSalvando(true); setErro('')
    try {
      const criado = await clienteService.cadastrar({ ...form, nome: form.nome.trim(), ehCliente: true, ehFornecedor: false })
      onCriado(criado); setAberta(false); setForm(vazio)
    } catch (e: unknown) {
      setErro(extrairErroExplicado(e, 'Não foi possível salvar o cadastro.').mensagem)
    } finally { setSalvando(false) }
  }
  const campo = (label: string, key: keyof ClienteRequest, maxLength = 255) => (
    <Field label={label} opt size="md"><input maxLength={maxLength} value={String(form[key] ?? '')}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      className="h-11 w-full rounded-input border border-line bg-white px-3 text-sm text-dark" /></Field>
  )
  return <>
    <button type="button" aria-label="Cadastrar cliente" title="Cadastrar cliente" onClick={() => setAberta(true)}
      className={triggerClassName ?? 'ml-2 inline-grid h-10 w-10 place-items-center rounded-input border border-line bg-white text-teal hover:bg-teal/5'}>+</button>
    <ModalShell open={aberta} onClose={fechar} title="Novo cliente" subtitle="Cadastro rápido" icon={<UserPlus size={18} />} width={650}
      footer={<><Button variant="ghost" onClick={fechar}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar cliente'}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campo('Nome', 'nome')}
        <Field label="Tipo de pessoa" opt size="md"><select value={form.tipoPessoa} onChange={e => setForm(f => ({ ...f, tipoPessoa: e.target.value as ClienteRequest['tipoPessoa'] }))} className="h-11 w-full rounded-input border border-line bg-white px-3 text-sm"><option value="FISICA">Física</option><option value="JURIDICA">Jurídica</option><option value="ESTRANGEIRO">Estrangeiro</option></select></Field>
        {campo('Documento', 'documento', 30)}{campo('WhatsApp', 'whatsapp', 25)}{campo('Telefone', 'telefone', 25)}{campo('E-mail', 'email')}{campo('Site', 'site')}
        <div className="sm:col-span-2">{campo('Endereço', 'endereco', 1000)}</div>
        <div className="sm:col-span-2"><Field label="Observações" opt size="md"><TextArea value={form.observacoes ?? ''} onChange={v => setForm(f => ({ ...f, observacoes: v }))} maxLength={500} rows={3} /></Field></div>
      </div>
      {erro && <p role="alert" className="mb-0 mt-3 text-sm text-danger-deep">{erro}</p>}
    </ModalShell>
  </>
}
