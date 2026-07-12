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
    <div className="mb-5 flex items-start gap-[13px]">
      {number !== undefined && (
        <span
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[13.5px] font-bold"
          style={{ background: bg, color }}
        >
          {number}
        </span>
      )}
      <div>
        <h2 className="m-0 text-base font-bold tracking-[-0.01em] text-dark">
          {title}
        </h2>
        {subtitle && (
          <p className="mb-0 mt-[3px] text-[12.5px] text-muted">
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
