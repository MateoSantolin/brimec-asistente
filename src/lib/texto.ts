/**
 * Utilidades de texto para la NLU simulada.
 *
 * T-09 descarta la "automatizacion basada en reglas" porque obligaria al usuario a
 * escribir comandos exactos (ej. UPDATE ITEM 333 STATUS SECADO). Por eso el parser de
 * esta demo NO hace coincidencia literal: normaliza, tolera errores de tipeo y de
 * transcripcion de voz, y acepta sinonimos. Sigue siendo un sistema de reglas -- no
 * sustituye a un modelo de lenguaje -- pero evita que la demo contradiga su propio
 * argumento.
 */

/** Minusculas, sin acentos, sin puntuacion, espacios colapsados. */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s:.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokens(s: string): string[] {
  return normalizar(s).split(' ').filter(Boolean)
}

/** Distancia de Levenshtein acotada. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const fila = [i]
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      fila[j] = Math.min(fila[j - 1] + 1, prev[j] + 1, prev[j - 1] + costo)
    }
    prev = fila
  }
  return prev[b.length]
}

/** Similitud 0..1 entre dos cadenas ya normalizadas. */
export function similitud(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  if (!max) return 1
  return 1 - levenshtein(a, b) / max
}

const RUIDO = new Set([
  'sa', 's a', 'srl', 's r l', 'sas', 'sac', 'sociedad', 'anonima', 'de', 'del', 'la', 'el',
  'los', 'las', 'y', 'e', 'cia', 'compania',
])

/**
 * Genera las formas con las que un usuario puede nombrar una razon social.
 * No se guardan en CLIENTE: se derivan, para no extender el modelo de datos.
 */
export function aliasDeRazonSocial(razonSocial: string): string[] {
  const base = normalizar(razonSocial)
  const palabras = base.split(' ').filter((p) => !RUIDO.has(p) && p.length > 1)
  const formas = new Set<string>([base, palabras.join(' ')])
  if (palabras.length > 1) formas.add(palabras.slice(0, 2).join(' '))
  if (palabras.length) {
    formas.add(palabras[0])
    // sigla: iniciales de las palabras significativas
    if (palabras.length > 1) formas.add(palabras.map((p) => p[0]).join(''))
  }
  // "petro sur" -> "petrosur" y viceversa
  formas.add(palabras.join(''))
  return [...formas].filter((f) => f.length >= 2)
}

/**
 * Busca la mejor coincidencia difusa de `consulta` dentro de `candidatos`.
 * Devuelve todos los que superan el umbral, ordenados de mejor a peor, para poder
 * detectar ambiguedad y repreguntar en lugar de adivinar.
 */
export function coincidenciasDifusas<T>(
  consulta: string,
  candidatos: T[],
  formasDe: (c: T) => string[],
  umbral = 0.74,
): Array<{ item: T; puntaje: number }> {
  const q = normalizar(consulta)
  if (!q) return []
  const resultado: Array<{ item: T; puntaje: number }> = []

  for (const c of candidatos) {
    let mejor = 0
    for (const forma of formasDe(c)) {
      const f = normalizar(forma)
      if (!f) continue
      let p = 0
      if (f === q) p = 1
      else if (f.includes(q) && q.length >= 3) p = 0.95 - (f.length - q.length) / (f.length * 8)
      else if (q.includes(f) && f.length >= 3) p = 0.92
      else p = similitud(q, f)
      if (p > mejor) mejor = p
    }
    if (mejor >= umbral) resultado.push({ item: c, puntaje: mejor })
  }
  return resultado.sort((a, b) => b.puntaje - a.puntaje)
}

/** Primer grupo capturado de la primera expresion que matchee. */
export function primerMatch(texto: string, expresiones: RegExp[]): string | null {
  for (const re of expresiones) {
    const m = texto.match(re)
    if (m) return (m[1] ?? m[0]).trim()
  }
  return null
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function truncar(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…'
}
