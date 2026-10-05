import { SegmentedControl } from '../../ui'
import type { AcaoFornecedor, FornecedorProposta } from '../../../types/compraNota'

/**
 * #683 (V0.16.0, RN-NOVA-10) — o emitente da nota vira fornecedor só com a confirmação da artesã; o sistema
 * nunca cria nem altera cadastro sozinho. Fornecedor já cadastrado não pede decisão. Quando o emitente só
 * é cliente, a escolha é adicionar o papel Fornecedor ou seguir sem fornecedor; sem cadastro, é cadastrar
 * como fornecedor ou seguir sem. `valor` fica nulo até a artesã escolher (a tela bloqueia o rascunho).
 * Os textos são rascunho até a validação do Gestor.
 */
export default function DecisaoFornecedorNota({ proposta, valor, onChange }: {
  proposta: FornecedorProposta
  valor: AcaoFornecedor | null
  onChange: (acao: AcaoFornecedor) => void
}) {
  const nome = proposta.nome ?? 'o emitente'

  if (proposta.situacao === 'FORNECEDOR_CADASTRADO') {
    return (
      <p className="m-0 text-[13.5px] text-body" data-testid="fornecedor-nota-cadastrado">
        Fornecedor: <strong>{nome}</strong>
      </p>
    )
  }

  const soCliente = proposta.situacao === 'SO_CLIENTE'
  const opcoes = [
    { value: (soCliente ? 'ADICIONAR_PAPEL' : 'CADASTRAR') as AcaoFornecedor, label: soCliente ? 'Adicionar como fornecedor' : 'Cadastrar como fornecedor' },
    { value: 'SEM_FORNECEDOR' as AcaoFornecedor, label: 'Seguir sem fornecedor' },
  ]

  return (
    <div className="flex flex-col gap-2" data-testid="fornecedor-nota-decisao">
      <p className="m-0 text-[13.5px] text-body">
        {soCliente
          ? <><strong>{nome}</strong> já é seu cliente. Quer adicionar o papel de fornecedor ao cadastro?</>
          : <><strong>{nome}</strong> ainda não é um fornecedor cadastrado. Quer cadastrar?</>}
      </p>
      <SegmentedControl options={opcoes} value={valor ?? ('' as AcaoFornecedor)} onChange={onChange} height="h-11" />
    </div>
  )
}
