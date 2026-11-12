import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Loader2, LogIn, User } from 'lucide-react'
import { useApp } from '@/store/AppContext'
import { AvisoDemo, logoBrimec } from '@/components/ui/Primitivos'

export default function Login() {
  const { ingresar } = useApp()
  const navegar = useNavigate()
  const [usuario, setUsuario] = useState('demo@brimec.com.ar')
  const [clave, setClave] = useState('demo1234')
  const [cargando, setCargando] = useState(false)

  function enviar(e: FormEvent) {
    e.preventDefault()
    setCargando(true)
    // Login FICTICIO: no valida credenciales. En la solucion real, la identidad y el rol
    // provienen del mecanismo de autenticacion del ERP (T-10).
    window.setTimeout(() => {
      ingresar()
      navegar('/perfil')
    }, 650)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brimec-navy px-4 py-10">
      {/* trama industrial de fondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brimec-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-brimec-primary/20 blur-3xl" />

      <div className="relative w-full max-w-5xl animate-fade-up">
        <div className="grid overflow-hidden rounded-2xl shadow-float md:grid-cols-2">
          {/* panel de marca */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-brimec-navy-deep to-brimec-navy p-9 md:flex">
            <div className="flex items-center gap-3">
              <img
                src={logoBrimec}
                alt="BRIMEC"
                className="h-14 w-14 rounded-lg bg-white object-cover ring-1 ring-white/20"
              />
              <div>
                <div className="font-display text-2xl tracking-[.22em] text-white">BRIMEC</div>
                <div className="text-[11px] tracking-[.12em] text-brimec-soft">CALDERERÍA · INDUSTRIA ARGENTINA</div>
              </div>
            </div>

            <div>
              <h1 className="font-display text-3xl leading-tight text-white">
                Asistente conversacional
                <br />
                <span className="text-brimec-soft">integrado al ERP</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-brimec-soft/80">
                Consultá clientes, pedidos y órdenes de fabricación, registrá novedades de taller y actualizá
                etapas de producción por voz o por texto, sin interrumpir la planta.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Oil & Gas', 'Minería', 'Nuclear', 'Petroquímica', 'Alimenticia'].map((s) => (
                  <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-brimec-soft">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-brimec-soft/50">
              Prototipo académico — T-09 / T-10. Ingeniería y Construcción Industrial.
            </p>
          </div>

          {/* formulario */}
          <div className="bg-white p-8 sm:p-10">
            <div className="mb-6 md:hidden">
              <img src={logoBrimec} alt="BRIMEC" className="h-12 w-12 rounded-lg object-cover" />
            </div>

            <h2 className="font-display text-xl text-brimec-navy">Ingresar al ERP</h2>
            <p className="mt-1 text-sm text-slate-500">Acceso de demostración. No se validan credenciales.</p>

            <form onSubmit={enviar} className="mt-6 space-y-4">
              <label className="block">
                <span className="label-ui">Usuario</span>
                <div className="relative mt-1.5">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="block">
                <span className="label-ui">Contraseña</span>
                <div className="relative mt-1.5">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </label>

              <button type="submit" className="btn-primary w-full" disabled={cargando}>
                {cargando ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {cargando ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>

            <AvisoDemo className="mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
