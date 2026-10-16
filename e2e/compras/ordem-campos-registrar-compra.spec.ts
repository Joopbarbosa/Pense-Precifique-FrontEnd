import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

/**
 * V0.17.0 #966 (RN-NOVA-21, CEN-NOVO-62): ordem do cabeçalho do Registrar compra — Data da compra,
 * Entrega imediata?, "Mais de um fornecedor?" e "Pagamento" numa linha só, depois o Fornecedor.
 */
test('V0.17.0 — #966 Mais de um fornecedor e Pagamento na mesma linha, abaixo da data e acima do Fornecedor', async ({ page }) => {
  await login(page)
  await page.goto('/compras/nova')

  // Cada campo é um grupo com nome acessível (o rótulo pode trazer * ou "(opcional)")
  const campo = async (localizador: ReturnType<typeof page.getByRole>, nome: string) => {
    const caixa = await localizador.first().boundingBox()
    expect(caixa, `campo "${nome}" visível`).not.toBeNull()
    return caixa!
  }
  const data = await campo(page.getByRole('textbox', { name: /Data da compra/ }), 'Data da compra')
  const entrega = await campo(page.getByRole('group', { name: /Entrega imediata\?/ }), 'Entrega imediata?')
  const multiplos = await campo(page.getByRole('group', { name: /Mais de um fornecedor\?/ }), 'Mais de um fornecedor?')
  const pagamento = await campo(page.getByRole('group', { name: /^Pagamento/ }), 'Pagamento')
  const fornecedor = await campo(page.getByRole('group', { name: /^Fornecedor/ }), 'Fornecedor')

  // data e entrega estão na mesma linha (o input da data começa abaixo do rótulo, daí a tolerância)
  expect(Math.abs(data.y - entrega.y)).toBeLessThan(30)
  expect(multiplos.y).toBeGreaterThan(data.y + 30)
  // na mesma linha: mesma altura de rótulo e Pagamento à direita de Mais de um fornecedor
  expect(Math.abs(multiplos.y - pagamento.y)).toBeLessThan(4)
  expect(pagamento.x).toBeGreaterThan(multiplos.x)
  expect(fornecedor.y).toBeGreaterThan(multiplos.y)
})
