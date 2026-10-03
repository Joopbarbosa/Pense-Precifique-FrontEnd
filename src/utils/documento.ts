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

/**
 * #602 (RN-NOVA-32, CEN-NOVO-46) — aviso ao SAIR do campo, antes de salvar. Exceção documentada à regra
 * "o front não decide": espelha `DocumentoFiscal` do backend (DV do CPF e do CNPJ alfanumérico, valor de
 * cada caractere = ASCII − 48) e os textos de `ClienteService`, só para avisar mais cedo. Ao salvar, quem
 * vale é o backend.
 */
const normalizarDocumento = (v: string) => v.replace(/[.\-/\s]/g, '').toUpperCase()

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || new Set(cpf).size === 1) return false
  const dv = (tam: number) => {
    let soma = 0
    for (let i = 0; i < tam; i++) soma += Number(cpf[i]) * (tam + 1 - i)
    return (soma * 10) % 11 % 10
  }
  return Number(cpf[9]) === dv(9) && Number(cpf[10]) === dv(10)
}

function cnpjValido(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || new Set(cnpj).size === 1) return false
  const dv = (base: string, pesos: number[]) => {
    const soma = pesos.reduce((s, p, i) => s + (base.charCodeAt(i) - 48) * p, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const dv1 = dv(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const dv2 = dv(cnpj.slice(0, 12) + dv1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return Number(cnpj[12]) === dv1 && Number(cnpj[13]) === dv2
}

export function erroDocumento(valor: string, tipo: TipoPessoa): { titulo: string; mensagem: string; motivo: string; comoResolver: string } | null {
  const doc = normalizarDocumento(valor)
  if (!doc) return null
  if (tipo === 'FISICA' && !cpfValido(doc)) return {
    titulo: 'CPF inválido', mensagem: 'CPF inválido',
    motivo: 'Os dois últimos dígitos do CPF são calculados a partir dos outros; o número digitado não fecha essa conta.',
    comoResolver: 'Confira o CPF no documento (11 dígitos, ex.: 529.982.247-25) ou deixe o campo vazio.',
  }
  if (tipo === 'JURIDICA' && !cnpjValido(doc)) return {
    titulo: 'CNPJ inválido', mensagem: 'CNPJ inválido',
    motivo: 'Os dois últimos dígitos do CNPJ são calculados a partir dos outros; o número digitado não fecha essa conta.',
    comoResolver: 'Confira o CNPJ no cartão da empresa (14 caracteres, podendo ter letras, ex.: 12.ABC.345/01DE-35) ou deixe o campo vazio.',
  }
  return null
}
