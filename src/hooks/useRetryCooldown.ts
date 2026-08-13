import { useCallback, useEffect, useRef, useState } from 'react'
import { extractApiError } from '../utils/apiError'

const COOLDOWN_SEGUNDOS_PADRAO = 10

interface Tentativa {
  acao: () => Promise<void>
  mensagemErro: string
}

/**
 * RN-NOVA-3 — retry manual com cooldown: uma tentativa falha, a UI exibe contagem regressiva e
 * bloqueia nova tentativa até o fim da contagem. Sem retry automático em segundo plano — só
 * dispara via `tentarNovamente()`, chamado pelo clique da artesã.
 */
export function useRetryCooldown(cooldownSegundos = COOLDOWN_SEGUNDOS_PADRAO) {
  const [executando, setExecutando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [cooldownRestante, setCooldownRestante] = useState(0)
  const ultimaTentativaRef = useRef<Tentativa | null>(null)

  useEffect(() => {
    if (cooldownRestante <= 0) return
    const t = setTimeout(() => setCooldownRestante((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldownRestante])

  const executar = useCallback(async (acao: () => Promise<void>, mensagemErro: string) => {
    ultimaTentativaRef.current = { acao, mensagemErro }
    setErro(null)
    setExecutando(true)
    try {
      await acao()
      setCooldownRestante(0)
    } catch (err) {
      setErro(extractApiError(err, mensagemErro))
      setCooldownRestante(cooldownSegundos)
    } finally {
      setExecutando(false)
    }
  }, [cooldownSegundos])

  const tentarNovamente = useCallback(() => {
    if (cooldownRestante > 0 || executando || !ultimaTentativaRef.current) return
    const { acao, mensagemErro } = ultimaTentativaRef.current
    executar(acao, mensagemErro)
  }, [cooldownRestante, executando, executar])

  // Dispensa só a mensagem visível (ex: fechar o modal) — não mexe no cooldown em andamento,
  // que continua bloqueando novas tentativas até zerar (RN-NOVA-3 não é só cosmético no modal).
  const dispensarErro = useCallback(() => setErro(null), [])

  return { executando, erro, cooldownRestante, executar, tentarNovamente, dispensarErro }
}
