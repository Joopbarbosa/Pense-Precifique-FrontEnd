interface SectionTitleProps {
  number?: number | string
  title: string
  subtitle?: string
  color?: string
}

export default function SectionTitle({
  number,
  title,
  subtitle,
  color = '#2A9D8F',
}: SectionTitleProps) {
  const bg = `rgba(${hexToRgb(color)}, 0.12)`

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 20 }}>
      {number !== undefined && (
        <span style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: bg,
          color,
          fontWeight: 700,
          fontSize: 13.5,
        }}>
          {number}
        </span>
      )}
      <div>
        <h2 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: '#3A372F',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#A29E96' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
