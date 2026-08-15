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
