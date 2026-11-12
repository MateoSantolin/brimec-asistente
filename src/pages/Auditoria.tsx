import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, Keyboard, Mic, Search, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { empleadoPorId } from '@/lib/consultas'
import { fechaHora, relativo } from '@/lib/formato'
import { normalizar } from '@/lib/texto'
import { ETIQUETA_ROL } from '@/lib/permisos'
import { Chip, Tarjeta, Vacio } from '@/components/ui/Primitivos'
import type { ResultadoAuditoria } from '@/types'

const ICONO_RESULTADO = {
  OK: CheckCircle2,
  RECHAZADA: Ban,
  CANCELADA: ShieldAlert,
} as const

const TONO_RESULTADO = {
  OK: 'ok',
  RECHAZADA: 'peligro',
  CANCELADA: 'neutro',
} as const

export default function Auditoria() {
  const { ds } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [resultado, setResultado] = useState<ResultadoAuditoria | ''>('')
  const [canal, setCanal] = useState<'' | 'texto' | 'voz'>('')

  const q = normalizar(busqueda)

  const registros = useMemo(
    () =>
      [...ds.auditoria]
        .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))
        .filter((a) => (resultado ? a.resultado === resultado : true))
        .filter((a) => (canal ? a.canal === canal : true))
        .filter((a) => {
          if (!q) return true
          const emp = empleadoPorId(a.empleado_id)?.nombre ?? ''
          return normalizar(`${a.entidad} ${a.operacion} ${a.detalle} ${emp} ${a.registro_id}`).includes(q)
        }),
    [canal, ds.auditoria, q, resultado],
  )

  const totales = useMemo(() => {
    const t = { OK: 0, RECHAZADA: 0, CANCELADA: 0, voz: 0, asistente: 0 }
    for (const a of ds.auditoria) {
      t[a.resultado] += 1
      if (a.canal === 'voz') t.voz += 1
      if (a.origen === 'Asistente') t.asistente += 1
    }
    return t
  }, [ds.auditoria])

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl text-brimec-navy">Auditoría</h1>
        <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-slate-500">
          Registro de operaciones. Cada escritura deja usuario, fecha y hora, entidad, registro, operación,
          resultado y canal. Es la vista que el sponsor pidió mantener visible para que el Jefe de Producción
          pueda supervisar el historial de cambios.
        </p>
      </div>

      {/* resumen */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total', valor: ds.auditoria.length, tono: 'info' as const },
          { label: 'Ejecutadas', valor: totales.OK, tono: 'ok' as const },
          { label: 'Rechazadas', valor: totales.RECHAZADA, tono: 'peligro' as const },
          { label: 'Canceladas', valor: totales.CANCELADA, tono: 'neutro' as const },
          { label: 'Por voz', valor: totales.voz, tono: 'info' as const },
        ].map((k) => (
          <div key={k.label} className="card px-4 py-3">
            <div className="label-ui">{k.label}</div>
            <div className="mt-1 font-display text-2xl tabular-nums text-brimec-navy">{k.valor}</div>
          </div>
        ))}
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar en el detalle…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select className="input w-auto" value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoAuditoria | '')}>
          <option value="">Todos los resultados</option>
          <option value="OK">Ejecutadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
        <select className="input w-auto" value={canal} onChange={(e) => setCanal(e.target.value as '' | 'texto' | 'voz')}>
          <option value="">Todos los canales</option>
          <option value="texto">Texto</option>
          <option value="voz">Voz</option>
        </select>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-slate-400">
          <SlidersHorizontal size={13} /> {registros.length} de {ds.auditoria.length}
        </span>
      </div>

      {/* timeline */}
      <Tarjeta titulo="Línea de tiempo de operaciones" sinPadding>
        {registros.length === 0 ? (
          <Vacio mensaje="No hay registros que cumplan el filtro." />
        ) : (
          <ol className="px-4 py-3">
            {registros.map((a, idx) => {
              const Icono = ICONO_RESULTADO[a.resultado]
              const emp = empleadoPorId(a.empleado_id)
              return (
                <li key={a.auditoria_id} className="relative flex gap-3 pb-4 last:pb-1">
                  {idx < registros.length - 1 && (
                    <span className="absolute left-[13px] top-7 h-full w-px bg-brimec-border" />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-2 ring-white ${
                      a.resultado === 'OK'
                        ? 'bg-emerald-100 text-emerald-600'
                        : a.resultado === 'RECHAZADA'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icono size={14} />
                  </span>

                  <div className="min-w-0 flex-1 rounded-lg border border-brimec-border/70 bg-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11.5px] font-semibold text-brimec-navy">{a.operacion}</span>
                      <span className="rounded bg-brimec-surface px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                        {a.entidad}
                        {a.registro_id ? ` #${a.registro_id}` : ''}
                      </span>
                      <Chip tono={TONO_RESULTADO[a.resultado]}>{a.resultado}</Chip>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        {a.canal === 'voz' ? <Mic size={10} /> : <Keyboard size={10} />}
                        {a.canal}
                      </span>
                      {a.origen === 'Asistente' && (
                        <span className="rounded-full bg-brimec-soft/40 px-2 py-0.5 text-[10.5px] font-semibold text-brimec-navy">
                          asistente
                        </span>
                      )}
                      <span className="ml-auto whitespace-nowrap text-[11px] text-slate-400" title={fechaHora(a.fecha_hora)}>
                        {relativo(a.fecha_hora)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[13px] leading-snug text-slate-700">{a.detalle}</p>

                    <p className="mt-1 text-[11.5px] text-slate-400">
                      {emp ? `${emp.nombre} · ${ETIQUETA_ROL[emp.rol]}` : 'Usuario no resuelto'} ·{' '}
                      {fechaHora(a.fecha_hora)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Tarjeta>

      <div className="card p-4 text-[12.5px] leading-relaxed text-slate-600">
        <p className="label-ui mb-1.5">Nota sobre el modelo de datos</p>
        <p>
          La tabla <code className="font-mono text-brimec-navy">AUDITORIA</code> del modelo destino tiene{' '}
          <code className="font-mono">auditoria_id, empleado_id, fecha_hora, entidad, registro_id, operacion</code> y{' '}
          <code className="font-mono">detalle</code>. Esta demo agrega tres columnas que el modelo todavía no
          contempla y que T-09/T-10 exigen: <b>resultado</b> (T-09 pide registrar el resultado de la operación),{' '}
          <b>canal</b> y <b>origen</b> (para poder medir la adopción del asistente frente a las pantallas del ERP).
        </p>
        <p className="mt-2">
          Esta vista es una <b>representación</b>: no demuestra persistencia real. En producción el registro debe
          escribirlo el middleware del lado servidor.{' '}
          <Link to="/dashboard" className="font-semibold text-brimec-primary hover:underline">
            Ver arquitectura
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
