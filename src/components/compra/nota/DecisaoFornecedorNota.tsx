import { Button } from '../../ui'
import { Check, UserPlus } from 'lucide-react'
import type { FornecedorProposta } from '../../../types/compraNota'

/**
 * #713 (V0.16.0, RN-NOVA-23, antes RN-NOVA-10) — o emitente da nota vira fornecedor só quando a artesã
 * clica no botão; o sistema nunca cria nem altera cadastro sozinho. Sem cadastro: "Cadastrar como fornecedor"
 * abre a modal de cadastro. Só cliente: "Adicionar como fornecedor" pede a confirmação. Quem não clica segue
 * sem fornecedor. Os textos são rascunho até a validação do Gestor.
 */
export default function DecisaoFornecedorNota({ proposta, cadastradoAgora, papelAdicionado, onCadastrar, onAdicionarPapel }: {
  proposta: FornecedorProposta
  /** Nome do fornecedor cadastrado pela modal nesta conferência. */
  cadastradoAgora: string | null
  /** A artesã confirmou adicionar o papel Fornecedor ao cadastro existente. */
  papelAdicionado: boolean
  onCadastrar: () => void
  onAdicionarPapel: () => void
}) {
  const nome = proposta.nome ?? 'o emitente'

  if (proposta.situacao === 'FORNECEDOR_CADASTRADO' || cadastradoAgora) {
    return (
      <p className="m-0 text-[13.5px] text-body" data-testid="fornecedor-nota-cadastrado">
        Fornecedor: <strong>{cadastradoAgora ?? nome}</strong>
      </p>
    )
  }

  const soCliente = proposta.situacao === 'SO_CLIENTE'
  if (soCliente && papelAdicionado) {
    return (
      <p className="m-0 inline-flex items-center gap-1.5 text-[13.5px] text-body" data-testid="fornecedor-nota-papel">
        <Check size={14} className="text-teal" /> <strong>{nome}</strong> será adicionado como fornecedor ao gerar o rascunho.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="fornecedor-nota-decisao">
      <p className="m-0 min-w-[240px] flex-1 text-[13.5px] text-body">
        {soCliente
          ? <><strong>{nome}</strong> já é seu cliente, mas ainda não é um fornecedor.</>
          : <><strong>{nome}</strong> ainda não é um fornecedor cadastrado.</>}
      </p>
      <Button variant="secondary" size="sm" icon={<UserPlus size={15} />} onClick={soCliente ? onAdicionarPapel : onCadastrar}>
        {soCliente ? 'Adicionar como fornecedor' : 'Cadastrar como fornecedor'}
      </Button>
    </div>
  )
}
