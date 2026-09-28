export function extractApiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}

/**
 * Requisições com `responseType: 'blob'` (download binário) recebem o corpo de erro também como
 * Blob, mesmo quando a API responde JSON — o Axios não reparseia. Sem isso, `extractApiError`
 * cai sempre no fallback genérico em vez da mensagem real do backend (ex: "temporariamente
 * indisponível"). Muta `err.response.data` in-place e devolve o mesmo erro, para uso direto em
 * `extractApiError` sem tratamento especial no call site.
 */
export async function normalizarErroBlob(err: unknown): Promise<unknown> {
  const resposta = (err as { response?: { data?: unknown } })?.response
  if (!(resposta?.data instanceof Blob)) return err
  try {
    const texto = await resposta.data.text()
    resposta.data = JSON.parse(texto)
  } catch {
    // corpo de erro não é JSON parseável — extractApiError cai no fallback genérico
  }
  return err
}

/**
 * V0.15.0 (#602, RN-NOVA-32/DT-NOVA-21) — erro explicado da modal de erro padrão. O backend manda
 * `titulo`, `motivo`, `comoResolver` e `itens` nas mensagens já convertidas; nas demais só `message`
 * (a modal mostra só "O que aconteceu").
 */
export interface ErroExplicado {
  titulo?: string
  mensagem: string
  motivo?: string
  comoResolver?: string
  itens?: string[]
}

export function extrairErroExplicado(err: unknown, fallback: string): ErroExplicado {
  const d = (err as { response?: { data?: { message?: string; titulo?: string | null; motivo?: string | null;
    comoResolver?: string | null; itens?: string[] | null; fieldErrors?: Record<string, string> | null } } })?.response?.data
  const campos = d?.fieldErrors ? Object.values(d.fieldErrors) : []
  return {
    titulo: d?.titulo ?? undefined,
    mensagem: campos.length && (!d?.message || d.message === 'Erro de validação') ? campos.join(' ') : (d?.message ?? fallback),
    motivo: d?.motivo ?? undefined,
    comoResolver: d?.comoResolver ?? undefined,
    itens: d?.itens ?? undefined,
  }
}
