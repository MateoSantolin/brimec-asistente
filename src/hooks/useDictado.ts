/**
 * Dictado por voz con la Web Speech API del navegador.
 *
 * T-09 define la voz como canal PRINCIPAL: el operario tiene las manos ocupadas y no
 * puede detener la maquina para navegar menus. Por eso el dictado no es un extra.
 *
 * Alcance real de esta demo: la transcripcion la hace el navegador (en Chrome/Edge el
 * audio se procesa en servidores de Google). En produccion hay que elegir y contratar un
 * servicio de Speech-to-Text y evaluar donde se procesa el audio: T-10 lo deja
 * explicitamente pendiente. Siempre queda disponible la alternativa por texto, porque el
 * ruido de planta (tornos, balancines, amoladoras) es un riesgo identificado en T-09.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type Reconocimiento = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

function constructor(): (new () => Reconocimiento) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconocimiento) | null
}

export interface EstadoDictado {
  soportado: boolean
  escuchando: boolean
  parcial: string
  error: string | null
  alternar: () => void
  detener: () => void
}

export function useDictado(onTexto: (texto: string) => void): EstadoDictado {
  const [soportado] = useState(() => typeof window !== 'undefined' && constructor() !== null)
  const [escuchando, setEscuchando] = useState(false)
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<Reconocimiento | null>(null)
  const callbackRef = useRef(onTexto)
  callbackRef.current = onTexto

  const detener = useCallback(() => {
    ref.current?.stop()
    setEscuchando(false)
    setParcial('')
  }, [])

  const alternar = useCallback(() => {
    if (!soportado) {
      setError('Este navegador no expone la Web Speech API. Usa Chrome o Edge, o escribi el mensaje.')
      return
    }
    if (escuchando) {
      detener()
      return
    }

    const Ctor = constructor()
    if (!Ctor) return
    const rec = new Ctor()
    ref.current = rec
    rec.lang = 'es-AR'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interino = ''
      let definitivo = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const texto = r[0].transcript
        if (r.isFinal) definitivo += texto
        else interino += texto
      }
      setParcial(interino)
      if (definitivo.trim()) {
        setParcial('')
        callbackRef.current(definitivo.trim())
      }
    }

    rec.onerror = (e) => {
      const mapa: Record<string, string> = {
        'no-speech': 'No se detecto voz. Probá de nuevo o escribi el mensaje.',
        'audio-capture': 'No se encontro microfono disponible.',
        'not-allowed': 'El navegador bloqueo el acceso al microfono. Habilitalo y reintentá.',
        network: 'Falla de red en el servicio de transcripcion. Podes escribir el mensaje.',
        aborted: '',
      }
      const msg = mapa[e.error ?? ''] ?? 'No se pudo transcribir. Escribi el mensaje como alternativa.'
      if (msg) setError(msg)
      setEscuchando(false)
      setParcial('')
    }

    rec.onend = () => {
      setEscuchando(false)
      setParcial('')
    }

    setError(null)
    try {
      rec.start()
      setEscuchando(true)
    } catch {
      setError('No se pudo iniciar el dictado.')
      setEscuchando(false)
    }
  }, [detener, escuchando, soportado])

  useEffect(() => () => ref.current?.abort(), [])

  return { soportado, escuchando, parcial, error, alternar, detener }
}
