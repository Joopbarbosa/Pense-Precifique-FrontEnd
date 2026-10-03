import { useEffect, useState } from 'react'

// Mesmo valor do breakpoint `md:` do Tailwind (ver Sidebar.tsx). Usado onde a decisão precisa
// ser tomada em JS, não em CSS — ex.: não montar gráfico no celular (RN-NOVA-15/RN-NOVA-20).
const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}
