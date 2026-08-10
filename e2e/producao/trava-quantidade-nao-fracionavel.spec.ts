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
 * Cenário 224 — reversão de PDC-005 → PDC-027 (#214, backend commit 19b36f1). Produto com insumo
 * não-fracionável na ficha técnica NÃO trava mais a quantidade em exatamente 1× o rendimento
 * (nome do arquivo é histórico) — aceita qualquer múltiplo inteiro do rendimento, limitado ao
 * estoque disponível dos insumos não-fracionáveis que não permitem estoque negativo. Campo de
 * quantidade em `NovaProducaoPage.tsx`/`EditarProducaoPage.tsx` segue sempre editável, via o
 * componente compartilhado `Stepper` (`components/ui/Stepper.tsx`, extraído de
 * `CriarOrcamentoPage.tsx`), nunca mais somente-leitura. Rejeição de backend em
 * `ProducaoService.java` (`validarMultiploDoRendimento`, PDC-027).
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

test.describe('Cenário 224 — Múltiplos do rendimento em produto com insumo não-fracionável (PDC-027/#214)', () => {
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

  test('224a (NovaProducaoPage) — produto 100% fracionável mantém quantidade livre; produto com insumo não-fracionável fica editável com aviso de múltiplo e passo do stepper = rendimento', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoFrac = `QA224a-InsumoFrac-${Date.now()}`
    const insumoFrac = await criarInsumoFracionavel(request, token, nomeInsumoFrac, 1000, 'DECIMAL')
    criadosInsumoIds.push(insumoFrac.id)
    const nomeInsumoNaoFrac = `QA224a-InsumoNaoFrac-${Date.now()}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 1000, false)
    criadosInsumoIds.push(insumoNaoFrac.id)

    const nomeLivre = `QA224a-ProdutoLivre-${Date.now()}`
    const produtoLivre = await criarProdutoComFicha(request, token, nomeLivre, [{ insumoId: insumoFrac.id, quantidade: 1 }], 3)
    const nomeMultiplo = `QA224a-ProdutoMultiplo-${Date.now()}`
    const produtoMultiplo = await criarProdutoComFicha(request, token, nomeMultiplo, [{ insumoId: insumoNaoFrac.id, quantidade: 1 }], 5)
    criadosProdutoIds.push(produtoLivre.id, produtoMultiplo.id)

    await login(page)
    await page.goto('/producao/nova')
    await page.getByLabel(/Data de término prevista/).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10))

    await buscarEAdicionarProduto(page, nomeLivre)
    const linhaLivre = linhaProduto(page, nomeLivre)
    await expect(linhaLivre.getByText(/múltiplo/)).toHaveCount(0)
    const inputLivre = linhaLivre.locator('input[type="number"]')
    await expect(inputLivre).toBeVisible()
    await inputLivre.fill('7')
    await expect(inputLivre).toHaveValue('7')

    await buscarEAdicionarProduto(page, nomeMultiplo)
    const linhaMultiplo = linhaProduto(page, nomeMultiplo)
    await expect(linhaMultiplo.getByText('Insumo não-fracionável — quantidade deve ser múltiplo de 5')).toBeVisible()
    const inputMultiplo = linhaMultiplo.locator('input[type="number"]')
    await expect(inputMultiplo).toBeVisible()
    await expect(inputMultiplo).toHaveValue('5')

    // Passo do stepper é o rendimento (5), não 1 — clicar "+" mantém a quantidade sempre múltipla.
    await linhaMultiplo.getByRole('button', { name: '+' }).click()
    await expect(inputMultiplo).toHaveValue('10')
  })

  test('224b (EditarProducaoPage) — quantidade persistida (múltiplo != rendimento) é preservada ao reabrir, não resetada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumoNaoFrac = `QA224b-InsumoNaoFrac-${Date.now()}`
    const insumoNaoFrac = await criarInsumoComEstoque(request, token, nomeInsumoNaoFrac, 1000, false)
    criadosInsumoIds.push(insumoNaoFrac.id)

    const nomeMultiplo = `QA224b-ProdutoMultiplo-${Date.now()}`
    const produtoMultiplo = await criarProdutoComFicha(request, token, nomeMultiplo, [{ insumoId: insumoNaoFrac.id, quantidade: 1 }], 4)
    criadosProdutoIds.push(produtoMultiplo.id)

    // Produção criada direto com 2× o rendimento (8) — cenário que não existia sob PDC-005.
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produtoMultiplo.id, quantidade: 8 }])
    criadasProducaoIds.push(producao.id)

    await login(page)
    await page.goto(`/producao/${producao.id}/editar`)

    const linha = linhaProduto(page, nomeMultiplo)
    await expect(linha.locator('input[type="number"]')).toHaveValue('8')
    await expect(linha.getByText('Insumo não-fracionável — quantidade deve ser múltiplo de 4')).toBeVisible()

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page).toHaveURL(new RegExp(`/producao/${producao.id}$`), { timeout: 10_000 })
  })

  test('224c (API) — backend aceita múltiplos do rendimento dentro do estoque, rejeita não-múltiplo e excesso de estoque com mensagens distintas (PDC-027)', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA224c-Insumo-${Date.now()}`
    // estoque=10, ficha.quantidade=3 por lote → no máximo 3 lotes → quantidade máxima = 3 × rendimento(2) = 6
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10, false)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA224c-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 3 }], 2)
    criadosProdutoIds.push(produto.id)

    const dataTerminoPrevista = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const resInvalido = await request.post('http://localhost:8080/producoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dataTerminoPrevista, produtos: [{ produtoId: produto.id, quantidade: 5 }] }, // 5 não é múltiplo de 2
    })
    expect(resInvalido.status()).toBe(400)
    expect((await resInvalido.json()).message).toContain('exige quantidade em múltiplos de')

    const resExcede = await request.post('http://localhost:8080/producoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dataTerminoPrevista, produtos: [{ produtoId: produto.id, quantidade: 8 }] }, // múltiplo válido, excede o máximo (6)
    })
    expect(resExcede.status()).toBe(400)
    expect((await resExcede.json()).message).toContain('quantidade máxima permitida')

    const resValido = await request.post('http://localhost:8080/producoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dataTerminoPrevista, produtos: [{ produtoId: produto.id, quantidade: 6 }] }, // múltiplo válido, dentro do estoque
    })
    expect(resValido.status()).toBe(201)
    criadasProducaoIds.push((await resValido.json()).id)
  })

  test('CEN-NOVO-8 (API) — todos os insumos não-fracionáveis permitem estoque negativo: sem limite de múltiplos', async ({ request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QA224d-Insumo-${Date.now()}`
    // estoque baixo (5) mas permitirEstoqueNegativo=true — não deve limitar o múltiplo mesmo assim.
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 5, true)
    criadosInsumoIds.push(insumo.id)
    const nomeProduto = `QA224d-Produto-${Date.now()}`
    const produto = await criarProdutoComFicha(request, token, nomeProduto, [{ insumoId: insumo.id, quantidade: 3 }], 2)
    criadosProdutoIds.push(produto.id)

    const dataTerminoPrevista = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    // Múltiplo de 2 (rendimento), quantidade bem acima do que o estoque atual (5) comportaria sem
    // permitir negativo — passa livremente porque permitirEstoqueNegativo=true no insumo.
    const res = await request.post('http://localhost:8080/producoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { dataTerminoPrevista, produtos: [{ produtoId: produto.id, quantidade: 1000 }] },
    })
    expect(res.status()).toBe(201)
    criadasProducaoIds.push((await res.json()).id)
  })
})
