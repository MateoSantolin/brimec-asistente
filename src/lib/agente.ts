/**
 * Agente conversacional simulado.
 *
 * Convierte el analisis de intencion en una respuesta. Respeta el orden de la
 * arquitectura de T-10:
 *
 *   1) AUTORIZACION   - si el rol no tiene la capacidad, rechaza sin ejecutar nada
 *   2) SLOT FILLING   - si falta un dato, repregunta; NUNCA infiere identificadores
 *   3) REGLA DE NEGOCIO - valida la transicion contra el catalogo del ERP
 *   4) CONFIRMACION   - toda escritura devuelve una PROPUESTA, no una ejecucion
 *
 * La ejecucion real (y la auditoria) ocurren en AppContext.ejecutar().
 */
import type {
  Canal, Capacidad, OfDetalle, OrdenFabricacion, PropuestaOperacion, Rol, TablaResultado, TonoMensaje,
} from '@/types'
import { ARTICULOS, CLIENTES, ETAPAS } from '@/data/seed'
import {
  articuloPorId, clienteDeOf, clientePorId, comentariosDeItem, comentariosDeOf,
  empleadoPorId, estaFinalizada, itemPorId, itemsDeCliente, itemsDeOf, ofPorId, ofPorNumero,
  ordenesAtrasadas, ordenesDeCliente, ordenesOrdenadasPorEntrega, ordenesPendientes, ordenesPorEtapa,
  ordenesPorVencer, pedidoDeOf, pedidosDeCliente, totalPedido, transicionesDesde, transicionPermitida,
  type Dataset,
} from './consultas'
import { diasHasta, fechaCorta, fechaHora, moneda, plazoTexto } from './formato'
import { motivoRechazo, puede } from './permisos'
import type { Analisis } from './nlu'

export interface RespuestaAgente {
  texto: string
  tono: TonoMensaje
  herramienta?: string
  tabla?: TablaResultado
  propuesta?: PropuestaOperacion
  /** cuando el middleware rechaza por permisos, el chat lo registra en AUDITORIA */
  rechazo?: { entidad: string; registroId: number; operacion: string; capacidad: Capacidad }
  /** la creacion de OF necesita varios turnos: la resuelve lib/formularioOf.ts */
  iniciarFormulario?: 'CREAR_OF'
}

interface Ctx {
  ds: Dataset
  rol: Rol
  canal: Canal
  analisis: Analisis
}

const nuevoIdPropuesta = () => `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/* ------------------------------------------------------------------ tablas */

function tablaOrdenes(ds: Dataset, lista: OrdenFabricacion[], titulo: string, criterio: string): TablaResultado {
  return {
    tipo: 'of',
    titulo,
    criterio,
    columnas: ['OF', 'Cliente', 'Etapa', 'Prioridad', 'Fin estimado', 'Plazo'],
    filas: lista.map((o) => ({
      OF: o.numero,
      Cliente: clienteDeOf(ds, o)?.razon_social ?? '—',
      Etapa: o.estado,
      Prioridad: o.prioridad,
      'Fin estimado': fechaCorta(o.fecha_estimada_fin),
      Plazo: estaFinalizada(o) ? 'finalizada' : plazoTexto(o.fecha_estimada_fin),
    })),
    enlaces: lista.map((o) => o.numero),
  }
}

function tablaItems(ds: Dataset, lista: OfDetalle[], titulo: string, criterio: string): TablaResultado {
  return {
    tipo: 'items',
    titulo,
    criterio,
    columnas: ['Item', 'OF', 'Articulo', 'Descripcion', 'Cant.', 'Etapa'],
    filas: lista.map((i) => {
      const of = ofPorId(ds, i.of_id)
      const art = articuloPorId(i.articulo_id)
      return {
        Item: String(i.of_detalle_id),
        OF: of?.numero ?? '—',
        Articulo: art?.codigo ?? '—',
        Descripcion: art?.descripcion ?? '—',
        'Cant.': String(i.cantidad),
        Etapa: i.estado,
      }
    }),
    enlaces: lista.map((i) => ofPorId(ds, i.of_id)?.numero ?? null),
  }
}

function tablaPedidos(ds: Dataset, rol: Rol, titulo: string, criterio: string, pedidoIds: number[]): TablaResultado {
  const verMontos = puede(rol, 'ver_datos_comerciales')
  const columnas = ['Pedido', 'Cliente', 'OC cliente', 'Estado', 'Entrega pactada', 'OF']
  if (verMontos) columnas.push('Total estimado')

  const filas = pedidoIds.map((id) => {
    const p = ds.pedidos.find((x) => x.pedido_id === id)!
    const ofs = ds.ordenes.filter((o) => o.pedido_id === id)
    const fila: Record<string, string> = {
      Pedido: `#${p.pedido_id}`,
      Cliente: clientePorId(p.cliente_id)?.razon_social ?? '—',
      'OC cliente': p.numero_orden_cliente,
      Estado: p.estado,
      'Entrega pactada': fechaCorta(p.fecha_entrega_pactada),
      OF: ofs.map((o) => o.numero).join(', ') || '—',
    }
    if (verMontos) fila['Total estimado'] = moneda(totalPedido(ds, id))
    return fila
  })

  return { tipo: 'pedidos', titulo, criterio, columnas, filas }
}

/* ------------------------------------------------------------------ helpers */

function sinResultados(titulo: string): RespuestaAgente {
  return {
    texto: `No encontre registros que cumplan ese criterio (${titulo}). Puede que el filtro sea muy restrictivo o que no haya datos cargados.`,
    tono: 'normal',
  }
}

function listaItems(ds: Dataset, of: OrdenFabricacion): string {
  return itemsDeOf(ds, of.of_id)
    .map((i) => {
      const art = articuloPorId(i.articulo_id)
      return `  · item ${i.of_detalle_id} — ${art?.codigo ?? ''} ${art?.descripcion ?? ''} (${i.estado})`
    })
    .join('\n')
}

function pedirCliente(cands: ReturnType<typeof clientePorId>[], accion: string): RespuestaAgente {
  return {
    texto:
      `Hay mas de un cliente que coincide con lo que dijiste. ¿A cual te referis para ${accion}?\n` +
      cands.map((c) => `  · ${c?.razon_social}`).join('\n'),
    tono: 'aclaracion',
  }
}

/** Resuelve el item destino de una escritura. Devuelve el item, o un pedido de aclaracion. */
function resolverItem(ctx: Ctx, accion: string): { item: OfDetalle } | { aclaracion: RespuestaAgente } {
  const { ds, analisis } = ctx
  const { itemId, ofNumero } = analisis.slots

  if (itemId !== null) {
    const item = itemPorId(ds, itemId)
    if (!item) {
      return {
        aclaracion: {
          texto: `No existe un item con identificador ${itemId}. Verifica el numero o indicame la OF para listarte sus items.`,
          tono: 'error',
        },
      }
    }
    return { item }
  }

  if (ofNumero !== null) {
    const of = ofPorNumero(ds, String(ofNumero))
    if (!of) {
      return { aclaracion: { texto: `No encontre la OF-${ofNumero} en el sistema.`, tono: 'error' } }
    }
    const items = itemsDeOf(ds, of.of_id)
    if (items.length === 1) return { item: items[0] }
    return {
      aclaracion: {
        texto:
          `En el modelo de datos, ${accion} se registra sobre un ITEM de la OF (OF_DETALLE), no sobre la OF completa.\n` +
          `${of.numero} tiene ${items.length} items. ¿Sobre cual?\n${listaItems(ds, of)}`,
        tono: 'aclaracion',
      },
    }
  }

  return {
    aclaracion: {
      texto:
        `Me falta el identificador para ${accion}. Decime el numero de item (por ejemplo "item 333") ` +
        `o el numero de OF para que te liste sus items. No voy a asumir cual es por mi cuenta.`,
      tono: 'aclaracion',
    },
  }
}

/* ================================================================== */

export function responder(ctx: Ctx): RespuestaAgente {
  const { ds, rol, canal, analisis } = ctx
  const { slots } = analisis
  const herramienta = analisis.herramienta !== '—' ? analisis.herramienta : undefined

  switch (analisis.intencion) {
    /* ---------------------------------------------- guardas */

    case 'datos_sensibles':
      return {
        texto:
          'No puedo acceder a credenciales, claves bancarias, datos salariales ni legajos: estan explicitamente ' +
          'excluidos del alcance del asistente. Si necesitas ese tipo de informacion, corresponde pedirla por el ' +
          'canal interno habilitado.',
        tono: 'rechazo',
      }

    case 'fuera_de_alcance':
      return {
        texto:
          'Esa consulta esta fuera de mi alcance operativo. Solo trabajo con clientes, pedidos, articulos, ordenes ' +
          'de fabricacion, items, etapas y comentarios de taller del ERP. El mantenimiento de maquinas tambien ' +
          'quedo fuera del alcance definido. No voy a inventar una respuesta.',
        tono: 'fuera_alcance',
      }

    case 'ayuda':
    case 'saludo':
      return { texto: textoAyuda(rol), tono: 'normal' }

    /* ---------------------------------------------- escrituras */

    case 'actualizar_estado': {
      if (!puede(rol, 'actualizar_estado')) {
        return {
          texto: motivoRechazo(rol, 'actualizar_estado') + ' No se ejecuto ningun cambio.',
          tono: 'rechazo',
          rechazo: {
            entidad: 'OF_DETALLE',
            registroId: slots.itemId ?? slots.ofNumero ?? 0,
            operacion: 'ACTUALIZAR_ESTADO',
            capacidad: 'actualizar_estado',
          },
        }
      }

      const r = resolverItem(ctx, 'el cambio de etapa')
      if ('aclaracion' in r) return r.aclaracion
      const item = r.item
      const of = ofPorId(ds, item.of_id)!

      if (!slots.etapa) {
        const opciones = transicionesDesde(item.estado)
        return {
          texto:
            `El item ${item.of_detalle_id} de ${of.numero} esta en "${item.estado}". ` +
            `¿A que etapa lo paso?\n` +
            (opciones.length
              ? opciones.map((e) => `  · ${e.nombre}`).join('\n')
              : '  (el catalogo del ERP no habilita transiciones desde esta etapa)'),
          tono: 'aclaracion',
        }
      }

      if (!transicionPermitida(item.estado, slots.etapa.nombre)) {
        const opciones = transicionesDesde(item.estado)
        return {
          texto:
            `El catalogo de etapas del ERP no permite pasar el item ${item.of_detalle_id} de ` +
            `"${item.estado}" a "${slots.etapa.nombre}". No se ejecuto ningun cambio.\n` +
            (opciones.length
              ? `Transiciones habilitadas desde "${item.estado}": ${opciones.map((e) => e.nombre).join(', ')}.`
              : `"${item.estado}" es una etapa final.`),
          tono: 'rechazo',
        }
      }

      const art = articuloPorId(item.articulo_id)
      const propuesta: PropuestaOperacion = {
        id: nuevoIdPropuesta(),
        tipo: 'ACTUALIZAR_ESTADO_ITEM',
        titulo: 'Actualizar etapa de produccion',
        entidad: 'OF_DETALLE',
        registro: `Item ${item.of_detalle_id} · ${of.numero}`,
        registro_id: item.of_detalle_id,
        estadoActual: item.estado,
        cambioPropuesto: slots.etapa.nombre,
        campos: [
          { label: 'Orden de fabricacion', valor: of.numero },
          { label: 'Cliente', valor: clienteDeOf(ds, of)?.razon_social ?? '—' },
          { label: 'Item', valor: `${item.of_detalle_id} (item ${item.numero_item})` },
          { label: 'Articulo', valor: `${art?.codigo ?? ''} — ${art?.descripcion ?? ''}` },
          { label: 'Cantidad', valor: `${item.cantidad} ${art?.unidad_medida ?? ''}` },
          { label: 'Etapa actual', valor: item.estado },
          { label: 'Etapa propuesta', valor: slots.etapa.nombre, resaltado: true },
        ],
        requiereAprobacion: slots.etapa.requiere_aprobacion
          ? `La etapa "${slots.etapa.nombre}" esta marcada como requiere_aprobacion en el catalogo del ERP.`
          : undefined,
        payload: { of_detalle_id: item.of_detalle_id, etapa_id: slots.etapa.etapa_id },
      }

      return {
        texto:
          `Entendi que queres pasar el item ${item.of_detalle_id} de ${of.numero} de "${item.estado}" a ` +
          `"${slots.etapa.nombre}". Revisa el resumen y confirma para que se ejecute.`,
        tono: 'normal',
        herramienta,
        propuesta,
      }
    }

    case 'agregar_comentario': {
      if (!puede(rol, 'agregar_comentario')) {
        return {
          texto: motivoRechazo(rol, 'agregar_comentario') + ' No se registro ningun comentario.',
          tono: 'rechazo',
          rechazo: {
            entidad: 'COMENTARIO_TALLER',
            registroId: slots.itemId ?? 0,
            operacion: 'CREAR_COMENTARIO',
            capacidad: 'agregar_comentario',
          },
        }
      }

      const r = resolverItem(ctx, 'el comentario de taller')
      if ('aclaracion' in r) return r.aclaracion
      const item = r.item
      const of = ofPorId(ds, item.of_id)!

      if (!slots.comentario) {
        return {
          texto:
            `Listo para registrar el comentario sobre el item ${item.of_detalle_id} de ${of.numero}. ` +
            `¿Que texto queres dejar? Podes dictarlo o escribirlo despues de dos puntos, por ejemplo: ` +
            `"comentario al item ${item.of_detalle_id}: falta material para continuar".`,
          tono: 'aclaracion',
        }
      }

      const tipo = slots.tipoComentario ?? 'Observacion'
      const propuesta: PropuestaOperacion = {
        id: nuevoIdPropuesta(),
        tipo: 'AGREGAR_COMENTARIO',
        titulo: 'Registrar comentario de taller',
        entidad: 'COMENTARIO_TALLER',
        registro: `Item ${item.of_detalle_id} · ${of.numero}`,
        registro_id: item.of_detalle_id,
        estadoActual: null,
        cambioPropuesto: slots.comentario,
        campos: [
          { label: 'Orden de fabricacion', valor: of.numero },
          { label: 'Item', valor: `${item.of_detalle_id} (etapa ${item.estado})` },
          { label: 'Tipo', valor: tipo },
          { label: 'Canal', valor: canal === 'voz' ? 'Dictado por voz' : 'Texto' },
          { label: 'Texto', valor: slots.comentario, resaltado: true },
        ],
        payload: { of_detalle_id: item.of_detalle_id, texto: slots.comentario, tipo },
      }

      return {
        texto: `Preparé el comentario sobre el item ${item.of_detalle_id} de ${of.numero}. Revisalo y confirma.`,
        tono: 'normal',
        herramienta,
        propuesta,
      }
    }

    case 'crear_of': {
      if (!puede(rol, 'crear_of')) {
        return {
          texto: motivoRechazo(rol, 'crear_of') + ' No se creo ninguna orden.',
          tono: 'rechazo',
          rechazo: {
            entidad: 'ORDEN_FABRICACION',
            registroId: 0,
            operacion: 'CREAR',
            capacidad: 'crear_of',
          },
        }
      }
      // Crear una OF necesita varios datos, asi que no se resuelve en un solo turno:
      // el chat abre el formulario de lib/formularioOf.ts y pide un campo por vez.
      return { texto: '', tono: 'normal', herramienta, iniciarFormulario: 'CREAR_OF' }
    }

    /* ---------------------------------------------- consultas */

    case 'consultar_of_atrasadas': {
      const lista = ordenesAtrasadas(ds)
      if (!lista.length) return sinResultados('OF atrasadas')
      return {
        texto: `Hay ${lista.length} orden(es) de fabricacion con la fecha estimada de fin vencida y sin finalizar, ordenadas de la mas atrasada a la menos atrasada.`,
        tono: 'normal',
        herramienta,
        tabla: tablaOrdenes(ds, lista, 'OF atrasadas', 'fecha_estimada_fin < hoy y estado != Finalizado · orden ascendente por fecha'),
      }
    }

    case 'consultar_pedidos_atrasados': {
      if (!puede(rol, 'consultar_pedidos')) {
        return {
          texto: motivoRechazo(rol, 'consultar_pedidos') + ' Puedo mostrarte las OF atrasadas si te sirve.',
          tono: 'rechazo',
          rechazo: { entidad: 'PEDIDO', registroId: 0, operacion: 'CONSULTAR', capacidad: 'consultar_pedidos' },
        }
      }
      const lista = ds.pedidos
        .filter((p) => p.estado !== 'Entregado' && p.estado !== 'Cerrado' && diasHasta(p.fecha_entrega_pactada) < 0)
        .sort((a, b) => +new Date(a.fecha_entrega_pactada) - +new Date(b.fecha_entrega_pactada))
      if (!lista.length) return sinResultados('pedidos atrasados')
      return {
        texto: `Hay ${lista.length} pedido(s) con la fecha de entrega pactada vencida y todavia sin entregar.`,
        tono: 'normal',
        herramienta,
        tabla: tablaPedidos(
          ds,
          rol,
          'Pedidos atrasados',
          'fecha_entrega_pactada < hoy y estado no entregado/cerrado · orden ascendente',
          lista.map((p) => p.pedido_id),
        ),
      }
    }

    case 'consultar_of_por_vencer': {
      const lista = ordenesPorVencer(ds, 7)
      if (!lista.length) return sinResultados('OF que vencen en los proximos 7 dias')
      return {
        texto: `Hay ${lista.length} OF con fin estimado dentro de los proximos 7 dias, de la mas proxima a la mas lejana.`,
        tono: 'normal',
        herramienta,
        tabla: tablaOrdenes(ds, lista, 'OF proximas a vencer', 'fin estimado entre hoy y hoy+7 · orden ascendente por fecha'),
      }
    }

    case 'consultar_of_pendientes': {
      const lista = ordenesPendientes(ds)
      if (!lista.length) return sinResultados('OF pendientes de iniciar')
      return {
        texto: `Hay ${lista.length} OF en la etapa inicial "${ETAPAS[0].nombre}", es decir sin iniciar en planta.`,
        tono: 'normal',
        herramienta,
        tabla: tablaOrdenes(ds, lista, 'OF pendientes de iniciar', `estado = ${ETAPAS[0].nombre}`),
      }
    }

    case 'consultar_of_por_etapa': {
      if (!slots.etapa) return sinResultados('OF por etapa')
      const lista = ordenesPorEtapa(ds, slots.etapa.nombre)
      if (!lista.length) return sinResultados(`OF en etapa ${slots.etapa.nombre}`)
      return {
        texto: `Hay ${lista.length} OF cuya etapa actual es "${slots.etapa.nombre}". Recorda que la etapa de la OF es la minima de sus items.`,
        tono: 'normal',
        herramienta,
        tabla: tablaOrdenes(ds, lista, `OF en etapa ${slots.etapa.nombre}`, `estado = ${slots.etapa.nombre}`),
      }
    }

    case 'consultar_of_detalle': {
      const of = slots.ofNumero !== null ? ofPorNumero(ds, String(slots.ofNumero)) : undefined
      if (!of) {
        return { texto: `No encontre la OF-${slots.ofNumero} en el sistema. Verifica el numero.`, tono: 'error' }
      }
      const cliente = clienteDeOf(ds, of)
      const pedido = pedidoDeOf(ds, of)
      const items = itemsDeOf(ds, of.of_id)
      const dias = diasHasta(of.fecha_estimada_fin)
      const alerta = estaFinalizada(of)
        ? 'Finalizada.'
        : dias < 0
          ? `ATRASADA: ${Math.abs(dias)} dias respecto del fin estimado.`
          : `Fin estimado ${plazoTexto(of.fecha_estimada_fin)}.`

      return {
        texto:
          `${of.numero} — ${cliente?.razon_social ?? 'cliente no resuelto'}\n` +
          `Etapa actual: ${of.estado} (es la minima de sus ${items.length} items)\n` +
          `Pedido de origen: #${pedido?.pedido_id ?? '—'} · OC ${pedido?.numero_orden_cliente ?? '—'}\n` +
          `Emision: ${fechaCorta(of.fecha_emision)} · Fin estimado: ${fechaCorta(of.fecha_estimada_fin)}\n` +
          `Prioridad: ${of.prioridad}. ${alerta}`,
        tono: 'normal',
        herramienta,
        tabla: tablaItems(ds, items, `Items de ${of.numero}`, `of_id = ${of.of_id}`),
      }
    }

    case 'consultar_items_of': {
      if (slots.itemId !== null) {
        const item = itemPorId(ds, slots.itemId)
        if (!item) return { texto: `No existe un item con identificador ${slots.itemId}.`, tono: 'error' }
        const of = ofPorId(ds, item.of_id)!
        const art = articuloPorId(item.articulo_id)
        const coms = comentariosDeItem(ds, item.of_detalle_id)
        return {
          texto:
            `Item ${item.of_detalle_id} (item ${item.numero_item} de ${of.numero})\n` +
            `Articulo: ${art?.codigo} — ${art?.descripcion}\n` +
            `Material: ${art?.material} · Norma: ${art?.norma}\n` +
            `Cantidad: ${item.cantidad} ${art?.unidad_medida} · Partida: ${item.partida || '—'}\n` +
            `Etapa actual: ${item.estado}\n` +
            `Cliente: ${clienteDeOf(ds, of)?.razon_social ?? '—'}` +
            (coms.length ? `\nComentarios de taller registrados: ${coms.length}` : ''),
          tono: 'normal',
          herramienta,
          tabla: tablaItems(ds, [item], `Item ${item.of_detalle_id}`, `of_detalle_id = ${item.of_detalle_id}`),
        }
      }

      const of = slots.ofNumero !== null ? ofPorNumero(ds, String(slots.ofNumero)) : undefined
      if (!of) return { texto: 'Decime de que OF queres ver los items.', tono: 'aclaracion' }
      const items = itemsDeOf(ds, of.of_id)
      if (!items.length) return sinResultados(`items de ${of.numero}`)
      return {
        texto: `${of.numero} tiene ${items.length} item(s).`,
        tono: 'normal',
        herramienta,
        tabla: tablaItems(ds, items, `Items de ${of.numero}`, `of_id = ${of.of_id}`),
      }
    }

    case 'consultar_items_cliente': {
      if (slots.clientes.length > 1) return pedirCliente(slots.clientes, 'listar sus items')
      if (!slots.clientes.length) {
        return { texto: '¿De que cliente queres ver los items? Decime la razon social.', tono: 'aclaracion' }
      }
      const cliente = slots.clientes[0]
      const items = itemsDeCliente(ds, cliente.cliente_id)
      if (!items.length) return sinResultados(`items de ${cliente.razon_social}`)
      return {
        texto: `${cliente.razon_social} tiene ${items.length} item(s) en fabricacion o fabricados.`,
        tono: 'normal',
        herramienta,
        tabla: tablaItems(
          ds,
          items,
          `Items de ${cliente.razon_social}`,
          `join OF_DETALLE -> ORDEN_FABRICACION -> PEDIDO -> CLIENTE (cliente_id = ${cliente.cliente_id})`,
        ),
      }
    }

    case 'consultar_of_cliente': {
      if (slots.clientes.length > 1) return pedirCliente(slots.clientes, 'listar sus OF')
      if (!slots.clientes.length) {
        const lista = slots.ordenarPorFecha ? ordenesOrdenadasPorEntrega(ds.ordenes) : ds.ordenes
        return {
          texto: `Hay ${lista.length} ordenes de fabricacion cargadas. Si queres, filtra por cliente, por etapa o por fecha de entrega.`,
          tono: 'normal',
          herramienta,
          tabla: tablaOrdenes(ds, lista, 'Todas las OF', slots.ordenarPorFecha ? 'orden ascendente por fin estimado' : 'sin filtro'),
        }
      }
      const cliente = slots.clientes[0]
      let lista = ordenesDeCliente(ds, cliente.cliente_id)
      if (slots.etapa) lista = lista.filter((o) => o.estado === slots.etapa!.nombre)
      if (slots.ordenarPorFecha) lista = ordenesOrdenadasPorEntrega(lista)
      if (!lista.length) return sinResultados(`OF de ${cliente.razon_social}`)
      return {
        texto: `${cliente.razon_social} tiene ${lista.length} orden(es) de fabricacion.`,
        tono: 'normal',
        herramienta,
        tabla: tablaOrdenes(
          ds,
          lista,
          `OF de ${cliente.razon_social}`,
          `cliente_id = ${cliente.cliente_id}${slots.etapa ? ` · etapa = ${slots.etapa.nombre}` : ''}${slots.ordenarPorFecha ? ' · orden por fin estimado' : ''}`,
        ),
      }
    }

    case 'consultar_pedidos_cliente': {
      if (!puede(rol, 'consultar_pedidos')) {
        return {
          texto: motivoRechazo(rol, 'consultar_pedidos') + ' Si necesitas el avance de una OF, preguntame por su numero.',
          tono: 'rechazo',
          rechazo: { entidad: 'PEDIDO', registroId: 0, operacion: 'CONSULTAR', capacidad: 'consultar_pedidos' },
        }
      }
      if (slots.clientes.length > 1) return pedirCliente(slots.clientes, 'listar sus pedidos')

      if (!slots.clientes.length) {
        const ids = ds.pedidos.map((p) => p.pedido_id)
        return {
          texto: `Hay ${ids.length} pedidos cargados. Decime un cliente para filtrarlos.`,
          tono: 'normal',
          herramienta,
          tabla: tablaPedidos(ds, rol, 'Todos los pedidos', 'sin filtro', ids),
        }
      }

      const cliente = slots.clientes[0]
      const lista = pedidosDeCliente(ds, cliente.cliente_id)
      if (!lista.length) return sinResultados(`pedidos de ${cliente.razon_social}`)
      const ids = (slots.ordenarPorFecha
        ? [...lista].sort((a, b) => +new Date(a.fecha_entrega_pactada) - +new Date(b.fecha_entrega_pactada))
        : lista
      ).map((p) => p.pedido_id)
      return {
        texto: `${cliente.razon_social} tiene ${lista.length} pedido(s) registrado(s).`,
        tono: 'normal',
        herramienta,
        tabla: tablaPedidos(
          ds,
          rol,
          `Pedidos de ${cliente.razon_social}`,
          `cliente_id = ${cliente.cliente_id}${slots.ordenarPorFecha ? ' · orden por entrega pactada' : ''}`,
          ids,
        ),
      }
    }

    case 'consultar_clientes': {
      if (!puede(rol, 'consultar_clientes')) {
        return {
          texto: motivoRechazo(rol, 'consultar_clientes') + ' En las OF si podes ver a que cliente corresponden.',
          tono: 'rechazo',
          rechazo: { entidad: 'CLIENTE', registroId: 0, operacion: 'CONSULTAR', capacidad: 'consultar_clientes' },
        }
      }
      const lista = slots.clientes.length ? slots.clientes : CLIENTES.filter((c) => c.estado === 'Activo')
      return {
        texto: `${lista.length} cliente(s).`,
        tono: 'normal',
        herramienta,
        tabla: {
          tipo: 'clientes',
          titulo: slots.clientes.length ? 'Clientes que coinciden' : 'Clientes',
          criterio: slots.clientes.length ? 'coincidencia por razon social' : 'estado = Activo',
          columnas: ['Cliente', 'CUIT', 'Localidad', 'Provincia', 'Pedidos', 'OF'],
          filas: lista.map((c) => ({
            Cliente: c.razon_social,
            CUIT: c.cuit,
            Localidad: c.localidad,
            Provincia: c.provincia,
            Pedidos: String(pedidosDeCliente(ds, c.cliente_id).length),
            OF: String(ordenesDeCliente(ds, c.cliente_id).length),
          })),
        },
      }
    }

    case 'consultar_articulos': {
      const lista = ARTICULOS.filter((a) => a.activo)
      return {
        texto: `El catalogo tiene ${lista.length} articulos activos.`,
        tono: 'normal',
        herramienta,
        tabla: {
          tipo: 'articulos',
          titulo: 'Catalogo de articulos',
          criterio: 'activo = true',
          columnas: ['Codigo', 'Descripcion', 'Tipo', 'Material', 'Norma', 'Dimensiones'],
          filas: lista.map((a) => ({
            Codigo: a.codigo,
            Descripcion: a.descripcion,
            Tipo: a.tipo,
            Material: a.material,
            Norma: a.norma,
            Dimensiones: a.dimensiones,
          })),
        },
      }
    }

    case 'consultar_comentarios': {
      const coms =
        slots.itemId !== null
          ? comentariosDeItem(ds, slots.itemId)
          : slots.ofNumero !== null
            ? (() => {
                const of = ofPorNumero(ds, String(slots.ofNumero))
                return of ? comentariosDeOf(ds, of.of_id) : []
              })()
            : [...ds.comentarios].sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora)).slice(0, 20)

      if (!coms.length) return sinResultados('comentarios de taller')

      return {
        texto: `${coms.length} comentario(s) de taller.`,
        tono: 'normal',
        herramienta,
        tabla: {
          tipo: 'comentarios',
          titulo: 'Comentarios de taller',
          criterio:
            slots.itemId !== null
              ? `of_detalle_id = ${slots.itemId}`
              : slots.ofNumero !== null
                ? `items de OF-${slots.ofNumero}`
                : 'ultimos 20',
          columnas: ['Fecha', 'Item', 'OF', 'Tipo', 'Autor', 'Canal', 'Texto'],
          filas: coms.map((c) => {
            const item = itemPorId(ds, c.of_detalle_id)
            const of = item ? ofPorId(ds, item.of_id) : undefined
            return {
              Fecha: fechaHora(c.fecha_hora),
              Item: String(c.of_detalle_id),
              OF: of?.numero ?? '—',
              Tipo: c.tipo,
              Autor: empleadoPorId(c.empleado_id)?.nombre ?? '—',
              Canal: c.archivo_audio ? 'Voz' : 'Texto',
              Texto: c.texto,
            }
          }),
          enlaces: coms.map((c) => {
            const item = itemPorId(ds, c.of_detalle_id)
            return item ? (ofPorId(ds, item.of_id)?.numero ?? null) : null
          }),
        },
      }
    }

    case 'consultar_auditoria': {
      if (!puede(rol, 'consultar_auditoria')) {
        return {
          texto: motivoRechazo(rol, 'consultar_auditoria'),
          tono: 'rechazo',
          rechazo: { entidad: 'AUDITORIA', registroId: 0, operacion: 'CONSULTAR', capacidad: 'consultar_auditoria' },
        }
      }
      const lista = [...ds.auditoria].sort((a, b) => +new Date(b.fecha_hora) - +new Date(a.fecha_hora)).slice(0, 20)
      return {
        texto: `Ultimos ${lista.length} registros de auditoria.`,
        tono: 'normal',
        herramienta,
        tabla: {
          tipo: 'auditoria',
          titulo: 'Auditoria',
          criterio: 'ultimos 20 por fecha descendente',
          columnas: ['Fecha', 'Usuario', 'Entidad', 'Registro', 'Operacion', 'Resultado', 'Canal'],
          filas: lista.map((a) => ({
            Fecha: fechaHora(a.fecha_hora),
            Usuario: empleadoPorId(a.empleado_id)?.nombre ?? '—',
            Entidad: a.entidad,
            Registro: String(a.registro_id),
            Operacion: a.operacion,
            Resultado: a.resultado,
            Canal: a.canal,
          })),
        },
      }
    }

    /* ---------------------------------------------- sin interpretacion */

    default:
      return {
        texto:
          'No logre interpretar la solicitud.\n\n' +
          'Importante para la demo: la comprension de lenguaje natural aca esta SIMULADA con reglas, no con un ' +
          'modelo generativo. Un LLM real resolveria frases que este analizador no cubre. Este es, justamente, ' +
          'el limite que T-09 señala de la automatizacion por reglas.\n\n' +
          'Probá con algo como: "listame los pedidos de Petrosur", "mostrame las OF atrasadas", ' +
          '"¿en que estado esta la OF-211?" o "pasá el item 333 a tratamiento".',
        tono: 'error',
      }
  }
}

function textoAyuda(rol: Rol): string {
  const comun = [
    '  · "mostrame las OF atrasadas"',
    '  · "listame las OF proximas a vencer y ordenalas"',
    '  · "¿en que estado esta la OF-211?"',
    '  · "mostrame los items de la OF-211"',
    '  · "¿que OF siguen pendientes de iniciar?"',
    '  · "mostrame los comentarios del item 333"',
  ]
  const porRol: Record<Rol, string[]> = {
    ADMINISTRACION: [
      '  · "listame los pedidos de Petrosur"',
      '  · "mostrame los clientes"',
      '  · "crear una OF para el pedido 1004"',
    ],
    OPERARIO: ['  · "agregá un comentario al item 333: falta material para continuar"'],
    JEFE_PRODUCCION: [
      '  · "pasá el item 333 a tratamiento"',
      '  · "agregá un comentario al item 333: observacion sobre la rosca"',
      '  · "mostrame la auditoria"',
    ],
  }
  return (
    `Soy el asistente operativo de BRIMEC. Trabajo con clientes, pedidos, articulos, ordenes de fabricacion, ` +
    `items, etapas y comentarios de taller.\n\nPodes pedirme, por ejemplo:\n` +
    [...comun, ...porRol[rol]].join('\n') +
    `\n\nToda operacion de escritura te muestra un resumen y pide confirmacion antes de ejecutarse.`
  )
}
