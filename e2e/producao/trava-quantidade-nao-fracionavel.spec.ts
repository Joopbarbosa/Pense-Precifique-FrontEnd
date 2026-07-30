import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import {
  criarProdutoComFicha,
  inativarProduto,
  teardownProducoes,
  criarProducaoViaApi,
} from '../helpers/producao'
import { criarInsumoComEstoque, criarInsumoFracionavel } from '../helpers/insumo'

const INSUMO_URL = 'http://localhost:8080/insumos'

/**
 * Homologação V0.6.2 — Trava de quantidade para produto com insumo não-fracionável (Cenário 224,
 * OpenProject #187, RN-051). `NovaProducaoPage.tsx`/`EditarProducaoPage.tsx`: `quantidadeTravada`
 * (derivado de `produto.algumInsumoNaoFracionavel`) trava o campo em `rendimento`, sem stepper.
 * Rejeição de backend em `ProducaoService.java:1054-1060` (RN-051).
 */

function linhaProduto(page: Page, nome: string) {
  return page.locator('div.border-t.border-line', { hasText: nome })
}

async function buscarEAdicionarProduto(page: Page, nome: string) {
  const busca = page.getByPlaceholder('Buscar produto...')
  await busca.fill(nome)
  const resultado = page.getByRole('button', { name: new RegExp(nome) })
  await expect(resultado.first()).toBeVisible({ timeout: 5000 })
  await resultado.first().click()
}

test.describe('Cenário 224 — Trava de quantidade em produto com insumo não-fracionável (#187)', () => {
  let criadosProdutoIds: string[] = []
  let criadosInsumoIds: string[] = []
  let criadasProducaoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
    criadosInsumoIds = []
    criadasProducaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, criadasProducaoIds)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
    for (const id of criadosInsumoIds) {
      await request.delete(`${INSUMO_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('224a (NovaProducaoPage) — produto 100% fracionável mantém quantidade livre, produto com insumo não-fracionável trava em rendimento', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoFrac = `QA224a-InsumoFrac-${Date.now()}`
    const insumoFrac = await criarInsumoFracionavel(request, token, nomeInsumoFrac, 1000, 'DECIMAL')
    criadosInsumoIds.push(insumoFrac.id)
    const nomeInsumoNaoFrac = `QA224a-InsumoNaoFrac-${Date.now()}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 1000, false)
    criadosInsumoIds.push(insumoNaoFrac.id)

    const nomeLivre = `QA224a-ProdutoLivre-${Date.now()}`
    const produtoLivre = await criarProdutoComFicha(request, token, nomeLivre, [{ insumoId: insumoFrac.id, quantidade: 1 }], 3)
    const nomeTravado = `QA224a-ProdutoTravado-${Date.now()}`
    const produtoTravado = await criarProdutoComFicha(request, token, nomeTravado, [{ insumoId: insumoNaoFrac.id, quantidade: 1 }], 5)
    criadosProdutoIds.push(produtoLivre.id, produtoTravado.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10))

    await buscarEAdicionarProduto(page, nomeLivre)
    const linhaLivre = linhaProduto(page, nomeLivre)
    await expect(linhaLivre.getByText('Quantidade fixa')).toHaveCount(0)
    const inputLivre = linhaLivre.locator('input[type="number"]')
    await expect(inputLivre).toBeVisible()
    await inputLivre.fill('7')
    await expect(inputLivre).toHaveValue('7')

    await buscarEAdicionarProduto(page, nomeTravado)
    const linhaTravada = linhaProduto(page, nomeTravado)
    await expect(linhaTravada.getByText('Quantidade fixa — insumo não-fracionável na ficha técnica')).toBeVisible()
    await expect(linhaTravada.locator('input[type="number"]')).toHaveCount(0)
    await expect(linhaTravada.locator('div.bg-cream')).toHaveText('5')
  })

  test('224b (EditarProducaoPage) — mesma trava ao editar uma produção AGUARDANDO_INICIO existente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoFrac = `QA224b-InsumoFrac-${Date.now()}`
    const insumoFrac = await criarInsumoFracionavel(request, token, nomeInsumoFrac, 1000, 'DECIMAL')
    criadosInsumoIds.push(insumoFrac.id)
    const nomeInsumoNaoFrac = `QA224b-InsumoNaoFrac-${Date.now()}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 1000, false)
    criadosInsumoIds.push(insumoNaoFrac.id)

    const nomeLivre = `QA224b-ProdutoLivre-${Date.now()}`
    const produtoLivre = await criarProdutoComFicha(request, token, nomeLivre, [{ insumoId: insumoFrac.id, quantidade: 1 }], 3)
    const nomeTravado = `QA224b-ProdutoTravado-${Date.now()}`
    const produtoTravado = await criarProdutoComFicha(request, token, nomeTravado, [{ insumoId: insumoNaoFrac.id, quantidade: 1 }], 4)
    criadosProdutoIds.push(produtoLivre.id, produtoTravado.id)

    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produtoLivre.id, quantidade: 3 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}/editar`)

    const linhaLivre = linhaProduto(page, nomeLivre)
    await expect(linhaLivre.locator('input[type="number"]')).toBeVisible()
    await expect(linhaLivre.getByText('Quantidade fixa')).toHaveCount(0)

    await buscarEAdicionarProduto(page, nomeTravado)
    const linhaTravada = linhaProduto(page, nomeTravado)
    await expect(linhaTravada.getByText('Quantidade fixa — insumo não-fracionável na ficha técnica')).toBeVisible()
    await expect(linhaTravada.locator('input[type="number"]')).toHaveCount(0)
    await expect(linhaTravada.locator('div.bg-cream')).toHaveText('4')

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}$`), { timeout: 10_000 })
  })

  test('224c (API) — backend bloqueia quantidade divergente do rendimento para insumo não-fracionável (RN-051)', async ({ request }) => {
    // A trava de UI (224a/224b) já torna esse estado inalcançável por interação normal — este
    // teste valida a regra de negócio diretamente na API, a defesa real contra contorno da UI
    // (DevTools, chamada direta, cliente futuro sem a trava).
    const token = await apiLogin(request)
    const nomeInsumo = `QA224c-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 1000, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA224c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 1 }], 5)
    criadosProdutoIds.push(produto.id)

    const res = await request.post('http://localhost:8080/producoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        dataTerminoPrevista: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        produtos: [{ produtoId: produto.id, quantidade: 3 }], // rendimento é 5, diferente de 3
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.message).toContain('não permite quantidade fracionada')
  })
})
