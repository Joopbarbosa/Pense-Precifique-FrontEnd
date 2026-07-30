import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, inativarInsumo } from '../helpers/api'
import { criarInsumoFracionavel } from '../helpers/insumo'

/**
 * Cenário 227 — Rótulo e campo `tipoExibicaoQuantidade` no cadastro/edição de Insumo (#186)
 * Cenário 230 — Exibição de fração/decimal de quantidade em Detalhe e Lista de Insumo
 * Cenário 231 — Acessibilidade dos toggles `group` do Field unificado em Insumo (#186)
 *
 * Ver docs/SCENARIOS.md para o Gherkin completo de cada um.
 */
test.describe('Cenário 227 — Rótulo e tipoExibicaoQuantidade no formulário de Insumo (#186)', () => {
  let insumoId: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test.afterEach(async ({ request }) => {
    if (!insumoId) return
    const token = await apiLogin(request)
    await inativarInsumo(request, token, insumoId)
  })

  test('rótulo sempre visível, campo condicional aparece só com fracionavel=sim, e valor persiste', async ({ page }) => {
    const nome = `E2E TipoExibicao ${Date.now()}`
    let corpoCriacao: Record<string, unknown> | null = null
    let corpoEdicao: Record<string, unknown> | null = null

    page.on('request', req => {
      if (req.method() === 'POST' && /\/insumos$/.test(req.url())) {
        corpoCriacao = req.postDataJSON()
      }
      if (req.method() === 'PUT' && /\/insumos\/[^/]+$/.test(req.url())) {
        corpoEdicao = req.postDataJSON()
      }
    })

    await page.goto('/insumos/novo')

    // rótulo do toggle de fracionamento sempre visível, campo de exibição ainda não (default fracionavel=false)
    await expect(page.getByText('Este item pode ser fracionado?')).toBeVisible()
    await expect(page.getByText('Como exibir a quantidade?')).not.toBeVisible()

    await page.getByPlaceholder('Papel couchê 180g').fill(nome)

    // liga fracionavel=sim — campo de exibição aparece
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(page.getByText('Como exibir a quantidade?')).toBeVisible()
    await page.getByRole('button', { name: 'Fração', exact: true }).click()

    await page.getByLabel(/Preço total da compra/).fill('50,00')
    await page.getByLabel(/Quantidade comprada/).fill('20')

    await page.getByRole('button', { name: 'Salvar insumo' }).click()
    // regex ancorado em UUID — "/insumos/[^/]+$" também dá match em "/insumos/novo" (a própria
    // página de criação), o que faz o toHaveURL "passar" antes da navegação real acontecer e
    // captura o literal "novo" como se fosse o id (causa de flakiness intermitente, corrigida aqui).
    await expect(page).toHaveURL(/\/insumos\/[0-9a-f-]{36}$/, { timeout: 10_000 })
    insumoId = page.url().split('/insumos/')[1]

    expect(corpoCriacao).not.toBeNull()
    expect(corpoCriacao!.fracionavel).toBe(true)
    expect(corpoCriacao!.tipoExibicaoQuantidade).toBe('FRACAO')

    // reabre em edição — valor persistido vem pré-selecionado
    await page.goto(`/insumos/${insumoId}/editar`)
    await expect(page.getByText('Como exibir a quantidade?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fração', exact: true })).toHaveClass(/bg-teal/)

    // desliga fracionavel — campo de exibição some, e tipoExibicaoQuantidade não é mais enviado
    await page.getByRole('button', { name: 'Não', exact: true }).click()
    await expect(page.getByText('Como exibir a quantidade?')).not.toBeVisible()
    await page.getByRole('button', { name: 'Salvar insumo' }).click()
    await expect(page).toHaveURL(`/insumos/${insumoId}`, { timeout: 10_000 })

    expect(corpoEdicao).not.toBeNull()
    expect(corpoEdicao!.fracionavel).toBe(false)
    expect(corpoEdicao!.tipoExibicaoQuantidade).toBeUndefined()
  })
})

test.describe('Cenário 231 — Acessibilidade dos toggles group do Field (Insumo, #186)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/insumos/novo')
  })

  test('cada botão dos dois toggles tem nome acessível igual ao próprio texto, não ao rótulo do campo', async ({ page }) => {
    // toggle fracionavel: Não/Sim — nome acessível é só o texto do botão
    await expect(page.getByRole('button', { name: 'Não', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Sim', exact: true })).toHaveCount(1)
    // nenhum dos dois herda o texto do rótulo do campo como nome acessível
    await expect(page.getByRole('button', { name: /Este item pode ser fracionado\?/ })).toHaveCount(0)

    // revela o segundo toggle (Decimal/Fração)
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Decimal', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Fração', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Como exibir a quantidade\?/ })).toHaveCount(0)
  })
})

test.describe('Cenário 230 — Exibição de fração/decimal em Detalhe e Lista de Insumo', () => {
  let idFracao: string | null = null
  let idDecimal: string | null = null
  let nomeFracao: string
  let nomeDecimal: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    nomeFracao = `E2E Fração ${Date.now()}`
    nomeDecimal = `E2E Decimal ${Date.now()}`
    const insumoFracao = await criarInsumoFracionavel(request, token, nomeFracao, 0.5, 'FRACAO')
    const insumoDecimal = await criarInsumoFracionavel(request, token, nomeDecimal, 0.5, 'DECIMAL')
    idFracao = insumoFracao.id
    idDecimal = insumoDecimal.id
    await login(page)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    if (idFracao) await inativarInsumo(request, token, idFracao)
    if (idDecimal) await inativarInsumo(request, token, idDecimal)
  })

  test('Detalhe do Insumo exibe glifo de fração quando tipoExibicaoQuantidade=FRACAO, decimal quando DECIMAL', async ({ page }) => {
    await page.goto(`/insumos/${idFracao}`)
    await expect(page.getByText('½ unidade', { exact: true })).toBeVisible()

    await page.goto(`/insumos/${idDecimal}`)
    await expect(page.getByText('0,5 unidade', { exact: true })).toBeVisible()
  })

  test('Listagem de Insumos exibe glifo de fração quando tipoExibicaoQuantidade=FRACAO, decimal quando DECIMAL', async ({ page }) => {
    await page.goto('/insumos')
    const busca = page.getByPlaceholder('Buscar por nome ou marca…')

    await busca.fill(nomeFracao)
    const nomeVisivelFracao = page.getByText(nomeFracao, { exact: true }).first()
    await expect(nomeVisivelFracao).toBeVisible()
    const linhaFracao = nomeVisivelFracao.locator('xpath=../..')
    await expect(linhaFracao.getByText('½', { exact: true })).toBeVisible()

    await busca.fill(nomeDecimal)
    const nomeVisivelDecimal = page.getByText(nomeDecimal, { exact: true }).first()
    await expect(nomeVisivelDecimal).toBeVisible()
    const linhaDecimal = nomeVisivelDecimal.locator('xpath=../..')
    await expect(linhaDecimal.getByText('0,5', { exact: true })).toBeVisible()
  })
})
