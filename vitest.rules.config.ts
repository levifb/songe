import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Configuração separada para os testes de regras: eles falam com o emulador
 * do Firestore, então rodam em Node puro e com folga de tempo.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
