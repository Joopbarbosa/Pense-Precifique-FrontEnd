import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button, ModalShell } from '../ui'
import CustomizacaoSeletor from './CustomizacaoSeletor'
import ModalCalculadoraItem from './ModalCalculadoraItem'
import { carregarCalculadoraAvulso } from './calculadoraItem'
import type { CustomizacaoLinha } from './types'

/**
 * Invólucro de modal do `CustomizacaoSeletor`, usado por Orçamento e Caixa.
 *
 * `comCalculadora` separa os dois consumidores: no Orçamento (default `true`) cada customização
 * escolhida passa por uma calculadora de preço, uma de cada vez — mesmo padrão "modal
 * sequencial" já usado em ModalConfirmacaoVinculoSequencial (ver CLAUDE.md do Frontend, seção 5),
 * porque ali o preço é objeto de negociação. No Caixa (`false`) a venda já sai com preço
 * definido, então a confirmação resolve direto pelo preço de venda cadastrado.
 */
export default function ModalCustomizacoes({
  nomeItem, customsIniciais, onClose, onConfirm, comCalculadora = true, confirmLabelCalculadora,
}: {
  nomeItem: string
  customsIniciais: CustomizacaoLinha[]
  onClose: () => void
  onConfirm: (customs: CustomizacaoLinha[]) => void
  comCalculadora?: boolean
  confirmLabelCalculadora?: string
}) {
  const [selecionadas, setSelecionadas] = useState<CustomizacaoLinha[]>(
    customsIniciais.map(c => ({ ...c, qtd: c.qtd ?? 1 }))
  )
  // `fila` guarda as que ainda faltam confirmar na calculadora; `confirmadas` acumula o preço
  // final de cada uma já confirmada.
  const [fila, setFila] = useState<CustomizacaoLinha[] | null>(null)
  const [confirmadas, setConfirmadas] = useState<CustomizacaoLinha[]>([])

  const toggle = (c: { id: string; nome: string; valor: number }) => {
    setSelecionadas(prev =>
      prev.find(x => x.id === c.id)
        ? prev.filter(x => x.id !== c.id)
        : [...prev, { ...c, qtd: 1 }]
    )
  }

  const setQtd = (id: string, qtd: number) => {
    setSelecionadas(prev =>
      prev.map(x => x.id === id ? { ...x, qtd: Math.max(1, qtd) } : x)
    )
  }

  // RN-NOVA-1 (V0.8.4) — cancelar a calculadora de uma customização da fila descarta só
  // aquela seleção (some do checklist de `selecionadas`), a fila segue com o resto. Se
  // não sobrar nenhuma, fecha a fila sem chamar onConfirm — a artesã volta pra tela de
  // seleção, livre pra ajustar ou fechar o modal inteiro.
  const descartarDaFila = () => {
    if (!fila) return
    const [atual, ...resto] = fila
    setSelecionadas(prev => prev.filter(x => x.id !== atual.id))
    setFila(resto.length > 0 ? resto : null)
  }

  const confirmarDaFila = (precoFinal: number) => {
    if (!fila) return
    const [atual, ...resto] = fila
    const novasConfirmadas = [...confirmadas, { ...atual, valor: precoFinal }]
    if (resto.length > 0) {
      setConfirmadas(novasConfirmadas)
      setFila(resto)
    } else {
      onConfirm(novasConfirmadas)
    }
  }

  const iniciarConfirmacao = () => {
    if (selecionadas.length === 0) { onConfirm([]); return }
    if (!comCalculadora) { onConfirm(selecionadas); return }
    setConfirmadas([])
    setFila([...selecionadas])
  }

  // Fila ativa: some a modal de seleção, mostra só a calculadora da customização atual
  // — mesmo espírito do padrão sequencial (uma pergunta/decisão por vez).
  if (fila && fila.length > 0) {
    const atual = fila[0]
    return (
      // key força remount a cada passo da fila — sem isso, o useEffect de carregamento
      // (mount-only) não dispara de novo pra próxima customização, ficando com dados
      // presos na anterior (mesma posição na árvore, React reaproveitaria a instância).
      <ModalCalculadoraItem
        key={atual.id}
        carregar={() => carregarCalculadoraAvulso(atual.id, atual.nome)}
        onClose={descartarDaFila}
        onConfirm={confirmarDaFila}
        confirmLabel={confirmLabelCalculadora}
      />
    )
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title={nomeItem}
      subtitle="Customizações"
      icon={<SlidersHorizontal size={20} />}
      iconBg="rgba(249,115,22,0.10)"
      iconColor="#F97316"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={iniciarConfirmacao}>
            Confirmar {selecionadas.length > 0 ? `(${selecionadas.length})` : ''}
          </Button>
        </>
      }
    >
      <CustomizacaoSeletor
        selecionadas={selecionadas}
        onToggle={toggle}
        onQtd={setQtd}
      />
    </ModalShell>
  )
}
