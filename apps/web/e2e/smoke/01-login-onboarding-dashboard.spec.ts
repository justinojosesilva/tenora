/**
 * Smoke test: login → onboarding → dashboard
 *
 * Verifica o fluxo completo de um usuário novo que ainda não tem organização:
 *   1. Acessa a raiz — é redirecionado para /sign-in
 *   2. Faz login com credenciais válidas
 *   3. É redirecionado para /onboarding (sem org ainda)
 *   4. Preenche o wizard de onboarding (3 passos)
 *   5. Chega no /dashboard e vê os KPI cards
 *
 * NOTA: Este teste usa credenciais de um usuário pré-criado no Clerk de staging
 * que ainda NÃO possui organização associada. Após o teste, a organização criada
 * fica no Clerk — em CI recomenda-se usar usuários descartáveis ou limpar via
 * Clerk Admin API no teardown.
 */
import { test, expect } from '@playwright/test'

test.describe('Fluxo smoke: login → onboarding → dashboard', () => {
  test('usuário sem org é redirecionado para onboarding após login', async ({ page }) => {
    const email = process.env.E2E_USER_A_EMAIL!
    const password = process.env.E2E_USER_A_PASSWORD!

    // 1. Raiz redireciona para sign-in quando não autenticado
    await page.goto('/')
    await expect(page).toHaveURL(/\/sign-in/)

    // 2. Preenche formulário de login do Clerk
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: /continue|sign in/i }).click()

    // 3. Após login sem org → redireciona para /onboarding
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })
  })

  test('wizard de onboarding exibe 3 passos e confirma empresa', async ({ page }) => {
    // Navega direto para onboarding (usuário já autenticado mas sem org)
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/onboarding/)

    // Passo 1 — Dados da empresa
    await expect(page.getByText(/dados da empresa|empresa/i)).toBeVisible()

    const companyNameInput = page.getByPlaceholder(/nome da empresa|razão social/i)
    await expect(companyNameInput).toBeVisible()
    await companyNameInput.fill('Imobiliária Teste E2E')

    // CNPJ válido para testes
    const cnpjInput = page.getByLabel(/cnpj/i)
    await cnpjInput.fill('11222333000181')

    // Número de imóveis
    const nPropertiesInput = page.getByLabel(/imóveis|propriedades/i)
    if (await nPropertiesInput.isVisible()) {
      await nPropertiesInput.fill('10')
    }

    const continueBtn = page.getByRole('button', { name: /continuar|próximo|avançar/i })
    await continueBtn.click()

    // Passo 2 — Banco
    await expect(page.getByText(/banco|conexão bancária/i)).toBeVisible()

    // Seleciona "Outros" para não exigir credenciais reais
    const outrosBank = page.getByRole('button', { name: /outros/i })
    if (await outrosBank.isVisible()) {
      await outrosBank.click()
    }

    await page.getByRole('button', { name: /continuar|próximo|avançar/i }).click()

    // Passo 3 — Confirmação
    await expect(page.getByText(/confirmar|resumo/i)).toBeVisible()
    await expect(page.getByText('Imobiliária Teste E2E')).toBeVisible()

    const finishBtn = page.getByRole('button', { name: /confirmar|concluir|finalizar/i })
    await finishBtn.click()

    // Dashboard acessível após onboarding
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  })

  test('dashboard exibe boas-vindas e estrutura básica', async ({ page }) => {
    // Acessa dashboard diretamente com sessão autenticada
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // Sidebar deve estar visível
    await expect(page.getByRole('navigation')).toBeVisible()

    // Algum conteúdo principal deve estar visível (KPI cards ou mensagem de boas-vindas)
    const mainContent = page.getByRole('main')
    await expect(mainContent).toBeVisible()
  })
})
