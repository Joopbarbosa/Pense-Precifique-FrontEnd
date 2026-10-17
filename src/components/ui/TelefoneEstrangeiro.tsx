import { useState } from 'react'
import { formatarTelefone } from '../../utils/telefone'

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

/** Botão "Número estrangeiro" / "Número nacional", ao lado do campo de telefone. */
export function BotaoNumeroEstrangeiro({ estrangeiro, onAlternar }: { estrangeiro: boolean; onAlternar: () => void }) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      className="shrink-0 whitespace-nowrap rounded-btn px-2 py-1 text-[12.5px] font-semibold text-teal hover:underline"
    >
      {estrangeiro ? 'Número nacional' : 'Número estrangeiro'}
    </button>
  )
}
