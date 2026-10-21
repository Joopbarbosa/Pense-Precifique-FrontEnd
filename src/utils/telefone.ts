/** Máscara de digitação: celular (11 dígitos) → (00) 00000-0000; fixo (10) → (00) 0000-0000. */
export function mascararTelefone(v: string, cortarEm11 = true): string {
  const todos = v.replace(/\D/g, '')
  const d = cortarEm11 ? todos.slice(0, 11) : todos
  // V0.17.0 #964 (RN-NOVA-19): texto sem nenhum dígito (ex.: "abc") fica no campo e bloqueia ao salvar
  if (d.length === 0) return v.trim() === '' ? '' : v
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * #995 (CEN-NOVO-86): ao voltar de Estrangeiro para Nacional os dígitos são mantidos, mesmo acima de 11,
 * e o salvamento é bloqueado com "Telefone inválido" — nenhum dígito é perdido em silêncio.
 */
export function mascararTelefoneMantendoDigitos(v: string): string {
  return mascararTelefone(v, false)
}

const MAX_CARACTERES = 25
const SEPARADORES_NUMERO = /^[0-9 ()-]+$/

/** V0.17.0 #964 (RN-NOVA-19): número estrangeiro começa com +, sem máscara nacional, até 25 caracteres. */
export function formatarEstrangeiro(v: string): string {
  const corpo = v.replace(/[^0-9 ()-]/g, '').slice(0, MAX_CARACTERES - 1)
  return corpo.length === 0 && !v.includes('+') ? '' : `+${corpo}`
}

export function formatarTelefone(v: string, estrangeiro: boolean): string {
  return estrangeiro ? formatarEstrangeiro(v) : mascararTelefone(v)
}

/**
 * Espelha a regra do servidor (ValidadorTelefone): vazio é permitido; nacional com 10 ou 11 dígitos;
 * estrangeiro com + e 8 a 15 dígitos; até 25 caracteres; texto sem dígito é inválido.
 */
export function telefoneValido(v: string | null | undefined): boolean {
  const t = (v ?? '').trim()
  if (t === '') return true
  if (t.length > MAX_CARACTERES) return false
  const contarDigitos = (s: string) => s.replace(/\D/g, '').length
  if (t.startsWith('+')) {
    const numero = t.slice(1)
    if (!SEPARADORES_NUMERO.test(numero)) return false
    const d = contarDigitos(numero)
    return d >= 8 && d <= 15
  }
  if (!SEPARADORES_NUMERO.test(t)) return false
  const d = contarDigitos(t)
  return d === 10 || d === 11
}

/** Mensagem de bloqueio padrão do campo de telefone (mesmo texto do servidor). */
export const MENSAGEM_TELEFONE_INVALIDO = 'Telefone inválido'
