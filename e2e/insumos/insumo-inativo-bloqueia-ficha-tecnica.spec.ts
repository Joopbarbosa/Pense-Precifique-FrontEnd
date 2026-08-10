import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { inativarProduto } from '../helpers/producao'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #228 — Insumo inativo não pode ser adicionado a nova ficha técnica (INS-011).
 * CEN-NOVO-12 (DECISOES_V0.7.md, RN-NOVA-8).
 *
 * Achado de auditoria (não corrigido aqui, ver DECISOES_V0.7.md): a leitura literal do BDD original
 * ("insumo inativo não aparece como opção válida na busca") não é o que o código faz — `GET
 * /insumos` (usado por `InsumoSearch` na ficha técnica de Produto) não filtra por `ativo`
 * (`InsumoService.listar():67-73`, só filtra `deletedAt IS NULL`), confirmado via curl direto na
 * API antes de escrever este spec. O insumo inativo aparece normalmente nos resultados da busca e
 * só é rejeitado ao tentar SALVAR o produto, com a mensagem de `FichaTecnicaService.java:47-49`
 * ("Este insumo está inativo e não pode ser adicionado. Reative-o para continuar."). Mesmo padrão
 * de bloqueio tardio já encontrado para CEN-NOVO-2 (produto inativo como componente).
 */
test.describe('OpenProject #228 — Insumo inativo bloqueado ao salvar ficha técnica', () => {
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

  test('CEN-NOVO-12 — insumo inativo aparece na busca (achado) mas é rejeitado ao salvar o produto', async ({ page }) => {
    await login(page)
    await page.goto('/produtos/novo')
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(`QA-CEN12-Produto-${Date.now()}`)
    await page.getByPlaceholder('45').fill('10')
    await page.getByRole('button', { name: 'Próximo: Ficha Técnica' }).click()

    const busca = page.getByPlaceholder('Buscar insumo ou produto...')
    await busca.fill(insumoNome)
    const item = page.getByText(insumoNome, { exact: true })
    await expect(item).toBeVisible({ timeout: 5000 })
    await item.click()

    await page.getByRole('button', { name: 'Salvar produto' }).click()
    await expect(page.getByText('Este insumo está inativo e não pode ser adicionado. Reative-o para continuar.')).toBeVisible({ timeout: 8000 })
  })
})
