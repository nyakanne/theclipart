import { resolve } from 'node:path'
import { build, createServer, loadEnv, preview } from 'vite'

const command = process.argv[2] ?? 'dev'
const modeFlagIndex = process.argv.indexOf('--mode')
const explicitMode = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : undefined
const mode = explicitMode || (command === 'build' ? 'production' : 'development')
const root = process.cwd()
const loadedEnv = loadEnv(mode, root, '')
for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] === undefined) process.env[key] = value
}

const apiProxy = {
  '/api': {
    target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}

const config = {
  root,
  mode,
  configFile: false,
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
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
