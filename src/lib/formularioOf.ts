/**
 * Formulario conversacional de creacion de OF (slot filling multi-turno).
 *
 * T-10 lo describe asi: «recopilá los datos necesarios, mostrá un resumen y solicitá
 * confirmación». Eso no se resuelve en un solo turno: el asistente pide un campo por vez,
 * recuerda lo ya respondido y solo al final arma la propuesta.
 *
 * Campos, en orden:
 *   1. pedido de origen        (obligatorio; se listan los pedidos en curso)
 *   2. lineas a fabricar       (por defecto todas las del PEDIDO_DETALLE)
 *   3. prioridad               (Alta / Media / Baja)
 *   4. fecha estimada de fin   (se sugiere entrega pactada - 7 dias)
 *
 * El numero de OF NO se pide: lo asigna el ERP.
 */
import type {
  Cliente, FormularioOf, PropuestaOperacion, TablaResultado, TonoMensaje,
} from '@/types'
import { ETAPAS } from '@/data/seed'
import { articuloPorId, clientePorId, detallesDePedido, type Dataset } from './consultas'
import { fechaCorta, moneda } from './formato'
import { normalizar } from './texto'
import type { Slots } from './nlu'

export interface PasoResultado {
  texto: string
  tono: TonoMensaje
  /** null = el formulario termino (confirmado, cancelado o convertido en propuesta) */
  formulario: FormularioOf | null
  propuesta?: PropuestaOperacion
  tabla?: TablaResultado
  herramienta?: string
}

const PRIORIDADES = ['Alta', 'Media', 'Baja']
const MS_DIA = 86400000

const vacio = (): FormularioOf => ({
  tipo: 'CREAR_OF',
  paso: 'pedido',
  pedido_id: null,
  lineas: null,
  prioridad: null,
  fecha_estimada_fin: null,
})

/* ------------------------------------------------------------------ utilidades */

const RE_CANCELAR = /\b(cancel|dejalo|deja lo|olvidalo|salir|basta|abortar|no importa|nada)\w*\b/

/** Frases que claramente no son una respuesta al formulario sino otra consulta. */
const RE_OTRA_CONSULTA =
  /^(most|list|dame|quiero ver|cuant|cual|que of|que pedido|mostrame|buscame|filtra|agrega|coment|actualiz|pas[aá])/

export function pareceOtraConsulta(texto: string): boolean {
  return RE_OTRA_CONSULTA.test(normalizar(texto))
}

function pedidosElegibles(ds: Dataset) {
  return ds.pedidos
    .filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cerrado')
    .sort((a, b) => +new Date(a.fecha_entrega_pactada) - +new Date(b.fecha_entrega_pactada))
}

function tablaPedidosElegibles(ds: Dataset, cliente?: Cliente): TablaResultado {
  const lista = pedidosElegibles(ds).filter((p) => (cliente ? p.cliente_id === cliente.cliente_id : true))
  return {
    tipo: 'pedidos',
    titulo: cliente ? `Pedidos en curso de ${cliente.razon_social}` : 'Pedidos en curso',
    criterio: 'estado distinto de Entregado y Cerrado · orden por entrega pactada',
    columnas: ['Pedido', 'Cliente', 'OC cliente', 'Estado', 'Entrega pactada', 'Lineas', 'OF existentes'],
    filas: lista.map((p) => ({
      Pedido: String(p.pedido_id),
      Cliente: clientePorId(p.cliente_id)?.razon_social ?? '—',
      'OC cliente': p.numero_orden_cliente,
      Estado: p.estado,
      'Entrega pactada': fechaCorta(p.fecha_entrega_pactada),
      Lineas: String(detallesDePedido(ds, p.pedido_id).length),
      'OF existentes': String(ds.ordenes.filter((o) => o.pedido_id === p.pedido_id).length),
    })),
  }
}

function tablaLineas(ds: Dataset, pedidoId: number): TablaResultado {
  const lineas = detallesDePedido(ds, pedidoId)
  return {
    tipo: 'items',
    titulo: `Lineas del pedido ${pedidoId}`,
    criterio: `PEDIDO_DETALLE donde pedido_id = ${pedidoId}`,
    columnas: ['#', 'Articulo', 'Descripcion', 'Cantidad', 'Especificacion'],
    filas: lineas.map((l, i) => {
      const a = articuloPorId(l.articulo_id)
      return {
        '#': String(i + 1),
        Articulo: a?.codigo ?? '—',
        Descripcion: a?.descripcion ?? '—',
        Cantidad: `${l.cantidad} ${l.unidad_medida}`,
        Especificacion: l.especificacion_tecnica || '—',
      }
    }),
  }
}

function fechaSugerida(ds: Dataset, pedidoId: number): string {
  const p = ds.pedidos.find((x) => x.pedido_id === pedidoId)!
  const sugerida = new Date(p.fecha_entrega_pactada).getTime() - 7 * MS_DIA
  // nunca proponer una fecha pasada
  return new Date(Math.max(sugerida, Date.now() + 3 * MS_DIA)).toISOString()
}

/* ------------------------------------------------------------------ parsers por paso */

function leerPedido(ds: Dataset, texto: string, clientes: Cliente[]): number | 'ambiguo' | null {
  const t = normalizar(texto)
  const num = t.match(/\b(\d{3,6})\b/)
  if (num) {
    const n = Number(num[1])
    return ds.pedidos.some((p) => p.pedido_id === n) ? n : -n // negativo = no existe
  }
  if (clientes.length === 1) {
    const abiertos = pedidosElegibles(ds).filter((p) => p.cliente_id === clientes[0].cliente_id)
    if (abiertos.length === 1) return abiertos[0].pedido_id
    if (abiertos.length > 1) return 'ambiguo'
  }
  return null
}

function leerLineas(ds: Dataset, pedidoId: number, texto: string): number[] | null {
  const t = normalizar(texto)
  const lineas = detallesDePedido(ds, pedidoId)
  if (/\btodas|todos|todo|completa|completo|las dos|ambas|si|dale|ok\b/.test(t)) {
    return lineas.map((l) => l.pedido_detalle_id)
  }
  // por numero de orden en la lista ("1 y 3", "la 2", "1,2")
  const nums = [...t.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1]))
  const porIndice = nums.filter((n) => n >= 1 && n <= lineas.length).map((n) => lineas[n - 1].pedido_detalle_id)
  if (porIndice.length) return [...new Set(porIndice)]
  // por codigo de articulo
  const porCodigo = lineas
    .filter((l) => {
      const cod = normalizar(articuloPorId(l.articulo_id)?.codigo ?? '')
      return cod.length > 3 && t.includes(cod)
    })
    .map((l) => l.pedido_detalle_id)
  return porCodigo.length ? porCodigo : null
}

function leerPrioridad(texto: string): string | null {
  const t = normalizar(texto)
  if (/\balta|urgente|critic/.test(t)) return 'Alta'
  if (/\bbaja|baj/.test(t)) return 'Baja'
  if (/\bmedia|normal|estandar|la que sugieras|default|cualquiera|da igual|dale|ok|si\b/.test(t)) return 'Media'
  return null
}

function leerFecha(ds: Dataset, pedidoId: number, texto: string): string | 'pasada' | null {
  const t = normalizar(texto)

  if (/\bsugerid|la que propon|propuesta|default|dale|ok|si|esa\b/.test(t)) return fechaSugerida(ds, pedidoId)

  const enDias = t.match(/\ben\s+(\d{1,3})\s*(dia|dias|d)\b/)
  if (enDias) return new Date(Date.now() + Number(enDias[1]) * MS_DIA).toISOString()

  const enSemanas = t.match(/\ben\s+(\d{1,2})\s*(semana|semanas)\b/)
  if (enSemanas) return new Date(Date.now() + Number(enSemanas[1]) * 7 * MS_DIA).toISOString()

  // dd/mm, dd/mm/yy, dd/mm/yyyy, dd-mm
  const fecha = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/)
  if (fecha) {
    const hoy = new Date()
    const dia = Number(fecha[1])
    const mes = Number(fecha[2]) - 1
    let anio = fecha[3] ? Number(fecha[3]) : hoy.getFullYear()
    if (anio < 100) anio += 2000
    const d = new Date(anio, mes, dia, 18, 0, 0)
    if (Number.isNaN(d.getTime())) return null
    // sin anio y ya paso: se asume el ano siguiente
    if (!fecha[3] && d.getTime() < Date.now()) d.setFullYear(anio + 1)
    return d.getTime() < Date.now() ? 'pasada' : d.toISOString()
  }
  return null
}

/* ------------------------------------------------------------------ preguntas */

function preguntar(ds: Dataset, f: FormularioOf): PasoResultado {
  const restantes = ['pedido', 'items', 'prioridad', 'fecha'] as const
  const idx = restantes.indexOf(f.paso) + 1
  const cabecera = `Creación de OF · paso ${idx} de 4`

  if (f.paso === 'pedido') {
    return {
      texto:
        `${cabecera} — pedido de origen.\n` +
        `¿Sobre qué pedido creo la orden? Decime el número (por ejemplo "1004") o el cliente. ` +
        `El número de OF no hace falta: lo asigna el ERP.`,
      tono: 'aclaracion',
      formulario: f,
      tabla: tablaPedidosElegibles(ds),
      herramienta: 'consultar_pedidos',
    }
  }

  const pedido = ds.pedidos.find((p) => p.pedido_id === f.pedido_id)!
  const cliente = clientePorId(pedido.cliente_id)

  if (f.paso === 'items') {
    const lineas = detallesDePedido(ds, pedido.pedido_id)
    return {
      texto:
        `${cabecera} — líneas a fabricar.\n` +
        `El pedido ${pedido.pedido_id} (${cliente?.razon_social}) tiene ${lineas.length} línea(s). ` +
        `¿Fabrico todas o solo algunas? Respondé "todas", o los números de la lista (por ejemplo "1 y 3").`,
      tono: 'aclaracion',
      formulario: f,
      tabla: tablaLineas(ds, pedido.pedido_id),
    }
  }

  if (f.paso === 'prioridad') {
    return {
      texto:
        `${cabecera} — prioridad.\n` +
        `¿Alta, Media o Baja? La entrega pactada del pedido es el ${fechaCorta(pedido.fecha_entrega_pactada)}. ` +
        `Si no indicás nada, queda Media.`,
      tono: 'aclaracion',
      formulario: f,
    }
  }

  const sug = fechaSugerida(ds, pedido.pedido_id)
  return {
    texto:
      `${cabecera} — fecha estimada de fin.\n` +
      `Sugiero el ${fechaCorta(sug)}, una semana antes de la entrega pactada al cliente ` +
      `(${fechaCorta(pedido.fecha_entrega_pactada)}). Podés aceptarla con "dale", o darme otra: ` +
      `"20/12", "en 15 días".`,
    tono: 'aclaracion',
    formulario: f,
  }
}

/** Calcula el proximo paso pendiente; si no queda ninguno, arma la propuesta. */
function avanzar(ds: Dataset, f: FormularioOf, aviso = ''): PasoResultado {
  if (f.pedido_id === null) return conAviso(preguntar(ds, { ...f, paso: 'pedido' }), aviso)
  if (f.lineas === null) return conAviso(preguntar(ds, { ...f, paso: 'items' }), aviso)
  if (f.prioridad === null) return conAviso(preguntar(ds, { ...f, paso: 'prioridad' }), aviso)
  if (f.fecha_estimada_fin === null) return conAviso(preguntar(ds, { ...f, paso: 'fecha' }), aviso)
  return conAviso(construirPropuesta(ds, f), aviso)
}

function conAviso(r: PasoResultado, aviso: string): PasoResultado {
  return aviso ? { ...r, texto: `${aviso}\n\n${r.texto}` } : r
}

/* ------------------------------------------------------------------ propuesta final */

function construirPropuesta(ds: Dataset, f: FormularioOf): PasoResultado {
  const pedido = ds.pedidos.find((p) => p.pedido_id === f.pedido_id)!
  const cliente = clientePorId(pedido.cliente_id)
  const todas = detallesDePedido(ds, pedido.pedido_id)
  const elegidas = todas.filter((l) => f.lineas!.includes(l.pedido_detalle_id))
  const total = elegidas.reduce((a, l) => a + l.cantidad * l.precio_unitario, 0)

  const tarde = new Date(f.fecha_estimada_fin!) > new Date(pedido.fecha_entrega_pactada)

  const propuesta: PropuestaOperacion = {
    id: `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tipo: 'CREAR_OF',
    titulo: 'Crear orden de fabricación',
    entidad: 'ORDEN_FABRICACION',
    registro: `Pedido ${pedido.pedido_id}`,
    registro_id: pedido.pedido_id,
    estadoActual: null,
    cambioPropuesto: `Nueva OF con ${elegidas.length} ítem(s) en etapa "${ETAPAS[0].nombre}"`,
    campos: [
      { label: 'Pedido de origen', valor: `${pedido.pedido_id} (OC ${pedido.numero_orden_cliente})` },
      { label: 'Cliente', valor: cliente?.razon_social ?? '—' },
      { label: 'Entrega pactada al cliente', valor: fechaCorta(pedido.fecha_entrega_pactada) },
      { label: 'Fin estimado de la OF', valor: fechaCorta(f.fecha_estimada_fin), resaltado: true },
      { label: 'Prioridad', valor: f.prioridad!, resaltado: f.prioridad === 'Alta' },
      { label: 'Etapa inicial', valor: ETAPAS[0].nombre },
      { label: 'Número de OF', valor: 'lo asigna el ERP al confirmar' },
      {
        label: `Ítems a fabricar (${elegidas.length} de ${todas.length})`,
        valor: elegidas
          .map((l) => `${articuloPorId(l.articulo_id)?.codigo} × ${l.cantidad} ${l.unidad_medida}`)
          .join(' · '),
        resaltado: true,
      },
      { label: 'Valorizado de las líneas', valor: moneda(total) },
    ],
    requiereAprobacion: tarde
      ? 'La fecha de fin estimada es posterior a la entrega pactada al cliente. Revisalo antes de confirmar.'
      : undefined,
    payload: {
      pedido_id: pedido.pedido_id,
      prioridad: f.prioridad,
      fecha_estimada_fin: f.fecha_estimada_fin,
      items: elegidas.map((l) => ({
        articulo_id: l.articulo_id,
        cantidad: l.cantidad,
        pedido_detalle_id: l.pedido_detalle_id,
      })),
    },
  }

  return {
    texto:
      `Listo. Revisá el resumen y confirmá para que el ERP cree la orden. ` +
      `Nada se escribe hasta que confirmes.`,
    tono: 'normal',
    formulario: null,
    propuesta,
    herramienta: 'crear_orden_fabricacion',
  }
}

/* ------------------------------------------------------------------ API */

/** Arranca el formulario, aprovechando lo que ya venia en la frase inicial. */
export function iniciarFormularioOf(ds: Dataset, slots: Slots): PasoResultado {
  const f = vacio()
  let aviso = ''

  if (slots.pedidoId !== null) {
    if (ds.pedidos.some((p) => p.pedido_id === slots.pedidoId)) f.pedido_id = slots.pedidoId
    else aviso = `No encontré el pedido ${slots.pedidoId}.`
  } else if (slots.ofNumero !== null) {
    // "crear of 3002": el numero que dieron es de OF, no de pedido
    aviso =
      `Ojo: ${slots.ofNumero} parece un número de OF, y el número de OF lo asigna el ERP al crearla. ` +
      `Lo que necesito es el pedido de origen.`
  } else if (slots.clientes.length === 1) {
    const abiertos = pedidosElegibles(ds).filter((p) => p.cliente_id === slots.clientes[0].cliente_id)
    if (abiertos.length === 1) f.pedido_id = abiertos[0].pedido_id
  }

  if (f.pedido_id === null && slots.clientes.length === 1) {
    const r = avanzar(ds, f, aviso)
    return { ...r, tabla: tablaPedidosElegibles(ds, slots.clientes[0]) }
  }
  return avanzar(ds, f, aviso)
}

/** Procesa la respuesta del usuario para el paso en curso. */
export function avanzarFormularioOf(
  ds: Dataset,
  f: FormularioOf,
  texto: string,
  clientes: Cliente[],
): PasoResultado {
  if (RE_CANCELAR.test(normalizar(texto))) {
    return {
      texto: 'Cancelé la creación de la OF. No se creó ningún registro.',
      tono: 'normal',
      formulario: null,
    }
  }

  /* ---- paso 1: pedido ---- */
  if (f.pedido_id === null) {
    const r = leerPedido(ds, texto, clientes)
    if (r === 'ambiguo') {
      const res = avanzar(ds, f, `${clientes[0].razon_social} tiene varios pedidos en curso.`)
      return { ...res, tabla: tablaPedidosElegibles(ds, clientes[0]) }
    }
    if (r === null) {
      return avanzar(ds, f, 'No pude identificar el pedido en lo que escribiste.')
    }
    if (r < 0) {
      return avanzar(ds, f, `El pedido ${-r} no existe. Estos son los pedidos en curso:`)
    }
    return avanzar(ds, { ...f, pedido_id: r, paso: 'items' })
  }

  /* ---- paso 2: lineas ---- */
  if (f.lineas === null) {
    const lineas = leerLineas(ds, f.pedido_id, texto)
    if (!lineas || !lineas.length) {
      return avanzar(ds, f, 'No identifiqué qué líneas fabricar.')
    }
    return avanzar(ds, { ...f, lineas, paso: 'prioridad' })
  }

  /* ---- paso 3: prioridad ---- */
  if (f.prioridad === null) {
    const p = leerPrioridad(texto)
    if (!p) {
      return avanzar(ds, f, `No reconocí esa prioridad. Las válidas son: ${PRIORIDADES.join(', ')}.`)
    }
    return avanzar(ds, { ...f, prioridad: p, paso: 'fecha' })
  }

  /* ---- paso 4: fecha ---- */
  const fecha = leerFecha(ds, f.pedido_id, texto)
  if (fecha === 'pasada') {
    return avanzar(ds, f, 'Esa fecha ya pasó. Necesito una fecha futura.')
  }
  if (!fecha) {
    return avanzar(ds, f, 'No pude interpretar la fecha.')
  }
  return avanzar(ds, { ...f, fecha_estimada_fin: fecha })
}

/** Etiqueta corta para el indicador de la UI. */
export function etiquetaPaso(f: FormularioOf): string {
  const nombres: Record<FormularioOf['paso'], string> = {
    pedido: 'pedido de origen',
    items: 'líneas a fabricar',
    prioridad: 'prioridad',
    fecha: 'fecha estimada de fin',
  }
  const orden = ['pedido', 'items', 'prioridad', 'fecha'] as const
  return `Creando OF · paso ${orden.indexOf(f.paso) + 1} de 4: ${nombres[f.paso]}`
}
