import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Button, Field, Input, ModalShell, TextArea } from '../../ui'
import { clienteService } from '../../../services/clienteService'
import { extrairErroExplicado } from '../../../utils/apiError'
import type { ClienteResponse } from '../../../types/cliente'
import type { FornecedorProposta } from '../../../types/compraNota'

/**
 * #713 (V0.16.0, RN-NOVA-23) — cadastro do emitente da nota como fornecedor, na própria conciliação. Nome e CNPJ
 * vêm da nota (CNPJ não editável); os demais campos são opcionais. Salva na hora; o rascunho gerado depois usa
 * esse fornecedor. Textos são rascunho até a validação do Gestor.
 */
export default function ModalCadastrarFornecedorNota({ proposta, onClose, onCriado }: {
  proposta: FornecedorProposta
  onClose: () => void
  onCriado: (fornecedor: ClienteResponse) => void
}) {
  const [nome, setNome] = useState(proposta.nome ?? '')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [site, setSite] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      onCriado(await clienteService.cadastrar({
        nome: nome.trim(), ehCliente: false, ehFornecedor: true, tipoPessoa: 'JURIDICA', documento: proposta.cnpj ?? undefined,
        email: email.trim() || undefined, whatsapp: whatsapp.trim() || undefined, telefone: telefone.trim() || undefined,
        endereco: endereco.trim() || undefined, site: site.trim() || undefined, observacoes: observacoes.trim() || undefined,
      }))
    } catch (err) {
      setErro(extrairErroExplicado(err, 'Não foi possível cadastrar o fornecedor.').mensagem)
      setSalvando(false)
    }
  }

  return (
    <ModalShell open onClose={onClose} width={560} title="Cadastrar fornecedor"
      subtitle="Nome e CNPJ vieram da nota; os demais dados são opcionais."
      icon={<Truck size={17} />}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? 'Salvando…' : 'Cadastrar fornecedor'}</Button>
      </>}>
      <div className="flex flex-col gap-3.5" data-testid="modal-cadastrar-fornecedor-nota">
        <Input label="Nome" value={nome} onChange={setNome} required />
        <Input label="CNPJ" value={proposta.cnpj ?? ''} onChange={() => undefined} disabled />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input label="E-mail" type="email" value={email} onChange={setEmail} />
          <Input label="WhatsApp" type="tel" value={whatsapp} onChange={setWhatsapp} />
          <Input label="Telefone" type="tel" value={telefone} onChange={setTelefone} />
          <Input label="Site" value={site} onChange={setSite} />
        </div>
        <Input label="Endereço" value={endereco} onChange={setEndereco} />
        <Field label="Observações" opt><TextArea value={observacoes} onChange={setObservacoes} /></Field>
        {erro && <p className="m-0 text-[13px] text-danger-deep" role="alert">{erro}</p>}
      </div>
    </ModalShell>
  )
}
