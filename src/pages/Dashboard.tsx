import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Ban, Check, CheckCircle2, ClipboardList, Clock, Factory,
  MessageSquareText, Mic, Package, ScrollText, ShieldCheck, Sparkles, TrendingUp,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Rol } from '@/types'
import { useApp } from '@/store/AppContext'
import {
  avanceDeOf, clienteDeOf, distribucionPorEtapa, empleadoPorId, itemPorId, kpis, ofPorId,
  ordenesAtrasadas, ordenesPorVencer,
} from '@/lib/consultas'
import { fechaCorta, relativo } from '@/lib/formato'
import { CAPACIDADES_POR_ROL, CAPACIDADES_VISIBLES, ETIQUETA_CAPACIDAD, ETIQUETA_ROL } from '@/lib/permisos'
import { BadgeEtapa, BarraAvance, Chip, ChipPlazo, Tarjeta, Vacio } from '@/components/ui/Primitivos'
import { DiagramaArquitectura } from '@/components/dashboard/DiagramaArquitectura'

/** Atajos del hero: una consulta y una operación propias de cada perfil. */
const ATAJOS: Record<Rol, string[]> = {
  ADMINISTRACION: ['Listame los pedidos de Petrosur', 'Mostrame las OF atrasadas', 'Quiero crear una OF'],
  OPERARIO: ['¿En qué estado está la OF-211?', 'Mostrame los ítems de la OF-211', 'Agregá un comentario al ítem 333: falta material'],
  JEFE_PRODUCCION: ['Mostrame las OF atrasadas', 'Pasá el ítem 333 a tratamiento', 'Mostrame la auditoría'],
}

function Kpi({
  icono, etiqueta, valor, detalle, tono = 'neutro', demora = 0,
}: {
  icono: ReactNode
  etiqueta: string
  valor: string | number
  detalle?: string
  tono?: 'neutro' | 'alerta' | 'peligro' | 'ok'
  demora?: number
}) {
  const colores = {
    neutro: 'text-brimec-primary bg-brimec-soft/40',
    alerta: 'text-amber-600 bg-amber-100',
    peligro: 'text-rose-600 bg-rose-100',
    ok: 'text-emerald-600 bg-emerald-100',
  }[tono]

  return (
    <div className="card animate-fade-up p-4" style={{ animationDelay: `${demora}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${colores}`}>{icono}</span>
        <div className="text-right">
          <div className="font-display text-3xl leading-none text-brimec-navy tabular-nums">{valor}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="label-ui">{etiqueta}</div>
        {detalle && <div className="mt-0.5 text-[12px] text-slate-500">{detalle}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { ds, rol, empleado, tieneCapacidad } = useApp()
  const navegar = useNavigate()
  if (!rol || !empleado) return null

  const k = kpis(ds)
  const porVencer = ordenesPorVencer(ds, 7).slice(0, 6)
  const atrasadas = ordenesAtrasadas(ds).slice(0, 6)
  const distribucion = distribucionPorEtapa(ds)
  const maxDist = Math.max(1, ...distribucion.map((d) => d.cantidad))
  const actividad = [...ds.auditoria].sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora)).slice(0, 7)
  const comentarios = [...ds.comentarios].sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora)).slice(0, 5)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      {/* El asistente es la solución propuesta: va primero y ocupa el lugar principal.
          Los indicadores son evidencia de apoyo y quedan debajo. */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brimec-navy-deep via-brimec-navy to-brimec-navy-deep px-6 py-10 text-center shadow-float sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-brimec-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-brimec-primary/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-2xl animate-fade-up flex-col items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[.1em] text-brimec-soft">
            <Sparkles size={12} /> {ETIQUETA_ROL[rol].toUpperCase()}
          </span>

          <h1 className="mt-4 font-display text-3xl leading-tight text-white sm:text-4xl">
            Hola {empleado.nombre.split(' ')[0]}, preguntale al asistente
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-brimec-soft/85">
            Consultá clientes, pedidos, órdenes de fabricación e ítems, registrá novedades de taller y actualizá
            etapas — por voz o por texto, sin interrumpir la planta.
          </p>

          <Link
            to="/chat"
            className="group mt-7 inline-flex items-center gap-3 rounded-xl bg-brimec-primary px-8 py-4 font-display text-lg tracking-wide text-white shadow-float transition-all duration-200 hover:bg-white hover:text-brimec-navy active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brimec-navy"
          >
            <MessageSquareText size={22} />
            Abrir el asistente
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </Link>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11.5px] text-brimec-soft/60">o empezá con:</span>
            {ATAJOS[rol].map((s) => (
              <button
                key={s}
                onClick={() => navegar('/chat', { state: { prompt: s } })}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-brimec-soft transition-colors hover:border-white/50 hover:bg-white/15 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11.5px] text-brimec-soft/55">
            <span className="inline-flex items-center gap-1.5"><Mic size={12} /> dictado por voz</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> confirmación antes de escribir</span>
            <span className="inline-flex items-center gap-1.5"><ScrollText size={12} /> todo queda auditado</span>
          </div>
        </div>
      </section>

      {/* ---------- evidencia de apoyo ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h2 className="font-display text-2xl text-brimec-navy">Dashboard ejecutivo</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Vista de {ETIQUETA_ROL[rol]} · {fechaCorta(new Date().toISOString())}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icono={<Factory size={17} />} etiqueta="OF activas" valor={k.ofActivas} detalle={`${k.ofFinalizadas} finalizadas`} demora={0} />
        <Kpi icono={<AlertTriangle size={17} />} etiqueta="OF atrasadas" valor={k.ofAtrasadas} detalle="fin estimado vencido" tono={k.ofAtrasadas > 0 ? 'peligro' : 'ok'} demora={60} />
        <Kpi icono={<Clock size={17} />} etiqueta="Vencen en 7 días" valor={k.ofPorVencer} detalle="requieren seguimiento" tono={k.ofPorVencer > 0 ? 'alerta' : 'ok'} demora={120} />
        <Kpi icono={<Package size={17} />} etiqueta="Ítems en taller" valor={k.itemsEnTaller} detalle={`${k.comentariosSemana} comentarios esta semana`} demora={180} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* OF por vencer */}
          <Tarjeta
            titulo="OF próximas a vencer"
            accion={<Link to="/consultas" className="text-xs font-semibold text-brimec-primary hover:underline">Ver todas</Link>}
            sinPadding
          >
            {porVencer.length === 0 ? (
              <Vacio mensaje="No hay OF que venzan en los próximos 7 días." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                    <tr>
                      <th className="th">OF</th>
                      <th className="th">Cliente</th>
                      <th className="th">Etapa</th>
                      <th className="th">Avance</th>
                      <th className="th">Fin estimado</th>
                      <th className="th">Plazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brimec-border/60">
                    {porVencer.map((o) => (
                      <tr key={o.of_id} className="row-hover">
                        <td className="td">
                          <Link to={`/of/${o.numero}`} className="font-semibold text-brimec-primary hover:underline">
                            {o.numero}
                          </Link>
                        </td>
                        <td className="td max-w-[200px] truncate">{clienteDeOf(ds, o)?.razon_social ?? '—'}</td>
                        <td className="td"><BadgeEtapa etapa={o.estado} tam="sm" /></td>
                        <td className="td w-32"><BarraAvance valor={avanceDeOf(ds, o.of_id)} /></td>
                        <td className="td whitespace-nowrap text-slate-600">{fechaCorta(o.fecha_estimada_fin)}</td>
                        <td className="td"><ChipPlazo iso={o.fecha_estimada_fin} finalizada={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          {/* atrasadas */}
          {atrasadas.length > 0 && (
            <Tarjeta titulo="OF atrasadas" sinPadding>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-brimec-border/70 bg-rose-50/60">
                    <tr>
                      <th className="th">OF</th>
                      <th className="th">Cliente</th>
                      <th className="th">Etapa</th>
                      <th className="th">Fin estimado</th>
                      <th className="th">Atraso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brimec-border/60">
                    {atrasadas.map((o) => (
                      <tr key={o.of_id} className="row-hover">
                        <td className="td">
                          <Link to={`/of/${o.numero}`} className="font-semibold text-brimec-primary hover:underline">
                            {o.numero}
                          </Link>
                        </td>
                        <td className="td max-w-[200px] truncate">{clienteDeOf(ds, o)?.razon_social ?? '—'}</td>
                        <td className="td"><BadgeEtapa etapa={o.estado} tam="sm" /></td>
                        <td className="td whitespace-nowrap text-slate-600">{fechaCorta(o.fecha_estimada_fin)}</td>
                        <td className="td"><ChipPlazo iso={o.fecha_estimada_fin} finalizada={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}

          {/* distribucion por etapa */}
          <Tarjeta titulo="Ítems por etapa de producción">
            <div className="flex h-44 items-end gap-3">
              {distribucion.map((d, i) => (
                <div key={d.etapa.etapa_id} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-display text-sm tabular-nums text-brimec-navy">{d.cantidad}</span>
                  <div
                    className="w-full origin-bottom animate-bar-grow rounded-t-md"
                    style={{
                      height: `${Math.max(6, (d.cantidad / maxDist) * 100)}%`,
                      backgroundColor: d.color,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                  <span className="text-center text-[11px] leading-tight text-slate-500">{d.etapa.nombre}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              El catálogo de etapas lo provee el ERP (tabla ETAPA_PRODUCCION). Si cambia allí, cambia acá: no hay
              estados fijados en el código del asistente.
            </p>
          </Tarjeta>
        </div>

        <div className="space-y-6">
          {/* permisos del perfil */}
          <Tarjeta titulo={`Permisos · ${ETIQUETA_ROL[rol]}`}>
            <ul className="space-y-1.5">
              {CAPACIDADES_VISIBLES.map((c) => {
                const tiene = CAPACIDADES_POR_ROL[rol].includes(c)
                return (
                  <li key={c} className={`flex items-center gap-2 text-[13px] ${tiene ? 'text-slate-700' : 'text-slate-400'}`}>
                    {tiene ? <Check size={14} className="shrink-0 text-emerald-600" /> : <Ban size={14} className="shrink-0 text-slate-300" />}
                    {ETIQUETA_CAPACIDAD[c]}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 rounded-md bg-brimec-surface px-2.5 py-2 text-[11px] leading-relaxed text-slate-500">
              En producción esta matriz se valida en el middleware/API. Acá corre en el navegador y{' '}
              <b>no es un control de seguridad</b>.
            </p>
          </Tarjeta>

          {/* avance global */}
          <Tarjeta titulo="Avance global de producción">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brimec-soft/40 text-brimec-primary">
                <TrendingUp size={18} />
              </span>
              <div className="flex-1">
                <BarraAvance valor={k.avancePromedio} />
                <p className="mt-1.5 text-[12px] text-slate-500">
                  Promedio sobre {ds.ordenes.length} OF · {k.pedidosAbiertos} pedidos en curso
                </p>
              </div>
            </div>
          </Tarjeta>

          {/* actividad reciente */}
          <Tarjeta
            titulo="Actividad reciente"
            accion={
              tieneCapacidad('consultar_auditoria') ? (
                <Link to="/auditoria" className="inline-flex items-center gap-1 text-xs font-semibold text-brimec-primary hover:underline">
                  Auditoría <ArrowUpRight size={12} />
                </Link>
              ) : undefined
            }
            sinPadding
          >
            <ul className="divide-y divide-brimec-border/60">
              {actividad.map((a) => (
                <li key={a.auditoria_id} className="flex items-start gap-3 px-4 py-2.5">
                  <span
                    className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      a.resultado === 'OK'
                        ? 'bg-emerald-100 text-emerald-600'
                        : a.resultado === 'RECHAZADA'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {a.resultado === 'OK' ? <CheckCircle2 size={13} /> : a.resultado === 'RECHAZADA' ? <Ban size={13} /> : <ScrollText size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-slate-700">{a.detalle}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {empleadoPorId(a.empleado_id)?.nombre ?? '—'} · {relativo(a.fecha_hora)} · {a.canal}
                      {a.origen === 'Asistente' && ' · asistente'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Tarjeta>

          {/* comentarios de taller */}
          <Tarjeta titulo="Últimas novedades de taller" sinPadding>
            {comentarios.length === 0 ? (
              <Vacio mensaje="Sin comentarios registrados." />
            ) : (
              <ul className="divide-y divide-brimec-border/60">
                {comentarios.map((c) => {
                  const item = itemPorId(ds, c.of_detalle_id)
                  const of = item ? ofPorId(ds, item.of_id) : undefined
                  return (
                    <li key={c.comentario_id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip tono={c.tipo === 'Incidencia' ? 'peligro' : c.tipo === 'Avance' ? 'ok' : 'info'}>{c.tipo}</Chip>
                        {of && (
                          <Link to={`/of/${of.numero}`} className="text-[11px] font-semibold text-brimec-primary hover:underline">
                            {of.numero} · ítem {c.of_detalle_id}
                          </Link>
                        )}
                        {c.archivo_audio && <Chip tono="neutro">dictado</Chip>}
                      </div>
                      <p className="mt-1 text-[12.5px] leading-snug text-slate-700">{c.texto}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {empleadoPorId(c.empleado_id)?.nombre ?? '—'} · {relativo(c.fecha_hora)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>

      {/* arquitectura */}
      <Tarjeta titulo="Arquitectura de la solución propuesta">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <DiagramaArquitectura />
          <div className="space-y-3 text-[13px] leading-relaxed text-slate-600">
            <p>
              <b className="text-brimec-navy">Patrón:</b> agente con herramientas (tool calling) sobre una
              arquitectura desacoplada. El modelo interpreta lenguaje natural e invoca herramientas expuestas por
              una API intermedia; nunca accede a la base ni ejecuta SQL.
            </p>
            <p>
              <b className="text-brimec-navy">Qué funciona hoy:</b> navegación por perfiles, interfaz
              conversacional con texto y dictado, consultas y filtros sobre datos sintéticos, panel de
              confirmación previo a cada escritura, mensajes de restricción por rol y vista de auditoría.
            </p>
            <p>
              <b className="text-brimec-navy">Qué está simulado:</b> la comprensión del lenguaje (acá es un
              analizador por reglas), el middleware, el conector REST, el ERP y su base de datos, la persistencia
              transaccional y la seguridad del lado servidor.
            </p>
            <div className="rounded-lg border border-brimec-border bg-brimec-surface px-3 py-2.5">
              <p className="label-ui">Dependencias previas</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12.5px]">
                <li>Finalizar la puesta en marcha del ERP y definir maestros, etapas, reglas, roles y permisos.</li>
                <li>Definir y validar las API de integración, autenticación, autorización y auditoría.</li>
                <li>Desarrollar la integración real y correr un piloto con usuarios en planta.</li>
              </ol>
            </div>
          </div>
        </div>
      </Tarjeta>

      <div className="flex flex-wrap gap-2 pb-4">
        <Link to="/consultas" className="btn-ghost"><ClipboardList size={15} /> Ir a Consultas</Link>
        {tieneCapacidad('consultar_auditoria') && (
          <Link to="/auditoria" className="btn-ghost"><ScrollText size={15} /> Ver Auditoría</Link>
        )}
      </div>
    </div>
  )
}
