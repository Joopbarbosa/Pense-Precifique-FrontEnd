import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

/**
 * V0.16.0 (#681, UC-NOVO-1, UC-NOVO-3, RN-NOVA-12 a 15) — compra por nota de ponta a ponta, com o
 * leitor-fiscal falso (e2e/fakes/leitor-fiscal-falso.mjs) e a IA desligada.
 * CEN-NOVO-9/17/19/60-62 na tela: nota → modal → rascunho; CEN-NOVO-14/18/21: a próxima nota do mesmo
 * emitente usa o vínculo salvo e lembra o ignorado; CEN-NOVO-13: reler a nota abre o rascunho;
 * CEN-NOVO-20: "Tentar novamente" com ligação manual pede confirmação; UC-NOVO-4 e CEN-NOVO-45 na modal.
 */

const FALSO = `http://localhost:${process.env.E2E_LEITOR_FALSO_PORT ?? 13501}`

function cnpjValido(): string {
  const base = Array.from({ length: 12 }, (_, i) => (i < 8 ? Math.floor(Math.random() * 10) : [0, 0, 0, 1][i - 8])).join('')
  const dv = (s: string, pesos: number[]) => {
    const soma = s.split('').reduce((t, c, i) => t + Number(c) * pesos[i], 0)
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${base}${d1}${d2}`
}

function chaveUnica(): string {
  return `3526101122233300018165001${String(Date.now()).padStart(13, '0')}${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`
}

type ItemNota = { nome: string; quantidade: number; valorFinal: number; unidade?: string }

async function registrarNota(request: APIRequestContext, cnpj: string, itens: ItemNota[], descontoGeral = 0) {
  const chave = chaveUnica()
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const soma = itens.reduce((t, i) => t + i.valorFinal, 0)
  const nota = {
    emitente: { cnpj, nome: 'Papelaria Estrela E2E', uf: 'SP' },
    chaveAcesso: chave, numero: '1', serie: '1', dataEmissao: `${ontem}T10:00:00-03:00`,
    totalPago: Math.round((soma - descontoGeral) * 100) / 100, descontoGeral, acrescimos: 0,
    itens: itens.map(i => ({ ...i, unidade: i.unidade ?? 'UN' })),
    origem: 'NFCE_QR', metodo: 'LEITOR_UF', doCache: false, uf: 'SP', leiaute: 'SP-1', avisos: [],
  }
  const res = await request.post(`${FALSO}/_fixture`, { data: { chave, nota } })
  expect(res.ok()).toBe(true)
  return chave
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
    // Emitente sem cadastro: segue sem fornecedor (RN-NOVA-10).
    await page.getByRole('button', { name: 'Seguir sem fornecedor' }).click()

    await expect(page.getByTestId('previa-rascunho')).toContainText(`Folha ${sfx}`)
    await page.getByRole('button', { name: 'Gerar rascunho da compra' }).click()
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/)
    await expect(page.getByText(/criado a partir da nota/)).toBeVisible()

    const compraId = page.url().split('/').pop()!
    const compra = await (await request.get(`${API_URL}/compras/${compraId}`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(compra.status).toBe('RASCUNHO')
    expect(compra.origem).toBe('NFCE_QR')
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

  test('UC-NOVO-4 e CEN-NOVO-45 — cadastrar insumo em rascunho pela modal e fator inválido', async ({ page, request }) => {
    const sfx = `c${Date.now().toString(36)}`
    const chave = await registrarNota(request, cnpjValido(), [{ nome: `RESMA ${sfx.toUpperCase()}`, quantidade: 2, valorFinal: 60, unidade: 'RM' }])

    await login(page)
    await lerNaTela(page, chave)
    await item(page, 0).getByRole('button', { name: 'Cadastrar insumo' }).click()
    const modal = page.getByTestId('modal-cadastrar-insumo-nota')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('Sem unidade')).toBeVisible()
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()

    await expect(item(page, 0).getByTestId('insumo-ligado')).toHaveText(`RESMA ${sfx.toUpperCase()}`)
    await expect(item(page, 0).getByText('Rascunho', { exact: true })).toBeVisible()

    await item(page, 0).getByLabel('Fator de conversão do item 1').fill('0')
    await expect(page.getByTestId('erro-previa')).toContainText('fator de conversão')
  })
})
