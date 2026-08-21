import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'

/**
 * CEN-NOVO-22 (P-T002, V0.8.1) — busca de cliente (server-side, OpenProject #243) em
 * `ClienteSelect` (Novo Orçamento). Gap confirmado no Passo 0: implementado
 * (`CriarOrcamentoPage.tsx`, `clienteService.listar` com termo + debounce 300ms, mesmo padrão de
 * `ItemSearch`/ORC-029), mas sem cenário BDD nem cobertura E2E — só a busca de item de catálogo
 * tinha spec dedicado (`busca-listagem-item-catalogo.spec.ts`, ORC-CEN-059-061).
 */
test.describe('CEN-NOVO-22 — Busca de cliente (server-side) em Novo Orçamento', () => {
  let criadosClienteIds: string[] = []

  test.beforeEach(() => {
    criadosClienteIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosClienteIds) {
      await request.delete(`http://localhost:8080/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-22 — foco lista tudo, busca filtra server-side, seleção troca input por card', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const nomeAlvo = `QACEN22-Maria-${sufixo}`
    const nomeOutro = `QACEN22-Joana-${sufixo}`

    const resAlvo = await request.post('http://localhost:8080/clientes', { headers: { Authorization: `Bearer ${token}` }, data: { nome: nomeAlvo } })
    criadosClienteIds.push((await resAlvo.json()).id)
    const resOutro = await request.post('http://localhost:8080/clientes', { headers: { Authorization: `Bearer ${token}` }, data: { nome: nomeOutro } })
    criadosClienteIds.push((await resOutro.json()).id)

    await login(page)
    await page.goto('/orcamentos/novo')
    const campoCliente = page.getByPlaceholder('Selecionar cliente...')

    // Foco sem digitar — listagem completa aparece (mesmo padrão de ItemSearch, #243).
    await campoCliente.click()
    await expect(page.getByText(nomeAlvo, { exact: true }).first()).toBeVisible({ timeout: 3000 })

    // Busca server-side filtra para só o cliente alvo.
    await campoCliente.fill(`QACEN22-Maria-${sufixo}`)
    await expect(page.getByText(nomeAlvo, { exact: true }).first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(nomeOutro, { exact: true })).toHaveCount(0)

    // Seleção troca o input de busca por um card com nome + botão "Trocar".
    await page.getByText(nomeAlvo, { exact: true }).click()
    await expect(page.getByText(nomeAlvo, { exact: true }).first()).toBeVisible()
    await expect(page.getByPlaceholder('Selecionar cliente...')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Trocar', exact: true })).toBeVisible()
  })
})
