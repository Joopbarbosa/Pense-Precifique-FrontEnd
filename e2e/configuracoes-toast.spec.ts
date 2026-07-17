import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin, getConfiguracao, putConfiguracao } from './helpers/api'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
/**
 * Cenário 162 — Toast dinâmico em Configurações (#97)
 *
 * Dado que a artesã salva Precificação com sucesso
 * Então o toast exibe mensagem de sucesso por ~3000ms e desaparece
 * Quando salvar Perfil falha (mock 500)
 * Então o toast exibe a mensagem de erro correspondente
 */
test.describe('Cenário 162 — Toast dinâmico em Configurações (#97)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
  })

  test('Precificação: sucesso mostra toast e some sozinho em ~3s', async ({ page, request }) => {
    const token = await apiLogin(request)
    const original = await getConfiguracao(request, token)

    // valor precisa diferir do já persistido, senão o form não fica "dirty" e o botão
    // continua desabilitado (o teste mutaria a config real de qualquer forma, então
    // alterna entre dois valores fixos e restaura o original via API no final).
    const input = page.locator('input').first()
    const atual = (await input.inputValue()).trim()
    const novoValor = atual.startsWith('41') ? '42,00' : '41,00'
    await input.fill(novoValor)
    await page.getByRole('button', { name: /Salvar alterações/ }).click()

    const toast = page.getByText('Configurações salvas com sucesso!')
    await expect(toast).toBeVisible()
    await expect(toast).not.toBeVisible({ timeout: 4000 })

    await putConfiguracao(request, token, {
      valorHora: original.valorHora,
      margemPadrao: original.margemPadrao,
    })
  })

  test('Perfil: erro (mock 500) mostra toast com a mensagem retornada pela API', async ({ page }) => {
    await page.route('**/empresa', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Erro simulado ao salvar perfil.' }),
        })
      } else {
        route.continue()
      }
    })

    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await page.getByRole('button', { name: /Salvar alterações/ }).click()

    await expect(page.getByText('Erro simulado ao salvar perfil.')).toBeVisible()
  })
})
