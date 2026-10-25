import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite bloquea dominios desconocidos; se permiten los túneles temporales de Cloudflare
// (cloudflared tunnel --url ...) para mostrar el panel a alguien fuera de esta red.
const hostsPermitidos = ['.trycloudflare.com']

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: hostsPermitidos },
  preview: { allowedHosts: hostsPermitidos },
})
