import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { ModalShell, Button } from '../../ui'
import ConfirmacaoModal from '../../shared/ConfirmacaoModal'
import CamposInsumo from '../../insumo/CamposInsumo'
import { useFormInsumo } from '../../insumo/useFormInsumo'
import { insumoService } from '../../../services/insumoService'
import { extrairErroExplicado } from '../../../utils/apiError'
import { paraCampo } from '../formato'
import type { InsumoResponse } from '../../../types/insumo'
import type { ItemConciliacao } from '../../../types/compraNota'

/**
 * #714 (V0.16.0, RN-NOVA-21) — cadastra o insumo completo a partir do item da nota, na própria conciliação.
 * Mesmos campos e regras do cadastro de Insumos (`CamposInsumo`); nome, unidade (quando a sigla da nota
 * existe), custo e quantidade vêm preenchidos da nota para a artesã ajustar. O insumo nasce ATIVO.
 * Textos são rascunho até a validação do Gestor.
 */
export default function ModalCadastrarInsumoNota({ item, onClose, onCriado }: {
  item: ItemConciliacao
  onClose: () => void
  onCriado: (insumo: InsumoResponse) => void
}) {
  const form = useFormInsumo({
    editando: false,
    inicial: { nome: item.nome, precoCompra: paraCampo(item.valorFinal, 2), qtdCompra: paraCampo(item.quantidade), siglaUnidade: item.unidade },
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!form.podeSubmeter) { form.tocarObrigatorios(); return }
    setSalvando(true)
    setErro('')
    try {
      onCriado(await insumoService.cadastrar(form.pedidoNovo()))
    } catch (err) {
      setErro(extrairErroExplicado(err, 'Não foi possível cadastrar o insumo.').mensagem)
      setSalvando(false)
    }
  }

  return (
    <>
      <ModalShell open onClose={onClose} width={760} title="Cadastrar insumo"
        subtitle="Os dados da nota já vieram preenchidos; confira antes de salvar."
        icon={<PackagePlus size={17} />}
        footer={<>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={salvar} disabled={salvando || !form.podeSubmeter}>{salvando ? 'Salvando…' : 'Salvar insumo'}</Button>
        </>}>
        <div data-testid="modal-cadastrar-insumo-nota" className="flex flex-col">
          <CamposInsumo form={form} compacto />
          {(erro || form.erroUnidades) && <p className="m-0 mt-3 text-[13px] text-danger-deep" role="alert">{erro || form.erroUnidades}</p>}
        </div>
      </ModalShell>
      <ConfirmacaoModal open={form.confirmarMarca} onClose={() => form.setConfirmarMarca(false)}
        title="Não validar marca" description={`A marca ${form.marca} será apagada`}
        confirmLabel="Apagar marca e confirmar" onConfirm={form.confirmarApagarMarca} />
    </>
  )
}
