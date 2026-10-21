import { useLayoutEffect, useState, type RefObject } from 'react'
import { LINHAS_BUSCA_VISIVEIS } from '../constants/buscadores'

export function useAlturaListaBusca<T extends HTMLElement>(ref: RefObject<T>, versao: string | number): number | undefined {
  const [maxHeight, setMaxHeight] = useState<number>()

  useLayoutEffect(() => {
    const painel = ref.current
    if (!painel) return

    painel.scrollTop = 0
    const linhas = painel.querySelectorAll<HTMLElement>('[data-search-row]')
    if (linhas.length <= LINHAS_BUSCA_VISIVEIS) {
      setMaxHeight(undefined)
      return
    }

    const oitava = linhas[LINHAS_BUSCA_VISIVEIS - 1]
    setMaxHeight(Math.ceil(oitava.offsetTop + oitava.offsetHeight + 6))
  }, [ref, versao])

  return maxHeight
}
