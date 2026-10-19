import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Button, Field, Input, ModalShell, TextArea } from '../../ui'
import { clienteService } from '../../../services/clienteService'
import { extrairErroExplicado } from '../../../utils/apiError'
import { MENSAGEM_TELEFONE_INVALIDO, telefoneValido } from '../../../utils/telefone'
import { ControleModoTelefone, useModoTelefone } from '../../ui/TelefoneEstrangeiro'
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

  // V0.17.0 #964 (RN-NOVA-19): telefone fora dos dois formatos bloqueia antes de enviar
  const modoWhatsapp = useModoTelefone(whatsapp, setWhatsapp)
  const modoTelefone = useModoTelefone(telefone, setTelefone)

  const salvar = async () => {
    if (!telefoneValido(whatsapp) || !telefoneValido(telefone)) {
      setErro(`${MENSAGEM_TELEFONE_INVALIDO}: confira o WhatsApp e o Telefone.`)
      return
    }
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
        <Input id="fornecedor-nota-nome" label="Nome" value={nome} onChange={setNome} required />
        <Input id="fornecedor-nota-cnpj" label="CNPJ" value={proposta.cnpj ?? ''} onChange={() => undefined} disabled />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input id="fornecedor-nota-email" label="E-mail" type="email" value={email} onChange={setEmail} />
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input id="fornecedor-nota-whatsapp" label="WhatsApp" type="tel" value={whatsapp} onChange={modoWhatsapp.digitar} error={!telefoneValido(whatsapp) ? MENSAGEM_TELEFONE_INVALIDO : undefined} />
            </div>
            <ControleModoTelefone estrangeiro={modoWhatsapp.estrangeiro} onAlternar={modoWhatsapp.alternar} />
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input id="fornecedor-nota-telefone" label="Telefone" type="tel" value={telefone} onChange={modoTelefone.digitar} error={!telefoneValido(telefone) ? MENSAGEM_TELEFONE_INVALIDO : undefined} />
            </div>
            <ControleModoTelefone estrangeiro={modoTelefone.estrangeiro} onAlternar={modoTelefone.alternar} />
          </div>
          <Input id="fornecedor-nota-site" label="Site" value={site} onChange={setSite} />
        </div>
        <Input id="fornecedor-nota-endereco" label="Endereço" value={endereco} onChange={setEndereco} />
        <Field label="Observações" opt><TextArea value={observacoes} onChange={setObservacoes} /></Field>
        {erro && <p className="m-0 text-[13px] text-danger-deep" role="alert">{erro}</p>}
      </div>
    </ModalShell>
  )
}
