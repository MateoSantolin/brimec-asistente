/**
 * Tipos del MVP.
 *
 * Las interfaces de entidad replican LITERALMENTE los nombres de tabla y de campo del
 * modelo de datos destino (Arquitectura_de_datos_destino.png), en snake_case, para que la
 * correspondencia con el ERD sea verificable campo por campo.
 *
 * Alcance: 11 de las 28 tablas del modelo (las que T-09 lista en "DATOS E INFORMACION
 * NECESARIA"). Fuera del MVP: SOLICITUD, COTIZACION, DOCUMENTO, PROVEEDOR, COMPRA,
 * COMPRA_DETALLE, LOTE_MATERIA_PRIMA, MOVIMIENTO_STOCK, CONSUMO_MATERIAL, CONTROL_CALIDAD,
 * CERTIFICADO_CALIDAD, REMITO, REMITO_DETALLE, TRANSPORTISTA, RECEPCION, FACTURA, PAGO.
 *
 * Los campos marcados con  // [EXT]  NO existen en el ERD: son extensiones que el MVP
 * necesita para cumplir requisitos explicitos de T-09/T-10. Estan listadas en el README.
 */

/* ================================================================== */
/* Entidades del modelo de datos destino                               */
/* ================================================================== */

export type Rol = 'ADMINISTRACION' | 'OPERARIO' | 'JEFE_PRODUCCION'

/** EMPLEADO */
export interface Empleado {
  empleado_id: number
  nombre: string
  sector: string
  rol: Rol
  email: string
  activo: boolean
}

/** CLIENTE */
export interface Cliente {
  cliente_id: number
  razon_social: string
  cuit: string
  domicilio: string
  localidad: string
  provincia: string
  telefono: string
  email: string
  condicion_iva: string
  estado: string
}

/** ARTICULO */
export interface Articulo {
  articulo_id: number
  codigo: string
  descripcion: string
  tipo: string
  norma: string
  material: string
  dimensiones: string
  unidad_medida: string
  activo: boolean
}

/** PEDIDO */
export interface Pedido {
  pedido_id: number
  cliente_id: number
  /** COTIZACION esta fuera del alcance del MVP: siempre null */
  cotizacion_id: number | null
  numero_orden_cliente: string
  fecha_confirmacion: string
  fecha_entrega_pactada: string
  estado: string
}

/** PEDIDO_DETALLE */
export interface PedidoDetalle {
  pedido_detalle_id: number
  pedido_id: number
  articulo_id: number
  cantidad: number
  especificacion_tecnica: string
  unidad_medida: string
  /** dato comercial: visible solo para ADMINISTRACION */
  precio_unitario: number
}

/** ORDEN_FABRICACION */
export interface OrdenFabricacion {
  of_id: number
  pedido_id: number
  /** clave natural visible en el chat: "OF-203" */
  numero: string
  fecha_emision: string
  fecha_estimada_fin: string
  fecha_real_fin: string | null
  prioridad: string
  /** denormalizado: corresponde a ETAPA_PRODUCCION.nombre; es el minimo de sus OF_DETALLE */
  estado: string
}

/** OF_DETALLE — los "items" del lenguaje del taller */
export interface OfDetalle {
  of_detalle_id: number
  of_id: number
  pedido_detalle_id: number | null
  articulo_id: number
  numero_item: string
  cantidad: number
  partida: string
  /** denormalizado: ETAPA_PRODUCCION.nombre de la etapa en curso */
  estado: string
}

/** ETAPA_PRODUCCION — catalogo provisto por el ERP, no fijado en el prompt (T-10, regla 3) */
export interface EtapaProduccion {
  etapa_id: number
  nombre: string
  orden: number
  requiere_aprobacion: boolean
}

export type EstadoSeguimiento = 'En curso' | 'Finalizada'

/** SEGUIMIENTO_ETAPA */
export interface SeguimientoEtapa {
  seguimiento_id: number
  of_detalle_id: number
  etapa_id: number
  empleado_id: number
  inicio: string
  fin: string | null
  estado: EstadoSeguimiento
  observaciones: string
}

export type TipoComentario = 'Observacion' | 'Incidencia' | 'Avance'

/** COMENTARIO_TALLER */
export interface ComentarioTaller {
  comentario_id: number
  of_detalle_id: number
  empleado_id: number
  fecha_hora: string
  tipo: TipoComentario
  texto: string
  /** el modelo preve guardar el audio dictado; aqui se simula el nombre de archivo */
  archivo_audio: string | null
}

export type ResultadoAuditoria = 'OK' | 'RECHAZADA' | 'CANCELADA'
export type Canal = 'texto' | 'voz'
export type OrigenOperacion = 'Asistente' | 'Pantalla ERP'

/** AUDITORIA */
export interface Auditoria {
  auditoria_id: number
  empleado_id: number
  fecha_hora: string
  entidad: string
  registro_id: number
  operacion: string
  detalle: string
  /** [EXT] T-09 exige registrar el "Resultado"; el ERD no tiene la columna. */
  resultado: ResultadoAuditoria
  /** [EXT] T-10 pide poder distinguir texto de voz para medir adopcion. */
  canal: Canal
  /** [EXT] distingue lo hecho por el asistente de lo hecho por pantalla del ERP. */
  origen: OrigenOperacion
}

/* ================================================================== */
/* Configuracion del middleware (NO pertenece al modelo de datos)      */
/* ================================================================== */

/**
 * Reglas y metadatos que en la arquitectura de T-10 viven en el middleware / la UI,
 * no en la tabla ETAPA_PRODUCCION. Se mantienen separados a proposito.
 */
export interface MetadatosEtapa {
  etapa_id: number
  color: string
  descripcion: string
  /** expresiones de taller que la NLU debe reconocer para esta etapa */
  sinonimos: string[]
  /** etapa_id destino permitidos (regla de negocio; el ERD no modela transiciones) */
  transiciones: number[]
}

export type Capacidad =
  | 'consultar_clientes'
  | 'consultar_pedidos'
  | 'consultar_of'
  | 'consultar_items'
  | 'consultar_articulos'
  | 'consultar_comentarios'
  | 'consultar_auditoria'
  | 'crear_of'
  | 'actualizar_estado'
  | 'agregar_comentario'
  | 'ver_datos_comerciales'

/* ================================================================== */
/* Conversacion y propuestas de operacion (estado de UI)               */
/* ================================================================== */

export type TipoOperacion = 'ACTUALIZAR_ESTADO_ITEM' | 'CREAR_OF' | 'AGREGAR_COMENTARIO'

export interface CampoPropuesta {
  label: string
  valor: string
  resaltado?: boolean
}

/**
 * Propuesta de escritura. Nunca se ejecuta sin confirmacion explicita
 * (T-09/T-10: resumen + estado actual + cambio propuesto + Confirmar / Cancelar).
 */
export interface PropuestaOperacion {
  id: string
  tipo: TipoOperacion
  titulo: string
  entidad: string
  registro: string
  registro_id: number
  estadoActual: string | null
  cambioPropuesto: string
  campos: CampoPropuesta[]
  /** aviso cuando ETAPA_PRODUCCION.requiere_aprobacion = true */
  requiereAprobacion?: string
  payload: Record<string, unknown>
}

export type EstadoPropuesta = 'pendiente' | 'confirmada' | 'cancelada'

export type TipoTabla =
  | 'pedidos' | 'of' | 'items' | 'clientes' | 'articulos' | 'comentarios' | 'seguimiento' | 'auditoria'

export interface TablaResultado {
  tipo: TipoTabla
  titulo: string
  criterio: string
  columnas: string[]
  filas: Array<Record<string, string>>
  /** numero de OF por fila, para el boton "ver detalle" */
  enlaces?: Array<string | null>
}

export type AutorMensaje = 'usuario' | 'asistente' | 'sistema'

export type TonoMensaje = 'normal' | 'aclaracion' | 'rechazo' | 'fuera_alcance' | 'exito' | 'error'

export interface Mensaje {
  id: string
  autor: AutorMensaje
  texto: string
  fecha: string
  canal: Canal
  tono: TonoMensaje
  intencion?: string
  /** herramienta que el agente habria invocado en el middleware (patron Tool Calling, T-10) */
  herramienta?: string
  tabla?: TablaResultado
  propuesta?: PropuestaOperacion
  estadoPropuesta?: EstadoPropuesta
}

/**
 * Slot filling de la creacion de OF.
 *
 * T-10 describe el flujo como «recopilá los datos necesarios, mostrá un resumen y
 * solicitá confirmación». Eso exige estado entre turnos: el asistente pide un campo por
 * vez y recuerda lo ya respondido. Vive en la conversacion para sobrevivir a la recarga.
 */
export type PasoFormularioOf = 'pedido' | 'items' | 'prioridad' | 'fecha'

export interface FormularioOf {
  tipo: 'CREAR_OF'
  paso: PasoFormularioOf
  pedido_id: number | null
  /** pedido_detalle_id de las lineas a fabricar; null = todavia no se definio */
  lineas: number[] | null
  prioridad: string | null
  /** ISO */
  fecha_estimada_fin: string | null
}

export interface Conversacion {
  id: string
  titulo: string
  empleado_id: number
  rol: Rol
  fechaInicio: string
  fechaUltima: string
  mensajes: Mensaje[]
  /** formulario en curso, si lo hay */
  formulario?: FormularioOf | null
}
