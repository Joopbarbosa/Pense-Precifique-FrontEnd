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
test.beforeEach(async ({ page }) => { await login(page) })
test.afterEach(async ({ request }) => {
  const token = await apiLogin(request)
  for (const id of ids.splice(0)) await inativarInsumo(request, token, id)
})

test('CEN-NOVO-25: marca desabilitada e vazia; opção persiste no cadastro, detalhe e edição', async ({ page }) => {
  await preencherCadastro(page, `Folha A4 ${Date.now()}`)
  const opcao = page.getByRole('switch', { name: 'Não validar marca' })
  await expect(opcao).toHaveAttribute('aria-checked', 'false')
  await opcao.click()
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('')
  const id = await salvar(page)
  await expect(page.getByText('Qualquer marca', { exact: true })).toBeVisible()
  await page.goto(`/insumos/${id}/editar`)
  await expect(opcao).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await opcao.click()
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
  const opcao = page.getByRole('switch', { name: 'Não validar marca' })
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('Progresso')
  await opcao.click()
  await expect(page.getByText('A marca Progresso será apagada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click()
  await expect(opcao).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('Progresso')
  await expect(page.getByPlaceholder('Suzano')).toBeEnabled()
  await opcao.click()
  await page.getByRole('button', { name: 'Apagar marca e confirmar' }).click()
  await expect(opcao).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByPlaceholder('Suzano')).toHaveValue('')
  await expect(page.getByPlaceholder('Suzano')).toBeDisabled()
  await page.getByRole('button', { name: 'Salvar insumo' }).click()
  await expect(page).toHaveURL(`/insumos/${insumo.id}`)
  await expect(page.getByText('Qualquer marca', { exact: true })).toBeVisible()
})
