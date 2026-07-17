import { Page } from '@playwright/test'

/** Clica em "Carregar mais" repetidamente até o texto aparecer na página (listas paginadas). */
export async function carregarAte(page: Page, texto: string, maxCliques = 15) {
  for (let i = 0; i < maxCliques; i++) {
    if (await page.getByText(texto, { exact: true }).count() > 0) return
    const carregarMais = page.getByRole('button', { name: /Carregar mais/ })
    if (!(await carregarMais.isVisible().catch(() => false))) return
    await carregarMais.click()
    await page.waitForTimeout(400)
  }
}
