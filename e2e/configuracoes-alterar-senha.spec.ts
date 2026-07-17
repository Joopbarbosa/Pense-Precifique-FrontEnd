import { test, expect } from '@playwright/test'
import { login, loginComoEmail, API_URL } from './helpers/auth'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
/**
 * Cenários 165-167 — Alteração de senha na aba Conta (#111)
 *
 * 165:
 *   Dado que a artesã está na aba Conta em Configurações
 *   Quando ela informa senhas divergentes e tenta salvar
 *   Então nenhuma requisição é disparada
 *   E o toast exibe erro client-side
 *
 * 166:
 *   Dado que a artesã está na aba Conta em Configurações
 *   Quando ela informa senha atual incorreta e tenta salvar
 *   Então PUT /usuarios/me/senha é disparado
 *   E o toast exibe "Senha atual incorreta" (vindo da API)
 *
 * 167:
 *   Dado que a artesã está na aba Conta em Configurações
 *   Quando ela informa os 3 campos corretamente
 *   Então PUT /usuarios/me/senha retorna 200
 *   E o toast exibe mensagem de sucesso
 *   E os 3 campos são limpos
 */
test.describe('Cenários 165-166 — validações client-side e erro da API (conta principal, sem risco)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Conta' }).click()
  })

  test('165 — senhas divergentes não chamam a API e mostram erro client-side', async ({ page }) => {
    let senhaRequestFired = false
    page.on('request', req => {
      if (req.url().includes('/usuarios/me/senha')) senhaRequestFired = true
    })

    await page.getByPlaceholder('••••••••').fill('senhaAtualQualquer123')
    await page.getByPlaceholder('Mínimo 8 caracteres').fill('novaSenha123')
    await page.getByPlaceholder('Repita a nova senha').fill('outraSenhaDiferente456')
    await page.getByRole('button', { name: 'Atualizar senha' }).click()

    await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
    expect(senhaRequestFired).toBe(false)
  })

  test('166 — senha atual incorreta dispara a API e mostra o erro retornado', async ({ page }) => {
    let requestUrl = ''
    page.on('request', req => {
      if (req.url().includes('/usuarios/me/senha')) requestUrl = req.url()
    })

    await page.getByPlaceholder('••••••••').fill('senhaErradaDeProposito999')
    await page.getByPlaceholder('Mínimo 8 caracteres').fill('novaSenha123')
    await page.getByPlaceholder('Repita a nova senha').fill('novaSenha123')
    await page.getByRole('button', { name: 'Atualizar senha' }).click()

    await expect(page.getByText('Senha atual incorreta')).toBeVisible({ timeout: 5000 })
    expect(requestUrl).toContain('/usuarios/me/senha')
  })
})

test.describe('Cenário 167 — fluxo de sucesso (conta descartável)', () => {
  let email: string
  const senhaInicial = 'SenhaInicial123'
  const senhaNova = 'SenhaNova456'

  test.beforeEach(async ({ request }) => {
    email = `e2e-alterarsenha-${Date.now()}@teste.com`
    const reg = await request.post(`${API_URL}/auth/register`, {
      data: { email, senha: senhaInicial, confirmarSenha: senhaInicial },
    })
    if (!reg.ok()) {
      throw new Error(`Falha ao criar conta descartável: ${reg.status()} ${await reg.text()}`)
    }
  })

  test.afterEach(async () => {
    // ACHADO: não existe endpoint de exclusão/desativação de conta (nem em
    // UsuarioController nem em nenhum outro lugar do backend). Diferente de
    // /insumos/{id}, que tem soft-delete via DELETE, uma conta criada via
    // /auth/register não pode ser removida nem desativada via API — fica
    // acumulada permanentemente no banco. Reportado como achado desta
    // homologação; nenhuma limpeza é possível aqui até existir esse endpoint.
  })

  test('167 — 3 campos corretos: PUT retorna 200, toast de sucesso e campos limpos', async ({ page }) => {
    await loginComoEmail(page, email, senhaInicial)

    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Conta' }).click()

    const senhaAtualInput = page.getByPlaceholder('••••••••')
    const novaSenhaInput = page.getByPlaceholder('Mínimo 8 caracteres')
    const confirmarInput = page.getByPlaceholder('Repita a nova senha')

    await senhaAtualInput.fill(senhaInicial)
    await novaSenhaInput.fill(senhaNova)
    await confirmarInput.fill(senhaNova)

    const respostaPromise = page.waitForResponse(
      resp => resp.url().includes('/usuarios/me/senha') && resp.request().method() === 'PUT'
    )
    await page.getByRole('button', { name: 'Atualizar senha' }).click()
    const resposta = await respostaPromise
    expect(resposta.status()).toBe(200)

    await expect(page.getByText('Senha atualizada com sucesso!')).toBeVisible({ timeout: 5000 })
    await expect(senhaAtualInput).toHaveValue('')
    await expect(novaSenhaInput).toHaveValue('')
    await expect(confirmarInput).toHaveValue('')
  })
})
