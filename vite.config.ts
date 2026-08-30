import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { authDevPlugin } from './vite-plugin-auth-dev.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), authDevPlugin()],
})
