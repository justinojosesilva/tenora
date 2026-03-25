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
import path from 'path'

export const AUTH_FILE_A = path.join(__dirname, '../../.auth/userA.json')
export const AUTH_FILE_B = path.join(__dirname, '../../.auth/userB.json')

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in')

  // Clerk renderiza o formulário de email primeiro
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: /continue/i }).click()

  // Após confirmar email, exibe campo de senha
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /continue|sign in/i }).click()

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
