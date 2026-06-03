import { getFlagUrl } from '@/lib/flags'

interface Props {
  code: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { circle: 24, flagSize: 'w40' as const },
  md: { circle: 32, flagSize: 'w40' as const },
  lg: { circle: 40, flagSize: 'w80' as const },
}

export function TeamFlag({ code, size = 'md', className = '' }: Props) {
  const { circle, flagSize } = sizeMap[size]
  const url = getFlagUrl(code, flagSize)

  if (!url) return null

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden border-2 border-gray-100 flex-shrink-0 ${className}`}
      style={{ width: circle, height: circle }}
    >
      <img
        src={url}
        alt={code}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  )
}
