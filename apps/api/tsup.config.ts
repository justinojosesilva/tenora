import { defineConfig } from 'tsup'

export default defineConfig({
  entry:     ['src/server.ts'],
  format:    ['esm'],
  target:    'node20',
  outDir:    'dist',
  bundle:    true,
  splitting: false,
  sourcemap: true,
  clean:     true,
  // Força bundle dos pacotes internos do workspace
  noExternal: [/@tenora\/.*/],
  // Apenas dependências nativas ficam externas
  external: [
    '@prisma/client',
    'prisma',
    'fastify',
    'bullmq',
    'ioredis',
  ],
})