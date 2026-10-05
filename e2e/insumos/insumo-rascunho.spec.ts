import { test, expect, APIRequestContext } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { carregarAte } from '../helpers/list'

/**
 * V0.16.0 (#687, RN-NOVA-18, RN-NOVA-19) — insumo em rascunho vindo da nota.
 * CEN-NOVO-27/29: rascunho com custo proposto, completar o cadastro o ativa.
 * CEN-NOVO-50: confirmar compra com insumo em rascunho bloqueia e oferece "Completar o insumo".
 * CEN-NOVO-51/56: listagem marca "Rascunho", sem "Inativar"; exclusão bloqueada por compra salva.
 */

async function criarRascunho(request: APIRequestContext, token: string, nome: string) {
  // "M" casa com a unidade padrão Metro (m) da conta, sem diferenciar maiúscula (CEN-NOVO-27).
  const res = await request.post(`${API_URL}/insumos/rascunho`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, unidadeNota: 'M', quantidadeNota: 5, valorFinalNota: 12.5 },
  })
  if (!res.ok()) throw new Error(`Falha ao criar insumo em rascunho: ${res.status()} ${await res.text()}`)
  return res.json() as Promise<{ id: string; nome: string; rascunho: boolean; custoUnitario: number; custoProposto: boolean }>
}

async function criarCompraRascunho(request: APIRequestContext, token: string, insumoId: string) {
  const res = await request.post(`${API_URL}/compras`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      dataCompra: new Date().toISOString().slice(0, 10),
      multiplosFornecedores: false,
      pago: false,
      itens: [{ insumoId, quantidade: 5, precoTotal: 12.5 }],
    },
  })
  if (!res.ok()) throw new Error(`Falha ao criar compra de teste: ${res.status()} ${await res.text()}`)
  return res.json() as Promise<{ id: string; identificador: string }>
}

test.describe('#687 — Insumo em rascunho', () => {
  test('CEN-NOVO-27/29 — rascunho mostra custo proposto e completar o cadastro o ativa', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarRascunho(request, token, `E2E687 Fita ${Date.now()}`)
    expect(insumo.rascunho).toBe(true)
    expect(insumo.custoProposto).toBe(true)

    await login(page)
    await page.goto(`/insumos/${insumo.id}`)
    await expect(page.getByTestId('tag-rascunho')).toBeVisible()
    await expect(page.getByText('Custo proposto, a revisar')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edição manual' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Completar cadastro' }).click()
    await expect(page).toHaveURL(new RegExp(`/insumos/${insumo.id}/editar`))
    await expect(page.getByTestId('aviso-rascunho')).toBeVisible()
    await expect(page.getByText('Proposto pela nota: R$ 2,50 por unidade (a revisar).')).toBeVisible()

    await page.getByPlaceholder('45,00').fill('12,50')
    await page.getByPlaceholder('100').fill('5')
    await page.getByRole('button', { name: 'Salvar insumo' }).click()

    await expect(page).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
    await expect(page.getByTestId('tag-rascunho')).toHaveCount(0)
    await expect(page.getByText('Ativo', { exact: true }).first()).toBeVisible()
    const salvo = await (await request.get(`${API_URL}/insumos/${insumo.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(salvo.rascunho).toBe(false)
    expect(salvo.custoUnitario).toBeCloseTo(2.5, 4)
  })

  test('CEN-NOVO-50 — confirmar compra com insumo em rascunho bloqueia com atalho "Completar o insumo"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarRascunho(request, token, `E2E687 Resma ${Date.now()}`)
    const compra = await criarCompraRascunho(request, token, insumo.id)

    await login(page)
    await page.goto(`/compras/${compra.id}`)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()

    const modal = page.getByTestId('modal-erro')
    await expect(modal).toBeVisible()
    await expect(page.getByText('Insumo em rascunho na compra')).toBeVisible()
    const atalhos = page.getByTestId('atalhos-completar-insumo')
    await expect(atalhos.getByText(insumo.nome)).toBeVisible()
    await expect(atalhos.getByRole('button', { name: 'Completar o insumo' })).toBeVisible()

    const depois = await (await request.get(`${API_URL}/compras/${compra.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(depois.status).toBe('RASCUNHO')
  })

  test('CEN-NOVO-51/56 — listagem marca "Rascunho" sem "Inativar"; exclusão bloqueada pela compra salva', async ({ page, request }) => {
    const token = await apiLogin(request)
    const headers = { Authorization: `Bearer ${token}` }
    const nome = `E2E687 Cola ${Date.now()}`
    const insumo = await criarRascunho(request, token, nome)
    const compra = await criarCompraRascunho(request, token, insumo.id)

    // Seletores de ficha técnica, catálogo e orçamento não recebem o rascunho.
    const padrao = await (await request.get(`${API_URL}/insumos`, { headers, params: { busca: nome } })).json()
    expect(padrao.content).toHaveLength(0)

    await login(page)
    await page.goto('/insumos')
    await carregarAte(page, nome)
    const linha = page.getByText(nome, { exact: true }).first().locator('xpath=../..')
    await expect(linha.getByText('Rascunho', { exact: true })).toBeVisible()
    await linha.getByRole('button', { name: 'Mais ações' }).click()
    await expect(page.getByText('Completar cadastro', { exact: true })).toBeVisible()
    await expect(page.getByText('Inativar', { exact: true })).toHaveCount(0)
    await page.getByText('Excluir', { exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Excluir/ }).click()
    await expect(page.getByText(compra.identificador).first()).toBeVisible()

    const aindaExiste = await request.get(`${API_URL}/insumos/${insumo.id}`, { headers })
    expect(aindaExiste.ok()).toBe(true)
  })
})
