import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// HashRouter y no BrowserRouter: el enrutado vive en el fragmento (#/dashboard), asi la
// demo se puede servir desde cualquier hosting estatico sin reglas de reescritura y
// recargar una pantalla interna no devuelve 404.
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </StrictMode>,
)
