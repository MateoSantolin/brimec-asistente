/**
 * NLU SIMULADA.
 *
 * ===================================================================
 * ESTO NO ES UN MODELO DE LENGUAJE. Es un analizador por reglas.
 * ===================================================================
 *
 * En la solucion propuesta (T-10) este paso lo resuelve un LLM con tool calling.
 * Aqui se reemplaza por reglas, PERO deliberadamente tolerantes, porque T-09 descarta
 * la "automatizacion basada en reglas" justamente por ser rigida:
 *
 *   - normaliza acentos, mayusculas y puntuacion
 *   - acepta sinonimos de taller ("torno", "cnc" -> Mecanizado)
 *   - tolera errores de tipeo y de transcripcion de voz (coincidencia difusa)
 *   - reconoce al cliente aunque se lo nombre parcialmente ("petro sur", "pampeana")
 *   - detecta datos faltantes y devuelve que slot falta, para repreguntar
 *   - detecta ambiguedad (varios clientes posibles) en lugar de adivinar
 *
 * Limite honesto: no entiende frases que no encajen en ninguna plantilla, no maneja
 * correferencia compleja ni razonamiento. Eso es exactamente lo que aportaria el LLM.
 */
import type { Cliente, EtapaProduccion } from '@/types'
import { CLIENTES, ETAPAS } from '@/data/seed'
import { metaEtapa } from './consultas'
import { aliasDeRazonSocial, normalizar, similitud } from './texto'

export type Intencion =
  | 'consultar_pedidos_cliente'
  | 'consultar_of_cliente'
  | 'consultar_of_atrasadas'
  | 'consultar_pedidos_atrasados'
  | 'consultar_of_por_vencer'
  | 'consultar_of_pendientes'
  | 'consultar_of_por_etapa'
  | 'consultar_of_detalle'
  | 'consultar_items_of'
  | 'consultar_items_cliente'
  | 'consultar_clientes'
  | 'consultar_articulos'
  | 'consultar_comentarios'
  | 'consultar_auditoria'
  | 'actualizar_estado'
  | 'agregar_comentario'
  | 'crear_of'
  | 'datos_sensibles'
  | 'fuera_de_alcance'
  | 'ayuda'
  | 'saludo'
  | 'desconocido'

export interface Slots {
  clientes: Cliente[]
  ofNumero: number | null
  itemId: number | null
  etapa: EtapaProduccion | null
  comentario: string | null
  tipoComentario: 'Observacion' | 'Incidencia' | 'Avance' | null
  ordenarPorFecha: boolean
  pedidoId: number | null
}

export interface Analisis {
  intencion: Intencion
  /** herramienta que el agente invocaria en el middleware (trazabilidad del tool calling) */
  herramienta: string
  slots: Slots
  /** 0..1, solo informativo: se muestra en la UI para recordar que es una simulacion */
  confianza: number
}

/* ------------------------------------------------------------------ detectores */

const vacio = (): Slots => ({
  clientes: [],
  ofNumero: null,
  itemId: null,
  etapa: null,
  comentario: null,
  tipoComentario: null,
  ordenarPorFecha: false,
  pedidoId: null,
})

function ngramas(texto: string, maxN = 4): string[] {
  const t = texto.split(' ').filter(Boolean)
  const out: string[] = []
  for (let n = Math.min(maxN, t.length); n >= 1; n--) {
    for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n).join(' '))
  }
  return out
}

/** Busca clientes nombrados dentro de la frase, sin exigir que se escriba la razon social completa. */
export function detectarClientes(textoNorm: string): Cliente[] {
  const grams = ngramas(textoNorm)
  const puntajes = new Map<number, number>()

  for (const c of CLIENTES) {
    const formas = [normalizar(c.razon_social), ...aliasDeRazonSocial(c.razon_social)]
      .filter((f) => f.length >= 4) // evita que siglas de 2-3 letras disparen falsos positivos
    let mejor = 0
    for (const g of grams) {
      if (g.length < 4) continue
      for (const f of formas) {
        const p = f === g ? 1 : f.startsWith(g) && g.length >= 5 ? 0.93 : similitud(g, f)
        if (p > mejor) mejor = p
      }
    }
    if (mejor >= 0.84) puntajes.set(c.cliente_id, mejor)
  }

  return [...puntajes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => CLIENTES.find((c) => c.cliente_id === id)!)
}

/** Resuelve una etapa a partir de su nombre o de un sinonimo de taller. */
export function detectarEtapa(textoNorm: string): EtapaProduccion | null {
  // prioriza lo que venga despues de "a " / "para " / "paso a"
  const explicito = textoNorm.match(/(?:paso a|pasa a|pasarla a|a la etapa|a etapa|a)\s+([a-z\s]{3,24})$/)
  const candidatos = explicito ? [explicito[1].trim(), textoNorm] : [textoNorm]

  let mejorEtapa: EtapaProduccion | null = null
  let mejorPuntaje = 0

  for (const [idx, fuente] of candidatos.entries()) {
    // el bonus solo vale cuando la fuente es el fragmento explicito ("... a mecanizado"),
    // no cuando se barre la frase completa: ahi bajaria el umbral y generaria falsos
    // positivos (p. ej. "horno" contra el sinonimo "torno").
    const bonus = explicito && idx === 0 ? 0.04 : 0
    const grams = ngramas(fuente, 3)
    for (const e of ETAPAS) {
      const formas = [normalizar(e.nombre), ...(metaEtapa(e.etapa_id)?.sinonimos ?? []).map(normalizar)]
      for (const g of grams) {
        if (g.length < 4) continue
        for (const f of formas) {
          const p = (f === g ? 1 : similitud(g, f)) + bonus
          if (p >= 0.84 && p > mejorPuntaje) {
            mejorPuntaje = p
            mejorEtapa = e
          }
        }
      }
    }
    if (mejorEtapa) break
  }
  return mejorEtapa
}

function detectarOf(textoNorm: string): number | null {
  const m =
    textoNorm.match(/\bof[\s.-]*(\d{2,5})\b/) ??
    textoNorm.match(/\borden(?:\s+de\s+fabricacion)?[\s.-]*(?:n[ro°]*\.?\s*)?(\d{2,5})\b/)
  return m ? Number(m[1]) : null
}

function detectarItem(textoNorm: string): number | null {
  const m =
    textoNorm.match(/\bit?e?m[\s.-]*(\d{2,5})\b/) ??
    textoNorm.match(/\bitm[\s.-]*(\d{2,5})\b/) ??
    textoNorm.match(/\bpieza[\s.-]*(\d{2,5})\b/)
  return m ? Number(m[1]) : null
}

function detectarPedido(textoNorm: string): number | null {
  const m = textoNorm.match(/\bped(?:ido)?[\s.-]*(?:n[ro°]*\.?\s*)?(\d{3,6})\b/)
  return m ? Number(m[1]) : null
}

/** El texto del comentario se toma del ORIGINAL para conservar acentos y mayusculas. */
function detectarComentario(original: string): string | null {
  const i = original.indexOf(':')
  if (i >= 0 && original.slice(i + 1).trim().length > 2) return original.slice(i + 1).trim()

  const m = original.match(
    /(?:coment(?:ario|a|á|ale|ar)?|anot(?:a|á|ar)|novedad(?:es)?|observaci[oó]n|incidencia)\s+(?:que\s+)?(.{4,})$/i,
  )
  if (m) {
    let t = m[1].trim()
    // quita el destino si quedo pegado ("a la of 203 falta material")
    t = t.replace(/^(?:a|en|sobre|para|de)\s+(?:la\s+|el\s+)?(?:of|orden|item|itm|pieza)[\s.-]*\d{2,5}\s*/i, '')
    return t.length > 2 ? t.trim() : null
  }
  return null
}

function detectarTipoComentario(textoNorm: string): Slots['tipoComentario'] {
  if (/\bincidencia|problema|falla|rotur|no se puede|frena|parad/.test(textoNorm)) return 'Incidencia'
  if (/\bavance|termin|listo|lista|complet|arranc/.test(textoNorm)) return 'Avance'
  if (/\bobservacion|observa/.test(textoNorm)) return 'Observacion'
  return null
}

/* ------------------------------------------------------------------ guardas */

const RE_SENSIBLE =
  /\b(clave|claves|contrasena|password|bancari|banco|cbu|alias\s+bancario|sueldo|salario|haberes|legajo|credencial|token|api\s*key|tarjeta|cuenta\s+corriente|facturacion\s+afip)\b/

const RE_FUERA_ALCANCE =
  /\b(precio del acero|cotizacion del dolar|dolar|clima|el tiempo|futbol|receta|chiste|noticias?|quien sos|que hora es|mantenimiento (de |del )?(la )?(maquina|maquinas|torno|equipo)|mantenimiento preventivo)\b/

const RE_AYUDA = /\b(ayuda|que podes hacer|que puedo preguntar|como funciona|ejemplos|opciones|comandos)\b/

const RE_SALUDO = /^(hola|buenas|buen dia|buenas tardes|buenas noches|gracias|chau|adios|ok|dale)\b/

/* ------------------------------------------------------------------ analizar */

export function analizar(textoOriginal: string): Analisis {
  const t = normalizar(textoOriginal)
  const slots = vacio()

  slots.ofNumero = detectarOf(t)
  slots.itemId = detectarItem(t)
  slots.pedidoId = detectarPedido(t)
  slots.clientes = detectarClientes(t)
  slots.ordenarPorFecha = /\borden(a|ala|alas|ar|adas|á)|de la mas proxima|mas proxim|por fecha|cronolog/.test(t)

  const armar = (intencion: Intencion, herramienta: string, confianza = 0.9): Analisis => ({
    intencion,
    herramienta,
    slots,
    confianza,
  })

  /* --- guardas que deben evaluarse primero --- */
  if (RE_SENSIBLE.test(t)) return armar('datos_sensibles', '—', 0.99)
  if (RE_FUERA_ALCANCE.test(t)) return armar('fuera_de_alcance', '—', 0.95)
  if (RE_AYUDA.test(t)) return armar('ayuda', '—', 0.99)

  /* --- escrituras (se evaluan antes que las lecturas) --- */

  const pideComentario = /\bcoment|anot|novedad|observaci|incidencia\b/.test(t)
  const pideCrearOf =
    /\b(cre(a|á|ar|ame|eme)|generar?|gener(a|á)|dar de alta|alta de|nueva|nuevo)\b/.test(t) &&
    /\b(of|orden de fabricacion|orden)\b/.test(t) &&
    !pideComentario
  const etapaDetectada = detectarEtapa(t)
  const verboDeCambio = /\b(actualiz|cambi|pas(a|o|ar|ale)|mov(e|er)|mand(a)|marc(a)|pon(e|er)|avanz)\w*\b/.test(t)
  // Un verbo suelto no alcanza: "la semana pasada" no es una orden de cambio de etapa.
  // Se exige ademas un destino (etapa) o un registro (OF/item) o la palabra estado/etapa.
  const hayObjetivoDeCambio =
    etapaDetectada !== null || slots.ofNumero !== null || slots.itemId !== null || /\bestado|etapa\b/.test(t)
  const pideActualizar = verboDeCambio && hayObjetivoDeCambio && !pideComentario && !pideCrearOf

  if (pideComentario) {
    slots.comentario = detectarComentario(textoOriginal)
    slots.tipoComentario = detectarTipoComentario(t)
    return armar('agregar_comentario', 'registrar_comentario_taller', slots.comentario ? 0.9 : 0.72)
  }

  if (pideCrearOf) {
    return armar('crear_of', 'crear_orden_fabricacion', 0.86)
  }

  if (pideActualizar) {
    slots.etapa = etapaDetectada
    return armar('actualizar_estado', 'actualizar_estado_item', slots.etapa ? 0.9 : 0.7)
  }

  /* --- consultas --- */

  if (/\bauditoria|historial de cambios|quien (cambio|modifico|actualizo)|trazabilidad\b/.test(t)) {
    return armar('consultar_auditoria', 'consultar_auditoria')
  }

  if (/\batrasad|vencid|demorad|fuera de (plazo|termino)|pasad(a|as) de fecha\b/.test(t)) {
    // T-09 usa como ejemplo "¿Que pedidos estan atrasados?": el atraso del PEDIDO se mide
    // contra fecha_entrega_pactada, no contra la fecha estimada de fin de la OF.
    if (/\bpedidos?\b/.test(t)) return armar('consultar_pedidos_atrasados', 'consultar_pedidos_atrasados', 0.93)
    return armar('consultar_of_atrasadas', 'consultar_of_atrasadas', 0.95)
  }

  if (/\b(proxim\w*\s+a\s+(su\s+)?(vencer|fecha|entrega)|por vencer|vencen|urgent|esta semana|estan por)\b/.test(t)) {
    return armar('consultar_of_por_vencer', 'consultar_of_por_vencer', 0.93)
  }

  if (/\bpendientes? de iniciar|sin iniciar|no iniciad|sin arrancar|todavia no empez\b/.test(t)) {
    return armar('consultar_of_pendientes', 'consultar_of_por_etapa', 0.92)
  }

  if (pideComentario || /\bcomentarios\b/.test(t)) {
    return armar('consultar_comentarios', 'consultar_comentarios_taller')
  }

  if (/\bcatalogo|articulos?\b/.test(t)) {
    return armar('consultar_articulos', 'consultar_articulos', 0.88)
  }

  const mencionaItems = /\bitems?\b|\bpiezas?\b/.test(t)
  const mencionaOf = /\bof\b|\borden(es)?\b|\bfabricacion\b/.test(t)
  const mencionaPedidos = /\bpedidos?\b/.test(t)
  const mencionaClientes = /\bclientes?\b/.test(t)

  if (slots.itemId !== null && !pideActualizar) {
    return armar('consultar_items_of', 'consultar_item', 0.93)
  }

  if (slots.ofNumero !== null) {
    if (mencionaItems) return armar('consultar_items_of', 'consultar_items_de_of', 0.94)
    return armar('consultar_of_detalle', 'consultar_of', 0.95)
  }

  if (mencionaPedidos) {
    return armar('consultar_pedidos_cliente', 'consultar_pedidos', slots.clientes.length ? 0.94 : 0.8)
  }

  if (mencionaItems && slots.clientes.length) {
    return armar('consultar_items_cliente', 'consultar_items', 0.92)
  }

  // "que of estan en mecanizado"
  const etapaMencionada = detectarEtapa(t)
  if (mencionaOf && etapaMencionada) {
    slots.etapa = etapaMencionada
    return armar('consultar_of_por_etapa', 'consultar_of_por_etapa', 0.9)
  }

  if (mencionaOf) {
    return armar('consultar_of_cliente', 'consultar_of', slots.clientes.length ? 0.93 : 0.82)
  }

  if (mencionaClientes) {
    return armar('consultar_clientes', 'consultar_clientes', 0.9)
  }

  if (slots.clientes.length) {
    return armar('consultar_of_cliente', 'consultar_of', 0.78)
  }

  if (RE_SALUDO.test(t)) return armar('saludo', '—', 0.95)

  return armar('desconocido', '—', 0.2)
}
