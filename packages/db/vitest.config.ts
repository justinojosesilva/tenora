// packages/db/vitest.config.ts
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ override: false }) // 'override: false' preserva vars já existentes

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      // Fallback explícito: se DATABASE_URL vier do CI, usa ele
      // Se não vier, usa o valor local para desenvolvimento
      DATABASE_URL: process.env.DATABASE_URL ?? '',
    },
  },
})
