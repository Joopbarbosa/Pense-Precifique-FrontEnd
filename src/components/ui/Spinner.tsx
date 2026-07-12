interface SpinnerProps {
  size?: number
  color?: string
  trackColor?: string
  thickness?: number
}

export default function Spinner({
  size = 16,
  color = '#fff',
  trackColor = 'rgba(255,255,255,0.45)',
  thickness = 2.4,
}: SpinnerProps) {
  return (
    <span
      className="inline-block flex-shrink-0 animate-spin rounded-full"
      style={{
        width: size,
        height: size,
        border: `${thickness}px solid ${trackColor}`,
        borderTopColor: color,
      }}
    />
  )
}
