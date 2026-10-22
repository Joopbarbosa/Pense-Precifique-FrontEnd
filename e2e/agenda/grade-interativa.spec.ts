import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { API_URL } from '../helpers/auth'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/**
 * Paridade com o Google Agenda (V0.18.0, Aditivo 3): hora de término (#1063), criar clicando num horário vazio (#1064) e arrastar e
 * esticar o bloco (#1065). CEN-NOVO-92 a 99. Todos os eventos são de amanhã, para não virarem atrasados durante o teste.
 */
async function doDia(request: APIRequestContext, titulo: string, dia: string) {
  const token = await apiLogin(request)
  const res = await request.get(`${API_URL}/agenda/compromissos?de=${dia}&ate=${dia}`, { headers: { Authorization: `Bearer ${token}` } })
  const lista = await res.json() as Array<{ titulo: string; horario: string | null; horarioFim: string | null; dataExibicao: string }>
  return lista.filter(c => c.titulo === titulo)
}

async function abrirAmanha(page: Page) {
  await login(page)
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  await page.getByRole('button', { name: 'Próximo' }).click()
}

/** A grade rola sozinha ao abrir (hora atual ou 7h): espera o bloco parar de se mover antes de arrastar. */
async function caixaEstavel(alvo: import('@playwright/test').Locator) {
  await expect(alvo).toBeVisible()
  let anterior = await alvo.boundingBox()
  for (let i = 0; i < 20; i++) {
    await alvo.page().waitForTimeout(150)
    const atual = await alvo.boundingBox()
    if (atual && anterior && atual.x === anterior.x && atual.y === anterior.y) return atual
    anterior = atual
  }
  return (await alvo.boundingBox())!
}

test.describe('Agenda — término, criar clicando, arrastar e esticar', () => {
  test('CT-1063-01 — o evento com término vira um bloco com a duração real', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1063-Reuniao-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), horario: '14:00', horarioFim: '15:30' })
    await abrirAmanha(page)
    const bloco = page.getByTestId('compromisso').filter({ hasText: titulo })
    await expect(bloco).toBeVisible()
    expect(Math.abs((await bloco.boundingBox())!.height - 84)).toBeLessThan(4) // 1,5 hora de 56 px
  })

  test('CT-1063-02 (negativo) — término antes do início bloqueia no Novo evento', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByLabel('Título').fill('Reunião sem sentido')
    await page.getByLabel('Horário', { exact: true }).fill('14:00')
    await page.getByLabel('Término', { exact: true }).fill('13:00')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('O término deve ser depois do início')).toBeVisible()
  })

  test('CT-1064-01 — clicar num espaço vazio da grade abre o Novo evento com a hora do clique', async ({ page }) => {
    await abrirAmanha(page)
    const coluna = page.locator('[data-testid^="coluna-"]').first()
    const caixa = (await coluna.boundingBox())!
    // 10h40 = 10,67 horas de 56 px: o clique arredonda para baixo a 30 minutos (10:30) e o término fica 1 hora depois
    await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + (10 + 40 / 60) * 56)
    await expect(page.getByTestId('modal-evento')).toBeVisible()
    await expect(page.getByLabel('Horário', { exact: true })).toHaveValue('10:30')
    await expect(page.getByLabel('Término', { exact: true })).toHaveValue('11:30')
  })

  test('CT-1065-01 — arrastar o bloco muda a hora, mantendo a duração', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1065-Arrastar-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), horario: '09:00', horarioFim: '10:00' })
    await abrirAmanha(page)
    const bloco = page.getByTestId('compromisso').filter({ hasText: titulo })
    const c = await caixaEstavel(bloco)
    await page.mouse.move(c.x + c.width / 2, c.y + 20)
    await page.mouse.down()
    await page.mouse.move(c.x + c.width / 2, c.y + 20 + 56, { steps: 6 }) // +1 hora
    await page.mouse.move(c.x + c.width / 2, c.y + 20 + 112, { steps: 6 }) // +2 horas
    await page.mouse.up()
    await expect.poll(async () => (await doDia(request, titulo, hojeLocal(1)))[0]?.horario).toBe('11:00')
    expect((await doDia(request, titulo, hojeLocal(1)))[0].horarioFim).toBe('12:00')
  })

  test('CT-1065-02 — esticar a borda de baixo muda o término', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1065-Esticar-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), horario: '09:00', horarioFim: '10:00' })
    await abrirAmanha(page)
    const alca = page.getByTestId('bloco-movel').filter({ hasText: titulo }).getByTestId('alca-esticar')
    const a = await caixaEstavel(alca)
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 56, { steps: 6 }) // +1 hora
    await page.mouse.up()
    await expect.poll(async () => (await doDia(request, titulo, hojeLocal(1)))[0]?.horarioFim).toBe('11:00')
    expect((await doDia(request, titulo, hojeLocal(1)))[0].horario).toBe('09:00')
  })

  test('CT-1065-03 — o clique sem arrastar continua abrindo o detalhe', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1065-Clique-${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), horario: '16:00' })
    await abrirAmanha(page)
    await page.getByTestId('compromisso').filter({ hasText: titulo }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toBeVisible()
  })

  test('CT-1065-04 — evento sem horário arrasta para outro dia no Mês', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `QA1065-DiaInteiro-${Date.now()}`
    // dias distantes, sem os compromissos que os outros testes criam (hoje, amanhã e hoje + 35)
    const origem = hojeLocal(50)
    const destino = hojeLocal(51)
    await criarCompromissoUsuaria(request, token, { titulo, data: origem })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    const ano = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7))
    for (let i = 0; i < ano(origem) - ano(hojeLocal(0)); i++) await page.getByRole('button', { name: 'Próximo' }).click()
    const chip = page.getByTestId(`dia-${origem}`).getByTestId('compromisso').filter({ hasText: titulo })
    // o dragTo não inicia o arraste do navegador de forma confiável: o gesto é feito com o mouse, em etapas
    const de = await caixaEstavel(chip)
    const para = (await page.getByTestId(`dia-${destino}`).boundingBox())!
    await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
    await page.mouse.down()
    await page.mouse.move(de.x + de.width / 2 + 10, de.y + de.height / 2 + 10, { steps: 4 })
    await page.mouse.move(para.x + 40, para.y + 40, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await doDia(request, titulo, destino)).length).toBe(1)
    expect((await doDia(request, titulo, origem)).length).toBe(0)
  })
})
