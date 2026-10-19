import { test, expect } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail } from './helpers/auth'
import { criarInsumo } from './helpers/api'
import { registrarCompraConfirmada } from './helpers/compra'

/**
 * V0.17.0 #994 (RN-NOVA-31, CEN-NOVO-97): a lista de Insumos tem paginação numerada no lugar do "Carregar mais", com a
 * página, a busca e os filtros no endereço — voltar de um insumo reabre a lista na mesma página. Conta efêmera, 45 insumos
 * (INS-1 a INS-45): "Insumo 1" a "Insumo 45", exceto INS-7 ("Fita de cetim") e INS-12 ("Fita de papel").
 */
test.describe('#994 — Paginação numerada na lista de Insumos', () => {
  test('CEN-NOVO-97: páginas de 20, voltar do navegador reabre a mesma página e a busca volta à página 1', async ({ page, request }) => {
    test.setTimeout(180_000)
    const { email, token } = await registrarEmpresaEfemera(request, 'pag-insumos')
    for (let n = 1; n <= 45; n++) {
      const nome = n === 7 ? 'Fita de cetim' : n === 12 ? 'Fita de papel' : `Insumo ${n}`
      await criarInsumo(request, token, nome)
    }
    await loginComoEmail(page, email, 'senha12345')

    await page.goto('/insumos')
    await expect(page.getByText('Página 1 de 3')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('45 insumos')
    await expect(page.getByText('INS-45', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('INS-26', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('INS-25', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Carregar mais/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Próxima', exact: true }).click()
    await page.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(page.getByText('Página 3 de 3')).toBeVisible()
    await expect(page.getByText('INS-5', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('INS-1', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('INS-6', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled()

    // abre "Insumo 3" e volta pelo botão voltar do navegador: reabre na página 3
    await page.getByText('Insumo 3', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/insumos\/[0-9a-f-]{36}/)
    await page.goBack()
    await expect(page.getByText('Página 3 de 3')).toBeVisible()
    await expect(page.getByText('INS-5', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('INS-3', { exact: true }).first()).toBeVisible()

    // buscar volta à página 1 e mostra só os dois "Fita", do mais novo para o mais antigo
    await page.getByPlaceholder('Buscar por nome ou marca…').fill('Fita')
    await expect(page.getByText('Página 1 de 1')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('2 insumos')
    const linhas = page.getByText(/^Fita de (papel|cetim)$/).locator('visible=true')
    await expect(linhas).toHaveText(['Fita de papel', 'Fita de cetim'])

    await page.getByText('Fita de papel', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/insumos\/[0-9a-f-]{36}/)
    await page.goBack()
    await expect(page.getByPlaceholder('Buscar por nome ou marca…')).toHaveValue('Fita')
    await expect(page.getByText('Página 1 de 1')).toBeVisible()
    await expect(linhas).toHaveText(['Fita de papel', 'Fita de cetim'])
  })

  test('filtro de estoque vale para todas as páginas e volta à página 1', async ({ page, request }) => {
    test.setTimeout(120_000)
    const { email, token } = await registrarEmpresaEfemera(request, 'pag-estoque')
    // 25 insumos com mínimo 1; uma só compra dá 10 de estoque a cada um: todos positivos e nenhum abaixo do mínimo
    const ids: string[] = []
    for (let n = 1; n <= 25; n++) ids.push((await criarInsumo(request, token, `Positivo ${n}`)).id)
    await registrarCompraConfirmada(request, token, ids.map(insumoId => ({ insumoId, quantidade: 10, precoTotal: 10 })))
    await loginComoEmail(page, email, 'senha12345')
    await page.goto('/insumos')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await page.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()

    await page.getByRole('button', { name: /^Estoque positivo/ }).click()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByTestId('total-registros')).toHaveText('25 insumos')
    await page.getByRole('button', { name: /^Estoque baixo/ }).click()
    await expect(page.getByText('Nenhum insumo encontrado')).toBeVisible()
    // o filtro vazio não esconde as abas: dá para voltar a "Todos"
    await page.getByRole('button', { name: /^Todos/ }).click()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
  })
})
