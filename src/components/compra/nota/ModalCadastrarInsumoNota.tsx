import { useEffect, useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { Input, ModalShell, Button } from '../../ui'
import { insumoService } from '../../../services/insumoService'
import { extrairErroExplicado } from '../../../utils/apiError'
import { moeda } from '../formato'
import type { InsumoResponse } from '../../../types/insumo'
import type { ItemConciliacao } from '../../../types/compraNota'

/**
 * #681 (V0.16.0, RN-NOVA-18, UC-NOVO-4) — cadastra o insumo em rascunho a partir do item da nota. O backend
 * propõe unidade e custo (`simular`); a artesã só ajusta o nome e salva. O insumo nasce em RASCUNHO e é
 * completado depois em Insumos. Textos são rascunho até a validação do Gestor.
 */
export default function ModalCadastrarInsumoNota({ item, onClose, onCriado }: {
  item: ItemConciliacao
  onClose: () => void
  onCriado: (insumo: InsumoResponse) => void
}) {
  const [nome, setNome] = useState(item.nome)
  const [proposta, setProposta] = useState<InsumoResponse | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const pedido = (n: string) => ({
    nome: n.trim(),
    unidadeNota: item.unidade ?? undefined,
    quantidadeNota: item.quantidade,
    valorFinalNota: item.valorFinal,
  })

  useEffect(() => {
    insumoService.criarRascunho(pedido(item.nome), true)
      .then(setProposta)
      .catch(err => setErro(extrairErroExplicado(err, 'Não foi possível calcular a proposta.').mensagem))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.posicao])

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      onCriado(await insumoService.criarRascunho(pedido(nome), false))
    } catch (err) {
      setErro(extrairErroExplicado(err, 'Não foi possível cadastrar o insumo.').mensagem)
      setSalvando(false)
    }
  }

  return (
    <ModalShell open onClose={onClose} width={500} title="Cadastrar insumo" subtitle="O insumo nasce como rascunho; complete o cadastro depois em Insumos."
      icon={<PackagePlus size={17} />}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? 'Salvando…' : 'Salvar rascunho'}</Button>
      </>}>
      <div className="flex flex-col gap-3.5 text-[13.5px] text-body" data-testid="modal-cadastrar-insumo-nota">
        <Input label="Nome do insumo" value={nome} onChange={setNome} />
        <dl className="m-0 grid grid-cols-2 gap-3 rounded-input border border-line px-3.5 py-3">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">Unidade</dt>
            <dd className="m-0 mt-0.5 font-semibold text-dark">{proposta ? (proposta.unidadeMedida ?? 'Sem unidade') : '…'}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">Custo</dt>
            <dd className="m-0 mt-0.5 font-semibold text-dark">
              {!proposta ? '…' : proposta.custoProposto ? `${moeda(proposta.custoUnitario)} (proposto, a revisar)` : 'Sem custo'}
            </dd>
          </div>
        </dl>
        {proposta && !proposta.unidadeMedida && (
          <p className="m-0 text-[12.5px] text-muted">A unidade da nota não corresponde a nenhuma unidade cadastrada; informe unidade e custo ao completar o insumo.</p>
        )}
        {erro && <p className="m-0 text-[13px] text-danger-deep" role="alert">{erro}</p>}
      </div>
    </ModalShell>
  )
}
