import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { ARTICULOS, CLIENTES, ETAPAS } from '@/data/seed'
import {
  articuloPorId, avanceDeOf, clienteDeOf, clientePorId, empleadoPorId, estaFinalizada, itemPorId,
  ofPorId, ordenesDeCliente, pedidosDeCliente, totalPedido,
} from '@/lib/consultas'
import { fechaCorta, fechaHora, moneda } from '@/lib/formato'
import { normalizar } from '@/lib/texto'
import { BadgeEtapa, BarraAvance, Chip, ChipPlazo, Tarjeta, Vacio } from '@/components/ui/Primitivos'
import type { Capacidad } from '@/types'

type Pestania = 'of' | 'items' | 'pedidos' | 'clientes' | 'articulos' | 'comentarios'

const PESTANIAS: Array<{ id: Pestania; label: string; capacidad?: Capacidad }> = [
  { id: 'of', label: 'Órdenes de fabricación' },
  { id: 'items', label: 'Ítems' },
  { id: 'pedidos', label: 'Pedidos', capacidad: 'consultar_pedidos' },
  { id: 'clientes', label: 'Clientes', capacidad: 'consultar_clientes' },
  { id: 'articulos', label: 'Artículos' },
  { id: 'comentarios', label: 'Comentarios de taller' },
]

export default function Consultas() {
  const { ds, tieneCapacidad } = useApp()
  const disponibles = PESTANIAS.filter((p) => !p.capacidad || tieneCapacidad(p.capacidad))
  const [pestania, setPestania] = useState<Pestania>('of')
  const [busqueda, setBusqueda] = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('')
  const [soloAtrasadas, setSoloAtrasadas] = useState(false)

  const activa = disponibles.some((p) => p.id === pestania) ? pestania : disponibles[0].id
  const q = normalizar(busqueda)

  const ordenes = useMemo(() => {
    return ds.ordenes
      .filter((o) => (etapaFiltro ? o.estado === etapaFiltro : true))
      .filter((o) => (soloAtrasadas ? !estaFinalizada(o) && new Date(o.fecha_estimada_fin) < new Date() : true))
      .filter((o) => {
        if (!q) return true
        const cliente = clienteDeOf(ds, o)?.razon_social ?? ''
        return normalizar(`${o.numero} ${cliente} ${o.estado} ${o.prioridad}`).includes(q)
      })
      .sort((a, b) => +new Date(a.fecha_estimada_fin) - +new Date(b.fecha_estimada_fin))
  }, [ds, etapaFiltro, q, soloAtrasadas])

  const items = useMemo(() => {
    return ds.ofDetalle
      .filter((i) => (etapaFiltro ? i.estado === etapaFiltro : true))
      .filter((i) => {
        if (!q) return true
        const art = articuloPorId(i.articulo_id)
        const of = ofPorId(ds, i.of_id)
        return normalizar(
          `${i.of_detalle_id} ${of?.numero ?? ''} ${art?.codigo ?? ''} ${art?.descripcion ?? ''} ${i.estado} ${i.partida}`,
        ).includes(q)
      })
  }, [ds, etapaFiltro, q])

  const pedidos = useMemo(() => {
    return ds.pedidos.filter((p) => {
      if (!q) return true
      const c = clientePorId(p.cliente_id)?.razon_social ?? ''
      return normalizar(`${p.pedido_id} ${c} ${p.numero_orden_cliente} ${p.estado}`).includes(q)
    })
  }, [ds, q])

  const clientes = useMemo(
    () => CLIENTES.filter((c) => (!q ? true : normalizar(`${c.razon_social} ${c.cuit} ${c.localidad} ${c.provincia}`).includes(q))),
    [q],
  )

  const articulos = useMemo(
    () =>
      ARTICULOS.filter((a) =>
        !q ? true : normalizar(`${a.codigo} ${a.descripcion} ${a.tipo} ${a.material} ${a.norma}`).includes(q),
      ),
    [q],
  )

  const comentarios = useMemo(
    () =>
      [...ds.comentarios]
        .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))
        .filter((c) => {
          if (!q) return true
          const item = itemPorId(ds, c.of_detalle_id)
          const of = item ? ofPorId(ds, item.of_id) : undefined
          return normalizar(`${c.texto} ${c.tipo} ${of?.numero ?? ''} ${c.of_detalle_id}`).includes(q)
        }),
    [ds, q],
  )

  const usaEtapa = activa === 'of' || activa === 'items'

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl text-brimec-navy">Consultas</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Las mismas herramientas que usa el asistente, accesibles por pantalla. Lo que ves depende de tu perfil.
        </p>
      </div>

      {/* pestañas */}
      <div className="flex flex-wrap gap-1.5">
        {disponibles.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestania(p.id)}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
              activa === p.id
                ? 'bg-brimec-navy text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-brimec-border hover:text-brimec-navy'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {usaEtapa && (
          <select className="input w-auto" value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value)}>
            <option value="">Todas las etapas</option>
            {ETAPAS.map((e) => (
              <option key={e.etapa_id} value={e.nombre}>
                {e.nombre}
              </option>
            ))}
          </select>
        )}

        {activa === 'of' && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] text-slate-600 ring-1 ring-brimec-border">
            <input
              type="checkbox"
              checked={soloAtrasadas}
              onChange={(e) => setSoloAtrasadas(e.target.checked)}
              className="accent-brimec-primary"
            />
            Solo atrasadas
          </label>
        )}

        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-slate-400">
          <SlidersHorizontal size={13} /> filtros aplicados sobre datos sintéticos
        </span>
      </div>

      {/* contenido */}
      {activa === 'of' && (
        <Tarjeta titulo={`Órdenes de fabricación (${ordenes.length})`} sinPadding>
          {ordenes.length === 0 ? (
            <Vacio mensaje="No hay OF que cumplan el filtro." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                  <tr>
                    <th className="th">OF</th>
                    <th className="th">Cliente</th>
                    <th className="th">Pedido</th>
                    <th className="th">Etapa</th>
                    <th className="th">Avance</th>
                    <th className="th">Prioridad</th>
                    <th className="th">Emisión</th>
                    <th className="th">Fin estimado</th>
                    <th className="th">Plazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brimec-border/60">
                  {ordenes.map((o) => (
                    <tr key={o.of_id} className="row-hover">
                      <td className="td">
                        <Link to={`/of/${o.numero}`} className="font-semibold text-brimec-primary hover:underline">
                          {o.numero}
                        </Link>
                      </td>
                      <td className="td max-w-[200px] truncate">{clienteDeOf(ds, o)?.razon_social ?? '—'}</td>
                      <td className="td text-slate-500">#{o.pedido_id}</td>
                      <td className="td"><BadgeEtapa etapa={o.estado} tam="sm" /></td>
                      <td className="td w-32"><BarraAvance valor={avanceDeOf(ds, o.of_id)} /></td>
                      <td className="td">
                        <Chip tono={o.prioridad === 'Alta' ? 'peligro' : o.prioridad === 'Baja' ? 'neutro' : 'info'}>
                          {o.prioridad}
                        </Chip>
                      </td>
                      <td className="td whitespace-nowrap text-slate-500">{fechaCorta(o.fecha_emision)}</td>
                      <td className="td whitespace-nowrap text-slate-600">{fechaCorta(o.fecha_estimada_fin)}</td>
                      <td className="td"><ChipPlazo iso={o.fecha_estimada_fin} finalizada={estaFinalizada(o)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}

      {activa === 'items' && (
        <Tarjeta titulo={`Ítems de fabricación (${items.length})`} sinPadding>
          {items.length === 0 ? (
            <Vacio mensaje="No hay ítems que cumplan el filtro." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                  <tr>
                    <th className="th">Ítem</th>
                    <th className="th">OF</th>
                    <th className="th">Cliente</th>
                    <th className="th">Artículo</th>
                    <th className="th">Descripción</th>
                    <th className="th">Cant.</th>
                    <th className="th">Partida</th>
                    <th className="th">Etapa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brimec-border/60">
                  {items.map((i) => {
                    const of = ofPorId(ds, i.of_id)
                    const art = articuloPorId(i.articulo_id)
                    return (
                      <tr key={i.of_detalle_id} className="row-hover">
                        <td className="td font-mono text-[12.5px] text-brimec-navy">{i.of_detalle_id}</td>
                        <td className="td">
                          {of && (
                            <Link to={`/of/${of.numero}`} className="font-semibold text-brimec-primary hover:underline">
                              {of.numero}
                            </Link>
                          )}
                        </td>
                        <td className="td max-w-[180px] truncate">{of ? clienteDeOf(ds, of)?.razon_social : '—'}</td>
                        <td className="td font-mono text-[12px]">{art?.codigo}</td>
                        <td className="td max-w-[260px] truncate">{art?.descripcion}</td>
                        <td className="td tabular-nums">{i.cantidad}</td>
                        <td className="td text-slate-500">{i.partida || '—'}</td>
                        <td className="td"><BadgeEtapa etapa={i.estado} tam="sm" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}

      {activa === 'pedidos' && (
        <Tarjeta titulo={`Pedidos (${pedidos.length})`} sinPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                <tr>
                  <th className="th">Pedido</th>
                  <th className="th">Cliente</th>
                  <th className="th">OC cliente</th>
                  <th className="th">Confirmación</th>
                  <th className="th">Entrega pactada</th>
                  <th className="th">Estado</th>
                  <th className="th">OF</th>
                  {tieneCapacidad('ver_datos_comerciales') && <th className="th">Total estimado</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brimec-border/60">
                {pedidos.map((p) => {
                  const ofs = ds.ordenes.filter((o) => o.pedido_id === p.pedido_id)
                  return (
                    <tr key={p.pedido_id} className="row-hover">
                      <td className="td font-semibold text-brimec-navy">#{p.pedido_id}</td>
                      <td className="td max-w-[200px] truncate">{clientePorId(p.cliente_id)?.razon_social}</td>
                      <td className="td font-mono text-[12px] text-slate-500">{p.numero_orden_cliente}</td>
                      <td className="td whitespace-nowrap text-slate-500">{fechaCorta(p.fecha_confirmacion)}</td>
                      <td className="td whitespace-nowrap text-slate-600">{fechaCorta(p.fecha_entrega_pactada)}</td>
                      <td className="td">
                        <Chip tono={p.estado === 'En produccion' ? 'info' : p.estado === 'Abierto' ? 'alerta' : 'ok'}>
                          {p.estado}
                        </Chip>
                      </td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1">
                          {ofs.map((o) => (
                            <Link
                              key={o.of_id}
                              to={`/of/${o.numero}`}
                              className="rounded bg-brimec-soft/40 px-1.5 py-0.5 text-[11px] font-semibold text-brimec-navy hover:bg-brimec-soft"
                            >
                              {o.numero}
                            </Link>
                          ))}
                        </div>
                      </td>
                      {tieneCapacidad('ver_datos_comerciales') && (
                        <td className="td whitespace-nowrap tabular-nums text-slate-700">
                          {moneda(totalPedido(ds, p.pedido_id))}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {activa === 'clientes' && (
        <Tarjeta titulo={`Clientes (${clientes.length})`} sinPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                <tr>
                  <th className="th">Razón social</th>
                  <th className="th">CUIT</th>
                  <th className="th">Localidad</th>
                  <th className="th">Provincia</th>
                  <th className="th">Condición IVA</th>
                  <th className="th">Pedidos</th>
                  <th className="th">OF</th>
                  <th className="th">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brimec-border/60">
                {clientes.map((c) => (
                  <tr key={c.cliente_id} className="row-hover">
                    <td className="td font-semibold text-brimec-navy">{c.razon_social}</td>
                    <td className="td font-mono text-[12px] text-slate-500">{c.cuit}</td>
                    <td className="td">{c.localidad}</td>
                    <td className="td text-slate-500">{c.provincia}</td>
                    <td className="td text-slate-500">{c.condicion_iva}</td>
                    <td className="td tabular-nums">{pedidosDeCliente(ds, c.cliente_id).length}</td>
                    <td className="td tabular-nums">{ordenesDeCliente(ds, c.cliente_id).length}</td>
                    <td className="td"><Chip tono="ok">{c.estado}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {activa === 'articulos' && (
        <Tarjeta titulo={`Catálogo de artículos (${articulos.length})`} sinPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-brimec-border/70 bg-brimec-surface/60">
                <tr>
                  <th className="th">Código</th>
                  <th className="th">Descripción</th>
                  <th className="th">Tipo</th>
                  <th className="th">Material</th>
                  <th className="th">Norma</th>
                  <th className="th">Dimensiones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brimec-border/60">
                {articulos.map((a) => (
                  <tr key={a.articulo_id} className="row-hover">
                    <td className="td font-mono text-[12px] text-brimec-navy">{a.codigo}</td>
                    <td className="td">{a.descripcion}</td>
                    <td className="td"><Chip tono="info">{a.tipo}</Chip></td>
                    <td className="td text-slate-600">{a.material}</td>
                    <td className="td text-slate-500">{a.norma}</td>
                    <td className="td text-slate-500">{a.dimensiones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {activa === 'comentarios' && (
        <Tarjeta titulo={`Comentarios de taller (${comentarios.length})`} sinPadding>
          {comentarios.length === 0 ? (
            <Vacio mensaje="No hay comentarios registrados." />
          ) : (
            <ul className="divide-y divide-brimec-border/60">
              {comentarios.map((c) => {
                const item = itemPorId(ds, c.of_detalle_id)
                const of = item ? ofPorId(ds, item.of_id) : undefined
                return (
                  <li key={c.comentario_id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tono={c.tipo === 'Incidencia' ? 'peligro' : c.tipo === 'Avance' ? 'ok' : 'info'}>
                        {c.tipo}
                      </Chip>
                      {of && (
                        <Link to={`/of/${of.numero}`} className="text-[12px] font-semibold text-brimec-primary hover:underline">
                          {of.numero}
                        </Link>
                      )}
                      <span className="font-mono text-[11.5px] text-slate-400">ítem {c.of_detalle_id}</span>
                      {c.archivo_audio && <Chip tono="neutro">dictado · {c.archivo_audio}</Chip>}
                      <span className="ml-auto text-[11.5px] text-slate-400">{fechaHora(c.fecha_hora)}</span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">{c.texto}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-400">
                      {empleadoPorId(c.empleado_id)?.nombre ?? '—'} · {empleadoPorId(c.empleado_id)?.sector ?? ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Tarjeta>
      )}
    </div>
  )
}
