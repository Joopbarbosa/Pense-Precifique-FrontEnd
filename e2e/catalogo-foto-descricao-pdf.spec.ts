import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, criarInsumo } from './helpers/api'

const API_URL = 'http://localhost:8080'

/**
 * OpenProject #518 (RN-NOVA-6/7) — foto (JPG/PNG, máx. 5MB, opcional) e descrição (máx. 150
 * caracteres, opcional) do Item de Catálogo. Upload só é possível depois que o item já existe
 * (endpoint dedicado exige itemId) — por isso os testes de foto sempre criam o item via API antes
 * e abrem a tela em modo edição.
 *
 * OpenProject #519 (RN-NOVA-8) — geração de PDF do Catálogo, bloqueada quando o catálogo está
 * inativo.
 */
test.describe('RN-NOVA-6/7/8 — foto, descrição e PDF do Catálogo', () => {
  let criadosCatalogoIds: string[] = []
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosCatalogoIds = []
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosCatalogoIds) {
      await request.post(`${API_URL}/catalogos/${id}/desativar`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
    for (const id of criadosInsumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function criarCatalogo(request: import('@playwright/test').APIRequestContext, token: string, nome: string) {
    const res = await request.post(`${API_URL}/catalogos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome },
    })
    if (!res.ok()) throw new Error(`Falha ao criar catálogo de teste: ${res.status()} ${await res.text()}`)
    return res.json()
  }

  async function criarItem(
    request: import('@playwright/test').APIRequestContext,
    token: string,
    catalogoId: string,
    nome: string,
    insumoId: string,
    descricao?: string
  ) {
    const res = await request.post(`${API_URL}/catalogos/${catalogoId}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome, tempoProducao: 5, margemLucro: 30, descricao, componentes: [{ insumoId, quantidade: 1 }] },
    })
    if (!res.ok()) throw new Error(`Falha ao criar item de teste: ${res.status()} ${await res.text()}`)
    return res.json()
  }

  test('upload de foto em modo edição atualiza o item e aparece no detalhe do catálogo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA-518-Insumo-${Date.now()}`)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-518-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    const nomeItem = `Kit Foto ${Date.now()}`
    const item = await criarItem(request, token, catalogo.id, nomeItem, insumo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'foto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('conteudo-de-teste-nao-e-uma-imagem-real'),
    })

    // Sem clique em "Salvar" — upload é imediato, endpoint dedicado (DT-NOVA-4).
    await expect(page.getByRole('button', { name: 'Remover foto' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Adicionar foto')).toHaveCount(0)

    const itemAtualizado = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemAtualizado[0].fotoUrl).toContain('r2.dev')

    await page.goto(`/catalogos/${catalogo.id}`)
    await expect(page.getByRole('img', { name: nomeItem })).toBeVisible()
  })

  test('remover foto limpa fotoUrl e volta a mostrar "Adicionar foto"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA-518b-Insumo-${Date.now()}`)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-518b-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    const item = await criarItem(request, token, catalogo.id, `Kit Remover Foto ${Date.now()}`, insumo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from('conteudo-de-teste-nao-e-uma-imagem-real'),
    })
    await expect(page.getByRole('button', { name: 'Remover foto' })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Remover foto' }).click()
    await expect(page.getByText('Adicionar foto')).toBeVisible({ timeout: 10_000 })

    const itemAtualizado = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemAtualizado[0].fotoUrl).toBeNull()
  })

  test('upload de formato não suportado é bloqueado com a mensagem do backend (CEN-NOVO-5)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA-518c-Insumo-${Date.now()}`)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-518c-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    const item = await criarItem(request, token, catalogo.id, `Kit Formato Invalido ${Date.now()}`, insumo.id)

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}&itemId=${item.id}`)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('nao e uma imagem'),
    })

    await expect(page.getByText('Só são aceitos arquivos JPG ou PNG.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Adicionar foto')).toBeVisible() // continua sem foto

    const itemAtualizado = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itemAtualizado[0].fotoUrl).toBeNull()
  })

  test('descrição é salva ao criar o item e aparece no detalhe do catálogo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA-518d-Insumo-${Date.now()}`)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-518d-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    const nomeItem = `Kit Descricao ${Date.now()}`
    const descricao = 'Sabonete artesanal + fita de cetim, embalagem para presente'

    await login(page)
    await page.goto(`/catalogos/itens/novo?catalogoId=${catalogo.id}`)
    await page.getByPlaceholder('Ex: Kit Presente Dia das Mães').fill(nomeItem)
    await page.getByPlaceholder('Buscar insumo, produto ou customização...').fill(insumo.nome)
    await page.getByText(insumo.nome, { exact: true }).click()
    await page.getByPlaceholder('Aparece também no PDF do catálogo').fill(descricao)
    await page.waitForTimeout(900)

    await page.getByRole('button', { name: 'Adicionar item ao catálogo', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/catalogos/${catalogo.id}$`), { timeout: 10_000 })

    await expect(page.getByText(descricao)).toBeVisible()

    const itens = await (await request.get(`${API_URL}/catalogos/${catalogo.id}/itens`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(itens[0].descricao).toBe(descricao)
  })

  test('botão "Gerar PDF" fica desabilitado quando o catálogo está inativo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const catalogo = await criarCatalogo(request, token, `QA-519-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    await request.post(`${API_URL}/catalogos/${catalogo.id}/desativar`, { headers: { Authorization: `Bearer ${token}` } })

    await login(page)
    await page.goto(`/catalogos/${catalogo.id}`)

    await expect(page.getByRole('button', { name: 'Gerar PDF' })).toBeDisabled()
  })

  test('"Gerar PDF" baixa o PDF quando o catálogo está ativo (RN-NOVA-8)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA-519b-Insumo-${Date.now()}`)
    criadosInsumoIds.push(insumo.id)
    const catalogo = await criarCatalogo(request, token, `QA-519b-Catalogo-${Date.now()}`)
    criadosCatalogoIds.push(catalogo.id)
    await criarItem(request, token, catalogo.id, `Kit PDF ${Date.now()}`, insumo.id, 'Descrição do item no PDF')

    await login(page)
    await page.goto(`/catalogos/${catalogo.id}`)

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 })
    await page.getByRole('button', { name: 'Gerar PDF' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe(`catalogo-${catalogo.numero}.pdf`)
  })
})
