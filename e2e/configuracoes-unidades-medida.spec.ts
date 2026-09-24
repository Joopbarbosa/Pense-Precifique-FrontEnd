import { test, expect, APIRequestContext } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin } from './helpers/api'

const API_URL = 'http://localhost:8080'

async function criarUnidadeViaApi(request: APIRequestContext, token: string, nome: string, sigla: string) {
  const res = await request.post(`${API_URL}/unidades-medida`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, sigla },
  })
  if (!res.ok()) throw new Error(`Falha ao criar unidade de medida de teste: ${res.status()} ${await res.text()}`)
  return res.json()
}

/** Linha da lista (`UnidadesMedida`, `ConfiguracoesPage.tsx`) escopada pelo nome exato da unidade. */
function linhaUnidade(page: import('@playwright/test').Page, nome: string) {
  return page.getByText(nome, { exact: true }).locator('xpath=ancestor::div[contains(@class, "justify-between")][1]')
}

/**
 * #298 (V0.14.0, RN-NOVA-8/UC-NOVO-1) — CRUD de Unidades de medida em Configurações
 * (`UnidadesMedida`/`UnidadeMedidaModal`, `ConfiguracoesPage.tsx`). CEN-NOVO-8/9. Mensagens
 * confirmadas em `UnidadeMedidaService.java` (backend): unicidade de sigla (`validarUnicidade`) e
 * bloqueio de exclusão por insumo vinculado (`excluir`). `unidades_medida` **não é truncada** pelo
 * `global-setup.ts` (mesma categoria de `metodos_pagamento` — sobrevive entre rodadas), incluindo a
 * unidade seed fixa "unidade"/"unidade" usada por toda a suíte — este spec nunca toca nela, só
 * limpa o que cria (nomes/siglas com timestamp, próprios deste arquivo).
 */
test.describe('#298 — Unidades de medida (CEN-NOVO-8/9)', () => {
  let criadasUnidadeIds: string[] = []
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadasUnidadeIds = []
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadasUnidadeIds) {
      await request.delete(`${API_URL}/unidades-medida/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  test('CEN-NOVO-8 — sigla duplicada é bloqueada com a mensagem do backend', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const sigla = `g${sufixo}`
    const nomeA = `QA298-8-Grama-${sufixo}`
    const nomeB = `QA298-8-Gramas-${sufixo}`

    const unidadeA = await criarUnidadeViaApi(request, token, nomeA, sigla)
    criadasUnidadeIds.push(unidadeA.id)

    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Unidades de medida', exact: true }).click()
    await expect(linhaUnidade(page, nomeA)).toBeVisible()

    await page.getByRole('button', { name: 'Nova unidade', exact: true }).click()
    await expect(page.getByText('Nova unidade de medida')).toBeVisible()
    // getByPlaceholder('g') sem exact colide com o campo Nome (placeholder "Grama" contém "g") —
    // exact:true escopa só o campo Sigla.
    await page.getByPlaceholder('Grama').fill(nomeB)
    await page.getByPlaceholder('g', { exact: true }).fill(sigla)
    await page.getByRole('button', { name: 'Criar unidade', exact: true }).click()

    await expect(page.getByText('Já existe uma unidade de medida com esta sigla.')).toBeVisible()
    // modal continua aberto (falha não fecha) — 2ª unidade não foi criada
    await expect(page.getByText('Nova unidade de medida')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(linhaUnidade(page, nomeB)).toHaveCount(0)

    const listaDepois = await (await request.get(`${API_URL}/unidades-medida`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect((listaDepois as Array<{ nome: string }>).filter(u => u.nome === nomeB)).toHaveLength(0)
  })

  test('CEN-NOVO-9 — exclusão é bloqueada enquanto um insumo usa a unidade, libera depois', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const nomeUnidade = `QA298-9-Unidade-${sufixo}`
    const unidade = await criarUnidadeViaApi(request, token, nomeUnidade, `u${sufixo}`)
    criadasUnidadeIds.push(unidade.id)

    const nomeInsumo = `QA298-9-Insumo-${sufixo}`
    const resInsumo = await request.post(`${API_URL}/insumos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nome: nomeInsumo,
        unidadeMedidaId: unidade.id,
        fracionavel: false,
        estoqueMinimo: 1,
        precoTotalCompraInicial: 10,
        quantidadeCompradaInicial: 10,
        permitirEstoqueNegativo: true,
      },
    })
    if (!resInsumo.ok()) throw new Error(`Falha ao criar insumo de teste: ${resInsumo.status()} ${await resInsumo.text()}`)
    const insumo = await resInsumo.json()
    criadosInsumoIds.push(insumo.id)

    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Unidades de medida', exact: true }).click()
    await expect(linhaUnidade(page, nomeUnidade)).toBeVisible()

    await linhaUnidade(page, nomeUnidade).getByRole('button', { name: 'Excluir' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(`Excluir "${nomeUnidade}"?`)).toBeVisible()
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click()

    await expect(
      dialog.getByText('Esta unidade está em uso por 1 ou mais insumos. Troque a unidade dos insumos vinculados antes de excluir.')
    ).toBeVisible()
    // modal não fechou, nada foi excluído
    await expect(dialog).toBeVisible()

    // resolve o vínculo (exclui o insumo) e tenta de novo, no MESMO modal ainda aberto
    await request.delete(`${API_URL}/insumos/${insumo.id}`, { headers: { Authorization: `Bearer ${token}` } })
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click()

    await expect(dialog).not.toBeVisible()
    await expect(linhaUnidade(page, nomeUnidade)).toHaveCount(0)

    const listaDepois = await (await request.get(`${API_URL}/unidades-medida`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect((listaDepois as Array<{ id: string }>).some(u => u.id === unidade.id)).toBe(false)
  })
})
