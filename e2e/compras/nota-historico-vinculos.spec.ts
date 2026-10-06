import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { login, API_URL } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'
import type { NotaLeituraResponse } from '../../src/types/compraNota'
import type { CompraResponse } from '../../src/types/compra'

const FALSO = `http://localhost:${process.env.E2E_LEITOR_FALSO_PORT ?? 13501}`
const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
function cnpjValido() {
  const base = Array.from({ length: 12 }, (_, i) => i < 8 ? Math.floor(Math.random() * 10) : [0, 0, 0, 1][i - 8]).join('')
  const dv = (s: string, p: number[]) => { const r = [...s].reduce((v, c, i) => v + Number(c) * p[i], 0) % 11; return r < 2 ? 0 : 11 - r }
  const d = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return base + d + dv(base + d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
}
async function ler(request: APIRequestContext, token: string, cnpj: string, nomes: string[], emitenteNome: string): Promise<NotaLeituraResponse> {
  const chave = `3526101122233300018165001${Date.now().toString().padStart(13, '0')}${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`
  const nota = { emitente: { cnpj, nome: emitenteNome, uf: 'SP' }, chaveAcesso: chave, numero: '1', serie: '1',
    dataEmissao: `${new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)}T10:00:00-03:00`,
    totalPago: nomes.length * 10, descontoGeral: 0, acrescimos: 0,
    itens: nomes.map(nome => ({ nome, quantidade: 1, valorFinal: 10, unidade: 'UN' })),
    origem: 'NFCE_QR', metodo: 'LEITOR_UF', doCache: false, uf: 'SP', leiaute: 'SP-1', avisos: [] }
  expect((await request.post(`${FALSO}/_fixture`, { data: { chave, nota } })).ok()).toBe(true)
  const resposta = await request.post(`${API_URL}/compras/nota/leitura`, { headers: headers(token), multipart: { modelo: 'NFCE', chaveAcesso: chave, confirmouEnvioIa: 'false' } })
  expect(resposta.ok(), await resposta.text()).toBe(true)
  return resposta.json()
}
async function salvar(request: APIRequestContext, token: string, leitura: NotaLeituraResponse, destinos: string[], acaoFornecedor: 'SEM_FORNECEDOR' | null = null): Promise<CompraResponse> {
  const r = await request.post(`${API_URL}/compras/nota/rascunho`, { headers: headers(token), data: {
    notaLida: leitura.nota, assinatura: leitura.assinatura,
    escolhas: destinos.map((insumoId, posicao) => ({ posicao, insumoId, fator: 1, ignorar: false })),
    fornecedor: acaoFornecedor, comprovanteLink: null,
  } })
  expect(r.ok(), await r.text()).toBe(true)
  return (await r.json()).compra
}
async function fornecedor(request: APIRequestContext, token: string, nome: string, documento: string) {
  const r = await request.post(`${API_URL}/clientes`, { headers: headers(token), data: { nome, documento, tipoPessoa: 'JURIDICA', ehCliente: false, ehFornecedor: true } })
  expect(r.ok(), await r.text()).toBe(true)
  return r.json()
}
const tabela = (page: Page) => page.getByRole('table', { name: 'Histórico de Nota Fiscal' })

// CEN22/23/24: vínculos criados pelo fluxo real, não por SQL; editar não muda rascunho antigo.
test('CEN22/23/24: filtrar, editar, ignorar, vincular novamente e desfazer só afetam notas futuras', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const azul = await criarInsumo(request, token, `Insumo azul ${sfx}`)
  const preta = await criarInsumo(request, token, `Insumo preto ${sfx}`)
  const cnpj = cnpjValido(); const outro = cnpjValido()
  const estrela = await fornecedor(request, token, `Papelaria Estrela ${sfx}`, cnpj)
  await fornecedor(request, token, `Distribuidora Aurora ${sfx}`, outro)
  const nomes = [`CANETA FISCAL ${sfx}`, `PAPEL FISCAL ${sfx}`, `COLA FISCAL ${sfx}`]
  const antigo = await salvar(request, token, await ler(request, token, cnpj, nomes, estrela.nome), [azul.id, azul.id, preta.id])
  await salvar(request, token, await ler(request, token, outro, [nomes[0]], `Distribuidora Aurora ${sfx}`), [azul.id])
  await login(page); await page.goto('/compras')
  await page.getByRole('link', { name: 'Histórico de Nota Fiscal', exact: true }).click()
  await page.getByLabel('Buscar vínculo').fill(sfx)
  await expect(tabela(page).getByRole('row')).toHaveCount(5)
  await page.getByPlaceholder('Buscar fornecedor…').fill(estrela.nome)
  await page.getByRole('button', { name: new RegExp(estrela.nome) }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(4)
  await page.getByPlaceholder('Filtrar por insumo…').fill(azul.nome)
  await page.getByRole('button', { name: new RegExp(azul.nome) }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(3)
  await page.getByRole('button', { name: 'Remover filtro de insumo' }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(4)
  await page.getByLabel('Buscar vínculo').fill(nomes[0])
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  const linha = tabela(page).getByRole('row').filter({ hasText: nomes[0] })
  await expect(linha).toContainText('Manual')
  await linha.getByRole('button', { name: 'Editar', exact: true }).click()
  const editor = page.getByRole('dialog').filter({ hasText: 'Editar vínculo' })
  await editor.getByRole('button', { name: 'Trocar insumo' }).click()
  await editor.getByPlaceholder('Escolher insumo do vínculo…').fill(preta.nome)
  await editor.getByRole('button', { name: new RegExp(preta.nome) }).click()
  await editor.getByLabel('Fator de conversão').fill('0')
  await editor.getByRole('button', { name: 'Salvar vínculo' }).click()
  await expect(page.getByTestId('modal-erro')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(editor).toBeVisible()
  await editor.getByLabel('Fator de conversão').fill('2,5')
  await editor.getByRole('button', { name: 'Salvar vínculo' }).click()
  await expect(editor).toHaveCount(0)
  await expect(linha).toContainText(preta.nome)
  await expect(linha).toContainText('2,5')
  const nova = await ler(request, token, cnpj, [nomes[0]], estrela.nome)
  expect(nova.itens[0].insumo.id).toBe(preta.id); expect(nova.itens[0].fator).toBe(2.5)
  const compraAntiga = await (await request.get(`${API_URL}/compras/${antigo.id}`, { headers: headers(token) })).json()
  expect(compraAntiga.itens.map(i => [i.insumo.id, i.quantidade, i.precoCheio])).toEqual(antigo.itens.map(i => [i.insumo.id, i.quantidade, i.precoCheio]))
  expect((await ler(request, token, outro, [nomes[0]], 'Distribuidora Aurora')).itens[0].insumo.id).toBe(azul.id)
  await linha.getByRole('button', { name: 'Ignorar', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(linha).toContainText(preta.nome)
  await linha.getByRole('button', { name: 'Ignorar', exact: true }).click()
  await page.getByRole('button', { name: 'Ignorar item', exact: true }).click()
  await expect(linha).toContainText('Ignorado')
  expect((await ler(request, token, cnpj, [nomes[0]], estrela.nome)).itens[0].ignorar).toBe(true)
  await linha.getByRole('button', { name: 'Vincular insumo' }).click()
  const vincular = page.getByRole('dialog').filter({ hasText: 'Vincular insumo' })
  await vincular.getByPlaceholder('Escolher insumo do vínculo…').fill(azul.nome)
  await vincular.getByRole('button', { name: new RegExp(azul.nome) }).click()
  await vincular.getByLabel('Fator de conversão').fill('1')
  await vincular.getByRole('button', { name: 'Salvar vínculo' }).click()
  await expect(linha).toContainText(azul.nome)
  await linha.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await page.getByRole('button', { name: 'Desfazer vínculo', exact: true }).click()
  await expect(page.getByText('Nenhum vínculo encontrado', { exact: true })).toBeVisible()
  // Sem vínculo do mesmo CNPJ, o do outro fornecedor (mesmo nome de item) liga o item antes da IA (#718, RN-NOVA-26).
  expect((await ler(request, token, cnpj, [nomes[0]], estrela.nome)).itens[0].origemLigacao).toBe('VINCULO_OUTRO_FORNECEDOR')
})

test('histórico: erro permite nova tentativa; página e busca preservam filtro e total', async ({ page }) => {
  let falhar = true
  const insumoId = '22222222-2222-4222-8222-222222222222'
  const vinculo = (n: number) => ({ id: `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`, nomeItem: `ITEM ${n}`, emitenteCnpj: '11222333000181', emitenteNome: 'Fornecedor sem cadastro', fornecedorId: null, fornecedorNome: 'Fornecedor sem cadastro',
    insumo: { id: insumoId, identificador: 'INS-1', nome: 'Caneta', marca: null, unidade: 'un', rascunho: false }, fator: 1, ignorar: false, origem: 'CASAMENTO_NOME', createdAt: '2026-10-01T10:00:00', updatedAt: '2026-10-01T10:00:00' })
  await page.route('**/compras/nota/vinculos?*', async route => {
    if (falhar) return route.fulfill({ status: 503, json: { message: 'Indisponível' } })
    const u = new URL(route.request().url()); const pg = Number(u.searchParams.get('page'))
    const filtrado = u.searchParams.get('busca') === 'AURORA'
    const content = filtrado ? [] : pg === 0 ? Array.from({ length: 20 }, (_, i) => vinculo(i + 1)) : [vinculo(21)]
    await route.fulfill({ json: { content, number: pg, size: 20, totalElements: filtrado ? 0 : 21, totalPages: filtrado ? 0 : 2, first: pg === 0, last: filtrado || pg === 1 } })
  })
  await login(page); await page.goto('/compras/nota/vinculos')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os vínculos.')
  falhar = false; await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(21)
  await expect(page.getByText('21 vínculos', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(tabela(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.getByText('Página 2 de 2', { exact: true })).toBeVisible()
  await expect(tabela(page)).toContainText('ITEM 21')
  await expect(page.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  await page.getByLabel('Buscar vínculo').fill('AURORA')
  await expect(page.getByText('Nenhum vínculo encontrado', { exact: true })).toBeVisible()
})


test('histórico: filtro CNPJ inclui emitente sem cadastro e filtro de insumo inclui inativo', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const insumo = await criarInsumo(request, token, `Insumo histórico ${sfx}`)
  const cnpj = cnpjValido(); const nome = `Emitente sem cadastro ${sfx}`
  await salvar(request, token, await ler(request, token, cnpj, [`ITEM SEM CADASTRO ${sfx}`], nome), [insumo.id], 'SEM_FORNECEDOR')
  const cadastro = await fornecedor(request, token, `Fornecedor histórico ${sfx}`, cnpjValido())
  await salvar(request, token, await ler(request, token, cadastro.documento, [`ITEM CADASTRADO ${sfx}`], cadastro.nome), [insumo.id])
  expect((await request.post(`${API_URL}/insumos/${insumo.id}/inativar`, { headers: headers(token) })).ok()).toBe(true)
  expect((await request.post(`${API_URL}/clientes/${cadastro.id}/inativar`, { headers: headers(token) })).ok()).toBe(true)
  await login(page); await page.goto('/compras/nota/vinculos')
  await page.getByLabel('CNPJ do emitente').fill(cnpj)
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  await expect(tabela(page)).toContainText(nome)
  await page.getByPlaceholder('Filtrar por insumo…').fill(insumo.nome)
  await page.getByRole('button', { name: new RegExp(insumo.nome) }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  await expect(tabela(page)).toContainText(insumo.nome)
  await page.getByLabel('CNPJ do emitente').fill('')
  await page.getByPlaceholder('Buscar fornecedor…').fill(cadastro.nome)
  await page.getByRole('button', { name: new RegExp(cadastro.nome) }).click()
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  await expect(tabela(page)).toContainText(cadastro.nome)
  await tabela(page).getByRole('button', { name: 'Editar', exact: true }).click()
  const editor = page.getByRole('dialog').filter({ hasText: 'Editar vínculo' })
  await editor.getByRole('button', { name: 'Trocar insumo' }).click()
  await editor.getByPlaceholder('Escolher insumo do vínculo…').fill(insumo.nome)
  await expect(editor.getByTestId('opcao-inativa').filter({ hasText: insumo.nome })).toHaveAttribute('aria-disabled', 'true')
})

// #716 (CEN-NOVO-66): clicar no registro abre "Ir para…" com compra, fornecedor e insumo; cada um abre o destino certo.
test('CEN-NOVO-66: clique no registro oferece compra, fornecedor e insumo', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const insumo = await criarInsumo(request, token, `Insumo destino ${sfx}`)
  const cadastro = await fornecedor(request, token, `Fornecedor destino ${sfx}`, cnpjValido())
  const compra = await salvar(request, token, await ler(request, token, cadastro.documento, [`ITEM DESTINO ${sfx}`], cadastro.nome), [insumo.id])
  await login(page); await page.goto('/compras')
  await page.getByRole('link', { name: 'Histórico de Nota Fiscal', exact: true }).click()
  await page.getByLabel('Buscar vínculo').fill(`ITEM DESTINO ${sfx}`)
  await expect(tabela(page).getByRole('row')).toHaveCount(2)

  const abrirDestinos = async () => {
    await tabela(page).getByRole('row').filter({ hasText: `ITEM DESTINO ${sfx}` }).getByText(`ITEM DESTINO ${sfx}`).click()
    const modal = page.getByTestId('destinos-vinculo-nota')
    await expect(modal.getByRole('button', { name: `Compra ${compra.identificador}` })).toBeVisible()
    await expect(modal.getByRole('button', { name: `Fornecedor ${cadastro.nome}` })).toBeVisible()
    await expect(modal.getByRole('button', { name: `Insumo ${insumo.nome}` })).toBeVisible()
    return modal
  }
  await (await abrirDestinos()).getByRole('button', { name: `Compra ${compra.identificador}` }).click()
  await expect(page).toHaveURL(new RegExp(`/compras/${compra.id}$`))
  await page.goBack()
  await expect(page).toHaveURL(/\/compras\/nota\/vinculos$/)
  await expect(page.getByTestId('destinos-vinculo-nota')).toHaveCount(0)
  await page.getByLabel('Buscar vínculo').fill(`ITEM DESTINO ${sfx}`)
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  await (await abrirDestinos()).getByRole('button', { name: `Fornecedor ${cadastro.nome}` }).click()
  await expect(page).toHaveURL(new RegExp(`/clientes/${cadastro.id}$`))
  await page.goBack()
  await expect(page).toHaveURL(/\/compras\/nota\/vinculos$/)
  await expect(page.getByTestId('destinos-vinculo-nota')).toHaveCount(0)
  await page.getByLabel('Buscar vínculo').fill(`ITEM DESTINO ${sfx}`)
  await expect(tabela(page).getByRole('row')).toHaveCount(2)
  await (await abrirDestinos()).getByRole('button', { name: `Insumo ${insumo.nome}` }).click()
  await expect(page).toHaveURL(new RegExp(`/insumos/${insumo.id}$`))
})

test('CEN-NOVO-66: compra excluída deixa de ser destino e as ações da linha não abrem a modal', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const insumo = await criarInsumo(request, token, `Insumo sem compra ${sfx}`)
  const compra = await salvar(request, token, await ler(request, token, cnpjValido(), [`ITEM SEM COMPRA ${sfx}`], `Emitente ${sfx}`), [insumo.id], 'SEM_FORNECEDOR')
  expect((await request.delete(`${API_URL}/compras/${compra.id}`, { headers: headers(token) })).ok()).toBe(true)
  await login(page); await page.goto('/compras/nota/vinculos')
  await page.getByLabel('Buscar vínculo').fill(`ITEM SEM COMPRA ${sfx}`)
  const linha = tabela(page).getByRole('row').filter({ hasText: `ITEM SEM COMPRA ${sfx}` })
  await linha.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.getByTestId('destinos-vinculo-nota')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await linha.getByText(`ITEM SEM COMPRA ${sfx}`).click()
  const modal = page.getByTestId('destinos-vinculo-nota')
  await expect(modal.getByRole('button', { name: /^Compra / })).toHaveCount(0)
  await expect(modal.getByRole('button', { name: `Insumo ${insumo.nome}` })).toBeVisible()
})

// #717 (CEN-NOVO-67): aba Histórico de Nota Fiscal no detalhe do insumo.
test('CEN-NOVO-67: aba do insumo lista os itens de nota ligados e mostra mensagem quando não há', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const comVinculo = await criarInsumo(request, token, `Insumo com nota ${sfx}`)
  const semVinculo = await criarInsumo(request, token, `Insumo sem nota ${sfx}`)
  const cadastro = await fornecedor(request, token, `Fornecedor aba ${sfx}`, cnpjValido())
  await salvar(request, token, await ler(request, token, cadastro.documento, [`PAPEL COUCHE ABA ${sfx}`], cadastro.nome), [comVinculo.id])
  await login(page)
  await page.goto(`/insumos/${comVinculo.id}`)
  await page.getByRole('button', { name: 'Histórico de Nota Fiscal' }).click()
  const tabelaInsumo = page.getByRole('table', { name: 'Histórico de Nota Fiscal do insumo' })
  await expect(tabelaInsumo).toContainText(`PAPEL COUCHE ABA ${sfx}`)
  await expect(tabelaInsumo).toContainText(cadastro.nome)
  await expect(tabelaInsumo).toContainText('Manual')
  await page.goto(`/insumos/${semVinculo.id}`)
  await page.getByRole('button', { name: 'Histórico de Nota Fiscal' }).click()
  await expect(page.getByTestId('historico-nota-vazio')).toContainText('Nenhum item de nota foi ligado a este insumo ainda.')
})

// #722: na aba do insumo, clicar no registro leva para a compra em que o vínculo foi feito.
test('#722: clicar no registro da aba do insumo abre a compra', async ({ page, request }) => {
  const token = await apiLogin(request); const sfx = Date.now().toString(36)
  const insumo = await criarInsumo(request, token, `Insumo aba compra ${sfx}`)
  const cadastro = await fornecedor(request, token, `Fornecedor aba compra ${sfx}`, cnpjValido())
  const compra = await salvar(request, token, await ler(request, token, cadastro.documento, [`ITEM ABA COMPRA ${sfx}`], cadastro.nome), [insumo.id])
  await login(page)
  await page.goto(`/insumos/${insumo.id}`)
  await page.getByRole('button', { name: 'Histórico de Nota Fiscal' }).click()
  await page.getByRole('table', { name: 'Histórico de Nota Fiscal do insumo' }).getByRole('row').filter({ hasText: `ITEM ABA COMPRA ${sfx}` }).getByText(`ITEM ABA COMPRA ${sfx}`).click()
  await expect(page).toHaveURL(new RegExp(`/compras/${compra.id}$`))
})
