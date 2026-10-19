import { Page } from '@playwright/test'

/**
 * Avança pela paginação numerada ("Próxima") até o texto aparecer na página — V0.17.0 #994 trocou o "Carregar mais"
 * (que acrescentava registros) por páginas de 20; o nome `carregarAte` continua para não mexer em todos os specs.
 */
export async function carregarAte(page: Page, texto: string, maxCliques = 15) {
  for (let i = 0; i < maxCliques; i++) {
    if (await page.getByText(texto, { exact: true }).count() > 0) return
    const proxima = page.getByRole('button', { name: 'Próxima', exact: true })
    if (!(await proxima.isVisible().catch(() => false)) || !(await proxima.isEnabled().catch(() => false))) return
    await proxima.click()
    await page.waitForTimeout(400)
  }
}
