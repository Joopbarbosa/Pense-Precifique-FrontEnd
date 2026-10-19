import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * V0.17.0 #994 (RN-NOVA-31 item 4, DT-NOVA-27 item 3) — a página, a busca e os filtros da lista ficam no endereço da
 * tela, para o botão voltar do navegador reabrir a lista na mesma página, com os mesmos filtros. A tela continua dona
 * do estado: lê o valor inicial com {@link lerDaUrl} e espelha aqui, num único efeito, tudo o que mudou (substitui a
 * entrada do histórico, não empilha uma por página). Valor igual ao padrão sai do endereço.
 */
export function useEspelharNaUrl(estado: Record<string, string | number | boolean | null | undefined>, padroes: Record<string, string | number | boolean> = {}) {
  const [params, setParams] = useSearchParams()
  const serializado = JSON.stringify(estado)
  useEffect(() => {
    const novo = new URLSearchParams(params)
    for (const [chave, valor] of Object.entries(estado)) {
      const vazio = valor == null || valor === '' || String(valor) === String(padroes[chave] ?? '')
      if (vazio) novo.delete(chave)
      else novo.set(chave, String(valor))
    }
    if (novo.toString() !== params.toString()) setParams(novo, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializado])
}

/** Valor inicial de um parâmetro do endereço (lido uma vez, ao montar a tela). */
export function useParamsIniciais() {
  const [params] = useSearchParams()
  return {
    texto: (chave: string, padrao = '') => params.get(chave) ?? padrao,
    /** Página do endereço (de 1 em diante) → índice de zero em diante. */
    pagina: () => Math.max(0, (parseInt(params.get('pagina') ?? '1', 10) || 1) - 1),
  }
}
