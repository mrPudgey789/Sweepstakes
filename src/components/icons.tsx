// Football-themed SVG icons used throughout the app

export function FootballIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2l3 7h-6l3-7zM2.5 9.5l6.5 2-3 6-3.5-8zM21.5 9.5l-6.5 2 3 6 3.5-8zM7 20l2-6h6l2 6" />
    </svg>
  )
}

export function TrophyIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

export function WhistleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16a7 7 0 0 1 7-7h2l8-5v2l-4 3h1a7 7 0 0 1 0 14H9a7 7 0 0 1-7-7z" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

export function BootIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18h5l2-3h4l1 3h6v-3c0-2-1-3-3-3h-2l-1-3-3-1V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4L3 12v6z" />
    </svg>
  )
}

export function GoalIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="1" />
      <path d="M2 4l4 4M22 4l-4 4M2 18l4-4M22 18l-4-4" />
      <line x1="6" y1="4" x2="6" y2="18" />
      <line x1="18" y1="4" x2="18" y2="18" />
      <line x1="2" y1="8" x2="22" y2="8" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </svg>
  )
}

export function RedCardIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="2" width="14" height="20" rx="2" fill="#EF4444" />
    </svg>
  )
}

export function ShirtIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l-5 5 3 2 1-2v15h10V7l1 2 3-2-5-5-2.5 1h-3L8 2z" />
    </svg>
  )
}

export function StadiumIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="8" rx="10" ry="4" />
      <path d="M2 8v8c0 2.2 4.5 4 10 4s10-1.8 10-4V8" />
      <path d="M2 12c0 2.2 4.5 4 10 4s10-1.8 10-4" />
    </svg>
  )
}
