import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // Rutas relativas: el build se puede servir desde cualquier carpeta o subdominio
  // sin reconfigurar nada (hosting estatico, GitHub Pages en subruta, etc.).
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { port: 5173, open: true },
})
