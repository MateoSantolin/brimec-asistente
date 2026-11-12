import { AlertTriangle, ArrowRight, Ban, Check, ShieldAlert, X } from 'lucide-react'
import type { EstadoPropuesta, PropuestaOperacion } from '@/types'

/**
 * Panel de confirmacion previo a toda escritura.
 *
 * Requisito explicito de T-09 y T-10: mostrar estado actual, cambio propuesto y los
 * botones Confirmar / Cancelar. Nada se ejecuta sin la confirmacion del usuario, y la
 * confirmacion NO reemplaza la validacion de permisos y reglas del backend.
 */
export function TarjetaConfirmacion({
  propuesta,
  estado,
  onConfirmar,
  onCancelar,
}: {
  propuesta: PropuestaOperacion
  estado: EstadoPropuesta
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const resuelta = estado !== 'pendiente'

  return (
    <div
      className={`mt-2 overflow-hidden rounded-xl border bg-white transition-colors ${
        estado === 'confirmada'
          ? 'border-emerald-300'
          : estado === 'cancelada'
            ? 'border-slate-300'
            : 'border-brimec-primary/50 shadow-card'
      }`}
    >
      <header
        className={`flex items-center gap-2 px-4 py-2.5 ${
          estado === 'confirmada'
            ? 'bg-emerald-50'
            : estado === 'cancelada'
              ? 'bg-slate-50'
              : 'bg-brimec-soft/30'
        }`}
      >
        <ShieldAlert size={15} className="shrink-0 text-brimec-navy" />
        <span className="font-display text-[13px] uppercase tracking-[.1em] text-brimec-navy">{propuesta.titulo}</span>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-brimec-border">
          {propuesta.entidad}
        </span>
      </header>

      <div className="px-4 py-3">
        {/* estado actual -> cambio propuesto */}
        {propuesta.estadoActual !== null && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-brimec-surface px-3 py-2">
            <div>
              <div className="label-ui">Estado actual</div>
              <div className="font-semibold text-slate-600">{propuesta.estadoActual}</div>
            </div>
            <ArrowRight size={16} className="mx-1 text-brimec-steel" />
            <div>
              <div className="label-ui">Cambio propuesto</div>
              <div className="font-semibold text-brimec-primary">{propuesta.cambioPropuesto}</div>
            </div>
          </div>
        )}

        <dl className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
          {propuesta.campos.map((c) => (
            <div key={c.label} className={c.valor.length > 46 ? 'sm:col-span-2' : ''}>
              <dt className="label-ui">{c.label}</dt>
              <dd className={`text-[13px] ${c.resaltado ? 'font-semibold text-brimec-navy' : 'text-slate-600'}`}>
                {c.valor}
              </dd>
            </div>
          ))}
        </dl>

        {propuesta.requiereAprobacion && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {propuesta.requiereAprobacion}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-brimec-border/70 bg-brimec-surface/50 px-4 py-2.5">
        {estado === 'pendiente' ? (
          <>
            <button onClick={onConfirmar} className="btn-primary">
              <Check size={15} /> Confirmar
            </button>
            <button onClick={onCancelar} className="btn-ghost">
              <X size={15} /> Cancelar
            </button>
            <span className="ml-auto text-[11px] text-slate-500">
              Nada se escribe hasta que confirmes.
            </span>
          </>
        ) : estado === 'confirmada' ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700">
            <Check size={14} /> Operación confirmada y registrada en auditoría
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
            <Ban size={14} /> Operación cancelada — no se modificó ningún registro
          </span>
        )}
        {resuelta && <span className="ml-auto text-[11px] text-slate-400">#{propuesta.registro}</span>}
      </footer>
    </div>
  )
}
