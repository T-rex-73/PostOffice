// ==========================================
// UTILS — แทน GAS helpers
// ==========================================

export function buildFullTracking(storedER: string): string {
  const s = String(storedER || '').trim()
  if (!s) return ''
  if (s.toUpperCase().endsWith('TH')) return s
  if (/^\d{1,8}$/.test(s)) return 'ER' + s.padStart(8, '0') + 'TH'
  return s
}

export function formatZipSpaced(zip: string): string {
  const z = String(zip || '').replace(/\D/g, '').substring(0, 5)
  if (!z) return ''
  return z.split('').join('  ')
}

export function todayThai(): string {
  const now = new Date()
  const d = now.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return d
}

export function nowTimestamp(): string {
  const now = new Date()
  return now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
}

export function calcCheckDigit(num8: string): string {
  const s = String(num8 || '').replace(/\D/g, '').padStart(8, '0').substring(0, 8)
  const w = [8, 6, 4, 2, 3, 5, 9, 7]
  const sum = s.split('').reduce((acc, d, i) => acc + parseInt(d) * w[i], 0)
  const r = sum % 11
  if (r === 0) return '5'
  if (r === 1) return '0'
  return String(11 - r)
}

export function normalizeTrackingER(raw: string): string {
  const s = String(raw || '').trim()
  if (/^\d{1,8}$/.test(s)) return 'ER' + s.padStart(8, '0') + 'TH'
  return s.substring(0, 13)
}
