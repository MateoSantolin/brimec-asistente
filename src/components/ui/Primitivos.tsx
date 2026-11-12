import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { colorEtapa, ordenEtapa } from '@/lib/consultas'
import { ETAPAS } from '@/data/seed'
import logoBrimec from '@/assets/brimec-logo.png'

export { logoBrimec }

/* ------------------------------------------------------------------ marca */

export function Marca({ compacta = false, invertida = false }: { compacta?: boolean; invertida?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoBrimec}
        alt="BRIMEC"
        className="h-9 w-9 rounded-md object-cover ring-1 ring-black/10 bg-white"
      />
      {!compacta && (
        <div className="leading-none">
          <div className={`font-display text-[17px] tracking-[.18em] ${invertida ? 'text-white' : 'text-brimec-navy'}`}>
            BRIMEC
          </div>
          <div className={`text-[10px] tracking-[.1em] ${invertida ? 'text-brimec-soft' : 'text-slate-500'}`}>
            ERP · ASISTENTE DE TALLER
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ badges */

export function BadgeEtapa({ etapa, tam = 'md' }: { etapa: string; tam?: 'sm' | 'md' }) {
  const color = colorEtapa(etapa)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        tam === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {etapa}
    </span>
  )
}

const TONOS = {
  neutro: 'bg-slate-100 text-slate-700',
  info: 'bg-brimec-soft/40 text-brimec-navy',
  ok: 'bg-emerald-100 text-emerald-700',
  alerta: 'bg-amber-100 text-amber-700',
  peligro: 'bg-rose-100 text-rose-700',
} as const

export function Chip({
  children,
  tono = 'neutro',
  icono,
}: {
  children: ReactNode
  tono?: keyof typeof TONOS
  icono?: ReactNode
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONOS[tono]}`}>
      {icono}
      {children}
    </span>
  )
}

export function ChipPlazo({ iso, finalizada }: { iso: string; finalizada: boolean }) {
  if (finalizada) return <Chip tono="ok">finalizada</Chip>
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86400000)
  if (dias < 0)
    return (
      <Chip tono="peligro" icono={<AlertTriangle size={12} />}>
        {Math.abs(dias)} d de atraso
      </Chip>
    )
  if (dias <= 7) return <Chip tono="alerta">{dias === 0 ? 'vence hoy' : `en ${dias} d`}</Chip>
  return <Chip tono="neutro">en {dias} d</Chip>
}

/* ------------------------------------------------------------------ layout */

export function Tarjeta({
  titulo,
  accion,
  children,
  sinPadding = false,
  className = '',
}: {
  titulo?: ReactNode
  accion?: ReactNode
  children: ReactNode
  sinPadding?: boolean
  className?: string
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {titulo && (
        <header className="flex items-center justify-between gap-3 border-b border-brimec-border/70 px-4 py-3">
          <h3 className="font-display text-sm uppercase tracking-[.12em] text-brimec-navy">{titulo}</h3>
          {accion}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

export function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-400">
      <Inbox size={26} strokeWidth={1.5} />
      {mensaje}
    </div>
  )
}

export function BarraAvance({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100)
  const etapaIdx = Math.min(Math.max(Math.round(valor * ETAPAS.length), 1), ETAPAS.length)
  const color = colorEtapa(ETAPAS[etapaIdx - 1]?.nombre ?? '')
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{pct}%</span>
    </div>
  )
}

/** Paso a paso de etapas, usado en el detalle de item. */
export function RielEtapas({ etapaActual }: { etapaActual: string }) {
  const actual = ordenEtapa(etapaActual)
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {ETAPAS.map((e) => {
        const alcanzada = e.orden <= actual
        const esActual = e.orden === actual
        return (
          <li key={e.etapa_id} className="flex items-center gap-1">
            <span
              className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                esActual ? 'ring-1' : ''
              }`}
              style={{
                backgroundColor: alcanzada ? `${colorEtapa(e.nombre)}1f` : '#F1F5F9',
                color: alcanzada ? colorEtapa(e.nombre) : '#94A3B8',
                ...(esActual ? { boxShadow: `inset 0 0 0 1px ${colorEtapa(e.nombre)}` } : {}),
              }}
            >
              {e.nombre}
            </span>
            {e.orden < ETAPAS.length && <span className="text-slate-300">›</span>}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ aviso de demo */

export function AvisoDemo({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900 ${className}`}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <p>
        <b>Modo demostración.</b> Datos sintéticos. La comprensión de lenguaje natural está simulada con reglas:
        no hay LLM, ni middleware, ni ERP conectados. Los controles de permisos corren en el navegador y{' '}
        <b>no constituyen seguridad real</b>.
      </p>
    </div>
  )
}
