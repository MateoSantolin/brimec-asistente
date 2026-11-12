import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useApp } from '@/store/AppContext'
import Login from '@/pages/Login'
import SeleccionPerfil from '@/pages/SeleccionPerfil'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Consultas from '@/pages/Consultas'
import DetalleOF from '@/pages/DetalleOF'
import AuditoriaPage from '@/pages/Auditoria'
import type { ReactNode } from 'react'
import type { Capacidad } from '@/types'

/** Exige sesion + perfil elegido, y opcionalmente una capacidad del rol. */
function Protegida({ children, capacidad }: { children: ReactNode; capacidad?: Capacidad }) {
  const { autenticado, empleado, tieneCapacidad } = useApp()
  if (!autenticado) return <Navigate to="/login" replace />
  if (!empleado) return <Navigate to="/perfil" replace />
  if (capacidad && !tieneCapacidad(capacidad)) return <Navigate to="/dashboard" replace />
  return <AppShell>{children}</AppShell>
}

export default function App() {
  const { autenticado, empleado } = useApp()

  return (
    <Routes>
      <Route
        path="/login"
        element={autenticado ? <Navigate to={empleado ? '/dashboard' : '/perfil'} replace /> : <Login />}
      />
      <Route
        path="/perfil"
        element={!autenticado ? <Navigate to="/login" replace /> : <SeleccionPerfil />}
      />

      <Route path="/dashboard" element={<Protegida><Dashboard /></Protegida>} />
      <Route path="/chat" element={<Protegida><Chat /></Protegida>} />
      <Route path="/consultas" element={<Protegida><Consultas /></Protegida>} />
      <Route path="/of/:numero" element={<Protegida><DetalleOF /></Protegida>} />
      <Route
        path="/auditoria"
        element={
          <Protegida capacidad="consultar_auditoria">
            <AuditoriaPage />
          </Protegida>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
