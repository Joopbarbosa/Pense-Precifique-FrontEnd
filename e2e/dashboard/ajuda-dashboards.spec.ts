import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'

/**
 * V0.17.0 #998 — botão "?" com a explicação de cada número, gráfico e lista dos 4 dashboards
 * (RN-NOVA-34, CEN-NOVO-106, 107 e 108). Conta efêmera; um insumo abaixo do mínimo faz aparecer o alerta do Início.
 */

const IDS = {
  vendas: ['vendas-faturamento', 'vendas-numero', 'vendas-ticket', 'vendas-fat-mes', 'vendas-origem', 'vendas-produtos', 'vendas-pagamento'],
  cadastros: ['cad-estoque-valor', 'cad-potencial', 'cad-cmv', 'cad-margem-material', 'cad-abaixo-minimo', 'cad-evolucao', 'cad-em-quantos', 'cad-mais-comprado',
    'cad-mais-gasto', 'cad-mais-vendido', 'cad-mais-lucro', 'cad-variaram', 'cad-abaixo-sugerido', 'cad-margem', 'cad-abc'],
  compras: ['comp-gasto', 'comp-compras-ticket', 'comp-economia', 'comp-cmv', 'comp-nao-pagas', 'comp-maior-aumento', 'comp-gasto-mes', 'comp-cmv-mes',
    'comp-cmv-pct-mes', 'comp-subiram', 'comp-forn-gasto', 'comp-forn-desconto', 'comp-evolucao-pago'],
} as const

const botoes = (page: Page) => page.getByTestId('botao-ajuda')
const idsNaTela = (page: Page) => botoes(page).evaluateAll(els => els.map(e => e.getAttribute('data-ajuda-id')))
const ajuda = (page: Page, id: string) => page.locator(`[data-ajuda-id="${id}"]`)

async function entrar(page: Page, request: Parameters<typeof registrarEmpresaEfemera>[0]) {
  const { email, token } = await registrarEmpresaEfemera(request, 'ajuda-dash')
  await criarInsumo(request, token, `Insumo Ajuda ${Date.now()}`)
  await loginComoEmail(page, email, 'senha12345')
  await page.setViewportSize({ width: 1440, height: 900 })
}

test.describe('#998 — botão "?" nos dashboards', () => {
  test('CEN-NOVO-108: os quatro dashboards têm o "?" em todo cartão de número, gráfico e lista, e só um balão fica aberto', async ({ page, request }) => {
    await entrar(page, request)
    const telas: [string, readonly string[]][] = [
      ['/vendas/dashboard', IDS.vendas], ['/cadastros/dashboard', IDS.cadastros], ['/compras/dashboard', IDS.compras],
    ]
    for (const [rota, esperados] of telas) {
      await page.goto(rota)
      await expect(botoes(page).first()).toBeVisible({ timeout: 15_000 })
      await expect.poll(async () => (await idsNaTela(page)).sort(), { message: rota, timeout: 15_000 }).toEqual([...esperados].sort())
      // todo cartão de número (card-*) tem o seu "?"
      const cartoes = page.locator('[data-testid^="card-"]')
      const total = await cartoes.count()
      for (let i = 0; i < total; i++) await expect(cartoes.nth(i).getByTestId('botao-ajuda'), `${rota} cartão ${i}`).toHaveCount(1)
    }

    await page.goto('/cadastros/dashboard')
    await ajuda(page, 'cad-cmv').click()
    await expect(page.getByTestId('balao-ajuda')).toHaveCount(1)
    await ajuda(page, 'cad-margem').click()
    await expect(page.getByTestId('balao-ajuda')).toHaveCount(1)
    await expect(page.getByTestId('balao-ajuda')).toContainText('Margem por produto')
    await page.mouse.click(5, 5)
    await expect(page.getByTestId('balao-ajuda')).toHaveCount(0)
  })

  test('CEN-NOVO-106: o "?" da Curva ABC explica o Acumulado, as classes e os produtos sem lucro; Esc fecha', async ({ page, request }) => {
    await entrar(page, request)
    await page.goto('/cadastros/dashboard')
    await ajuda(page, 'cad-abc').click()
    const balao = page.getByTestId('balao-ajuda')
    await expect(balao).toBeVisible()
    await expect(balao).toContainText('Acumulado')
    await expect(balao).toContainText('Conta:')
    await expect(balao).toContainText('Exemplo:')
    await expect(balao).toContainText('70% e acumulado 70%; 20% e acumulado 90%; 10% e acumulado 100%')
    await expect(balao).toContainText('A: acumulado até 80%. B: acima de 80% até 95%. C: acima de 95%')
    await expect(balao).toContainText('lucro zero ou negativo ficam fora')
    await page.keyboard.press('Escape')
    await expect(balao).toHaveCount(0)
  })

  test('CEN-NOVO-107: item que resulta de conta traz a conta por extenso e um exemplo; cartão com dois números explica cada um', async ({ page, request }) => {
    await entrar(page, request)
    await page.goto('/cadastros/dashboard')
    await ajuda(page, 'cad-cmv').click()
    await expect(page.getByTestId('balao-ajuda')).toContainText('O custo do material do que foi vendido, dividido pelo faturamento, vezes cem')
    await expect(page.getByTestId('balao-ajuda')).toContainText('R$ 30,00 para um faturamento de R$ 100,00 dá 30%')

    // todo item com conta mostra "Conta:" e "Exemplo:" (ticket médio, margem, economia, evolução de preço…)
    const comConta = ['cad-margem-material', 'cad-margem', 'cad-evolucao', 'cad-variaram']
    for (const id of comConta) {
      await ajuda(page, id).click()
      await expect(page.getByTestId('balao-ajuda'), id).toContainText('Conta:')
      await expect(page.getByTestId('balao-ajuda'), id).toContainText('Exemplo:')
    }
    await page.goto('/vendas/dashboard')
    await ajuda(page, 'vendas-ticket').click()
    await expect(page.getByTestId('balao-ajuda')).toContainText('R$ 200,00 em 4 vendas dá ticket médio de R$ 50,00')

    await page.goto('/compras/dashboard')
    await ajuda(page, 'comp-economia').click()
    await expect(page.getByTestId('balao-ajuda')).toContainText('Valor economizado')
    await expect(page.getByTestId('balao-ajuda')).toContainText('Porcentagem')
    await page.keyboard.press('Escape')
    await ajuda(page, 'comp-compras-ticket').click()
    const dois = page.getByTestId('balao-ajuda')
    await expect(dois).toContainText('Compras')
    await expect(dois).toContainText('Ticket médio')
    await expect(dois).toContainText('Conta:')
    await expect(dois).toContainText('Exemplo:')
  })

  test('celular: o balão cabe na largura da tela', async ({ page, request }) => {
    await entrar(page, request)
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/vendas/dashboard')
    await ajuda(page, 'vendas-faturamento').click()
    const caixa = (await page.getByTestId('balao-ajuda').boundingBox())!
    expect(caixa.x).toBeGreaterThanOrEqual(0)
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(390)
  })
})
