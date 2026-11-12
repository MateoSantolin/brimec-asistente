/**
 * Capa de consulta: equivale a las herramientas de SOLO LECTURA que el middleware
 * expondria al agente (patron Tool Calling de T-10).
 *
 * Son funciones puras sobre el dataset. El "modelo" nunca accede a los datos: pide una
 * herramienta, y es esta capa la que resuelve el join y aplica los filtros.
 */
import type {
  Articulo, Auditoria, Cliente, ComentarioTaller, Empleado, EtapaProduccion,
  MetadatosEtapa, OfDetalle, OrdenFabricacion, Pedido, PedidoDetalle, SeguimientoEtapa,
} from '@/types'
import { ARTICULOS, CLIENTES, EMPLEADOS, ETAPAS, METADATOS_ETAPA } from '@/data/seed'
import { aliasDeRazonSocial, coincidenciasDifusas, normalizar } from './texto'
import { diasHasta } from './formato'

/** Estado mutable de la demo (lo que en produccion vive en la base del ERP). */
export interface Dataset {
  pedidos: Pedido[]
  pedidoDetalle: PedidoDetalle[]
  ordenes: OrdenFabricacion[]
  ofDetalle: OfDetalle[]
  seguimiento: SeguimientoEtapa[]
  comentarios: ComentarioTaller[]
  auditoria: Auditoria[]
}

/* ---------------------------------------------------------------- maestros */

export const clientePorId = (id: number): Cliente | undefined =>
  CLIENTES.find((c) => c.cliente_id === id)

export const articuloPorId = (id: number): Articulo | undefined =>
  ARTICULOS.find((a) => a.articulo_id === id)

export const empleadoPorId = (id: number): Empleado | undefined =>
  EMPLEADOS.find((e) => e.empleado_id === id)

export const etapaPorId = (id: number): EtapaProduccion | undefined =>
  ETAPAS.find((e) => e.etapa_id === id)

export const etapaPorNombre = (nombre: string): EtapaProduccion | undefined =>
  ETAPAS.find((e) => normalizar(e.nombre) === normalizar(nombre))

export const metaEtapa = (id: number): MetadatosEtapa | undefined =>
  METADATOS_ETAPA.find((m) => m.etapa_id === id)

export function colorEtapa(nombre: string): string {
  const e = etapaPorNombre(nombre)
  return (e && metaEtapa(e.etapa_id)?.color) || '#64748B'
}

export function ordenEtapa(nombre: string): number {
  return etapaPorNombre(nombre)?.orden ?? 0
}

/** Etapas a las que se puede pasar desde `nombre`, segun las reglas del middleware. */
export function transicionesDesde(nombre: string): EtapaProduccion[] {
  const e = etapaPorNombre(nombre)
  if (!e) return []
  const ids = metaEtapa(e.etapa_id)?.transiciones ?? []
  return ids.map((id) => etapaPorId(id)).filter((x): x is EtapaProduccion => !!x)
}

export function transicionPermitida(desde: string, hacia: string): boolean {
  return transicionesDesde(desde).some((e) => normalizar(e.nombre) === normalizar(hacia))
}

/* ---------------------------------------------------------------- resolucion difusa */

export function buscarClientes(texto: string): Cliente[] {
  return coincidenciasDifusas(texto, CLIENTES, (c) => [
    c.razon_social,
    ...aliasDeRazonSocial(c.razon_social),
    c.cuit.replace(/-/g, ''),
  ]).map((r) => r.item)
}

export function buscarEtapa(texto: string): EtapaProduccion | null {
  const r = coincidenciasDifusas(
    texto,
    ETAPAS,
    (e) => [e.nombre, ...(metaEtapa(e.etapa_id)?.sinonimos ?? [])],
    0.8,
  )
  return r.length ? r[0].item : null
}

export function buscarArticulos(texto: string): Articulo[] {
  return coincidenciasDifusas(texto, ARTICULOS, (a) => [a.codigo, a.descripcion, a.tipo, a.material]).map(
    (r) => r.item,
  )
}

/* ---------------------------------------------------------------- OF e items */

export const ofPorId = (ds: Dataset, id: number): OrdenFabricacion | undefined =>
  ds.ordenes.find((o) => o.of_id === id)

export const ofPorNumero = (ds: Dataset, numero: string): OrdenFabricacion | undefined => {
  const n = normalizar(numero).replace(/^of[-\s]?/, '')
  return ds.ordenes.find((o) => normalizar(o.numero).replace(/^of[-\s]?/, '') === n)
}

export const itemPorId = (ds: Dataset, id: number): OfDetalle | undefined =>
  ds.ofDetalle.find((i) => i.of_detalle_id === id)

export const itemsDeOf = (ds: Dataset, ofId: number): OfDetalle[] =>
  ds.ofDetalle.filter((i) => i.of_id === ofId).sort((a, b) => a.numero_item.localeCompare(b.numero_item))

export const pedidoDeOf = (ds: Dataset, of: OrdenFabricacion): Pedido | undefined =>
  ds.pedidos.find((p) => p.pedido_id === of.pedido_id)

/** ORDEN_FABRICACION no tiene cliente_id: se llega por PEDIDO (tal como el ERD). */
export function clienteDeOf(ds: Dataset, of: OrdenFabricacion): Cliente | undefined {
  const p = pedidoDeOf(ds, of)
  return p ? clientePorId(p.cliente_id) : undefined
}

export const ofDeItem = (ds: Dataset, item: OfDetalle): OrdenFabricacion | undefined =>
  ofPorId(ds, item.of_id)

export const ordenesDeCliente = (ds: Dataset, clienteId: number): OrdenFabricacion[] => {
  const pedidos = new Set(ds.pedidos.filter((p) => p.cliente_id === clienteId).map((p) => p.pedido_id))
  return ds.ordenes.filter((o) => pedidos.has(o.pedido_id))
}

export const itemsDeCliente = (ds: Dataset, clienteId: number): OfDetalle[] => {
  const ofs = new Set(ordenesDeCliente(ds, clienteId).map((o) => o.of_id))
  return ds.ofDetalle.filter((i) => ofs.has(i.of_id))
}

export const pedidosDeCliente = (ds: Dataset, clienteId: number): Pedido[] =>
  ds.pedidos.filter((p) => p.cliente_id === clienteId)

export const detallesDePedido = (ds: Dataset, pedidoId: number): PedidoDetalle[] =>
  ds.pedidoDetalle.filter((d) => d.pedido_id === pedidoId)

export const ordenesDePedido = (ds: Dataset, pedidoId: number): OrdenFabricacion[] =>
  ds.ordenes.filter((o) => o.pedido_id === pedidoId)

export const totalPedido = (ds: Dataset, pedidoId: number): number =>
  detallesDePedido(ds, pedidoId).reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0)

/* ---------------------------------------------------------------- filtros operativos */

export const estaFinalizada = (o: OrdenFabricacion): boolean => ordenEtapa(o.estado) >= ETAPAS.length

export function ordenesAtrasadas(ds: Dataset): OrdenFabricacion[] {
  return ds.ordenes
    .filter((o) => !estaFinalizada(o) && diasHasta(o.fecha_estimada_fin) < 0)
    .sort((a, b) => +new Date(a.fecha_estimada_fin) - +new Date(b.fecha_estimada_fin))
}

export function ordenesPorVencer(ds: Dataset, dias = 7): OrdenFabricacion[] {
  return ds.ordenes
    .filter((o) => {
      if (estaFinalizada(o)) return false
      const d = diasHasta(o.fecha_estimada_fin)
      return d >= 0 && d <= dias
    })
    .sort((a, b) => +new Date(a.fecha_estimada_fin) - +new Date(b.fecha_estimada_fin))
}

export function ordenesPendientes(ds: Dataset): OrdenFabricacion[] {
  const inicial = ETAPAS.find((e) => e.orden === 1)
  return ds.ordenes.filter((o) => inicial && o.estado === inicial.nombre)
}

export function ordenesPorEtapa(ds: Dataset, nombreEtapa: string): OrdenFabricacion[] {
  return ds.ordenes.filter((o) => normalizar(o.estado) === normalizar(nombreEtapa))
}

export function ordenesOrdenadasPorEntrega(lista: OrdenFabricacion[]): OrdenFabricacion[] {
  return [...lista].sort((a, b) => +new Date(a.fecha_estimada_fin) - +new Date(b.fecha_estimada_fin))
}

/* ---------------------------------------------------------------- taller */

export const comentariosDeItem = (ds: Dataset, itemId: number): ComentarioTaller[] =>
  ds.comentarios
    .filter((c) => c.of_detalle_id === itemId)
    .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))

export function comentariosDeOf(ds: Dataset, ofId: number): ComentarioTaller[] {
  const ids = new Set(itemsDeOf(ds, ofId).map((i) => i.of_detalle_id))
  return ds.comentarios
    .filter((c) => ids.has(c.of_detalle_id))
    .sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora))
}

export const seguimientoDeItem = (ds: Dataset, itemId: number): SeguimientoEtapa[] =>
  ds.seguimiento
    .filter((s) => s.of_detalle_id === itemId)
    .sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio))

export function seguimientoDeOf(ds: Dataset, ofId: number): SeguimientoEtapa[] {
  const ids = new Set(itemsDeOf(ds, ofId).map((i) => i.of_detalle_id))
  return ds.seguimiento
    .filter((s) => ids.has(s.of_detalle_id))
    .sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio))
}

/** Ultimo empleado que registro avance en la OF: el ERD no guarda un responsable en ORDEN_FABRICACION. */
export function responsableDeOf(ds: Dataset, ofId: number): Empleado | undefined {
  const s = seguimientoDeOf(ds, ofId)[0]
  return s ? empleadoPorId(s.empleado_id) : undefined
}

/** Avance 0..1 de una OF: promedio del orden de etapa de sus items. */
export function avanceDeOf(ds: Dataset, ofId: number): number {
  const items = itemsDeOf(ds, ofId)
  if (!items.length) return 0
  const total = items.reduce((acc, i) => acc + ordenEtapa(i.estado), 0)
  return total / (items.length * ETAPAS.length)
}

/* ---------------------------------------------------------------- indicadores */

export interface Kpis {
  ofActivas: number
  ofAtrasadas: number
  ofPorVencer: number
  ofFinalizadas: number
  pedidosAbiertos: number
  itemsEnTaller: number
  comentariosSemana: number
  avancePromedio: number
}

export function kpis(ds: Dataset): Kpis {
  const activas = ds.ordenes.filter((o) => !estaFinalizada(o))
  const haceUnaSemana = Date.now() - 7 * 24 * 3600 * 1000
  return {
    ofActivas: activas.length,
    ofAtrasadas: ordenesAtrasadas(ds).length,
    ofPorVencer: ordenesPorVencer(ds).length,
    ofFinalizadas: ds.ordenes.length - activas.length,
    pedidosAbiertos: ds.pedidos.filter((p) => p.estado !== 'Cerrado' && p.estado !== 'Entregado').length,
    itemsEnTaller: ds.ofDetalle.filter((i) => ordenEtapa(i.estado) > 1 && ordenEtapa(i.estado) < ETAPAS.length)
      .length,
    comentariosSemana: ds.comentarios.filter((c) => +new Date(c.fecha_hora) >= haceUnaSemana).length,
    avancePromedio:
      ds.ordenes.length === 0
        ? 0
        : ds.ordenes.reduce((acc, o) => acc + avanceDeOf(ds, o.of_id), 0) / ds.ordenes.length,
  }
}

export function distribucionPorEtapa(ds: Dataset): Array<{ etapa: EtapaProduccion; cantidad: number; color: string }> {
  return ETAPAS.map((e) => ({
    etapa: e,
    cantidad: ds.ofDetalle.filter((i) => normalizar(i.estado) === normalizar(e.nombre)).length,
    color: metaEtapa(e.etapa_id)?.color ?? '#64748B',
  }))
}
