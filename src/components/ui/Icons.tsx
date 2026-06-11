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
  tag: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/>
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  layers: (p?: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}>
      <path d="M12 3 21 8l-9 5-9-5 9-5Z"/>
      <path d="M3 13l9 5 9-5"/>
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
}

export type IconName = keyof typeof Icons
