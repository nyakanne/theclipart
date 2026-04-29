import { resolve } from 'node:path'
import { build, createServer, preview } from 'vite'

const command = process.argv[2] ?? 'dev'
const apiProxy = {
  '/api': {
    target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
    changeOrigin: true,
  },
}

const config = {
  configFile: false,
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: apiProxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
    proxy: apiProxy,
  },
}

if (command === 'build') {
  await build(config)
} else if (command === 'preview') {
  const server = await preview(config)
  server.printUrls()
} else {
  const server = await createServer(config)
  await server.listen()
  server.printUrls()
}
