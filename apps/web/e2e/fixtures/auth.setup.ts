/**
 * Setup de autenticação para os testes E2E.
 *
 * Faz login via UI do Clerk e salva o storageState de cada usuário em
 * .auth/userA.json e .auth/userB.json para reutilização nos testes —
 * evitando login repetido a cada spec.
 *
 * Requer as variáveis de ambiente:
 *   E2E_USER_A_EMAIL / E2E_USER_A_PASSWORD  — tenant A
 *   E2E_USER_B_EMAIL / E2E_USER_B_PASSWORD  — tenant B (isolamento)
 */
import { test as setup, expect, type Page } from '@playwright/test'
import { AUTH_FILE_A, AUTH_FILE_B } from './auth.paths'

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies()
  await page.goto('/sign-in')
  await page.waitForLoadState('domcontentloaded')

  // Log da URL atual para diagnóstico (visível no trace/CI logs)
  console.log('[auth.setup] URL após goto /sign-in:', page.url())

  // Dump do HTML visível para diagnóstico
  const bodyText = await page
    .locator('body')
    .innerText()
    .catch(() => '<erro ao ler body>')
  console.log('[auth.setup] Texto visível na página:\n', bodyText.slice(0, 1000))

  // Lista todos os inputs presentes no DOM (incluindo iframes)
  const inputs = await page.locator('input').all()
  console.log('[auth.setup] Inputs encontrados:', inputs.length)
  for (const input of inputs) {
    const name = await input.getAttribute('name').catch(() => null)
    const type = await input.getAttribute('type').catch(() => null)
    console.log(`  input: name="${name}" type="${type}"`)
  }

  // Aguarda o input do Clerk aparecer (componente JS carrega após hydration)
  const emailInput = page.locator(
    'input[name="identifier"], input[type="email"], input[autocomplete="email username"]',
  )
  await emailInput.first().waitFor({ state: 'visible', timeout: 20_000 })

  console.log('[auth.setup] Formulário de login visível, preenchendo email...')

  await emailInput.first().fill(email)
  await page.locator('button[data-localization-key="formButtonPrimary"]').click()

  // Após confirmar email, exibe campo de senha
  const passwordInput = page.locator('input[name="password"], input[type="password"]')
  await passwordInput.first().waitFor({ state: 'visible', timeout: 10_000 })
  await passwordInput.first().fill(password)
  await page.locator('button[data-localization-key="formButtonPrimary"]').click()

  // Aguarda redirect pós-login (onboarding ou dashboard)
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })
}

setup('autenticar usuário A', async ({ page }) => {
  const email = process.env.E2E_USER_A_EMAIL
  const password = process.env.E2E_USER_A_PASSWORD

  expect(email, 'E2E_USER_A_EMAIL não definido').toBeTruthy()
  expect(password, 'E2E_USER_A_PASSWORD não definido').toBeTruthy()

  await signIn(page, email!, password!)
  await page.context().storageState({ path: AUTH_FILE_A })
})

setup('autenticar usuário B', async ({ page }) => {
  const email = process.env.E2E_USER_B_EMAIL
  const password = process.env.E2E_USER_B_PASSWORD

  expect(email, 'E2E_USER_B_EMAIL não definido').toBeTruthy()
  expect(password, 'E2E_USER_B_PASSWORD não definido').toBeTruthy()

  await signIn(page, email!, password!)
  await page.context().storageState({ path: AUTH_FILE_B })
})
