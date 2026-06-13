import React from 'react'

const sw = {
  strokeWidth: 1.7,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Icons = {
  grid: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>
    </svg>
  ),
  users: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <circle cx="9" cy="8" r="3.3"/>
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0"/>
      <path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4"/>
    </svg>
  ),
  doc: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/>
      <path d="M13 3.5V9h5"/>
      <path d="M8.5 13.5h7M8.5 16.5h5"/>
    </svg>
  ),
  box: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/>
      <path d="M4 7.6 12 12l8-4.4M12 12v8.8"/>
    </svg>
  ),
  cube: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/>
      <path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/>
    </svg>
  ),
  factory: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/>
      <path d="M3.5 20.5h17"/>
    </svg>
  ),
  gear: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  logout: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5"/>
      <path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6"/>
    </svg>
  ),
  menu: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
  ),
  bell: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/>
      <path d="M10 19.5a2 2 0 0 0 4 0"/>
    </svg>
  ),
  x: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <path d="M6 6l12 12M18 6 6 18"/>
    </svg>
  ),
  plus: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}>
      <path d="M12 5v14M5 12h14" strokeWidth={2}/>
    </svg>
  ),
  search: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}>
      <circle cx="11" cy="11" r="6.5"/>
      <path d="m20 20-3.6-3.6"/>
    </svg>
  ),
  edit: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}>
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/>
      <path d="M13.5 6.5 17.5 10.5"/>
    </svg>
  ),
  trash: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}>
      <path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"/>
      <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5"/>
    </svg>
  ),
  chevron: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}>
      <path d="m9 6 6 6-6 6"/>
    </svg>
  ),
  caret: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  arrowRight: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M5 12h13M14 6l6 6-6 6" strokeWidth={1.9}/>
    </svg>
  ),
  clock: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 7.5V12l3 1.8"/>
    </svg>
  ),
  clock2: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 7.5V12l3 2"/>
    </svg>
  ),
  tag: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/>
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  layers: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  check: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12.5 4.2 4.2L19 7"/>
    </svg>
  ),
  receipt: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 2v20l3-2 2 2 2-2 2 2 2-2 3 2V2l-3 2-2-2-2 2-2-2-2 2-3-2Z"/>
      <path d="M8 10h8M8 14h5"/>
    </svg>
  ),
  image: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="28" height="28" {...sw} {...p}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/>
      <circle cx="8.5" cy="9.5" r="1.8"/>
      <path d="m4 17 4.5-4.5 4 4 3-3L20 17"/>
    </svg>
  ),
  calc: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2.5"/>
      <path d="M8 7h8"/>
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01"/>
      <path d="M15.5 15v3M8.5 18h3.5"/>
    </svg>
  ),
  info: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 11v5" strokeWidth={1.9}/>
      <circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  fileText: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/>
      <path d="M13 3.5V9h5"/>
    </svg>
  ),
  mail: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="3"/>
      <path d="m4 7 8 6 8-6"/>
    </svg>
  ),
  lock: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/>
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>
    </svg>
  ),
  eye: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 4l16 16"/>
      <path d="M9.5 5.9A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.8 3.4M6.2 7.3A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.5"/>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
    </svg>
  ),
  alertCircle: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7.5v5.5" strokeWidth="1.9"/>
      <circle cx="12" cy="16.3" r="1.05" fill="currentColor" stroke="none"/>
    </svg>
  ),
  emptyBox: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/>
      <path d="M4 7.6 12 12l8-4.4M12 12v8.8"/>
      <path d="M8 5.4 16 9.8"/>
    </svg>
  ),
  alertFilled: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7.5v5.5" strokeWidth="1.9"/>
      <circle cx="12" cy="16.3" r="1.05" fill="currentColor" stroke="none"/>
    </svg>
  ),
  dots: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...p}>
      <circle cx="12" cy="5" r="1.6"/>
      <circle cx="12" cy="12" r="1.6"/>
      <circle cx="12" cy="19" r="1.6"/>
    </svg>
  ),
  copy: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2.5"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  power: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v6M6.3 6.3a8.5 8.5 0 1 0 11.4 0"/>
    </svg>
  ),
  ban: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M6.5 6.5l11 11"/>
    </svg>
  ),
  trendUp: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 14.5 9 9l3.2 3L20 4.2"/>
      <path d="M15.5 4.2H20V8.7"/>
    </svg>
  ),
  bulb: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.4-1.4 4.5-3 5.7V17H9v-2.3C7.4 13.5 6 11.4 6 9a6 6 0 0 1 6-6Z"/>
    </svg>
  ),
  checkSmall: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12.5 4.2 4.2L19 7"/>
    </svg>
  ),
  dollar: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v18M16 7.2c-.7-1.4-2.3-2.2-4-2.2-2.2 0-4 1.3-4 3.1 0 4.3 8.4 2.3 8.4 6.7 0 1.9-2 3.2-4.4 3.2-1.9 0-3.6-.8-4.3-2.3"/>
    </svg>
  ),
  fileStack: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3.5h6l4 4V17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/>
      <path d="M14 3.5V8h4"/>
      <path d="M5 7v12.5a1 1 0 0 0 1 1h9"/>
    </svg>
  ),
  alertTriangle: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z"/>
      <path d="M12 10v4.2" strokeWidth="1.9"/>
      <circle cx="12" cy="17.4" r=".4" fill="currentColor" stroke="none"/>
    </svg>
  ),
  phone: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6.6 4.5c.3.8.8 1.6 1.3 2.4L6.5 8.3a10.5 10.5 0 0 0 5.2 5.2l1.4-1.4c.8.5 1.6 1 2.4 1.3v3A1.5 1.5 0 0 1 14 18C8.4 18 4 13.6 4 8a1.5 1.5 0 0 1 1.5-1.5h1.1z"/>
    </svg>
  ),
  user: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20a8 8 0 0 1 16 0"/>
    </svg>
  ),
  list: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  refresh: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/>
      <path d="M21 4v4h-4M3 20v-4h4"/>
    </svg>
  ),
  filter: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6h16M7 12h10M10 18h4"/>
    </svg>
  ),
  calendar: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  externalLink: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <path d="M15 3h6v6M10 14 21 3"/>
    </svg>
  ),
  back: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M11 6.5 5.5 12 11 17.5M5.5 12H19"/>
    </svg>
  ),
  download: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>
    </svg>
  ),
  send: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M20 4 3.5 11l6.5 2.5M20 4l-6 16-4-6.5M20 4 10 13.5"/>
    </svg>
  ),
  checkCircle: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8.5" strokeWidth={1.7}/>
      <path d="m8.3 12.2 2.5 2.5 4.9-5" strokeWidth={2}/>
    </svg>
  ),
  pix: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}>
      <path d="M12 3.8 8.6 7.2a2 2 0 0 0 0 2.8L12 13.4l3.4-3.4a2 2 0 0 0 0-2.8L12 3.8Z"/>
      <path d="M12 20.2 8.6 16.8a2 2 0 0 1 0-2.8L12 10.6l3.4 3.4a2 2 0 0 1 0 2.8L12 20.2Z"/>
      <path d="M3.8 12 7.2 8.6a2 2 0 0 1 2.8 0M16 8.6 19.4 12l-3.4 3.4"/>
    </svg>
  ),
  bag: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}>
      <path d="M6 8.5h12l-1 11.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 8.5Z"/>
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>
    </svg>
  ),
  sparkles: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z"/>
      <path d="M18.5 15.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/>
    </svg>
  ),
  whats: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}>
      <path d="M4 20.5 5.4 16a8 8 0 1 1 3.1 3.1L4 20.5Z"/>
      <path d="M9 9.2c.2-.6.5-.6.8-.6h.6c.2 0 .5 0 .7.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.3c.3.1.4 0 .6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.8c.3.1.4.3.4.5s0 .9-.4 1.3c-.4.4-1.2.8-1.8.8a7 7 0 0 1-5-2.6 6.7 6.7 0 0 1-1.9-3.8c0-.8.3-1.5.5-1.7Z"/>
    </svg>
  ),
  save: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>
      <path d="M17 21v-8H7v8M7 3v5h8"/>
    </svg>
  ),
  wallet: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>
      <path d="M16 12a2 2 0 0 0 0 4h5v-4Z"/>
    </svg>
  ),
  sliders: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" {...p}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
    </svg>
  ),
  cart: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  pdf: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <path d="M14 2v6h6"/>
      <path d="M8.5 13.5h.01M11.5 13.5h.01"/>
      <path d="M8 17h8"/>
    </svg>
  ),
  note: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <path d="M14 2v6h6M8 13h8M8 17h5"/>
    </svg>
  ),
}

export type IconName = keyof typeof Icons
