const MS_DIA = 24 * 60 * 60 * 1000

export function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fechaLarga(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fechaHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${d.toLocaleTimeString(
    'es-AR',
    { hour: '2-digit', minute: '2-digit' },
  )}`
}

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/** Dias calendario entre hoy y la fecha (negativo = ya paso). */
export function diasHasta(iso: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoy.getTime()) / MS_DIA)
}

export function plazoTexto(iso: string): string {
  const d = diasHasta(iso)
  if (d < -1) return `${Math.abs(d)} dias de atraso`
  if (d === -1) return 'venció ayer'
  if (d === 0) return 'vence hoy'
  if (d === 1) return 'vence mañana'
  return `en ${d} dias`
}

export function relativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 31) return `hace ${d} d`
  return fechaCorta(iso)
}

export function moneda(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

export function numero(n: number): string {
  return n.toLocaleString('es-AR')
}
