/**
 * Matriz RBAC.
 *
 * Replica literalmente la definicion de T-09 / T-10:
 *   ADMINISTRACION  -> consulta clientes, pedidos, OF, items y avances; CREA OF.
 *                      NO actualiza estados. NO registra comentarios de taller.
 *   OPERARIO        -> consulta informacion operativa; REGISTRA comentarios.
 *                      NO crea OF. NO actualiza estados.
 *   JEFE_PRODUCCION -> consulta informacion operativa; REGISTRA comentarios;
 *                      ACTUALIZA estados de items. NO crea OF (alcance de T-10).
 *
 * ATENCION: en la solucion real esta matriz vive en el middleware / API del ERP y se
 * valida del lado del servidor. Aqui se evalua en el cliente SOLO porque es una demo sin
 * backend; no constituye un control de seguridad (T-10, seccion Seguridad y privacidad).
 */
import type { Capacidad, Rol } from '@/types'

export const CAPACIDADES_POR_ROL: Record<Rol, Capacidad[]> = {
  ADMINISTRACION: [
    'consultar_clientes',
    'consultar_pedidos',
    'consultar_of',
    'consultar_items',
    'consultar_articulos',
    'consultar_comentarios',
    'consultar_auditoria',
    'crear_of',
    'ver_datos_comerciales',
  ],
  OPERARIO: [
    'consultar_of',
    'consultar_items',
    'consultar_articulos',
    'consultar_comentarios',
    'agregar_comentario',
  ],
  JEFE_PRODUCCION: [
    'consultar_of',
    'consultar_items',
    'consultar_articulos',
    'consultar_comentarios',
    'consultar_auditoria',
    'agregar_comentario',
    'actualizar_estado',
  ],
}

export function puede(rol: Rol, capacidad: Capacidad): boolean {
  return CAPACIDADES_POR_ROL[rol].includes(capacidad)
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRACION: 'Administracion',
  OPERARIO: 'Operario',
  JEFE_PRODUCCION: 'Jefe de Produccion',
}

export const ETIQUETA_CAPACIDAD: Record<Capacidad, string> = {
  consultar_clientes: 'Consultar clientes',
  consultar_pedidos: 'Consultar pedidos',
  consultar_of: 'Consultar ordenes de fabricacion',
  consultar_items: 'Consultar items',
  consultar_articulos: 'Consultar articulos',
  consultar_comentarios: 'Ver comentarios de taller',
  consultar_auditoria: 'Ver auditoria',
  crear_of: 'Crear orden de fabricacion',
  actualizar_estado: 'Actualizar estado de items',
  agregar_comentario: 'Registrar comentario de taller',
  ver_datos_comerciales: 'Ver precios y montos',
}

/** Capacidades que se muestran como indicador de permisos en la UI, en orden. */
export const CAPACIDADES_VISIBLES: Capacidad[] = [
  'consultar_of',
  'consultar_items',
  'consultar_pedidos',
  'consultar_clientes',
  'crear_of',
  'actualizar_estado',
  'agregar_comentario',
  'consultar_auditoria',
  'ver_datos_comerciales',
]

/** Motivo de rechazo que devuelve el middleware simulado cuando falta una capacidad. */
export function motivoRechazo(rol: Rol, capacidad: Capacidad): string {
  const quien: Record<Capacidad, string> = {
    crear_of: 'Solo Administracion puede crear ordenes de fabricacion.',
    actualizar_estado: 'Solo el Jefe de Produccion puede actualizar el estado de los items.',
    agregar_comentario: 'Solo los operarios y el Jefe de Produccion pueden registrar comentarios de taller.',
    consultar_clientes: 'El listado de clientes esta reservado a Administracion.',
    consultar_pedidos: 'La consulta de pedidos esta reservada a Administracion.',
    consultar_auditoria: 'La auditoria esta reservada a Administracion y al Jefe de Produccion.',
    ver_datos_comerciales: 'Los datos comerciales estan reservados a Administracion.',
    consultar_of: '',
    consultar_items: '',
    consultar_articulos: '',
    consultar_comentarios: '',
  }
  const detalle = quien[capacidad] || 'La operacion no esta habilitada para este perfil.'
  return `El perfil ${ETIQUETA_ROL[rol]} no tiene la capacidad "${ETIQUETA_CAPACIDAD[capacidad]}". ${detalle}`
}
