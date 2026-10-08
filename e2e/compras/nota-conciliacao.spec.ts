import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import { cnpjValido, registrarNotaFalsa, type ItemNotaFalsa } from '../helpers/nota-fiscal'

/**
 * V0.16.0 (#681, UC-NOVO-1, UC-NOVO-3, RN-NOVA-12 a 15) — compra por nota de ponta a ponta, com o
 * leitor-fiscal falso (e2e/fakes/leitor-fiscal-falso.mjs) e a IA desligada.
 * CEN-NOVO-9/17/19/60-62 na tela: nota → modal → rascunho; CEN-NOVO-14/18/21: a próxima nota do mesmo
 * emitente usa o vínculo salvo e lembra o ignorado; CEN-NOVO-13: reler a nota abre o rascunho;
 * CEN-NOVO-20: "Tentar novamente" com ligação manual pede confirmação; UC-NOVO-4 e CEN-NOVO-45 na modal.
 */

type ItemNota = ItemNotaFalsa

async function registrarNota(request: APIRequestContext, cnpj: string, itens: ItemNota[], descontoGeral = 0) {
  return (await registrarNotaFalsa(request, { cnpj, itens, descontoGeral })).chave
}

async function lerNaTela(page: Page, chave: string) {
  await page.goto('/compras/nota')
  await page.getByTestId('campo-link-chave').fill(chave)
  await page.getByRole('button', { name: 'Ler nota' }).click()
}

const item = (page: Page, posicao: number) => page.getByTestId(`item-nota-${posicao}`)

test.describe('#681 — Conciliação da nota', () => {
  test('nota → modal → rascunho, e a próxima nota do emitente usa o vínculo salvo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sfx = `z${Date.now().toString(36)}`
    const caneta = await criarInsumo(request, token, `Caneta gel ${sfx}`)
    const folha = await criarInsumo(request, token, `Folha ${sfx}`)
    const cnpj = cnpjValido()
    const itens = [
      { nome: `CANETA GEL ${sfx.toUpperCase()} AZUL`, quantidade: 3, valorFinal: 12 },
      { nome: `PAPEL COUCHE ${sfx.toUpperCase()} C/100`, quantidade: 1, valorFinal: 38 },
      { nome: `LANCHE ${sfx.toUpperCase()}`, quantidade: 1, valorFinal: 9 },
    ]
    const chave = await registrarNota(request, cnpj, itens, 5)

    await login(page)
    await lerNaTela(page, chave)
    await expect(page.getByTestId('modal-conciliacao-nota')).toBeVisible()
    await expect(item(page, 0).getByTestId('origem-ligacao')).toHaveText('Casamento por nome')
    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveText(`Caneta gel ${sfx}`)
    await expect(item(page, 1).getByTestId('origem-ligacao')).toHaveText('Sem ligação')
    await expect(item(page, 2).getByTestId('origem-ligacao')).toHaveText('Sem ligação')
    await expect(page.getByTestId('pendentes-conciliacao')).toContainText('2 itens')
    await expect(page.getByRole('button', { name: 'Gerar rascunho da compra' })).toBeDisabled()

    // Item 2: a artesã escolhe o insumo e informa o fator (pacote com 100).
    await item(page, 1).getByPlaceholder('Escolher insumo…').fill(`Folha ${sfx}`)
    await page.getByText(`Folha ${sfx}`, { exact: true }).last().click()
    await item(page, 1).getByLabel('Fator de conversão do item 2').fill('100')
    // Item 3: ignorado.
    await item(page, 2).getByRole('button', { name: 'Ignorar item' }).click()
    await expect(item(page, 2).getByTestId('origem-ligacao')).toHaveText('Ignorado')
    // Emitente sem cadastro: sem clicar em "Cadastrar como fornecedor", o rascunho segue sem fornecedor (RN-NOVA-23).
    await expect(page.getByTestId('fornecedor-nota-decisao')).toContainText('ainda não é um fornecedor cadastrado')

    await expect(page.getByTestId('previa-rascunho')).toContainText(`Folha ${sfx}`)
    await page.getByRole('button', { name: 'Gerar rascunho da compra' }).click()
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/)
    await expect(page.getByText(/criado a partir da nota/)).toBeVisible()

    const compraId = page.url().split('/').pop()!
    const compra = await (await request.get(`${API_URL}/compras/${compraId}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(compra.status).toBe('RASCUNHO')
    expect(compra.origem).toBe('NFCE_QR')
    // CEN-NOVO-65: sem clicar em "Cadastrar como fornecedor", a compra fica sem fornecedor.
    expect(compra.fornecedor ?? null).toBeNull()
    expect(compra.itens).toHaveLength(2)
    const linhaFolha = compra.itens.find((l: { insumo: { id: string } }) => l.insumo.id === folha.id)
    expect(linhaFolha.quantidade).toBe(100)
    expect(compra.itens.some((l: { insumo: { id: string } }) => l.insumo.id === caneta.id)).toBe(true)

    // CEN-NOVO-13: ler de novo a mesma nota abre o rascunho existente.
    await lerNaTela(page, chave)
    await expect(page).toHaveURL(new RegExp(`/compras/${compraId}$`))
    await expect(page.getByText(/já está no rascunho/)).toBeVisible()

    // CEN-NOVO-14/18: próxima nota do mesmo emitente com os mesmos itens.
    const chave2 = await registrarNota(request, cnpj, itens)
    await lerNaTela(page, chave2)
    await expect(item(page, 1).getByTestId('origem-ligacao')).toHaveText('Vínculo salvo')
    await expect(item(page, 1).getByTestId('insumo-ligado')).toHaveText(`Folha ${sfx}`)
    await expect(item(page, 1).getByLabel('Fator de conversão do item 2')).toHaveValue('100')
    await expect(item(page, 2).getByTestId('origem-ligacao')).toHaveText('Ignorado')
    await expect(item(page, 0).getByTestId('origem-ligacao')).toHaveText('Vínculo salvo')
  })

  test('CEN-NOVO-20 — "Tentar novamente" com ligação manual pede confirmação antes de descartar', async ({ page, request }) => {
    const sfx = `t${Date.now().toString(36)}`
    const chave = await registrarNota(request, cnpjValido(), [
      { nome: `ITEM UM ${sfx.toUpperCase()}`, quantidade: 1, valorFinal: 5 },
      { nome: `ITEM DOIS ${sfx.toUpperCase()}`, quantidade: 1, valorFinal: 6 },
    ])

    await login(page)
    await lerNaTela(page, chave)
    await item(page, 0).getByRole('button', { name: 'Ignorar item' }).click()
    await page.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(page.getByText('Descartar a conferência?')).toBeVisible()
    await page.getByRole('dialog').filter({ hasText: 'Descartar a conferência?' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(item(page, 0).getByTestId('origem-ligacao')).toHaveText('Ignorado')

    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.getByRole('button', { name: 'Descartar e ler de novo' }).click()
    await expect(page.getByTestId('modal-conciliacao-nota')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ler nota' })).toBeVisible()
  })

  test('CEN-NOVO-63/64 e CEN-NOVO-45 — cadastrar insumo completo pela modal, botão some e fator inválido', async ({ page, request }) => {
    const sfx = `c${Date.now().toString(36)}`
    const chave = await registrarNota(request, cnpjValido(), [{ nome: `RESMA ${sfx.toUpperCase()}`, quantidade: 2, valorFinal: 60, unidade: 'RM' }])

    await login(page)
    await lerNaTela(page, chave)
    await item(page, 0).getByRole('button', { name: 'Cadastrar insumo' }).click()
    const modal = page.getByTestId('modal-cadastrar-insumo-nota')
    await expect(modal).toBeVisible()
    // nome, custo e quantidade vêm da nota; todos os campos do cadastro estão na modal; não existe rascunho
    await expect(modal.getByPlaceholder('Papel couchê 180g')).toHaveValue(`RESMA ${sfx.toUpperCase()}`)
    await expect(modal.getByPlaceholder('45,00')).toHaveValue('60')
    await expect(modal.getByPlaceholder('100', { exact: true })).toHaveValue('2')
    await expect(modal.getByText('Unidade de medida *')).toBeVisible()
    await expect(modal.getByText('Permitir estoque negativo')).toBeVisible()
    await modal.getByPlaceholder('45,00').fill('60')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar insumo' }).click()

    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveText(`RESMA ${sfx.toUpperCase()}`)
    await expect(item(page, 0).getByText('Rascunho', { exact: true })).toHaveCount(0)
    // #715: com o item ligado, o botão Cadastrar insumo some
    await expect(item(page, 0).getByRole('button', { name: 'Cadastrar insumo' })).toHaveCount(0)

    await item(page, 0).getByLabel('Fator de conversão do item 1').fill('0')
    await expect(page.getByTestId('erro-previa')).toContainText('fator de conversão')
  })

  test('CEN-NOVO-64 — nome e marca repetidos: a modal continua aberta com a mensagem do cadastro', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sfx = `d${Date.now().toString(36)}`
    await criarInsumo(request, token, `Resma ${sfx}`)
    const chave = await registrarNota(request, cnpjValido(), [{ nome: `SULFITE ${sfx.toUpperCase()} 500FL`, quantidade: 1, valorFinal: 30 }])

    await login(page)
    await lerNaTela(page, chave)
    await item(page, 0).getByRole('button', { name: 'Cadastrar insumo' }).click()
    const modal = page.getByTestId('modal-cadastrar-insumo-nota')
    await modal.getByPlaceholder('Papel couchê 180g').fill(`Resma ${sfx}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar insumo' }).click()
    await expect(modal).toContainText('Já existe um insumo com este nome e marca.')
    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveCount(0)
  })

  test('CEN-NOVO-65 — fornecedor pelo botão: cadastra pela modal e o rascunho usa esse fornecedor', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sfx = `f${Date.now().toString(36)}`
    const caneta = await criarInsumo(request, token, `Caneta ${sfx}`)
    const cnpj = cnpjValido()
    const chave = await registrarNota(request, cnpj, [{ nome: `CANETA ${sfx.toUpperCase()}`, quantidade: 1, valorFinal: 4 }])

    await login(page)
    await lerNaTela(page, chave)
    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveText(`Caneta ${sfx}`)
    await page.getByRole('button', { name: 'Cadastrar como fornecedor' }).click()
    const modal = page.getByTestId('modal-cadastrar-fornecedor-nota')
    await expect(modal.getByLabel('CNPJ')).toBeDisabled()
    await page.getByRole('dialog').getByRole('button', { name: 'Cadastrar fornecedor' }).click()
    await expect(page.getByTestId('fornecedor-nota-cadastrado')).toContainText('Papelaria Estrela E2E')
    await expect(page.getByTestId('fornecedor-nota-decisao')).toHaveCount(0)

    await page.getByRole('button', { name: 'Gerar rascunho da compra' }).click()
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/)
    const compraId = page.url().split('/').pop()!
    const compra = await (await request.get(`${API_URL}/compras/${compraId}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(compra.fornecedor?.nome).toBe('Papelaria Estrela E2E')
    // CEN-NOVO-65: o fornecedor salvo leva o CNPJ da nota (só dígitos, como o cadastro grava o documento).
    const fornecedor = await (await request.get(`${API_URL}/clientes/${compra.fornecedor.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(String(fornecedor.documento).replace(/\D/g, '')).toBe(cnpj)
    expect(compra.itens.some((l: { insumo: { id: string } }) => l.insumo.id === caneta.id)).toBe(true)
  })
  test('CEN-NOVO-68 — vínculo de outro fornecedor liga o item antes da IA, com o fator do vínculo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sfx = `o${Date.now().toString(36)}`
    const folha = await criarInsumo(request, token, `Folha ${sfx}`)
    const nome = `PAPEL COUCHE ${sfx.toUpperCase()} C/100`
    const primeira = await registrarNota(request, cnpjValido(), [{ nome, quantidade: 1, valorFinal: 38 }])

    await login(page)
    await lerNaTela(page, primeira)
    await item(page, 0).getByPlaceholder('Escolher insumo…').fill(`Folha ${sfx}`)
    await page.getByText(`Folha ${sfx}`, { exact: true }).last().click()
    await item(page, 0).getByLabel('Fator de conversão do item 1').fill('100')
    await page.getByRole('button', { name: 'Gerar rascunho da compra' }).click()
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/)

    // Outro fornecedor (outro CNPJ) com o mesmo nome de item: vem ligado ao mesmo insumo e fator.
    const segunda = await registrarNota(request, cnpjValido(), [{ nome, quantidade: 2, valorFinal: 76 }])
    await lerNaTela(page, segunda)
    await expect(item(page, 0).getByTestId('origem-ligacao')).toHaveText('Vínculo de outro fornecedor')
    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveText(`Folha ${sfx}`)
    await expect(item(page, 0).getByLabel('Fator de conversão do item 1')).toHaveValue('100')
    expect(folha.id).toBeTruthy()
  })
})
