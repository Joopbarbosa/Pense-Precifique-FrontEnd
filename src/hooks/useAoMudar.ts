import { useEffect, useRef } from 'react'

/**
 * V0.17.0 #994 — roda `aoMudar` só quando `valor` muda DE VERDADE depois da primeira renderização. Substitui o padrão
 * `isFirst = useRef(true)` + efeito, que no modo estrito do React (efeitos executados duas vezes ao montar) dispara na
 * segunda execução e mandava a lista de volta à página 1, perdendo a página que a URL pediu. `valor` é um texto ou
 * número que representa o conjunto de filtros (use uma chave composta quando houver mais de um).
 */
export function useAoMudar(valor: string | number | boolean | null | undefined, aoMudar: () => void) {
  const anterior = useRef(valor)
  useEffect(() => {
    if (Object.is(anterior.current, valor)) return
    anterior.current = valor
    aoMudar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])
}
