'use client'

import { useEffect, useState } from 'react'

interface PreloaderProps {
  onComplete?: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'enter' | 'sweep' | 'or' | 'weep' | 'hold' | 'exit' | 'done'>('enter')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('sweep'), 100),
      setTimeout(() => setPhase('or'), 700),
      setTimeout(() => setPhase('weep'), 1200),
      setTimeout(() => setPhase('hold'), 1700),
      setTimeout(() => setPhase('exit'), 2800),
      setTimeout(() => { setPhase('done'); onComplete?.() }, 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  if (phase === 'done') return null

  const phaseIndex = ['enter', 'sweep', 'or', 'weep', 'hold', 'exit'].indexOf(phase)
  const showSweep = phaseIndex >= 1
  const showOr = phaseIndex >= 2
  const showWeep = phaseIndex >= 3
  const showTitle = phaseIndex >= 3

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#1A56DB',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Diamond pattern background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => {
          const row = Math.floor(i / 4)
          const col = i % 4
          const shades = [
            '#1248C2', '#1654D4', '#1A5FE6', '#2070F0',
            '#1856D8', '#1248C2', '#2070F0', '#1654D4',
            '#1A5FE6', '#1856D8', '#1248C2', '#2070F0',
          ]
          const sizes = [140, 120, 160, 130, 150, 110, 145, 135, 125, 155, 140, 120]
          return (
            <div
              key={i}
              className="absolute"
              style={{
                width: sizes[i],
                height: sizes[i],
                background: shades[i],
                transform: 'rotate(45deg)',
                borderRadius: 4,
                left: `${col * 28 - 5}%`,
                top: `${row * 38 - 10}%`,
                opacity: 0.18,
              }}
            />
          )
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* World Cup 2026 */}
        <p
          className="heading text-2xl sm:text-3xl mb-6"
          style={{
            color: 'white',
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
          }}
        >
          World Cup 2026
        </p>

        {/* SWEEP - drops in from top with a bounce */}
        <div
          style={{
            opacity: showSweep ? 1 : 0,
            transform: showSweep
              ? 'translateY(0) rotate(0deg)'
              : 'translateY(-60px) rotate(-8deg)',
            transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            width: 'clamp(200px, 40vw, 360px)',
          }}
        >
          <img
            src="/sweep-green.svg"
            alt="Sweep"
            className="w-full h-auto"
          />
        </div>

        {/* OR - pops in with scale */}
        <div
          style={{
            opacity: showOr ? 1 : 0,
            transform: showOr ? 'scale(1)' : 'scale(0.3)',
            transition: 'opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            width: 'clamp(60px, 12vw, 100px)',
            margin: '4px 0',
          }}
        >
          <img
            src="/or-white.svg"
            alt="or"
            className="w-full h-auto"
          />
        </div>

        {/* WEEP - slides up from bottom with a bounce */}
        <div
          style={{
            opacity: showWeep ? 1 : 0,
            transform: showWeep
              ? 'translateY(0) rotate(0deg)'
              : 'translateY(60px) rotate(8deg)',
            transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            width: 'clamp(200px, 40vw, 360px)',
          }}
        >
          <img
            src="/weep-white.svg"
            alt="Weep"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  )
}
