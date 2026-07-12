import { useState, useEffect } from 'react'

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), duration)
    return () => clearTimeout(t)
  }, [toast, duration])

  return { toast, setToast }
}
