import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { registrarCompraPendente } from '../helpers/compra'

/**
 * #1181 (V0.18.0, RN-NOVA-43 a 46 e 50) — mover um card exige a janela de confirmação com o antes e o depois.
 * CEN-NOVO-152, 153, 157 (compra) e 166 (título do Mês).
 */
async function doDia(request: APIRequestContext, titulo: string, dia: string) {
  const token = await apiLogin(request)
  const res = await request.get(`${E2E_API_URL}/agenda/compromissos?de=${dia}&ate=${dia}`, { headers: { Authorization: `Bearer ${token}` } })
  const lista = await res.json() as Array<{ titulo: string }>
  return lista.filter(c => c.titulo.includes(titulo))
}

async function abrirMes(page: Page, alvo: string) {
  await login(page)
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Mês', exact: true }).click()
  const meses = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7))
  for (let i = 0; i < meses(alvo) - meses(hojeLocal(0)); i++) await page.getByRole('button', { name: 'Próximo' }).click()
}

async function arrastar(page: Page, chip: Locator, destino: string) {
  await expect(chip).toBeVisible()
  const de = (await chip.boundingBox())!
  const para = (await page.getByTestId(`dia-${destino}`).boundingBox())!
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2 + 10, de.y + de.height / 2 + 10, { steps: 4 })
  await page.mouse.move(para.x + 40, para.y + 40, { steps: 8 })
  await page.mouse.up()
}

test.describe('#1181 — Mover card com confirmação', () => {
  test('CT-1181-01 — a janela mostra antes e depois; cancelar não grava; confirmar grava', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1181-Avulso-${Date.now()}`
    const origem = hojeLocal(60), destino = hojeLocal(61)
    await criarCompromissoUsuaria(request, token, { titulo, data: origem })
    await abrirMes(page, origem)
    const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: titulo })
    await arrastar(page, chip, destino)
    await expect(page.getByTestId('modal-confirmar-movimento')).toBeVisible()
    await expect(page.getByTestId('movimento-antes-depois')).toContainText(origem.split('-').reverse().join('/'))
    await expect(page.getByTestId('movimento-antes-depois')).toContainText(destino.split('-').reverse().join('/'))
    await page.getByTestId('cancelar-movimento').click()
    expect((await doDia(request, titulo, origem)).length).toBe(1)
    expect((await doDia(request, titulo, destino)).length).toBe(0)
    await arrastar(page, chip, destino)
    await page.getByTestId('confirmar-movimento').click()
    await expect.poll(async () => (await doDia(request, titulo, destino)).length).toBe(1)
  })

  test('CT-1181-02 (negativo) — compra pendente para antes de hoje: a janela bloqueia e não grava', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumoComEstoque(request, token, `QA1181-Insumo-${Date.now()}`, 0, true)
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 5, precoTotal: 20 }], hojeLocal(0), hojeLocal(0))
    const origem = hojeLocal(0), destino = hojeLocal(-1)
    await abrirMes(page, origem)
    const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: compra.identificador })
    await arrastar(page, chip, destino)
    await expect(page.getByTestId('movimento-bloqueio')).toBeVisible()
    await expect(page.getByTestId('confirmar-movimento')).toBeDisabled()
    await page.getByTestId('cancelar-movimento').click()
    expect((await doDia(request, compra.identificador, origem)).length).toBe(1)
  })

  test('CT-1181-03 — o cabeçalho do Mês mostra mês e ano ("Outubro de 2026")', async ({ page }) => {
    await abrirMes(page, hojeLocal(0))
    await expect(page.getByTestId('titulo-periodo')).toHaveText(/^[A-ZÀ-Ú][a-zç]+ de \d{4}$/)
  })
})
