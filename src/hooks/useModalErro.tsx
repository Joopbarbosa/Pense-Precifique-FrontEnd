import { useCallback, useRef, useState, type ReactNode } from 'react'
import ModalErro from '../components/ui/ModalErro'
import { extrairErroExplicado, type ErroExplicado } from '../utils/apiError'

type Foco = HTMLElement | null | undefined | (() => HTMLElement | null | undefined)

/**
 * V0.15.0 (#602, RN-NOVA-32) — estado da modal de erro padrão de uma tela.
 * `mostrarErro(err, fallback, foco?)`: `err` pode ser o erro do Axios ou um `ErroExplicado` pronto;
 * `foco` é o campo (ou uma função que o acha depois da tela redesenhar, ex.: o primeiro campo
 * marcado com `aria-invalid`) que recebe o foco ao clicar OK. Renderize `modalErro` na tela.
 */
export function useModalErro(): { modalErro: ReactNode; mostrarErro: (err: unknown, fallback?: string, foco?: Foco) => void } {
  const [erro, setErro] = useState<ErroExplicado | null>(null)
  const foco = useRef<Foco>(null)

  const mostrarErro = useCallback((err: unknown, fallback = 'Não foi possível concluir a ação.', campo?: Foco) => {
    foco.current = campo ?? null
    const pronto = err && typeof err === 'object' && 'mensagem' in err ? err as ErroExplicado : extrairErroExplicado(err, fallback)
    setErro(pronto)
  }, [])

  const ok = () => {
    setErro(null)
    const alvo = foco.current
    setTimeout(() => {
      const el = typeof alvo === 'function' ? alvo() : alvo
      el?.focus()
    }, 0)
  }

  return { modalErro: erro ? <ModalErro erro={erro} onOk={ok} /> : null, mostrarErro }
}

/** Primeiro campo marcado como inválido dentro de `raiz` (padrão: a página). */
export const primeiroCampoInvalido = (raiz: ParentNode = document) =>
  raiz.querySelector<HTMLElement>('[aria-invalid="true"]')
