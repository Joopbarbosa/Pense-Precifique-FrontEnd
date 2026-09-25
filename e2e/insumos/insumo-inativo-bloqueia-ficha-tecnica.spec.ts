import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #228 — Insumo inativo não pode ser adicionado a nova ficha técnica (INS-011).
 * CEN-NOVO-12 (DECISOES_V0.7.md, RN-NOVA-8).
 *
 * Desde #347 (V0.14.0) a busca de componente envia `ativo=true` — o insumo inativo não aparece mais
 * na busca (antes aparecia e só era barrado ao salvar). O bloqueio ao salvar continua no backend
 * (`FichaTecnicaService`), mas não é mais alcançável pela UI.
 */
test.describe('OpenProject #228/#347 — Insumo inativo fora da busca de ficha técnica', () => {
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

  test('CEN-NOVO-12 — insumo inativo não aparece na busca de componente da ficha técnica', async ({ page }) => {
    await login(page)
    await page.goto('/produtos/novo')
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(`QA-CEN12-Produto-${Date.now()}`)
    await page.getByPlaceholder('45').fill('10')
    await page.getByRole('button', { name: 'Próximo: Ficha Técnica' }).click()

    const busca = page.getByPlaceholder('Buscar insumo ou produto...')
    await busca.fill(insumoNome)
    await expect(page.getByText('Nenhum componente encontrado')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(insumoNome, { exact: true })).toHaveCount(0)
  })
})
