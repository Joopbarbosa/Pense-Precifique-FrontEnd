import { test, expect, type Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'

const ids: string[] = []
async function preencherCadastro(page: Page, nome: string) {
  await page.goto('/insumos/novo')
  await page.getByPlaceholder('Papel couchê 180g').fill(nome)
  await page.getByLabel(/Custo do Insumo/).fill('17,43')
  await page.getByLabel(/^Quantidade/).fill('3')
}
async function salvar(page: Page) {
  await page.getByRole('button', { name: 'Salvar insumo' }).click()
  await expect(page).toHaveURL(/\/insumos\/[0-9a-f-]{36}$/)
  const id = page.url().split('/insumos/')[1]
  ids.push(id)
  return id
}
// #712 — "Não validar marca" é um alternador Sim/Não pequeno (antes um switch).
const opcaoNaoValidarMarca = (page: Page) => page.getByRole('group', { name: 'Não validar marca' })
const ligar = (page: Page) => opcaoNaoValidarMarca(page).getByRole('button', { name: 'Sim', exact: true }).click()
const desligar = (page: Page) => opcaoNaoValidarMarca(page).getByRole('button', { name: 'Não', exact: true }).click()
const ligada = (page: Page) => expect(opcaoNaoValidarMarca(page).getByRole('button', { name: 'Sim', exact: true })).toHaveAttribute('aria-pressed', 'true')
const desligada = (page: Page) => expect(opcaoNaoValidarMarca(page).getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true')
test.beforeEach(async ({ page }) => { await login(page) })
test.afterEach(async ({ request }) => {
  const token = await apiLogin(request)
  for (const id of ids.splice(0)) await inativarInsumo(request, token, id)
})

test('CEN-NOVO-25: marca desabilitada e vazia; opção persiste no cadastro, detalhe e edição', async ({ page }) => {
  await preencherCadastro(page, `Folha A4 ${Date.now()}`)
  await desligada(page)
  await ligar(page)
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('')
  const id = await salvar(page)
  await expect(page.getByText('Qualquer marca', { exact: true })).toBeVisible()
  await page.goto(`/insumos/${id}/editar`)
  await ligada(page)
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await desligar(page)
  await expect(page.getByPlaceholder('Suzano')).toBeEnabled()
  await page.getByPlaceholder('Suzano').fill('Chamex')
  await page.getByRole('button', { name: 'Salvar insumo' }).click()
  await expect(page).toHaveURL(`/insumos/${id}`)
  await expect(page.getByText('Chamex', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Qualquer marca', { exact: true })).toHaveCount(0)
})

test('CEN-NOVO-26: mesmo nome de qualquer marca e Chamex coexistem', async ({ page, request }) => {
  const nome = `Folha A4 ${Date.now()}`, token = await apiLogin(request)
  ids.push((await criarInsumo(request, token, nome, { qualquerMarca: true })).id)
  await preencherCadastro(page, nome)
  await page.getByPlaceholder('Suzano').fill('Chamex')
  await salvar(page)
  await expect(page.getByText('Chamex', { exact: true }).first()).toBeVisible()
})

test('CEN-NOVO-48: nome duplicado sem marca bloqueado mesmo com opção desmarcada', async ({ page, request }) => {
  const nome = `Folha A4 ${Date.now()}`, token = await apiLogin(request)
  ids.push((await criarInsumo(request, token, nome, { qualquerMarca: true })).id)
  await preencherCadastro(page, nome)
  await page.getByRole('button', { name: 'Salvar insumo' }).click()
  await expect(page.getByText('Já existe um insumo com este nome e marca.', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/insumos\/novo$/)
})

test('CEN-NOVO-49: cancelar preserva marca; confirmar apaga e marca a opção', async ({ page, request }) => {
  const token = await apiLogin(request)
  const insumo = await criarInsumo(request, token, `Fita de cetim ${Date.now()}`, { marca: 'Progresso', qualquerMarca: false })
  ids.push(insumo.id)
  await page.goto(`/insumos/${insumo.id}/editar`)
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('Progresso')
  await ligar(page)
  await expect(page.getByText('A marca Progresso será apagada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click()
  await desligada(page)
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('Progresso')
  await expect(page.getByPlaceholder('Suzano')).toBeEnabled()
  await ligar(page)
  await page.getByRole('button', { name: 'Apagar marca e confirmar' }).click()
  await ligada(page)
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('')
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await page.getByRole('button', { name: 'Salvar insumo' }).click()
  await expect(page).toHaveURL(`/insumos/${insumo.id}`)
  await expect(page.getByText('Qualquer marca', { exact: true })).toBeVisible()
})

// #721 — "Não validar marca" fica à esquerda do campo Marca, na mesma linha (abaixo do nome).
test('#721 — o alternador "Não validar marca" fica à esquerda do campo Marca', async ({ page }) => {
  await page.goto('/insumos/novo')
  const nome = await page.getByPlaceholder('Papel couchê 180g').boundingBox()
  const alternador = await opcaoNaoValidarMarca(page).boundingBox()
  const marca = await page.getByPlaceholder('Suzano').boundingBox()
  expect(nome && alternador && marca).toBeTruthy()
  expect(alternador!.x + alternador!.width).toBeLessThanOrEqual(marca!.x)
  expect(alternador!.y).toBeGreaterThan(nome!.y + nome!.height)
  expect(Math.abs((alternador!.y + alternador!.height / 2) - (marca!.y + marca!.height / 2))).toBeLessThan(40)
})
