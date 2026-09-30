import { E2E_API_URL } from '../helpers/target'
import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'

const API_URL = E2E_API_URL

/**
 * OpenProject #228 — Insumo inativo não pode ser adicionado a nova ficha técnica (INS-011).
 * CEN-NOVO-12 (DECISOES_V0.7.md, RN-NOVA-8).
 *
 * #641 (V0.15.0) passou a mostrar o insumo inativo riscado e indisponível na busca.
 * O bloqueio ao salvar continua no backend (`FichaTecnicaService`).
 */
test.describe('OpenProject #228/#347/#641 — Insumo inativo indisponível na ficha técnica', () => {
  let insumoId: string
  let insumoNome: string
  let produtoId: string | null = null

  test.beforeEach(async ({ request }) => {
    const token = await apiLogin(request)
    insumoNome = `QA-CEN12-Insumo-${Date.now()}`
    const insumo = await criarInsumo(request, token, insumoNome)
    insumoId = insumo.id
    await request.post(`${API_URL}/insumos/${insumoId}/inativar`, { headers: { Authorization: `Bearer ${token}` } })
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    if (produtoId) await inativarProduto(request, token, produtoId)
    await inativarInsumo(request, token, insumoId) // soft-delete permanente — limpeza final
  })

  test('CEN-NOVO-12/RN-NOVA-40 — insumo inativo aparece riscado e não pode ser escolhido', async ({ page }) => {
    await login(page)
    await page.goto('/produtos/novo')
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(`QA-CEN12-Produto-${Date.now()}`)
    await page.getByPlaceholder('45').fill('10')
    await page.getByRole('button', { name: 'Próximo: Ficha Técnica' }).click()

    const busca = page.getByPlaceholder('Buscar insumo ou produto...')
    await busca.fill(insumoNome)
    const opcao = page.getByTestId('opcao-inativa').filter({ hasText: insumoNome })
    await expect(opcao).toBeVisible({ timeout: 5000 })
    await expect(opcao).toHaveAttribute('aria-disabled', 'true')
    await opcao.click()
    await expect(page.getByText('Nenhum componente ainda. Use a busca acima para adicionar.')).toBeVisible()
  })
})
