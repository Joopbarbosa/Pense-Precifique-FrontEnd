import { useState } from 'react'
import { formatarTelefone } from '../../utils/telefone'
import SegmentedControl from './SegmentedControl'

/**
 * V0.17.0 #964 (RN-NOVA-19, DT-NOVA-15) — modo de telefone: nacional (padrão, com máscara) ou
 * estrangeiro (+ e código do país). Trocar de modo mantém os dígitos: nacional → estrangeiro põe o +
 * na frente; estrangeiro → nacional reaplica a máscara nacional. Um campo de telefone só, para as
 * quatro telas (onboarding, Perfil da empresa, cliente e fornecedor pela nota).
 */
export function useModoTelefone(valor: string, onChange: (v: string) => void) {
  // Escolha manual da pessoa; sem escolha, o modo segue o valor (+ = estrangeiro), mesmo quando o valor chega depois
  const [escolha, setEscolha] = useState<boolean | null>(null)
  const estrangeiro = escolha ?? valor.startsWith('+')
  const digitar = (v: string) => onChange(formatarTelefone(v, estrangeiro))
  const alternar = () => {
    const proximo = !estrangeiro
    const digitos = valor.replace(/\D/g, '')
    setEscolha(proximo)
    onChange(digitos === '' ? '' : proximo ? `+${digitos}` : formatarTelefone(digitos, false))
  }
  return { estrangeiro, digitar, alternar }
}

/**
 * #984 (RN-NOVA-19, alteração): controle de duas opções **Nacional | Estrangeiro** ao lado do campo de
 * telefone, uma opção ativa por vez (o `SegmentedControl` do sistema). Trocar de opção mantém os dígitos
 * (ver `useModoTelefone`).
 */
export function ControleModoTelefone({ estrangeiro, onAlternar }: { estrangeiro: boolean; onAlternar: () => void }) {
  return (
    <SegmentedControl
      options={[{ value: false, label: 'Nacional' }, { value: true, label: 'Estrangeiro' }]}
      value={estrangeiro}
      onChange={(proximo) => { if (proximo !== estrangeiro) onAlternar() }}
      height="h-8" display="inline-flex" optionWidth="whitespace-nowrap px-3" textSize="text-[12.5px]"
      className="shrink-0"
    />
  )
}
