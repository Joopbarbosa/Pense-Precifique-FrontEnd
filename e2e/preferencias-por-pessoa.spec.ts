import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail } from './helpers/auth'

/**
 * #671 (V0.18.0, RN-NOVA-23, DT-NOVA-10) — as preferências de tela são de cada pessoa (chave com o id da conta), no mesmo navegador:
 * números escondidos, menu recolhido e visão da Agenda. CEN-NOVO-3, 66 e 67.
 */
async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login|\/$/, { timeout: 15_000 })
}

test.describe('#671 — Preferências por pessoa', () => {
  test('CT-671-01 — cada pessoa mantém os números que escondeu no Dashboard de Vendas', async ({ page, request }) => {
    const marina = await registrarEmpresaEfemera(request, 'marina')
    const paulo = await registrarEmpresaEfemera(request, 'paulo')

    await loginComoEmail(page, marina.email, 'senha12345')
    await page.goto('/vendas/dashboard')
    await page.getByRole('button', { name: 'Esconder números' }).first().click()
    await expect(page.getByRole('button', { name: 'Mostrar números' }).first()).toBeVisible()
    await page.goto('/agenda') // sai pela Agenda: o login seguinte volta para onde a pessoa estava
    await sair(page)

    await loginComoEmail(page, paulo.email, 'senha12345')
    await page.goto('/vendas/dashboard')
    await expect(page.getByRole('button', { name: 'Esconder números' }).first()).toBeVisible()
    await page.goto('/agenda')
    await sair(page)

    await loginComoEmail(page, marina.email, 'senha12345')
    await page.goto('/vendas/dashboard')
    await expect(page.getByRole('button', { name: 'Mostrar números' }).first()).toBeVisible()
  })

  test('CT-671-02 — o menu recolhido e a visão da Agenda também são de cada pessoa', async ({ page, request }) => {
    const marina = await registrarEmpresaEfemera(request, 'marina2')
    const paulo = await registrarEmpresaEfemera(request, 'paulo2')

    await loginComoEmail(page, marina.email, 'senha12345')
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
    await sair(page)

    await loginComoEmail(page, paulo.email, 'senha12345')
    await page.goto('/agenda')
    await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
    await sair(page)

    await loginComoEmail(page, marina.email, 'senha12345')
    await page.goto('/agenda')
    await expect(page.getByRole('button', { name: 'Mês', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  })

  test('CT-671-03 — a chave antiga (sem o id da conta) deixa de ser lida', async ({ page, request }) => {
    const pessoa = await registrarEmpresaEfemera(request, 'antiga')
    await loginComoEmail(page, pessoa.email, 'senha12345')
    await page.evaluate(() => { localStorage.setItem('sidebarCollapsed', '1'); localStorage.setItem('numerosEscondidos:dashboard-vendas', '1') })
    await page.goto('/vendas/dashboard')
    await expect(page.getByRole('button', { name: 'Esconder números' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
  })
})
