import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail, API_URL } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { hojeLocal } from '../helpers/data'

/**
 * V0.17.0 #997 — "Registrar compra" abre em "Pago" com o último método usado (RN-NOVA-33,
 * CEN-NOVO-103, 104 e 105). Conta efêmera: o último método fica no navegador, então cada teste
 * começa com o armazenamento limpo.
 */

const CHAVE = 'pp:compra:ultimo-metodo-pagamento'
const pagamento = (page: Page, nome: 'Pago' | 'Não pago') =>
  page.getByRole('group', { name: /^Pagamento/ }).getByRole('button', { name: nome, exact: true })
const metodoBotao = (page: Page, nome: string) => page.getByRole('button', { name: new RegExp(nome) })

async function preparar(page: Page, request: APIRequestContext, prefixo: string) {
  const { email, token } = await registrarEmpresaEfemera(request, prefixo)
  const h = { Authorization: `Bearer ${token}` }
  const metodos = await (await request.get(`${API_URL}/configuracoes/metodos-pagamento`, { headers: h })).json() as { id: string; tipo: string; ativo: boolean }[]
  const pix = metodos.find(m => m.tipo === 'PIX')!
  await loginComoEmail(page, email, 'senha12345')
  return { token, h, pix }
}

async function rascunho(request: APIRequestContext, token: string, pago: boolean, metodoId: string | null, nome: string) {
  const insumo = await criarInsumo(request, token, nome)
  const hoje = hojeLocal()
  const res = await request.post(`${API_URL}/compras`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { dataCompra: hoje, multiplosFornecedores: false, pago, metodoPagamentoId: metodoId, itens: [{ insumoId: insumo.id, quantidade: 2, precoCheio: 10 }] },
  })
  if (!res.ok()) throw new Error(`rascunho: ${res.status()} ${await res.text()}`)
  return res.json() as Promise<{ id: string }>
}

test.describe('#997 — Registrar compra abre em Pago', () => {
  test('CEN-NOVO-103: abre em Pago sem método; com último método ativo vem selecionado; desativado, nenhum; Não pago esconde o método', async ({ page, request }) => {
    const { h, pix } = await preparar(page, request, 'compra-pago')
    await page.goto('/compras/nova')
    await expect(pagamento(page, 'Pago')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Como foi paga?')).toBeVisible()
    await expect(metodoBotao(page, 'Pix')).toHaveAttribute('aria-pressed', 'false')

    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [CHAVE, pix.id])
    await page.goto('/compras/nova')
    await expect(metodoBotao(page, 'Pix')).toHaveAttribute('aria-pressed', 'true')

    const desativar = await request.put(`${API_URL}/configuracoes/metodos-pagamento/${pix.id}`, { headers: h, data: { ativo: false } })
    expect(desativar.ok()).toBeTruthy()
    await page.goto('/compras/nova')
    await expect(pagamento(page, 'Pago')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Como foi paga?')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Pix/ })).toHaveCount(0)

    await pagamento(page, 'Não pago').click()
    await expect(page.getByText('Como foi paga?')).toHaveCount(0)
  })

  test('armazenamento do navegador indisponível: abre sem método e conclui depois de escolher um', async ({ page, request }) => {
    await preparar(page, request, 'compra-sem-storage')
    // só a chave do último método falha (o resto do app usa o armazenamento normalmente)
    await page.addInitScript((chave) => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem
      Storage.prototype.getItem = function (k: string) { if (k === chave) throw new Error('armazenamento indisponível'); return get.call(this, k) }
      Storage.prototype.setItem = function (k: string, v: string) { if (k === chave) throw new Error('armazenamento indisponível'); return set.call(this, k, v) }
    }, CHAVE)
    await page.goto('/compras/nova')
    await expect(pagamento(page, 'Pago')).toHaveAttribute('aria-pressed', 'true')
    await expect(metodoBotao(page, 'Pix')).toHaveAttribute('aria-pressed', 'false')
    await metodoBotao(page, 'Pix').click()
    await expect(metodoBotao(page, 'Pix')).toHaveAttribute('aria-pressed', 'true')
  })

  test('CEN-NOVO-104: Pago sem método bloqueia confirmar e salvar rascunho; Não pago salva o rascunho', async ({ page, request }) => {
    const { token } = await preparar(page, request, 'compra-bloqueio')
    const insumo = await criarInsumo(request, token, `Insumo ${Date.now()}`)
    await page.goto('/compras/nova')
    await page.getByPlaceholder('Adicionar insumo à compra…').fill(insumo.nome)
    await page.getByText(insumo.nome, { exact: true }).first().click()
    await page.getByLabel(`Quantidade de ${insumo.nome}`).fill('2')
    await page.getByLabel(`Preço cheio de ${insumo.nome}`).fill('10,00')

    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.getByText('Escolha como a compra foi paga.')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/compras\/nova/)

    await pagamento(page, 'Não pago').click()
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    // #1025 — salvar o rascunho só navega quando a API responde; sob carga passa dos 5 s padrão
    await expect(page).toHaveURL(/\/compras\/(?!nova)[0-9a-f-]{36}/, { timeout: 20_000 })
  })

  test('CEN-NOVO-105: rascunho existente mostra o gravado; confirmar pelo detalhe grava o último método', async ({ page, request }) => {
    const { token, pix } = await preparar(page, request, 'compra-gravado')
    const naoPago = await rascunho(request, token, false, null, `Insumo A ${Date.now()}`)
    await page.goto(`/compras/${naoPago.id}/editar`)
    await expect(pagamento(page, 'Não pago')).toHaveAttribute('aria-pressed', 'true')

    const pago = await rascunho(request, token, true, pix.id, `Insumo B ${Date.now()}`)
    await page.goto(`/compras/${pago.id}`)
    await page.evaluate(k => localStorage.removeItem(k), CHAVE)
    await page.getByRole('button', { name: 'Confirmar compra' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()
    await expect.poll(() => page.evaluate(k => localStorage.getItem(k), CHAVE)).toBe(pix.id)
  })
})
