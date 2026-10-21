import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera } from '../helpers/auth'
import { criarCliente, criarOrcamentoViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque } from '../helpers/producao'

/**
 * V0.17.0 #982 (RN-NOVA-27, CEN-NOVO-80): salvar o perfil da empresa nunca apaga o logo enviado.
 * O logo só muda por envio ou remoção; a prévia do PDF mostra o logo e, depois da remoção, a inicial.
 * Conta efêmera: o logo gravado não contamina a conta principal dos outros specs.
 */

// PNG de 1x1 pixel (JPG ou PNG de até 5 MB é o que o servidor aceita).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('V0.17.0 — #982 logo e salvar o perfil', () => {
  test('CEN-NOVO-80 — o logo continua depois de salvar o perfil, aparece na prévia do PDF e some só ao remover', async ({ page, request }) => {
    const sufixo = Date.now()
    const { token, email } = await registrarEmpresaEfemera(request, 'logo982')
    const produto = await criarProdutoComEstoque(request, token, `Logo982-Produto-${sufixo}`, 10)
    const cliente = await criarCliente(request, token, `Logo982-Cliente-${sufixo}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, margemAplicada: 50, precoUnitario: 20, quantidade: 1 },
    ])

    await loginComoEmail(page, email, 'senha12345')
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa' }).first().click()

    // 1. Enviar o logo: aparece na hora, já gravado no servidor.
    await page.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 })
    const logo = page.locator('img[alt="Logo"]').last()
    await expect(logo).toHaveAttribute('src', /\/empresa\//, { timeout: 15_000 })

    // 2. Salvar o perfil alterando o telefone: o logo continua.
    await page.getByPlaceholder('(00) 00000-0000').fill('11912345678')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible({ timeout: 15_000 })
    await expect(logo).toHaveAttribute('src', /\/empresa\//)

    // 3. Atualizar a página: o logo continua gravado.
    await page.reload()
    await page.getByRole('button', { name: 'Perfil da empresa' }).first().click()
    await expect(page.locator('img[alt="Logo"]').last()).toHaveAttribute('src', /\/empresa\//, { timeout: 15_000 })

    // 4. A prévia do PDF do orçamento mostra o logo no cabeçalho.
    await page.goto(`/orcamentos/${orcamento.id}/preview`)
    const quadro = page.frameLocator('iframe[title="Preview do orçamento"]')
    await expect(quadro.locator('img[data-logo-empresa="true"]')).toBeVisible({ timeout: 20_000 })

    // 5. Remover o logo e salvar: a prévia volta ao quadrado com a inicial da empresa.
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Perfil da empresa' }).first().click()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.locator('img[alt="Logo"]').last()).not.toHaveAttribute('src', /\/empresa\//, { timeout: 15_000 })
    await page.reload()
    await page.getByRole('button', { name: 'Perfil da empresa' }).first().click()
    await expect(page.locator('img[alt="Logo"]').last()).not.toHaveAttribute('src', /\/empresa\//)

    await page.goto(`/orcamentos/${orcamento.id}/preview`)
    const quadroSemLogo = page.frameLocator('iframe[title="Preview do orçamento"]')
    await expect(quadroSemLogo.locator('body')).toContainText(`#${orcamento.numero}`, { timeout: 20_000 })
    await expect(quadroSemLogo.locator('img[data-logo-empresa="true"]')).toHaveCount(0)
    await expect(quadroSemLogo.getByText('A', { exact: true }).first()).toBeVisible()
  })
})
