import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

// Cenários renumerados na retomada V0.5 (colisão com v0.3) — ver SCENARIOS.md
/**
 * Cenário 161 — Overlay da sidebar com opacidade correta (#96)
 *
 * Dado que a artesã abre a sidebar em mobile (viewport 390px)
 * Então existe apenas 1 overlay no DOM com rgba(0,0,0,0.35)
 * Quando ela clica no overlay
 * Então a sidebar fecha
 */
test.describe('Cenário 161 — Overlay da sidebar com opacidade correta (#96)', () => {
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
          return cs.position === 'fixed' && /\/ [\d.]+\)|rgba/.test(cs.backgroundColor) && cs.display !== 'none'
        })
        .map((d) => getComputedStyle(d).backgroundColor)
    )
    expect(overlays).toHaveLength(1)
    // Tailwind 4 serializa bg-black/35 como oklab(0 0 0 / 0.35); Tailwind 3 como rgba(0, 0, 0, 0.35)
    expect(overlays[0]).toMatch(/^(rgba\(0, 0, 0, 0\.35\)|oklab\(0 0 0 \/ 0\.35\))$/)

    // clique fora da faixa da sidebar (220px), dentro do viewport de 390px
    await page.mouse.click(370, 400)

    await expect
      .poll(() => page.evaluate(() => Math.round(document.querySelector('nav')!.getBoundingClientRect().right)))
      .toBeLessThanOrEqual(0)
  })
})
