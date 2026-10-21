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

/**
 * V0.17.0 #985 (RN-NOVA-21, alteração, CEN-NOVO-87): os controles Sim/Não de "Mais de um fornecedor?" e de
 * "Pagamento" têm a mesma largura do controle de "Entrega imediata?", em tela larga e estreita.
 */
test('V0.17.0 — #985 controles de Mais de um fornecedor e Pagamento com a largura de Entrega imediata', async ({ page }) => {
  await login(page)
  const largura = async (nome: RegExp) => {
    const caixa = await page.getByRole('group', { name: nome }).first().boundingBox()
    expect(caixa, `campo ${nome} visível`).not.toBeNull()
    return caixa!.width
  }
  for (const viewport of [{ width: 1400, height: 900 }, { width: 1000, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/compras/nova')
    const entrega = await largura(/Entrega imediata\?/)
    expect(Math.abs((await largura(/Mais de um fornecedor\?/)) - entrega), `largura ${viewport.width}px`).toBeLessThan(3)
    expect(Math.abs((await largura(/^Pagamento/)) - entrega), `largura ${viewport.width}px`).toBeLessThan(3)
  }
  // tela estreita (celular): os dois empilham e mantêm a largura de Entrega imediata
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/compras/nova')
  const entregaCelular = await largura(/Entrega imediata\?/)
  expect(Math.abs((await largura(/Mais de um fornecedor\?/)) - entregaCelular)).toBeLessThan(3)
  expect(Math.abs((await largura(/^Pagamento/)) - entregaCelular)).toBeLessThan(3)
  const multiplos = await page.getByRole('group', { name: /Mais de um fornecedor\?/ }).first().boundingBox()
  const pagamento = await page.getByRole('group', { name: /^Pagamento/ }).first().boundingBox()
  expect(pagamento!.y).toBeGreaterThan(multiplos!.y + 30)
})
