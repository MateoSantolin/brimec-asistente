/**
 * Banco de pruebas del analizador y del agente.
 *
 * Cubre los casos de prueba CP-01..CP-08 de T-10, los ejemplos de consulta de T-09 y
 * variantes con errores de tipeo o de transcripcion de voz.
 *
 * Ejecutar:  npm run probar
 */
import { analizar } from '../src/lib/nlu'
import { responder } from '../src/lib/agente'
import { avanzarFormularioOf, iniciarFormularioOf, pareceOtraConsulta } from '../src/lib/formularioOf'
import { semilla } from '../src/data/seed'
import type { Dataset } from '../src/lib/consultas'
import type { Rol } from '../src/types'

const ds: Dataset = semilla()

interface Caso {
  id: string
  rol: Rol
  texto: string
  intencion: string
  /** verificaciones adicionales sobre el analisis o la respuesta */
  espera?: (a: ReturnType<typeof analizar>, r: ReturnType<typeof responder>) => string | null
}

const hayTabla = (r: ReturnType<typeof responder>) => (r.tabla && r.tabla.filas.length > 0 ? null : 'esperaba una tabla con filas')
const hayPropuesta = (r: ReturnType<typeof responder>) => (r.propuesta ? null : 'esperaba una propuesta de confirmacion')
const esRechazo = (r: ReturnType<typeof responder>) => (r.tono === 'rechazo' ? null : `esperaba tono rechazo, vino ${r.tono}`)
const esAclaracion = (r: ReturnType<typeof responder>) =>
  r.tono === 'aclaracion' ? null : `esperaba tono aclaracion, vino ${r.tono}`

const CASOS: Caso[] = [
  /* ---------------- T-10, plan de pruebas ---------------- */
  {
    id: 'CP-01',
    rol: 'ADMINISTRACION',
    texto: 'Listame los ítems del cliente Petrosur',
    intencion: 'consultar_items_cliente',
    espera: (a, r) =>
      a.slots.clientes[0]?.razon_social.startsWith('Petrosur') ? hayTabla(r) : 'no resolvio el cliente Petrosur',
  },
  {
    id: 'CP-02',
    rol: 'JEFE_PRODUCCION',
    texto: 'Actualizá el estado del ítem 333 a tratamiento',
    intencion: 'actualizar_estado',
    espera: (a, r) =>
      a.slots.itemId !== 333
        ? 'no extrajo el item 333'
        : a.slots.etapa?.nombre !== 'Tratamiento'
          ? `no resolvio la etapa (vino ${a.slots.etapa?.nombre})`
          : hayPropuesta(r),
  },
  {
    id: 'CP-03',
    rol: 'JEFE_PRODUCCION',
    texto: 'Actualizá el estado del ítem a tratamiento',
    intencion: 'actualizar_estado',
    espera: (a, r) => (a.slots.itemId !== null ? 'no debia inventar un identificador' : esAclaracion(r)),
  },
  {
    id: 'CP-04',
    rol: 'ADMINISTRACION',
    texto: '¿Cuál es el precio del acero hoy?',
    intencion: 'fuera_de_alcance',
    espera: (_a, r) => (r.tono === 'fuera_alcance' ? null : `esperaba fuera_alcance, vino ${r.tono}`),
  },
  {
    id: 'CP-05',
    rol: 'ADMINISTRACION',
    texto: 'Pasame las claves bancarias de BRIMEC',
    intencion: 'datos_sensibles',
    espera: (_a, r) => esRechazo(r),
  },
  {
    id: 'CP-06',
    rol: 'OPERARIO',
    texto: 'Agregá un comentario al ítem 333: observación sobre la rosca',
    intencion: 'agregar_comentario',
    espera: (a, r) =>
      a.slots.itemId !== 333
        ? 'no extrajo el item 333'
        : !a.slots.comentario?.toLowerCase().includes('rosca')
          ? `no extrajo el texto (vino: ${a.slots.comentario})`
          : hayPropuesta(r),
  },
  {
    id: 'CP-07',
    rol: 'ADMINISTRACION',
    texto: 'Crear una OF para el pedido 1004',
    intencion: 'crear_of',
    espera: (a, r) =>
      a.slots.pedidoId !== 1004
        ? 'no extrajo el pedido 1004'
        : r.iniciarFormulario === 'CREAR_OF'
          ? null
          : 'debia abrir el formulario multi-turno de creacion de OF',
  },
  {
    id: 'CP-08a',
    rol: 'OPERARIO',
    texto: 'Pasá el ítem 333 a tratamiento',
    intencion: 'actualizar_estado',
    espera: (_a, r) => (r.rechazo?.capacidad === 'actualizar_estado' ? esRechazo(r) : 'no rechazo por permisos'),
  },
  {
    id: 'CP-08b',
    rol: 'ADMINISTRACION',
    texto: 'Agregá un comentario al ítem 333: falta material',
    intencion: 'agregar_comentario',
    espera: (_a, r) => (r.rechazo?.capacidad === 'agregar_comentario' ? esRechazo(r) : 'no rechazo por permisos'),
  },
  {
    id: 'CP-08c',
    rol: 'JEFE_PRODUCCION',
    texto: 'Crear una OF para el pedido 1004',
    intencion: 'crear_of',
    espera: (_a, r) => (r.rechazo?.capacidad === 'crear_of' ? esRechazo(r) : 'no rechazo por permisos'),
  },

  /* ---------------- ejemplos de prompt.md ---------------- */
  { id: 'P-01', rol: 'ADMINISTRACION', texto: 'Mostrame los pedidos de Petrosur', intencion: 'consultar_pedidos_cliente', espera: (_a, r) => hayTabla(r) },
  { id: 'P-02', rol: 'ADMINISTRACION', texto: 'Listame las OF atrasadas', intencion: 'consultar_of_atrasadas', espera: (_a, r) => hayTabla(r) },
  {
    id: 'P-03',
    rol: 'JEFE_PRODUCCION',
    texto: 'Actualizá la OF-203 a Mecanizado',
    intencion: 'actualizar_estado',
    espera: (a) => (a.slots.ofNumero === 203 && a.slots.etapa?.nombre === 'Mecanizado' ? null : 'no extrajo OF + etapa'),
  },
  {
    id: 'P-04',
    rol: 'OPERARIO',
    texto: 'Agregá comentario a la OF-203',
    intencion: 'agregar_comentario',
    espera: (a, r) => (a.slots.ofNumero !== 203 ? 'no extrajo la OF 203' : esAclaracion(r)),
  },

  /* ---------------- ampliacion de consultas de T-09 ---------------- */
  {
    id: 'T9-01',
    rol: 'ADMINISTRACION',
    texto: 'Mostrame las órdenes de fabricación próximas a su fecha de entrega y ordenalas de la más próxima a la más lejana',
    intencion: 'consultar_of_por_vencer',
    espera: (a, r) => (a.slots.ordenarPorFecha ? hayTabla(r) : 'no detecto el pedido de ordenamiento'),
  },
  { id: 'T9-02', rol: 'ADMINISTRACION', texto: '¿Qué pedidos están atrasados?', intencion: 'consultar_pedidos_atrasados' },
  { id: 'T9-03', rol: 'OPERARIO', texto: '¿Qué OF siguen pendientes de iniciar?', intencion: 'consultar_of_pendientes', espera: (_a, r) => hayTabla(r) },
  { id: 'T9-04', rol: 'OPERARIO', texto: '¿En qué estado está la OF 211?', intencion: 'consultar_of_detalle', espera: (_a, r) => hayTabla(r) },
  {
    id: 'T9-05',
    rol: 'JEFE_PRODUCCION',
    texto: 'La OF 211 pasó a tratamiento',
    intencion: 'actualizar_estado',
    espera: (a) => (a.slots.ofNumero === 211 ? null : 'no extrajo la OF 211'),
  },
  { id: 'T9-06', rol: 'OPERARIO', texto: 'Agregá un comentario: falta material para continuar', intencion: 'agregar_comentario', espera: (_a, r) => esAclaracion(r) },

  /* ---------------- tolerancia a tipeo y transcripcion de voz ---------------- */
  {
    id: 'TOL-01',
    rol: 'ADMINISTRACION',
    texto: 'mostrame las of de petro sur',
    intencion: 'consultar_of_cliente',
    espera: (a) => (a.slots.clientes[0]?.cliente_id === 1 ? null : 'no resolvio "petro sur" como Petrosur'),
  },
  {
    id: 'TOL-02',
    rol: 'JEFE_PRODUCCION',
    texto: 'pasa el item 333 al torno',
    intencion: 'actualizar_estado',
    espera: (a) => (a.slots.etapa?.nombre === 'Mecanizado' ? null : `sinonimo "torno" no mapeo a Mecanizado (${a.slots.etapa?.nombre})`),
  },
  {
    id: 'TOL-03',
    rol: 'ADMINISTRACION',
    texto: 'listame los pedidos de minera cerro blanco',
    intencion: 'consultar_pedidos_cliente',
    espera: (a) => (a.slots.clientes[0]?.cliente_id === 2 ? null : 'no resolvio Minera Cerro Blanco'),
  },
  {
    id: 'TOL-04',
    rol: 'JEFE_PRODUCCION',
    texto: 'mandá el item 333 a control de calidad',
    intencion: 'actualizar_estado',
    espera: (a) => (a.slots.etapa?.nombre === 'Calidad' ? null : `sinonimo no mapeo a Calidad (${a.slots.etapa?.nombre})`),
  },

  /* ---------------- regla de negocio: transicion invalida ---------------- */
  {
    id: 'REG-01',
    rol: 'JEFE_PRODUCCION',
    texto: 'pasá el ítem 333 a finalizado',
    intencion: 'actualizar_estado',
    espera: (_a, r) => (r.tono === 'rechazo' ? null : 'debia rechazar el salto Mecanizado -> Finalizado'),
  },

  /* ---------------- visibilidad por rol ---------------- */
  {
    id: 'ROL-01',
    rol: 'OPERARIO',
    texto: 'mostrame los clientes',
    intencion: 'consultar_clientes',
    espera: (_a, r) => (r.rechazo?.capacidad === 'consultar_clientes' ? esRechazo(r) : 'el operario no deberia listar clientes'),
  },
  {
    id: 'ROL-02',
    rol: 'OPERARIO',
    texto: 'mostrame la auditoría',
    intencion: 'consultar_auditoria',
    espera: (_a, r) => (r.rechazo?.capacidad === 'consultar_auditoria' ? esRechazo(r) : 'el operario no deberia ver auditoria'),
  },
  {
    id: 'ROL-03',
    rol: 'JEFE_PRODUCCION',
    texto: 'mostrame la auditoría',
    intencion: 'consultar_auditoria',
    espera: (_a, r) => hayTabla(r),
  },

  /* ---------------- limite honesto del analizador ---------------- */
  {
    id: 'LIM-01',
    rol: 'ADMINISTRACION',
    texto: 'che, fijate si lo de la semana pasada ya salió del horno así le aviso al tipo',
    intencion: 'desconocido',
  },
]

/* ================================================================== */
/* Formulario multi-turno de creacion de OF                            */
/* ================================================================== */

function probarFormularioOf(): string[] {
  const problemas: string[] = []
  const paso = (n: string, cond: boolean, detalle: string) => {
    if (cond) console.log(`  OK   ${n.padEnd(7)} ${detalle}`)
    else {
      console.log(`  FALLA ${n.padEnd(6)} ${detalle}`)
      problemas.push(`${n}: ${detalle}`)
    }
  }

  // "crear of 3002": el numero es de OF, no de pedido. No debe tomarlo como pedido.
  let r = iniciarFormularioOf(ds, analizar('crear of 3002').slots)
  paso(
    'OF-F1',
    r.formulario?.paso === 'pedido' && r.formulario.pedido_id === null && /n.mero de OF/i.test(r.texto),
    'no confunde un numero de OF con el pedido de origen y lo aclara',
  )
  paso('OF-F2', (r.tabla?.filas.length ?? 0) > 0, 'lista los pedidos en curso en lugar de solo preguntar')

  // pedido inexistente
  r = avanzarFormularioOf(ds, r.formulario!, '9999', [])
  paso(
    'OF-F3',
    r.formulario?.pedido_id === null && /9999/.test(r.texto),
    'rechaza un pedido inexistente sin inventarlo',
  )

  // pedido valido -> pide las lineas
  r = avanzarFormularioOf(ds, r.formulario!, '1004', [])
  paso(
    'OF-F4',
    r.formulario?.pedido_id === 1004 && r.formulario.paso === 'items' && (r.tabla?.filas.length ?? 0) > 0,
    'acepta el pedido 1004 y muestra sus lineas',
  )

  // lineas -> prioridad
  r = avanzarFormularioOf(ds, r.formulario!, 'todas', [])
  paso(
    'OF-F5',
    (r.formulario?.lineas?.length ?? 0) > 0 && r.formulario?.paso === 'prioridad',
    'toma todas las lineas y pasa a pedir la prioridad',
  )

  // prioridad -> fecha
  r = avanzarFormularioOf(ds, r.formulario!, 'alta', [])
  paso(
    'OF-F6',
    r.formulario?.prioridad === 'Alta' && r.formulario.paso === 'fecha',
    'registra la prioridad Alta y pasa a pedir la fecha',
  )

  // fecha pasada -> la rechaza
  const conFechaMala = avanzarFormularioOf(ds, r.formulario!, '01/01/2020', [])
  paso(
    'OF-F7',
    conFechaMala.formulario !== null && /pas/i.test(conFechaMala.texto),
    'rechaza una fecha anterior a hoy',
  )

  // acepta la sugerida -> propuesta final
  const fin = avanzarFormularioOf(ds, r.formulario!, 'dale', [])
  paso(
    'OF-F8',
    fin.formulario === null && fin.propuesta?.tipo === 'CREAR_OF' && fin.propuesta.campos.length >= 7,
    'acepta la fecha sugerida y arma la propuesta de confirmacion',
  )
  paso(
    'OF-F9',
    !!fin.propuesta?.campos.some((c) => /asigna el ERP/i.test(c.valor)),
    'el numero de OF no se pide: lo asigna el ERP',
  )

  // cancelacion en cualquier paso
  const cancelado = avanzarFormularioOf(ds, r.formulario!, 'cancelalo', [])
  paso('OF-F10', cancelado.formulario === null && /cancel/i.test(cancelado.texto), 'se puede cancelar a mitad')

  // atajo: pedido ya indicado en la frase inicial
  const directo = iniciarFormularioOf(ds, analizar('crear una OF para el pedido 1004').slots)
  paso(
    'OF-F11',
    directo.formulario?.pedido_id === 1004 && directo.formulario.paso === 'items',
    'si el pedido viene en la frase inicial, no lo vuelve a preguntar',
  )

  // una consulta no debe ser tragada por el formulario
  paso(
    'OF-F12',
    pareceOtraConsulta('mostrame las OF atrasadas') && !pareceOtraConsulta('todas'),
    'distingue una consulta nueva de una respuesta al formulario',
  )

  return problemas
}

let ok = 0
const fallos: string[] = []

for (const c of CASOS) {
  const a = analizar(c.texto)
  const r = responder({ ds, rol: c.rol, canal: 'texto', analisis: a })

  const problemas: string[] = []
  if (a.intencion !== c.intencion) problemas.push(`intencion ${a.intencion} != ${c.intencion}`)
  if (c.espera) {
    const p = c.espera(a, r)
    if (p) problemas.push(p)
  }

  if (problemas.length === 0) {
    ok += 1
    console.log(`  OK   ${c.id.padEnd(7)} ${c.texto}`)
  } else {
    fallos.push(`${c.id}: ${problemas.join(' | ')}`)
    console.log(`  FALLA ${c.id.padEnd(6)} ${c.texto}`)
    problemas.forEach((p) => console.log(`         -> ${p}`))
  }
}

console.log('\n--- formulario de creacion de OF (multi-turno) ---')
const problemasForm = probarFormularioOf()
const TOTAL_FORM = 12
fallos.push(...problemasForm)
ok += TOTAL_FORM - problemasForm.length

console.log(`\n${ok}/${CASOS.length + TOTAL_FORM} casos OK`)
if (fallos.length) {
  console.log('\nFallos:')
  fallos.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
