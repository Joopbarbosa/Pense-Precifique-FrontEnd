import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const { E2E_API_PROXY_TARGET } = loadEnv(mode, '.', 'E2E_')
  return {
    plugins: [react()],
    server: {
      proxy: E2E_API_PROXY_TARGET ? {
        '/api': {
          target: E2E_API_PROXY_TARGET,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (request) => request.removeHeader('origin'))
          },
        },
      } : undefined,
    },
  }
})
