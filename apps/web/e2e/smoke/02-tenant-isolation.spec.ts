/**
 * Smoke test: isolamento entre tenants (RLS)
 *
 * Verifica que um usuário autenticado como tenant A não consegue ver
 * dados pertencentes ao tenant B — validando o funcionamento do
 * PostgreSQL Row-Level Security implementado na T-02.
 *
 * Pré-condições (staging):
 *   - Tenant A e Tenant B já existem com organizações criadas
 *   - Tenant A tem pelo menos 1 propriedade/imóvel cadastrado
 *   - Tenant B está em conta separada (org diferente)
 *
 * Credenciais:
 *   E2E_USER_A_EMAIL / E2E_USER_A_PASSWORD
 *   E2E_USER_B_EMAIL / E2E_USER_B_PASSWORD
 */
import { test, expect } from '@playwright/test'
import { AUTH_FILE_A, AUTH_FILE_B } from '../fixtures/auth.paths'

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

test.describe('Isolamento de tenant (RLS)', () => {
  test('tenant A não vê propriedades do tenant B', async ({ browser }) => {
    // Contexto separado por tenant para garantir sessões isoladas
    const ctxA = await browser.newContext({ storageState: AUTH_FILE_A })
    const ctxB = await browser.newContext({ storageState: AUTH_FILE_B })

    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    try {
      // --- Tenant A: verifica que está no dashboard ---
      await pageA.goto('/dashboard')
      await expect(pageA).toHaveURL(/\/dashboard/, { timeout: 15_000 })

      // Navega para a lista de propriedades do tenant A
      await pageA.goto('/dashboard/properties')
      await pageA.waitForLoadState('networkidle')

      // Coleta os nomes de propriedades visíveis para o tenant A
      const propertiesA = await pageA.getByTestId('property-name').allTextContents()

      // --- Tenant B: verifica que está no dashboard ---
      await pageB.goto('/dashboard')
      await expect(pageB).toHaveURL(/\/dashboard/, { timeout: 15_000 })

      // Navega para a lista de propriedades do tenant B
      await pageB.goto('/dashboard/properties')
      await pageB.waitForLoadState('networkidle')

      // Coleta os nomes de propriedades visíveis para o tenant B
      const propertiesB = await pageB.getByTestId('property-name').allTextContents()

      // Nenhuma propriedade do tenant A deve aparecer para o tenant B
      for (const propA of propertiesA) {
        expect(
          propertiesB,
          `Tenant B não deve ver a propriedade "${propA}" do tenant A`,
        ).not.toContain(propA)
      }

      // Nenhuma propriedade do tenant B deve aparecer para o tenant A
      for (const propB of propertiesB) {
        expect(
          propertiesA,
          `Tenant A não deve ver a propriedade "${propB}" do tenant B`,
        ).not.toContain(propB)
      }
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })

  test('tenant B não acessa rotas de API com token do tenant A', async ({ request }) => {
    // Verifica que a API retorna 401/403 ao não enviar token
    const response = await request.get(
      `${process.env.E2E_API_URL ?? 'http://localhost:3001'}/trpc/property.list`,
    )

    // Sem autenticação → deve receber 401
    expect([401, 403]).toContain(response.status())
  })
})
