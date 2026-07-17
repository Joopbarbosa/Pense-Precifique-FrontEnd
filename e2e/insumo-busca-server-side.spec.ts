import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, criarInsumo, contarInsumos, inativarInsumo } from './helpers/api'

/**
 * Cenários 150 e 151 — Busca de insumos server-side (#110)
 *
 * 150:
 *   Dado que a artesã tem mais de 20 insumos cadastrados
 *   Quando ela busca por um termo presente apenas além da 1ª página
 *   Então o resultado aparece (prova que a busca é server-side)
 *   E a requisição GET /insumos contém o parâmetro busca= na query string
 *
 * 151:
 *   Dado que a artesã buscou um termo e vê resultados filtrados
 *   Quando ela limpa o campo de busca
 *   Então a lista volta ao estado normal com "Carregar mais" disponível
 */
test.describe('Cenários 150-151 — Busca de insumos server-side (#110)', () => {
  let criadosIds: string[] = []
  let targetNome: string

  test.beforeEach(async ({ request }) => {
    criadosIds = []
    const token = await apiLogin(request)

    // garante mais de 20 insumos cadastrados (Dado do cenário 150), criando fillers
    // se o ambiente ainda não tiver o suficiente para uma 2ª página.
    const totalAtual = await contarInsumos(request, token)
    const fillersNecessarios = Math.max(0, 21 - totalAtual)
    for (let i = 0; i < fillersNecessarios; i++) {
      const filler = await criarInsumo(request, token, `QA150-Filler-${Date.now()}-${i}`)
      criadosIds.push(filler.id)
    }

    // nome com prefixo "zzz" ordena por último (confirmado empiricamente: sort=nome
    // desta base usa colação que põe minúsculo "z" depois de tudo mais), garantindo
    // que o item fique além da 1ª página (size=20) independente do dataset existente.
    targetNome = `zzz-QA150-BuscaE2E-${Date.now()}`
    const target = await criarInsumo(request, token, targetNome)
    criadosIds.push(target.id)

    // confirma a precondição via API antes de testar via UI: o item não pode estar
    // na página 0, senão a busca não provaria nada sobre paginação server-side.
    const page0 = await request.get('http://localhost:8080/insumos?page=0&size=20&sort=nome', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const nomesPagina0: string[] = (await page0.json()).content.map((c: { nome: string }) => c.nome)
    expect(nomesPagina0).not.toContain(targetNome)
  })

  test.afterEach(async ({ request }) => {
    // API só expõe soft-delete (inativar) via DELETE /insumos/{id} — não existe hard-delete
    // (mesma limitação documentada em insumo-desativar-confirmacao.spec.ts).
    const token = await apiLogin(request)
    for (const id of criadosIds) {
      await inativarInsumo(request, token, id)
    }
  })

  test('150 — busca por termo além da 1ª página retorna resultado via API', async ({ page }) => {
    await login(page)
    await page.goto('/insumos')
    await page.waitForTimeout(500)

    const requestsComBusca: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (url.includes('/insumos') && url.includes('busca=')) requestsComBusca.push(url)
    })

    await page.getByPlaceholder('Buscar por nome ou marca…').fill(targetNome)
    await page.waitForTimeout(600) // debounce de 300ms + round-trip

    await expect(page.getByText(targetNome).first()).toBeVisible({ timeout: 5000 })
    expect(requestsComBusca.some(u => u.includes('busca='))).toBe(true)
  })

  test('151 — limpar a busca restaura a lista paginada normal', async ({ page }) => {
    await login(page)
    await page.goto('/insumos')
    await page.waitForTimeout(500)

    const buscaInput = page.getByPlaceholder('Buscar por nome ou marca…')
    await buscaInput.fill(targetNome)
    await page.waitForTimeout(600)
    await expect(page.getByText(targetNome).first()).toBeVisible({ timeout: 5000 })

    await buscaInput.fill('')
    await page.waitForTimeout(600)
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toBeVisible({ timeout: 5000 })
  })
})
