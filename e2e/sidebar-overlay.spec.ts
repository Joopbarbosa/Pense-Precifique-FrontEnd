import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Cenário 148 — Overlay da sidebar com opacidade correta (#96)
 *
 * Dado que a artesã abre a sidebar em mobile (viewport 390px)
 * Então existe apenas 1 overlay no DOM com rgba(0,0,0,0.35)
 * Quando ela clica no overlay
 * Então a sidebar fecha
 */
test.describe('Cenário 148 — Overlay da sidebar com opacidade correta (#96)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
  })

  test('apenas 1 overlay a 35% de opacidade; clicar nele fecha a sidebar', async ({ page }) => {
    await page.locator('button:has(svg.lucide-menu)').click()

    const overlays = await page.evaluate(() =>
      [...document.querySelectorAll('div')]
        .filter((d) => {
          const cs = getComputedStyle(d)
          return cs.position === 'fixed' && cs.backgroundColor.includes('rgba') && cs.display !== 'none'
        })
        .map((d) => getComputedStyle(d).backgroundColor)
    )
    expect(overlays).toHaveLength(1)
    expect(overlays[0]).toBe('rgba(0, 0, 0, 0.35)')

    // clique fora da faixa da sidebar (220px), dentro do viewport de 390px
    await page.mouse.click(370, 400)

    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('nav')!).transform))
      .toBe('matrix(1, 0, 0, 1, -220, 0)')
  })
})
