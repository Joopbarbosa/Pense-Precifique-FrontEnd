import { useLayoutEffect, useState, type RefObject } from 'react'
import { LINHAS_BUSCA_VISIVEIS } from '../constants/buscadores'

export function useAlturaListaBusca<T extends HTMLElement>(ref: RefObject<T>, versao: string | number): number | undefined {
  const [maxHeight, setMaxHeight] = useState<number>()

  useLayoutEffect(() => {
    const painel = ref.current
    if (!painel) return

    painel.scrollTop = 0
    let frame = 0
    const medir = () => {
      if (painel.getAnimations().some(animacao => animacao.playState === 'running')) {
        frame = requestAnimationFrame(medir)
        return
      }
      const linhas = painel.querySelectorAll<HTMLElement>('[data-search-row]')
      if (linhas.length <= LINHAS_BUSCA_VISIVEIS) {
        setMaxHeight(undefined)
        return
      }

      // Mede em relação ao próprio painel: offsetTop depende do offsetParent, que varia entre listas.
      const painelBox = painel.getBoundingClientRect()
      const oitavaBox = linhas[LINHAS_BUSCA_VISIVEIS - 1].getBoundingClientRect()
      setMaxHeight(Math.ceil(oitavaBox.bottom - painelBox.top + 1))
    }
    frame = requestAnimationFrame(medir)
    return () => cancelAnimationFrame(frame)
  }, [ref, versao])

  return maxHeight
}
