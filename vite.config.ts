import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { egonFaviconPlugin } from '@stellar-enclosure/stellar-enclosure-web-shared/vite-plugin'

export default defineConfig(async ({mode, command}) => {
  const permissionPlugins: import('vite').PluginOption[] = []
  if (command === 'build') {
    if (!process.env.PAC_SDK_DIR) throw new Error('PAC_SDK_DIR_REQUIRED')
    const plugin = await import(pathToFileURL(resolve(process.env.PAC_SDK_DIR, 'scripts/permissions/consumer-vite-plugin.mjs')).href)
    permissionPlugins.push(plugin.permissionBuildPlugin())
  }
  const configuredBase = loadEnv(mode, process.cwd(), 'VITE_').VITE_BASE_PATH ?? '/'
  if (!configuredBase.startsWith('/') || configuredBase.startsWith('//')
    || /[\\?#%]/.test(configuredBase) || Array.from(configuredBase).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || /\/{2,}/.test(configuredBase)
    || configuredBase.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Invalid VITE_BASE_PATH')
  }
  const basePath = configuredBase === '/' ? '/' : configuredBase.replace(/\/?$/, '/')

  return {
    base: basePath,
    plugins: [react(), egonFaviconPlugin(), ...permissionPlugins],
    resolve: {
      dedupe: ["react", "react-dom", "react-i18next", "i18next", "antd", "@tanstack/react-query", "react-router-dom", "@ant-design/icons"],
    },
    server: {
      host: '127.0.0.1',
      port: 18131,
      strictPort: true,
      proxy: {
        '/apps': {
          target: process.env.TIANQUAN_JIANSHEN_AUTH_PROXY ?? 'http://127.0.0.1:18180',
          changeOrigin: false,
        },
        '/api': {
          target: process.env.TIANQUAN_JIANSHEN_ADMIN_PROXY ?? 'http://127.0.0.1:18180',
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const antdPath = id.split('/node_modules/antd/es/')[1]
            if (antdPath) {
              const component = antdPath.split('/')[0]
              if (['table', 'form', 'select', 'input', 'input-number', 'checkbox'].includes(component)) return 'vendor-antd-data'
              if (['modal', 'drawer', 'popconfirm', 'tooltip'].includes(component)) return 'vendor-antd-overlay'
              return 'vendor-antd-core'
            }
            if (id.includes('/node_modules/@ant-design/')) return 'vendor-antd-core'
            if (id.includes('/node_modules/@tanstack/')) return 'vendor-query'
            if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler/')) return 'vendor-react'
            return undefined
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      fileParallelism: false,
      setupFiles: './src/test/setup.ts',
      exclude: ['e2e/**', 'scripts/**', 'node_modules/**', 'dist/**'],
    },
  }
})
