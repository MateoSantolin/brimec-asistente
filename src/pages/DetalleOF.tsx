import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarClock, ClipboardList, MessageSquarePlus, Mic, Package, Repeat, User2, X,
} from 'lucide-react'
import { useApp } from '@/store/AppContext'
import {
  articuloPorId, avanceDeOf, clienteDeOf, colorEtapa, comentariosDeOf, empleadoPorId, estaFinalizada,
  etapaPorId, itemsDeOf, ofPorNumero, pedidoDeOf, responsableDeOf, seguimientoDeItem, seguimientoDeOf,
  transicionesDesde,
} from '@/lib/consultas'
import { fechaCorta, fechaHora, moneda, relativo } from '@/lib/formato'
import { BadgeEtapa, BarraAvance, Chip, ChipPlazo, RielEtapas, Tarjeta, Vacio } from '@/components/ui/Primitivos'
import { TarjetaConfirmacion } from '@/components/chat/TarjetaConfirmacion'
import type { ComentarioTaller, OfDetalle, PropuestaOperacion } from '@/types'

export default function DetalleOF() {
  const { numero = '' } = useParams()
  const { ds, tieneCapacidad, ejecutar, registrarCancelacion } = useApp()
  const [propuesta, setPropuesta] = useState<PropuestaOperacion | null>(null)
  const [resuelta, setResuelta] = useState<'confirmada' | 'cancelada' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const of = ofPorNumero(ds, numero)
  const items = useMemo(() => (of ? itemsDeOf(ds, of.of_id) : []), [ds, of])
  const comentarios = useMemo(() => (of ? comentariosDeOf(ds, of.of_id) : []), [ds, of])
  const historial = useMemo(() => (of ? seguimientoDeOf(ds, of.of_id) : []), [ds, of])

  if (!of) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-display text-xl text-brimec-navy">No se encontró la orden «{numero}»</p>
        <Link to="/consultas" className="btn-ghost mt-4">
          <ArrowLeft size={15} /> Volver a Consultas
        </Link>
      </div>
    )
  }

  const cliente = clienteDeOf(ds, of)
  const pedido = pedidoDeOf(ds, of)
  const responsable = responsableDeOf(ds, of.of_id)
  const puedeCambiar = tieneCapacidad('actualizar_estado')
  const puedeComentar = tieneCapacidad('agregar_comentario')

  function abrirCambioEtapa(item: OfDetalle, etapaId: number) {
    const destino = etapaPorId(etapaId)
    if (!destino || !of) return
    const art = articuloPorId(item.articulo_id)
    setResuelta(null)
    setAviso(null)
    setPropuesta({
      id: `ui-${Date.now().toString(36)}`,
      tipo: 'ACTUALIZAR_ESTADO_ITEM',
      titulo: 'Actualizar etapa de producción',
      entidad: 'OF_DETALLE',
      registro: `Ítem ${item.of_detalle_id} · ${of.numero}`,
      registro_id: item.of_detalle_id,
      estadoActual: item.estado,
      cambioPropuesto: destino.nombre,
      campos: [
        { label: 'Orden de fabricación', valor: of.numero },
        { label: 'Cliente', valor: cliente?.razon_social ?? '—' },
        { label: 'Ítem', valor: `${item.of_detalle_id} (ítem ${item.numero_item})` },
        { label: 'Artículo', valor: `${art?.codigo ?? ''} — ${art?.descripcion ?? ''}` },
        { label: 'Etapa actual', valor: item.estado },
        { label: 'Etapa propuesta', valor: destino.nombre, resaltado: true },
      ],
      requiereAprobacion: destino.requiere_aprobacion
        ? `La etapa "${destino.nombre}" está marcada como requiere_aprobacion en el catálogo del ERP.`
        : undefined,
      payload: { of_detalle_id: item.of_detalle_id, etapa_id: destino.etapa_id },
    })
  }

  function abrirComentario(item: OfDetalle, texto: string, tipo: ComentarioTaller['tipo']) {
    if (!of) return
    setResuelta(null)
    setAviso(null)
    setPropuesta({
      id: `ui-${Date.now().toString(36)}`,
      tipo: 'AGREGAR_COMENTARIO',
      titulo: 'Registrar comentario de taller',
      entidad: 'COMENTARIO_TALLER',
      registro: `Ítem ${item.of_detalle_id} · ${of.numero}`,
      registro_id: item.of_detalle_id,
      estadoActual: null,
      cambioPropuesto: texto,
      campos: [
        { label: 'Orden de fabricación', valor: of.numero },
        { label: 'Ítem', valor: `${item.of_detalle_id} (etapa ${item.estado})` },
        { label: 'Tipo', valor: tipo },
        { label: 'Canal', valor: 'Texto (pantalla del ERP)' },
        { label: 'Texto', valor: texto, resaltado: true },
      ],
      payload: { of_detalle_id: item.of_detalle_id, texto, tipo },
    })
  }

  function confirmar() {
    if (!propuesta) return
    const r = ejecutar(propuesta, 'texto', 'Pantalla ERP')
    setResuelta(r.ok ? 'confirmada' : null)
    setAviso(r.ok ? r.mensaje : `No se pudo ejecutar: ${r.mensaje}`)
    if (r.ok) window.setTimeout(() => setPropuesta(null), 1400)
  }

  function cancelar() {
    if (!propuesta) return
    registrarCancelacion(propuesta, 'texto')
    setResuelta('cancelada')
    window.setTimeout(() => setPropuesta(null), 1100)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
      <Link to="/consultas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brimec-primary hover:underline">
        <ArrowLeft size={15} /> Consultas
      </Link>

      {/* encabezado */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl text-brimec-navy">{of.numero}</h1>
              <BadgeEtapa etapa={of.estado} />
              <Chip tono={of.prioridad === 'Alta' ? 'peligro' : of.prioridad === 'Baja' ? 'neutro' : 'info'}>
                prioridad {of.prioridad}
              </Chip>
              <ChipPlazo iso={of.fecha_estimada_fin} finalizada={estaFinalizada(of)} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{cliente?.razon_social ?? 'Cliente no resuelto'}</p>
          </div>

          <div className="w-full max-w-xs">
            <div className="label-ui mb-1">Avance de la OF</div>
            <BarraAvance valor={avanceDeOf(ds, of.of_id)} />
            <p className="mt-1 text-[11.5px] text-slate-400">
              La etapa de la OF es la mínima de sus {items.length} ítems.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-brimec-border/70 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <Dato icono={<ClipboardList size={13} />} label="Pedido" valor={pedido ? `#${pedido.pedido_id}` : '—'} />
          <Dato label="OC del cliente" valor={pedido?.numero_orden_cliente ?? '—'} />
          <Dato icono={<CalendarClock size={13} />} label="Emisión" valor={fechaCorta(of.fecha_emision)} />
          <Dato label="Fin estimado" valor={fechaCorta(of.fecha_estimada_fin)} />
          <Dato label="Entrega pactada" valor={pedido ? fechaCorta(pedido.fecha_entrega_pactada) : '—'} />
          <Dato icono={<User2 size={13} />} label="Último registro" valor={responsable?.nombre ?? '—'} />
        </dl>

        {tieneCapacidad('ver_datos_comerciales') && pedido && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            Total estimado del pedido:{' '}
            <b className="text-brimec-navy">
              {moneda(
                ds.pedidoDetalle
                  .filter((d) => d.pedido_id === pedido.pedido_id)
                  .reduce((a, d) => a + d.cantidad * d.precio_unitario, 0),
              )}
            </b>
          </p>
        )}
      </div>

      {aviso && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          {aviso}
        </p>
      )}

      {/* panel de confirmacion */}
      {propuesta && (
        <div className="relative">
          <button
            onClick={() => setPropuesta(null)}
            className="absolute right-2 top-2 z-10 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
          <TarjetaConfirmacion
            propuesta={propuesta}
            estado={resuelta ?? 'pendiente'}
            onConfirmar={confirmar}
            onCancelar={cancelar}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* items */}
        <Tarjeta titulo={`Ítems de fabricación (${items.length})`} sinPadding>
          <ul className="divide-y divide-brimec-border/60">
            {items.map((i) => (
              <FilaItem
                key={i.of_detalle_id}
                item={i}
                puedeCambiar={puedeCambiar}
                puedeComentar={puedeComentar}
                onCambiar={(etapaId) => abrirCambioEtapa(i, etapaId)}
                onComentar={(texto, tipo) => abrirComentario(i, texto, tipo)}
                historial={seguimientoDeItem(ds, i.of_detalle_id)}
              />
            ))}
          </ul>
        </Tarjeta>

        <div className="space-y-5">
          {/* timeline */}
          <Tarjeta titulo="Línea de tiempo de etapas" sinPadding>
            {historial.length === 0 ? (
              <Vacio mensaje="Sin registros de seguimiento." />
            ) : (
              <ol className="relative space-y-0 px-4 py-3">
                {historial.slice(0, 14).map((s, idx) => {
                  const etapa = etapaPorId(s.etapa_id)
                  return (
                    <li key={s.seguimiento_id} className="relative flex gap-3 pb-4 last:pb-0">
                      {idx < Math.min(historial.length, 14) - 1 && (
                        <span className="absolute left-[7px] top-4 h-full w-px bg-brimec-border" />
                      )}
                      <span
                        className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: colorEtapa(etapa?.nombre ?? '') }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-brimec-navy">{etapa?.nombre}</span>
                          <span className="font-mono text-[11px] text-slate-400">ítem {s.of_detalle_id}</span>
                          <Chip tono={s.estado === 'En curso' ? 'info' : 'neutro'}>{s.estado}</Chip>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-slate-500">
                          {empleadoPorId(s.empleado_id)?.nombre ?? '—'} · inicio {fechaHora(s.inicio)}
                          {s.fin ? ` · fin ${fechaHora(s.fin)}` : ' · en curso'}
                        </p>
                        {s.observaciones && (
                          <p className="mt-0.5 text-[12px] italic text-slate-500">{s.observaciones}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Tarjeta>

          {/* comentarios */}
          <Tarjeta titulo={`Comentarios de taller (${comentarios.length})`} sinPadding>
            {comentarios.length === 0 ? (
              <Vacio mensaje="Sin comentarios en esta OF." />
            ) : (
              <ul className="divide-y divide-brimec-border/60">
                {comentarios.map((c) => (
                  <li key={c.comentario_id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tono={c.tipo === 'Incidencia' ? 'peligro' : c.tipo === 'Avance' ? 'ok' : 'info'}>
                        {c.tipo}
                      </Chip>
                      <span className="font-mono text-[11px] text-slate-400">ítem {c.of_detalle_id}</span>
                      {c.archivo_audio && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Mic size={10} /> {c.archivo_audio}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-slate-400">{relativo(c.fecha_hora)}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{c.texto}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-400">{empleadoPorId(c.empleado_id)?.nombre ?? '—'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

function Dato({ label, valor, icono }: { label: string; valor: string; icono?: React.ReactNode }) {
  return (
    <div>
      <dt className="label-ui flex items-center gap-1">
        {icono}
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] text-slate-700">{valor}</dd>
    </div>
  )
}

function FilaItem({
  item,
  puedeCambiar,
  puedeComentar,
  onCambiar,
  onComentar,
  historial,
}: {
  item: OfDetalle
  puedeCambiar: boolean
  puedeComentar: boolean
  onCambiar: (etapaId: number) => void
  onComentar: (texto: string, tipo: ComentarioTaller['tipo']) => void
  historial: ReturnType<typeof seguimientoDeItem>
}) {
  const [comentando, setComentando] = useState(false)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<ComentarioTaller['tipo']>('Observacion')
  const art = articuloPorId(item.articulo_id)
  const opciones = transicionesDesde(item.estado)
  const enCurso = historial.find((s) => s.fin === null)

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-brimec-navy">ítem {item.of_detalle_id}</span>
            <span className="text-[11px] text-slate-400">#{item.numero_item}</span>
            <BadgeEtapa etapa={item.estado} tam="sm" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-700">
            <Package size={13} className="shrink-0 text-slate-400" />
            <span className="font-mono text-[12px]">{art?.codigo}</span> — {art?.descripcion}
          </p>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {item.cantidad} {art?.unidad_medida} · {art?.material} · {art?.norma}
            {item.partida && ` · partida ${item.partida}`}
            {enCurso && ` · en etapa desde ${fechaCorta(enCurso.inicio)}`}
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        <RielEtapas etapaActual={item.estado} />
      </div>

      {(puedeCambiar || puedeComentar) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {puedeCambiar &&
            (opciones.length ? (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Repeat size={11} /> pasar a:
                </span>
                {opciones.map((e) => (
                  <button
                    key={e.etapa_id}
                    onClick={() => onCambiar(e.etapa_id)}
                    className="rounded-full border border-brimec-border bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-brimec-primary hover:text-brimec-primary"
                  >
                    {e.nombre}
                  </button>
                ))}
              </>
            ) : (
              <span className="text-[11px] text-slate-400">Etapa final: el catálogo no habilita transiciones.</span>
            ))}

          {puedeComentar && (
            <button
              onClick={() => setComentando((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brimec-border bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-brimec-primary hover:text-brimec-primary"
            >
              <MessageSquarePlus size={12} /> Comentar
            </button>
          )}
        </div>
      )}

      {comentando && puedeComentar && (
        <form
          className="mt-2.5 flex flex-wrap items-end gap-2 rounded-lg bg-brimec-surface p-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!texto.trim()) return
            onComentar(texto.trim(), tipo)
            setTexto('')
            setComentando(false)
          }}
        >
          <select
            className="input w-auto py-1.5 text-[12.5px]"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ComentarioTaller['tipo'])}
          >
            <option>Observacion</option>
            <option>Incidencia</option>
            <option>Avance</option>
          </select>
          <input
            className="input min-w-[220px] flex-1 py-1.5 text-[12.5px]"
            placeholder="Novedad del taller…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="btn-primary py-1.5 text-[12.5px]" disabled={!texto.trim()}>
            Preparar
          </button>
        </form>
      )}
    </li>
  )
}
