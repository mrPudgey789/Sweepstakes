import { v4 as uuidv4 } from 'uuid'

const JOIN_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateJoinCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]
  }
  return code
}

export function generateShareSlug(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

export function buildPaypalLink(handle: string, amount?: number): string {
  const base = handle.startsWith('http')
    ? handle
    : `https://paypal.me/${handle}`
  if (amount && base.includes('paypal.me')) {
    return `${base.replace(/\/$/, '')}/${amount}`
  }
  return base
}

export function normalisePaypalHandle(input: string): string {
  const match = input.match(/paypal\.me\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  return input.replace(/[^A-Za-z0-9]/g, '')
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export { uuidv4 }
