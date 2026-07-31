import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, inativarInsumo } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'

/**
 * Migração de `CompraLoteModal`/`ImpactoLoteModal` (ListaInsumosPage.tsx) para `ModalShell` —
 * eram os últimos dois consumidores hand-rolled (overlay/painel/botão-fechar próprios, sem
 * Escape), débito documentado no CLAUDE.md desde a formalização do `ModalShell` (V0.6.1.1).
 * Nenhum dos dois tinha teste E2E de UI antes desta migração (`reporEstoque` em outros specs
 * sempre passa por `POST /lotes-compra` direto, nunca pela tela).
 */
test.describe('Cenário — CompraLoteModal/ImpactoLoteModal migrados para ModalShell', () => {
  let criadosInsumoIds: string[] = []

  test.beforeEach(() => {
    criadosInsumoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosInsumoIds) await inativarInsumo(request, token, id)
  })

  test('CompraLoteModal: título acima do subtitle, fecha com Escape sem registrar nada', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QAModal-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10)
    criadosInsumoIds.push(insumo.id)

    await login(page)
    await page.goto('/insumos')
    await page.getByRole('button', { name: 'Registrar compras', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const tituloLoc = dialog.getByText('Registrar compras', { exact: true }).first()
    const subtitleLoc = dialog.getByText('Adicione os insumos que você comprou.', { exact: true }).first()
    await expect(tituloLoc).toBeVisible()
    await expect(subtitleLoc).toBeVisible()
    const tituloBox = await tituloLoc.boundingBox()
    const subtitleBox = await subtitleLoc.boundingBox()
    expect(tituloBox!.y).toBeLessThan(subtitleBox!.y)

    // Adiciona um item, mas fecha via Escape sem confirmar — nada deve ser registrado.
    await dialog.getByPlaceholder('Buscar insumo para adicionar…').fill(nomeInsumo)
    await dialog.getByRole('button', { name: new RegExp(nomeInsumo) }).click()
    await expect(dialog.getByText(nomeInsumo, { exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    const insumoDepois = await (await request.get(`http://localhost:8080/insumos/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(10)
  })

  test('CompraLoteModal -> ImpactoLoteModal: fluxo real de registrar compra, segundo modal também é ModalShell (título acima do subtitle, fecha com Escape)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `QAModal-Insumo-${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 10)
    criadosInsumoIds.push(insumo.id)

    await login(page)
    await page.goto('/insumos')
    await page.getByRole('button', { name: 'Registrar compras', exact: true }).click()

    const dialogCompra = page.getByRole('dialog')
    await dialogCompra.getByPlaceholder('Buscar insumo para adicionar…').fill(nomeInsumo)
    await dialogCompra.getByRole('button', { name: new RegExp(nomeInsumo) }).click()
    await expect(dialogCompra.getByText(nomeInsumo, { exact: true })).toBeVisible()

    // Só um item no carrinho neste ponto — os inputs de Qtd/preço são inequívocos.
    await dialogCompra.getByPlaceholder('Qtd').fill('5')
    await dialogCompra.getByPlaceholder('0,00').fill('50')

    await dialogCompra.getByRole('button', { name: /Confirmar.*e ver impacto/ }).click()

    const dialogImpacto = page.getByRole('dialog')
    await expect(dialogImpacto).toBeVisible()
    await expect(dialogImpacto.getByText('Compra registrada!', { exact: true })).toBeVisible()

    const tituloLoc = dialogImpacto.getByText('Compra registrada!', { exact: true }).first()
    const subtitleLoc = dialogImpacto.getByText(/insumo atualizado/, { exact: false }).first()
    const tituloBox = await tituloLoc.boundingBox()
    const subtitleBox = await subtitleLoc.boundingBox()
    expect(tituloBox!.y).toBeLessThan(subtitleBox!.y)

    await page.keyboard.press('Escape')
    await expect(dialogImpacto).toHaveCount(0)

    const insumoDepois = await (await request.get(`http://localhost:8080/insumos/${insumo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(insumoDepois.estoqueAtual).toBe(15)
  })
})
