/**
 * Smoke E2E: fluxo completo de criação e encerramento de contrato
 *
 * Cobre o ciclo completo de um contrato de locação:
 *   [1] Criar contrato em imóvel disponível → status 'Vigente'
 *   [2] Imóvel muda para 'Alugado' após criar contrato
 *   [3] Cobrança do mês aparece na tela de cobranças
 *   [4] Imóvel já alugado não aparece no seletor de imóveis disponíveis
 *   [5] Encerrar contrato → imóvel volta para 'Disponível'
 *
 * Pré-condição (staging):
 *   - Tenant A (E2E_USER_A_EMAIL) deve ter pelo menos 1 imóvel com
 *     status 'available' cadastrado no ambiente de staging.
 */
import { test, expect } from '@playwright/test'
import { AUTH_FILE_A } from '../fixtures/auth.paths'

// Identificador único para evitar colisão entre execuções paralelas
const TENANT_NAME = `E2E Inquilino ${Date.now()}`
const RENT_AMOUNT = '1500'
const TODAY = new Date().toISOString().split('T')[0] ?? ''
const NEXT_YEAR = new Date(Date.now() + 365 * 86_400_000).toISOString().split('T')[0] ?? ''

test.describe('Fluxo E2E: criação e encerramento de contrato', () => {
  test('ciclo completo: criar → verificar estados → encerrar', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE_A })
    const page = await ctx.newPage()

    // Endereço do imóvel selecionado — compartilhado entre steps
    let propertyAddress = ''

    try {
      // ──────────────────────────────────────────────────────────
      // STEP 1: Navega para /contratos e abre o formulário de novo contrato
      // ──────────────────────────────────────────────────────────
      await test.step('navegar para /contratos e abrir formulário', async () => {
        await page.goto('/contratos')
        await expect(page).toHaveURL(/\/contratos/, { timeout: 15_000 })

        // Tanto no estado vazio ("Cadastrar contrato") quanto com dados ("Novo Contrato")
        await page
          .getByRole('button', { name: /novo contrato|cadastrar contrato/i })
          .first()
          .click()

        // Drawer (Sheet = Radix Dialog) deve estar visível
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
      })

      // ──────────────────────────────────────────────────────────
      // STEP 2: Seleciona imóvel disponível e preenche o formulário
      // ──────────────────────────────────────────────────────────
      await test.step('selecionar imóvel disponível e preencher formulário', async () => {
        const propertySelect = page.locator('select[name="propertyId"]')
        await propertySelect.waitFor({ state: 'visible', timeout: 10_000 })

        // Options com valor não-vazio = imóveis disponíveis
        const options = await propertySelect.locator('option[value]:not([value=""])').all()
        if (options.length === 0) {
          test.skip(true, 'Nenhum imóvel disponível no tenant A — configure dados no staging')
          return
        }

        const firstOption = options[0]!
        const firstValue = (await firstOption.getAttribute('value')) ?? ''
        const optionText = (await firstOption.textContent()) ?? ''
        // Extrai apenas o endereço (antes de " — cidade")
        propertyAddress = (optionText.split(' — ')[0] ?? optionText).trim()

        await propertySelect.selectOption(firstValue)

        await page.locator('input[name="tenantName"]').fill(TENANT_NAME)
        await page.locator('input[name="rentAmount"]').fill(RENT_AMOUNT)
        await page.locator('input[name="startDate"]').fill(TODAY)
        await page.locator('input[name="endDate"]').fill(NEXT_YEAR)

        await page.getByRole('button', { name: /cadastrar contrato/i }).click()
      })

      // ──────────────────────────────────────────────────────────
      // CRITÉRIO [1]: contrato aparece na listagem com status 'Vigente'
      // ──────────────────────────────────────────────────────────
      await test.step('[1] contrato criado aparece com status Vigente', async () => {
        // Drawer fecha após sucesso
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

        // Recarrega para garantir dados frescos do servidor
        await page.goto('/contratos')
        await expect(page).toHaveURL(/\/contratos/, { timeout: 10_000 })

        // Linha com o nome do inquilino deve estar visível
        await expect(page.getByText(TENANT_NAME)).toBeVisible({ timeout: 15_000 })

        // Badge "Vigente" deve estar na mesma linha
        const row = page.locator('tr').filter({ hasText: TENANT_NAME }).first()
        await expect(row.getByText('Vigente')).toBeVisible()
      })

      // ──────────────────────────────────────────────────────────
      // CRITÉRIO [2]: imóvel muda para 'Alugado'
      // ──────────────────────────────────────────────────────────
      await test.step('[2] imóvel muda para status Alugado em /imoveis', async () => {
        await page.goto('/imoveis')

        // Card do imóvel (identifica pelo endereço parcial)
        const card = page.locator('.rounded-xl').filter({ hasText: propertyAddress }).first()
        await expect(card.getByText('Alugado')).toBeVisible({ timeout: 10_000 })
      })

      // ──────────────────────────────────────────────────────────
      // CRITÉRIO [3]: cobrança do mês aparece em /cobrancas
      // ──────────────────────────────────────────────────────────
      await test.step('[3] cobrança do mês aparece em /cobrancas', async () => {
        await page.goto('/cobrancas')

        // Deve haver ao menos uma cobrança pendente
        await expect(page.getByText(/pendente/i).first()).toBeVisible({ timeout: 10_000 })
      })

      // ──────────────────────────────────────────────────────────
      // CRITÉRIO [4]: imóvel alugado não aparece no seletor de disponíveis
      // ──────────────────────────────────────────────────────────
      await test.step('[4] imóvel alugado não aparece no seletor de novo contrato', async () => {
        await page.goto('/contratos')
        await page
          .getByRole('button', { name: /novo contrato|cadastrar contrato/i })
          .first()
          .click()

        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })

        const propertySelect = page.locator('select[name="propertyId"]')
        await propertySelect.waitFor({ state: 'visible', timeout: 10_000 })

        const allOptionTexts = await propertySelect.locator('option').allTextContents()

        const found = allOptionTexts.some((t) => t.includes(propertyAddress))
        expect(
          found,
          `Imóvel "${propertyAddress}" não deve aparecer como disponível após ser alugado`,
        ).toBe(false)

        // Fecha o drawer sem criar contrato
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5_000 })
      })

      // ──────────────────────────────────────────────────────────
      // CRITÉRIO [5]: encerrar contrato → imóvel volta para 'Disponível'
      // ──────────────────────────────────────────────────────────
      await test.step('[5] encerrar contrato → imóvel volta para Disponível', async () => {
        // Garante que estamos na listagem de contratos
        await page.goto('/contratos')
        await expect(page.getByText(TENANT_NAME)).toBeVisible({ timeout: 10_000 })

        // Clica na linha do contrato para abrir o drawer de detalhes
        await page.locator('tr').filter({ hasText: TENANT_NAME }).first().click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })

        // Clica em "Encerrar" no header do drawer
        await page.getByRole('button', { name: /^encerrar$/i }).click()

        // Confirma no overlay de confirmação (div fixo, não é um dialog Radix)
        await page.getByRole('button', { name: /encerrar contrato/i }).click()

        // Drawer fecha após sucesso
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

        // Recarrega a página de contratos
        await page.goto('/contratos')

        // Contrato agora exibe "Encerrado"
        const row = page.locator('tr').filter({ hasText: TENANT_NAME }).first()
        await expect(row.getByText('Encerrado')).toBeVisible({ timeout: 10_000 })

        // Imóvel volta para "Disponível" em /imoveis
        await page.goto('/imoveis')
        const card = page.locator('.rounded-xl').filter({ hasText: propertyAddress }).first()
        await expect(card.getByText('Disponível')).toBeVisible({ timeout: 10_000 })
      })
    } finally {
      await ctx.close()
    }
  })
})
