import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config para testes E2E de smoke.
 *
 * Variáveis de ambiente:
 *   E2E_BASE_URL        — URL base (padrão: http://localhost:3000)
 *   E2E_USER_A_EMAIL    — email do usuário tenant A
 *   E2E_USER_A_PASSWORD — senha do usuário tenant A
 *   E2E_USER_B_EMAIL    — email do usuário tenant B
 *   E2E_USER_B_PASSWORD — senha do usuário tenant B
 */
export default defineConfig({
  testDir: './e2e',

  // Timeout por teste (30s em CI, 60s local para debug)
  timeout: process.env.CI ? 30_000 : 60_000,

  // Falha rápido no CI — sem retry local
  retries: process.env.CI ? 2 : 0,

  // Paralelismo: 1 worker no CI para evitar conflito de sessões Clerk
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    // Relatório HTML salvo em playwright-report/ (artefato de CI)
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',

    // Captura screenshot apenas em caso de falha (debug facilitado)
    screenshot: 'only-on-failure',

    // Vídeo retido apenas em caso de falha
    video: 'retain-on-failure',

    // Trace completo em caso de falha (permite replay no Playwright UI)
    trace: 'retain-on-failure',
  },

  projects: [
    // Setup — cria os storageStates autenticados (roda antes dos testes)
    {
      name: 'setup',
      testMatch: /e2e\/fixtures\/.*\.setup\.ts/,
    },

    // Testes de smoke em Chromium desktop
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
