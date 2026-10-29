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
      // Espera também as animações dos elementos pais (ex.: a entrada em escala do ModalShell): medir durante o `scale`
      // devolve alturas encolhidas e a lista final mostraria 5 linhas em vez de 6.
      const animando = document.getAnimations().some(animacao => {
        const alvo = (animacao.effect as KeyframeEffect | null)?.target
        return animacao.playState === 'running' && alvo instanceof Node && alvo.contains(painel)
      })
      if (animando) {
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
      const ultimaBox = linhas[LINHAS_BUSCA_VISIVEIS - 1].getBoundingClientRect()
      setMaxHeight(Math.ceil(ultimaBox.bottom - painelBox.top + 1))
    }
    frame = requestAnimationFrame(medir)
    return () => cancelAnimationFrame(frame)
  }, [ref, versao])

  return maxHeight
}
