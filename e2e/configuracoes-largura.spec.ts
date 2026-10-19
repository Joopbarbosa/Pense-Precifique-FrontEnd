import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail } from './helpers/auth'

/**
 * V0.17.0 #996 — abas de Configurações na largura da tela e Perfil em duas colunas
 * (RN-NOVA-32, CEN-NOVO-101 e 102). Conta efêmera.
 */

const ABAS = [['Precificação', 'precificacao'], ['Perfil da empresa', 'perfil'], ['Métodos de Pagamento', 'pagamento'], ['Conta', 'conta'], ['Unidades de Medida', 'unidades']]
const COM_SALVAR_UNICO = ['Precificação', 'Perfil da empresa', 'Métodos de Pagamento']

async function entrar(page: Page, request: Parameters<typeof registrarEmpresaEfemera>[0]) {
  const { email } = await registrarEmpresaEfemera(request, 'cfg-largura')
  await loginComoEmail(page, email, 'senha12345')
  await page.goto('/configuracoes')
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
}

const abrirAba = (page: Page, nome: string) => page.getByRole('button', { name: nome }).first().click()
const semRolagemLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

test.describe('#996 — Configurações na largura da tela', () => {
  test('CEN-NOVO-101: em 1280 px o conteúdo de cada aba passa de 640 px e o salvar só aparece nas três abas do salvar único', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await entrar(page, request)
    for (const [aba, id] of ABAS) {
      await abrirAba(page, aba)
      const cartoes = page.getByTestId(`aba-${id}`).locator('.rounded-card')
      await expect(cartoes.first()).toBeVisible()
      // largura ocupada pelo conteúdo da aba: do canto esquerdo do primeiro cartão ao direito do último (a Conta tem dois cartões lado a lado)
      const largura = await cartoes.evaluateAll(els => {
        const r = els.map(e => e.getBoundingClientRect())
        return Math.max(...r.map(x => x.right)) - Math.min(...r.map(x => x.left))
      })
      expect(largura, `aba ${aba}`).toBeGreaterThan(640)
      const salvar = page.getByRole('button', { name: 'Salvar alterações' })
      if (COM_SALVAR_UNICO.includes(aba)) await expect(salvar).toBeVisible()
      else await expect(salvar).toHaveCount(0)
    }
  })

  test('CEN-NOVO-102: Perfil em duas colunas a 1280 px (horário à direita) e uma coluna a 390 px (logo, dados, horário)', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await entrar(page, request)
    await abrirAba(page, 'Perfil da empresa')
    const dados = page.getByTestId('perfil-coluna-dados')
    const horario = page.getByTestId('perfil-coluna-horario')
    await expect(horario).toBeVisible()
    const d = (await dados.boundingBox())!
    const h = (await horario.boundingBox())!
    expect(h.x).toBeGreaterThan(d.x + d.width - 1)
    expect(Math.abs(h.y - d.y)).toBeLessThan(40)

    await page.setViewportSize({ width: 390, height: 800 })
    await expect(horario).toBeVisible()
    const logo = (await dados.getByAltText('Logo').boundingBox())!
    const nome = (await page.getByPlaceholder('Nome do seu ateliê ou negócio').boundingBox())!
    const h2 = (await horario.boundingBox())!
    expect(logo.y).toBeLessThan(nome.y)
    expect(nome.y).toBeLessThan(h2.y)
    expect(await semRolagemLateral(page)).toBe(true)
  })
})
