/**
 * Carga los datos sinteticos y resuelve los offsets de fecha a fechas reales.
 *
 * Los JSON guardan las fechas como "off_*" = dias respecto de AHORA (negativo = pasado).
 * Asi la demo nunca queda desactualizada: siempre hay OF atrasadas y OF por vencer
 * relativas al dia en que se ejecuta.
 */
import type {
  Articulo, Auditoria, Cliente, ComentarioTaller, Empleado, EtapaProduccion,
  MetadatosEtapa, OfDetalle, OrdenFabricacion, Pedido, PedidoDetalle, SeguimientoEtapa,
} from '@/types'

import empleadosJson from './empleados.json'
import clientesJson from './clientes.json'
import articulosJson from './articulos.json'
import etapasJson from './catalogoEtapas.json'
import pedidosJson from './pedidos.json'
import ordenesJson from './ordenes.json'
import seguimientoJson from './seguimiento.json'
import comentariosJson from './comentarios.json'
import auditoriaJson from './auditoria.json'

/** Momento de referencia: se fija una sola vez al cargar el modulo. */
export const AHORA = new Date()

const MS_DIA = 24 * 60 * 60 * 1000

/** Convierte un offset en dias a fecha ISO. */
export function desdeOffset(dias: number): string {
  return new Date(AHORA.getTime() + dias * MS_DIA).toISOString()
}

function opt(dias: number | null): string | null {
  return dias === null ? null : desdeOffset(dias)
}

/* ------------------------------------------------------------------ */

export const EMPLEADOS = empleadosJson.empleados as Empleado[]
export const PERFILES_DEMO = empleadosJson._perfilesDemo as number[]
export const CLIENTES = clientesJson.clientes as Cliente[]
export const ARTICULOS = articulosJson.articulos as Articulo[]
export const ETAPAS = (etapasJson.etapas as EtapaProduccion[]).slice().sort((a, b) => a.orden - b.orden)
export const METADATOS_ETAPA = etapasJson.metadatos as MetadatosEtapa[]

export const PEDIDOS: Pedido[] = pedidosJson.pedidos.map((p) => ({
  pedido_id: p.pedido_id,
  cliente_id: p.cliente_id,
  cotizacion_id: p.cotizacion_id,
  numero_orden_cliente: p.numero_orden_cliente,
  fecha_confirmacion: desdeOffset(p.off_fecha_confirmacion),
  fecha_entrega_pactada: desdeOffset(p.off_fecha_entrega_pactada),
  estado: p.estado,
}))

export const PEDIDO_DETALLE = pedidosJson.pedido_detalle as PedidoDetalle[]

export const ORDENES: OrdenFabricacion[] = ordenesJson.ordenes.map((o) => ({
  of_id: o.of_id,
  pedido_id: o.pedido_id,
  numero: o.numero,
  fecha_emision: desdeOffset(o.off_fecha_emision),
  fecha_estimada_fin: desdeOffset(o.off_fecha_estimada_fin),
  fecha_real_fin: opt(o.off_fecha_real_fin),
  prioridad: o.prioridad,
  estado: o.estado,
}))

export const OF_DETALLE = ordenesJson.of_detalle as OfDetalle[]

export const SEGUIMIENTO: SeguimientoEtapa[] = seguimientoJson.seguimiento_etapa.map((s) => ({
  seguimiento_id: s.seguimiento_id,
  of_detalle_id: s.of_detalle_id,
  etapa_id: s.etapa_id,
  empleado_id: s.empleado_id,
  inicio: desdeOffset(s.off_inicio),
  fin: opt(s.off_fin),
  estado: s.estado as SeguimientoEtapa['estado'],
  observaciones: s.observaciones,
}))

export const COMENTARIOS: ComentarioTaller[] = comentariosJson.comentarios.map((c) => ({
  comentario_id: c.comentario_id,
  of_detalle_id: c.of_detalle_id,
  empleado_id: c.empleado_id,
  fecha_hora: desdeOffset(c.off_fecha_hora),
  tipo: c.tipo as ComentarioTaller['tipo'],
  texto: c.texto,
  archivo_audio: c.archivo_audio,
}))

export const AUDITORIA: Auditoria[] = auditoriaJson.auditoria.map((a) => ({
  auditoria_id: a.auditoria_id,
  empleado_id: a.empleado_id,
  fecha_hora: desdeOffset(a.off_fecha_hora),
  entidad: a.entidad,
  registro_id: a.registro_id,
  operacion: a.operacion,
  detalle: a.detalle,
  resultado: a.resultado as Auditoria['resultado'],
  canal: a.canal as Auditoria['canal'],
  origen: a.origen as Auditoria['origen'],
}))

/** Semilla completa, usada al inicializar el store y al reiniciar la demo. */
export function semilla() {
  return {
    pedidos: PEDIDOS,
    pedidoDetalle: PEDIDO_DETALLE,
    ordenes: ORDENES,
    ofDetalle: OF_DETALLE,
    seguimiento: SEGUIMIENTO,
    comentarios: COMENTARIOS,
    auditoria: AUDITORIA,
  }
}
