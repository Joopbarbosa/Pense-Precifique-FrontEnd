import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'

type Intervalo = { de: string | null; ate: string | null }

function dashboardResponse(de: string, ate: string) {
  const insumo = { id: 'insumo-grafico-e2e', identificador: 'INS-1', nome: 'Fita de teste', marca: null, unidade: 'm', ativo: true }
  const numero = { valor: 0, anterior: 0, variacaoPercentual: 0 }
  return {
    de,
    ate,
    deAnterior: de,
    ateAnterior: ate,
    gasto: numero,
    quantidadeCompras: numero,
    ticketMedio: numero,
    economia: { valor: 0, totalCheio: 0, percentual: 0, anterior: 0, variacaoPercentual: 0 },
    cmv: { valor: 0, faturamento: 0, percentual: 0, estimado: 0, vendasSemCusto: 0, anterior: 0, percentualAnterior: 0, variacaoPercentual: 0 },
    naoPagas: { quantidade: 0, valor: 0 },
    maiorAumento: { insumo, precoInicial: 1.2, dataInicial: de, precoFinal: 1.5, dataFinal: ate, variacaoPercentual: 25 },
    meses: [],
    insumosQueMaisSubiram: [],
    fornecedoresPorGasto: [],
    fornecedoresPorDescontoPercentual: [],
    fornecedoresPorDescontoValor: [],
  }
}

test('#670 — o gráfico de preço acompanha o período do Dashboard', async ({ page }) => {
  const periodosDashboard: Intervalo[] = []
  const periodosGrafico: Intervalo[] = []
  const insumo = { id: 'insumo-grafico-e2e', identificador: 'INS-1', nome: 'Fita de teste', marca: null, unidade: 'm', ativo: true }

  await page.route('**/api/compras/dashboard*', async route => {
    const url = new URL(route.request().url())
    const de = url.searchParams.get('de')
    const ate = url.searchParams.get('ate')
    periodosDashboard.push({ de, ate })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboardResponse(de ?? '', ate ?? '')) })
  })

  await page.route('**/api/compras/evolucao-preco*', async route => {
    const url = new URL(route.request().url())
    const de = url.searchParams.get('de')
    const ate = url.searchParams.get('ate')
    periodosGrafico.push({ de, ate })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ de, ate, series: [{ insumo, pontos: [] }] }) })
  })

  await login(page)
  await page.goto('/compras/dashboard')
  await expect(page.getByTestId('periodo-grafico-preco')).toBeVisible()

  const aguardarMesmoPeriodo = async (esperado?: Intervalo) => {
    await expect.poll(() => {
      const painel = periodosDashboard.at(-1)
      const grafico = periodosGrafico.at(-1)
      return !!painel && !!grafico && painel.de === grafico.de && painel.ate === grafico.ate
        && (!esperado || painel.de === esperado.de && painel.ate === esperado.ate)
    }).toBe(true)

    const periodo = periodosDashboard.at(-1)!
    await expect(page.getByTestId('periodo-grafico-preco')).toHaveText(`${formatarData(periodo.de!)} a ${formatarData(periodo.ate!)}`)
  }

  const chamadasGraficoAntes = periodosGrafico.length
  await page.getByRole('button', { name: '6 meses', exact: true }).click()
  await expect.poll(() => periodosGrafico.length).toBeGreaterThan(chamadasGraficoAntes)
  await aguardarMesmoPeriodo()

  await page.getByRole('button', { name: 'Personalizado', exact: true }).click()
  await page.getByLabel('Data inicial do painel').fill('2026-08-10')
  await page.getByLabel('Data final do painel').fill('2026-09-10')
  await aguardarMesmoPeriodo({ de: '2026-08-10', ate: '2026-09-10' })
})

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
