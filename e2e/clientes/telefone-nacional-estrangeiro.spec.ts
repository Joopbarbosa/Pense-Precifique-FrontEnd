import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

/**
 * V0.17.0 #964 (RN-NOVA-19, CEN-NOVO-56 a 59): telefone do cliente com máscara nacional,
 * número estrangeiro e bloqueio de telefone inválido, na tela e no envio.
 */
test.describe('V0.17.0 — #964 telefone de cliente', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/clientes/novo')
  })

  test('CEN-NOVO-56 — nacional com máscara; CEN-NOVO-57 — estrangeiro sem máscara nacional', async ({ page }) => {
    const whatsapp = page.getByPlaceholder('(11) 99999-0000')
    await whatsapp.fill('11912345678')
    await expect(whatsapp).toHaveValue('(11) 91234-5678')

    await page.getByRole('button', { name: 'Número estrangeiro' }).first().click()
    const estrangeiro = page.getByPlaceholder('+55 11 99999-0000')
    await estrangeiro.fill('+55 11 91234-5678')
    await expect(estrangeiro).toHaveValue('+55 11 91234-5678')
    await page.getByRole('button', { name: 'Número nacional' }).first().click()
    await expect(page.getByPlaceholder('(11) 99999-0000')).toBeVisible()
  })

  test('CEN-NOVO-58 — texto sem dígito bloqueia ao salvar e nada é gravado', async ({ page }) => {
    await page.getByPlaceholder('Beatriz Santos ou Papelaria Central').fill(`Cliente telefone ${Date.now()}`)
    await page.getByPlaceholder('(11) 99999-0000').fill('abc')
    await page.getByRole('button', { name: 'Salvar cadastro' }).click()
    await expect(page.getByText('Telefone inválido').first()).toBeVisible()
    await expect(page).toHaveURL(/\/clientes\/novo$/)
  })
})
