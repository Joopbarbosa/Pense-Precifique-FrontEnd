import { test, expect } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail, TEST_SENHA } from './helpers/auth'
import { criarInsumo } from './helpers/api'

/**
 * V0.17.0 #1006 (QA da #994, RN-NOVA-31, CEN-NOVO-99): 21 insumos em 2 páginas, com 1 insumo na página 2. A página do endereço além
 * da última (9) mostra a última existente e a negativa mostra a primeira, sem erro; excluir o único insumo da página 2 estando nela
 * leva à página 1, que passa a ser a última (20 insumos), sem mensagem de erro. Conta efêmera.
 */
test('V0.17.0 — #1006 página além do limite ou negativa corrige para a mais próxima e excluir o último item da página 2 volta à página 1', async ({ page, request }) => {
  test.setTimeout(180_000)
  const { email, token } = await registrarEmpresaEfemera(request, 'pag-invalida')
  for (let n = 1; n <= 21; n++) await criarInsumo(request, token, `Insumo ${String(n).padStart(2, '0')}`)
  await loginComoEmail(page, email, TEST_SENHA)

  // página 9 (além da última): mostra a última existente, a 2
  await page.goto('/insumos?pagina=9')
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(page.getByTestId('total-registros')).toHaveText('21 insumos')
  await expect(page.getByRole('alert')).toHaveCount(0)

  // página negativa: mostra a primeira
  await page.goto('/insumos?pagina=-1')
  await expect(page.getByText('Página 1 de 2')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  // exclui o único insumo da página 2 (o mais antigo, INS-1) estando nela
  await page.goto('/insumos?pagina=2')
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  const linha = page.getByText('Insumo 01', { exact: true }).first().locator('xpath=../..')
  await linha.getByRole('button', { name: 'Mais ações' }).click()
  await page.getByText('Excluir', { exact: true }).click()
  await page.getByRole('button', { name: 'Excluir insumo' }).click()
  await expect(page.getByText('Insumo excluído.')).toBeVisible()

  // a lista passa a ter 20 insumos em uma só página, sem erro
  await expect(page.getByText('Página 1 de 1')).toBeVisible()
  await expect(page.getByTestId('total-registros')).toHaveText('20 insumos')
  await expect(page.getByText('Insumo 01', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
})
