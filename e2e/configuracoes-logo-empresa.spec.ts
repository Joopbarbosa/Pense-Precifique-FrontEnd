import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { apiLogin } from './helpers/api'

const API_URL = 'http://localhost:8080'

/**
 * #532 (V0.14.0) — upload/remoção do logo da empresa (`ConfiguracoesPage.tsx`, componente
 * `PerfilEmpresa`), endpoint `POST/DELETE /empresa/logo`. Mesmo `ValidadorArquivoImagem`
 * compartilhado de Produto (#531)/Item de Catálogo — mensagens confirmadas em
 * `ValidadorArquivoImagem.java` (backend). Erro aparece via `Toast` local do componente
 * (`setToast(extractApiError(...))`), não como texto inline (diferente de Produto).
 *
 * O logo aparece em 2 pontos: o card-resumo (`PerfilCard`, só visível na aba "Precificação",
 * `aba` inicial da tela) e a própria aba "Perfil da empresa" — nunca os 2 ao mesmo tempo (tabs
 * mutuamente exclusivas), o que evita ambiguidade entre os dois `<img alt="Logo">`.
 *
 * Conta de teste é compartilhada entre specs do e2e (`TEST_EMAIL`) — teardown sempre remove o
 * logo via API ao final para não vazar estado (RN não teria como "resetar" sozinha).
 */
test.describe('#532 — Logo da empresa (CEN-NOVO-6/7)', () => {
  // beforeEach + afterEach: garante estado limpo mesmo se uma rodada anterior tiver falhado antes
  // do teardown (conta de teste compartilhada entre specs — idempotência exige não confiar só no afterEach).
  test.beforeEach(async ({ request }) => {
    const token = await apiLogin(request)
    await request.delete(`${API_URL}/empresa/logo`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await request.delete(`${API_URL}/empresa/logo`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  })

  test('CEN-NOVO-6 — arquivo com formato inválido (.pdf) é bloqueado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const antes = await (await request.get(`${API_URL}/empresa`, { headers: { Authorization: `Bearer ${token}` } })).json()

    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa', exact: true }).click()
    // "Alterar logo" é um <label> envolvendo o <input type="file"> (upload imediato ao selecionar
    // arquivo, sem botão dedicado) — não tem role="button".
    await expect(page.getByText('Alterar logo', { exact: true })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('nao e uma imagem'),
    })

    await expect(page.getByText('Só são aceitos arquivos JPG ou PNG.')).toBeVisible({ timeout: 10_000 })

    const depois = await (await request.get(`${API_URL}/empresa`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(depois.logoUrl ?? null).toBe(antes.logoUrl ?? null)
  })

  test('CEN-NOVO-7 — logo válido aparece no card-resumo e na aba Perfil da empresa', async ({ page, request }) => {
    const token = await apiLogin(request)

    await login(page)
    await page.goto('/configuracoes')

    // aba inicial é "Precificação" — card-resumo (PerfilCard) mostra ali, ainda sem logo (placeholder
    // /logo.png). Tabs são mutuamente exclusivas — só existe 1 <img alt="Logo"> na tela por vez.
    await expect(page.getByRole('button', { name: /Editar perfil|Cadastrar dados da empresa/ })).toBeVisible()
    await expect(page.locator('img[alt="Logo"]')).toHaveAttribute('src', '/logo.png')

    await page.getByRole('button', { name: 'Perfil da empresa', exact: true }).click()
    await expect(page.getByText('Alterar logo', { exact: true })).toBeVisible()
    await expect(page.locator('img[alt="Logo"]')).toHaveAttribute('src', '/logo.png')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('conteudo-de-teste-nao-e-uma-imagem-real'),
    })

    await expect(page.getByRole('button', { name: 'Remover', exact: true })).toBeVisible({ timeout: 10_000 })
    const logoImgPerfil = page.locator('img[alt="Logo"]')
    await expect(logoImgPerfil).not.toHaveAttribute('src', '/logo.png', { timeout: 10_000 })

    const empresaDepois = await (await request.get(`${API_URL}/empresa`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(empresaDepois.logoUrl).toBeTruthy()

    await page.getByRole('button', { name: 'Precificação', exact: true }).click()
    await expect(page.getByRole('button', { name: /Editar perfil|Cadastrar dados da empresa/ })).toBeVisible()
    await expect(page.locator('img[alt="Logo"]')).not.toHaveAttribute('src', '/logo.png')
    await expect(page.locator('img[alt="Logo"]')).toHaveAttribute('src', empresaDepois.logoUrl)
  })
})
