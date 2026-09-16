import clsx from 'clsx'

// #352 (V0.11.0) — extraído de 17 pontos de renderização (13+ arquivos) que copiavam este <div>
// literalmente, cada um plugado no seu próprio `useToast()` local. Variante `error` replica o
// visual de alerta já usado em KanbanBoard.tsx (única exceção de cor antes desta extração).
interface ToastProps {
  message: string | null
  variant?: 'success' | 'error'
}

export default function Toast({ message, variant = 'success' }: ToastProps) {
  if (!message) return null
  const isError = variant === 'error'
  return (
    <div
      role={isError ? 'alert' : undefined}
      aria-live={isError ? 'assertive' : undefined}
      className={clsx(
        'fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input px-5 py-3 text-sm font-semibold text-white',
        isError
          ? 'bg-danger shadow-[0_8px_24px_-8px_rgba(192,73,43,0.6)]'
          : 'bg-teal shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]'
      )}
    >
      {message}
    </div>
  )
}
