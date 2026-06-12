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
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${thickness}px solid ${trackColor}`,
        borderTopColor: color,
        display: 'inline-block',
        animation: 'spin .7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}
