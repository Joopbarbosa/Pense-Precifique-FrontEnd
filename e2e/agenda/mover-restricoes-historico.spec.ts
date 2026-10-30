import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { registrarCompraPendente } from '../helpers/compra'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1187 (V0.18.0, RN-NOVA-43, 44 e 46) — o que não se move, o que continua na Agenda e o que bloqueia ao mover para antes de hoje.
 * CEN-NOVO-158 (concluído, cancelado e Saldo a receber não movem), 167 (concluído antigo segue na Agenda) e 168 (passado: bloqueio x aviso).
 * Datas próprias e distantes; toda contagem é filtrada por um identificador único (`ts`).
 */
const OBS_CANCELAMENTO = 'Cancelado pelo teste automatizado da tarefa 1187 (observação com mais de trinta caracteres).'

async function doDia(request: APIRequestContext, trecho: string, dia: string) {
  const token = await apiLogin(request)
  const res = await request.get(`${E2E_API_URL}/agenda/compromissos?de=${dia}&ate=${dia}`, { headers: { Authorization: `Bearer ${token}` } })
  const lista = await res.json() as Array<{ titulo: string; situacao: string }>
  return lista.filter(c => c.titulo.includes(trecho))
}

async function abrirMes(page: Page, alvo: string) {
  await login(page)
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Mês', exact: true }).click()
  const meses = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7))
  const diferenca = meses(alvo) - meses(hojeLocal(0))
  for (let i = 0; i < Math.abs(diferenca); i++) await page.getByRole('button', { name: diferenca > 0 ? 'Próximo' : 'Anterior' }).click()
}

async function arrastar(page: Page, chip: Locator, destino: string) {
  await expect(chip).toBeVisible()
  await chip.scrollIntoViewIfNeeded()
  const de = (await chip.boundingBox())!
  const para = (await page.getByTestId(`dia-${destino}`).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 10, de.y + de.height / 2 + 10, { steps: 4 })
  await page.mouse.move(para.x + 40, para.y + 40, { steps: 8 })
  await page.mouse.up()
}

async function naoAbreJanela(page: Page) {
  await expect(page.getByTestId('modal-confirmar-movimento')).toHaveCount(0)
  await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0)
}

test.use({ viewport: { width: 1280, height: 1100 } }) // a semana de hoje fica abaixo da dobra no viewport padrão

test.describe('#1187 — Restrições ao mover e histórico da Agenda', () => {
  const produtoIds: string[] = []

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds.splice(0)) await inativarProduto(request, token, id)
  })

  test('CT-1187-01 (negativo, CEN-NOVO-158) — concluído e cancelado não se movem ao arrastar e nenhuma janela abre', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const concluido = `QA1187-Concluido-${ts}`, cancelado = `QA1187-Cancelado-${ts}`
    const diaConcluido = hojeLocal(70), diaCancelado = hojeLocal(72)
    const a = await criarCompromissoUsuaria(request, token, { titulo: concluido, data: diaConcluido })
    const b = await criarCompromissoUsuaria(request, token, { titulo: cancelado, data: diaCancelado })
    const ok = await request.post(`${E2E_API_URL}/agenda/compromissos-usuaria/${a.id}/ocorrencias/${a.dataOriginal}/concluir`, { headers: { Authorization: `Bearer ${token}` } })
    expect(ok.ok()).toBe(true)
    const cancelou = await request.post(`${E2E_API_URL}/agenda/compromissos-usuaria/${b.id}/ocorrencias/${b.dataOriginal}/cancelar`,
      { headers: { Authorization: `Bearer ${token}` }, data: { escopo: 'OCORRENCIA', observacao: OBS_CANCELAMENTO } })
    expect(cancelou.ok()).toBe(true)

    await abrirMes(page, diaConcluido)
    const chipConcluido = page.getByTestId(`dia-${diaConcluido}`).getByTestId('compromisso').filter({ hasText: concluido })
    await expect(chipConcluido).toHaveAttribute('data-situacao', 'CONCLUIDO')
    await arrastar(page, chipConcluido, hojeLocal(71))
    await naoAbreJanela(page)
    const chipCancelado = page.getByTestId(`dia-${diaCancelado}`).getByTestId('compromisso').filter({ hasText: cancelado })
    await expect(chipCancelado).toHaveAttribute('data-situacao', 'CANCELADO')
    await arrastar(page, chipCancelado, hojeLocal(73))
    await naoAbreJanela(page)

    expect((await doDia(request, concluido, diaConcluido)).map(c => c.situacao)).toEqual(['CONCLUIDO'])
    expect((await doDia(request, concluido, hojeLocal(71)))).toHaveLength(0)
    expect((await doDia(request, cancelado, diaCancelado)).map(c => c.situacao)).toEqual(['CANCELADO'])
    expect((await doDia(request, cancelado, hojeLocal(73)))).toHaveLength(0)
  })

  test('CT-1187-02 (negativo, CEN-NOVO-158) — o card de Saldo a receber de orçamento Finalizado não se move', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoComEstoque(request, token, `QA1187-Produto-${ts}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1187-Cliente-${ts}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], { sinalAtivo: true, percentualSinal: 30, prazoProducaoDias: 1 })
    for (let i = 0; i < 6; i++) await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('FINALIZADO')
    const rotulo = `Saldo a receber — ORC-${orcamento.numero}`
    const origem = hojeLocal(1), destino = hojeLocal(2)

    await abrirMes(page, origem)
    const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: rotulo })
    await arrastar(page, chip, destino)
    await naoAbreJanela(page)
    expect(await doDia(request, rotulo, origem)).toHaveLength(1)
    expect(await doDia(request, rotulo, destino)).toHaveLength(0)
  })

  test('CT-1187-03 (CEN-NOVO-167) — compromisso concluído há 200 dias continua na Agenda ao navegar até aquele mês', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1187-Antigo-${Date.now()}`
    const dia = hojeLocal(-200)
    const c = await criarCompromissoUsuaria(request, token, { titulo, data: dia })
    const ok = await request.post(`${E2E_API_URL}/agenda/compromissos-usuaria/${c.id}/ocorrencias/${c.dataOriginal}/concluir`, { headers: { Authorization: `Bearer ${token}` } })
    expect(ok.ok()).toBe(true)
    expect((await doDia(request, titulo, dia)).map(x => x.situacao)).toEqual(['CONCLUIDO'])

    await abrirMes(page, dia)
    const chip = page.getByTestId(`dia-${dia}`).getByTestId('compromisso').filter({ hasText: titulo })
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveAttribute('data-situacao', 'CONCLUIDO')
  })

  test('CT-1187-04 (negativo, CEN-NOVO-168) — compra pendente e Sinal a receber para antes de hoje: BLOQUEIO e Confirmar desabilitado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const origem = hojeLocal(0), destino = hojeLocal(-1)
    const insumo = await criarInsumoComEstoque(request, token, `QA1187-Insumo-${ts}`, 0, true)
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 5, precoTotal: 20 }], origem, origem)
    const produto = await criarProdutoComEstoque(request, token, `QA1187-ProdutoSinal-${ts}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1187-ClienteSinal-${ts}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], { sinalAtivo: true, percentualSinal: 30, sinalAte: origem })
    for (let i = 0; i < 3; i++) await avancarStatusViaApi(request, token, orcamento.id, { metodoSinalRecebido: 'PIX' })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('AGUARDANDO_SINAL')
    const rotuloSinal = `Sinal a receber — ORC-${orcamento.numero}`

    await abrirMes(page, origem)
    for (const [trecho, rotulo] of [[compra.identificador, 'compra'], [rotuloSinal, 'sinal']] as const) {
      const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: trecho })
      await arrastar(page, chip, destino)
      await expect(page.getByTestId('movimento-bloqueio'), rotulo).toBeVisible()
      await expect(page.getByTestId('confirmar-movimento'), rotulo).toBeDisabled()
      await page.getByTestId('cancelar-movimento').click()
      expect(await doDia(request, trecho, origem), rotulo).toHaveLength(1)
      expect(await doDia(request, trecho, destino), rotulo).toHaveLength(0)
    }
    expect((await buscarOrcamento(request, token, orcamento.id)).sinalAte).toBe(origem)
  })

  test('CT-1187-05 (CEN-NOVO-168) — avulso para antes de hoje: só o AVISO "A data já passou" e o Confirmar grava', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1187-Reuniao-${Date.now()}`
    const origem = hojeLocal(0), destino = hojeLocal(-1)
    await criarCompromissoUsuaria(request, token, { titulo, data: origem })
    await abrirMes(page, origem)
    const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: titulo })
    await arrastar(page, chip, destino)
    await expect(page.getByTestId('movimento-aviso')).toContainText('A data já passou')
    await expect(page.getByTestId('movimento-bloqueio')).toHaveCount(0)
    await expect(page.getByTestId('confirmar-movimento')).toBeEnabled()
    await page.getByTestId('confirmar-movimento').click()
    await expect.poll(async () => (await doDia(request, titulo, destino)).length).toBe(1)
    expect(await doDia(request, titulo, origem)).toHaveLength(0)
  })
})
