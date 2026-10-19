import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

/**
 * V0.17.0 #964 (RN-NOVA-19, CEN-NOVO-56 a 59): telefone do cliente com máscara nacional,
 * número estrangeiro e bloqueio de telefone inválido, na tela e no envio.
 */
// O campo WhatsApp é um grupo rotulado (o controle não vai dentro do <label>); há outro botão "Estrangeiro" na tela (documento)
const grupoWhatsapp = (page: import('@playwright/test').Page) => page.getByRole('group', { name: /^WhatsApp/ })

test.describe('V0.17.0 — #964 telefone de cliente', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/clientes/novo')
  })

  test('CEN-NOVO-56 — nacional com máscara; CEN-NOVO-57 — estrangeiro sem máscara nacional', async ({ page }) => {
    const whatsapp = page.getByPlaceholder('(11) 99999-0000')
    await whatsapp.fill('11912345678')
    await expect(whatsapp).toHaveValue('(11) 91234-5678')

    await grupoWhatsapp(page).getByRole('button', { name: 'Estrangeiro' }).click()
    const estrangeiro = page.getByPlaceholder('+55 11 99999-0000')
    await estrangeiro.fill('+55 11 91234-5678')
    await expect(estrangeiro).toHaveValue('+55 11 91234-5678')
    await grupoWhatsapp(page).getByRole('button', { name: 'Nacional' }).click()
    await expect(page.getByPlaceholder('(11) 99999-0000')).toBeVisible()
  })

  test('CEN-NOVO-86 — controle Nacional | Estrangeiro, uma opção ativa, sem o botão de texto antigo', async ({ page }) => {
    // #984 (RN-NOVA-19, alteração): o botão "Número estrangeiro" dá lugar ao controle de duas opções
    await expect(page.getByRole('button', { name: /^Número (estrangeiro|nacional)$/ })).toHaveCount(0)
    const nacional = grupoWhatsapp(page).getByRole('button', { name: 'Nacional' })
    const estrangeiro = grupoWhatsapp(page).getByRole('button', { name: 'Estrangeiro' })
    await expect(nacional).toHaveAttribute('aria-pressed', 'true')
    await expect(estrangeiro).toHaveAttribute('aria-pressed', 'false')

    await estrangeiro.click()
    await expect(estrangeiro).toHaveAttribute('aria-pressed', 'true')
    await expect(nacional).toHaveAttribute('aria-pressed', 'false')
    const campo = page.getByPlaceholder('+55 11 99999-0000')
    await campo.fill('+1 212 555 0123')
    await expect(campo).toHaveValue('+1 212 555 0123')

    // trocar de opção mantém os dígitos (11 dígitos cabem na máscara nacional)
    await nacional.click()
    await expect(nacional).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByPlaceholder('(11) 99999-0000')).toHaveValue('(12) 12555-0123')
  })

  test('CEN-NOVO-58 — texto sem dígito bloqueia ao salvar e nada é gravado', async ({ page }) => {
    await page.getByPlaceholder('Beatriz Santos ou Papelaria Central').fill(`Cliente telefone ${Date.now()}`)
    await page.getByPlaceholder('(11) 99999-0000').fill('abc')
    await page.getByRole('button', { name: 'Salvar cadastro' }).click()
    await expect(page.getByText('Telefone inválido').first()).toBeVisible()
    await expect(page).toHaveURL(/\/clientes\/novo$/)
  })
})
