import { useAuthStore } from '../store/authStore'

/**
 * V0.18.0 (#671, RN-NOVA-23, DT-NOVA-10) — preferências de tela guardadas por pessoa, no navegador. A chave inclui o id da conta
 * (`usuario.id` do `authStore`) e o nome da preferência: quem entra depois no mesmo navegador não herda a escolha de quem saiu, e
 * sair da conta não apaga a preferência. Sem conta autenticada, ou sem acesso ao armazenamento, a escolha vale só na visita: leitura
 * e escrita nunca derrubam a tela. As chaves antigas, sem o id da conta, deixam de ser lidas e não são migradas.
 */
const PREFIXO = 'pp:pref'

function chave(nome: string): string | null {
  const usuarioId = useAuthStore.getState().usuario?.id
  return usuarioId ? `${PREFIXO}:${usuarioId}:${nome}` : null
}

export function lerPreferencia(nome: string): string | null {
  const k = chave(nome)
  if (!k) return null
  try {
    const valor = window.localStorage.getItem(k)
    return valor !== null && valor.length <= 128 ? valor : null
  } catch {
    return null
  }
}

/** Valor nulo apaga a preferência (volta ao padrão). */
export function gravarPreferencia(nome: string, valor: string | null) {
  const k = chave(nome)
  if (!k) return
  try {
    if (valor === null) window.localStorage.removeItem(k)
    else window.localStorage.setItem(k, valor)
  } catch {
    /* armazenamento indisponível: a escolha vale só nesta visita */
  }
}
