import { Page } from '@playwright/test'

/**
 * Avança pela paginação numerada ("Próxima") até o texto aparecer na página — V0.17.0 #994 trocou o "Carregar mais"
 * (que acrescentava registros) por páginas de 20; o nome `carregarAte` continua para não mexer em todos os specs.
 * Enquanto a página carrega o botão fica desabilitado: espera um instante antes de concluir que acabaram as páginas.
 */
export async function carregarAte(page: Page, texto: string, maxCliques = 15) {
  // Banco de teste cheio (centenas de registros "E2E ..."): filtra pela busca da tela, quando existe, em vez de
  // percorrer dezenas de páginas.
  const busca = page.getByPlaceholder(/^Buscar por nome/).first()
  // Logo depois de trocar de aba a lista ainda recarrega (campo de busca oculto, linhas antigas na tela): espera o campo antes de decidir
  await busca.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined)
  if (await busca.isVisible().catch(() => false)) {
    await busca.fill(texto)
    await page.waitForTimeout(800)
  }
  for (let i = 0; i < maxCliques; i++) {
    if (await page.getByText(texto, { exact: true }).count() > 0) return
    const proxima = page.getByRole('button', { name: 'Próxima', exact: true })
    let pronta = false
    for (let t = 0; t < 8 && !pronta; t++) {
      pronta = (await proxima.isVisible().catch(() => false)) && (await proxima.isEnabled().catch(() => false))
      if (!pronta) await page.waitForTimeout(250)
    }
    if (!pronta) return
    await proxima.click()
    await page.waitForTimeout(400)
  }
}
