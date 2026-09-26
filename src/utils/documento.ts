import type { TipoPessoa } from '../types/cliente'

// V0.15.0 (#536, RN-NOVA-17) — só formatação de exibição/digitação. A validação (dígitos
// verificadores, CNPJ alfanumérico da IN RFB 2.229/2024, duplicidade) é do backend.

const aplicarMascara = (valor: string, mascara: string) => {
  let out = ''
  let i = 0
  for (const ch of mascara) {
    if (i >= valor.length) break
    if (ch === '0') out += valor[i++]
    else out += ch
  }
  return out
}

/** CPF: só dígitos, 000.000.000-00. */
export function mascararCpf(valor: string): string {
  return aplicarMascara(valor.replace(/\D/g, '').slice(0, 11), '000.000.000-00')
}

/** CNPJ: 12 posições A–Z/0–9 (minúscula vira maiúscula) + 2 dígitos de DV, 00.000.000/0000-00. */
export function mascararCnpj(valor: string): string {
  const bruto = valor.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const raiz = bruto.slice(0, 12)
  const dv = bruto.slice(12).replace(/\D/g, '').slice(0, 2)
  return aplicarMascara(raiz + dv, '00.000.000/0000-00')
}

/** Máscara conforme o tipo de pessoa; Estrangeiro é texto livre. */
export function mascararDocumento(valor: string, tipo: TipoPessoa): string {
  if (tipo === 'FISICA') return mascararCpf(valor)
  if (tipo === 'JURIDICA') return mascararCnpj(valor)
  return valor
}

export const ROTULO_DOCUMENTO: Record<TipoPessoa, string> = {
  FISICA: 'CPF',
  JURIDICA: 'CNPJ',
  ESTRANGEIRO: 'Documento estrangeiro',
}
