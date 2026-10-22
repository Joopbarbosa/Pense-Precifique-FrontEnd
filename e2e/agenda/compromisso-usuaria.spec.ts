import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo, inativarInsumo } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'

/**
 * #1039 (V0.18.0, RN-NOVA-19 a RN-NOVA-21) — o compromisso criado pela usuária: "Novo evento", recorrência semanal e mensal, concluir,
 * editar e cancelar a ocorrência ou a série inteira, insumo removido. CEN-NOVO-51 a 62.
 */
test.describe('#1039 — Compromisso da usuária', () => {
  async function terca(): Promise<string> {
    // a próxima terça-feira a partir de amanhã (datas civis em Brasília, via UTC para não deslocar o dia)
    for (let i = 1; i <= 7; i++) {
      const d = hojeLocal(i)
      if (new Date(`${d}T12:00:00Z`).getUTCDay() === 2) return d
    }
    return hojeLocal(1)
  }

  async function datasDaAgenda(request: import('@playwright/test').APIRequestContext, token: string, de: string, ate: string, titulo: string) {
    const res = await request.get(`${E2E_API_URL}/agenda/compromissos?de=${de}&ate=${ate}`, { headers: { Authorization: `Bearer ${token}` } })
    return (await res.json() as Array<{ titulo: string; dataExibicao: string; situacao: string }>)
      .filter(c => c.titulo === titulo).map(c => ({ data: c.dataExibicao, situacao: c.situacao }))
  }

  async function abrirNoDia(page: import('@playwright/test').Page, titulo: string, diasAFrente: number) {
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < diasAFrente; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByTestId('compromisso').filter({ hasText: titulo }).first().click()
  }

  test('CT-1039-01 — Novo evento simples com horário: aparece no dia e na hora', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Comprar linha ${Date.now()}`
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Data').fill(hojeLocal(3))
    await page.getByLabel('Horário').fill('10:00')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    expect(await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(10), titulo)).toEqual([{ data: hojeLocal(3), situacao: 'PENDENTE' }])
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    await expect(page.getByTestId('compromisso').filter({ hasText: titulo })).toContainText('10:00')
  })

  test('CT-1039-02 (negativo) — título vazio e quantidade de ocorrências fora de 2 a 365 bloqueiam', async ({ page, request }) => {
    const token = await apiLogin(request)
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Informe o título')).toBeVisible()
    await page.getByLabel('Título').fill(`Pagar aluguel ${Date.now()}`)
    await page.getByRole('button', { name: 'Semanal', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Escolha pelo menos um dia da semana')).toBeVisible()
    await page.getByRole('button', { name: 'Seg', exact: true }).click()
    await page.getByRole('button', { name: 'Termina após' }).click()
    await page.getByLabel('Quantidade de ocorrências').fill('1')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A quantidade de ocorrências vai de 2 a 365')).toBeVisible()
    await page.getByLabel('Quantidade de ocorrências').fill('366')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A quantidade de ocorrências vai de 2 a 365')).toBeVisible()
    expect(await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(60), 'Pagar aluguel')).toEqual([])
  })

  test('CT-1039-03 — recorrência semanal às terças e quintas, 4 ocorrências, criada pela tela', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Entregar encomendas ${Date.now()}`
    const inicio = await terca()
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Novo evento' }).click()
    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Data').fill(inicio)
    await page.getByRole('button', { name: 'Semanal', exact: true }).click()
    await page.getByRole('button', { name: 'Ter', exact: true }).click()
    await page.getByRole('button', { name: 'Qui', exact: true }).click()
    await page.getByRole('button', { name: 'Termina após' }).click()
    await page.getByLabel('Quantidade de ocorrências').fill('4')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    const [t, q] = [inicio, new Date(new Date(`${inicio}T12:00:00Z`).getTime() + 2 * 86_400_000).toISOString().slice(0, 10)]
    const esperado = [t, q, new Date(new Date(`${t}T12:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10), new Date(new Date(`${q}T12:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10)]
    const achadas = await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(40), titulo)
    expect(achadas.map(a => a.data)).toEqual(esperado)
  })

  test('CT-1039-04 — concluir uma ocorrência: fica riscada e a outra segue pendente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Conferir estoque ${Date.now()}`
    const inicio = hojeLocal(1)
    await criarCompromissoUsuaria(request, token, { titulo, data: inicio, recorrencia: 'SEMANAL', diasSemana: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], quantidadeOcorrencias: 3 })
    await login(page)
    await abrirNoDia(page, titulo, 1)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0)
    const concluido = page.getByTestId('compromisso').filter({ hasText: titulo }).first()
    await expect(concluido).toHaveAttribute('data-situacao', 'CONCLUIDO')
    await expect(concluido).toHaveClass(/bg-success/)
    await expect(concluido).toHaveClass(/text-white/)
    await expect(concluido.locator('span').first()).toHaveClass(/line-through/)
    await expect(concluido.locator('span').first()).toHaveClass(/text-white/)
    await expect(concluido.locator('svg')).toHaveCount(1)
    await expect(concluido.locator('span').last()).toHaveClass(/line-through/)
    const situacoes = await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(10), titulo)
    expect(situacoes.map(s => s.situacao)).toEqual(['CONCLUIDO', 'PENDENTE', 'PENDENTE'])
  })

  test('CT-1039-05 — cancelar a série inteira exige 30 caracteres e preserva o que já foi concluído', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Entregar pedidos ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), recorrencia: 'SEMANAL', diasSemana: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], quantidadeOcorrencias: 3 })
    await login(page)
    await abrirNoDia(page, titulo, 1)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await abrirNoDia(page, titulo, 2)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.getByRole('button', { name: 'A série inteira' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByLabel('Observação do cancelamento').fill('Mudou o dia')
    await page.getByRole('button', { name: 'Cancelar compromisso' }).click()
    await expect(page.getByText(/pelo menos 30 caracteres|Mínimo de 30/).first()).toBeVisible()
    await page.getByLabel('Observação do cancelamento').fill('Parei de entregar às terças e quintas')
    await page.getByRole('button', { name: 'Cancelar compromisso' }).click()
    await expect(page.getByTestId('detalhe-compromisso')).toHaveCount(0)
    const situacoes = await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(10), titulo)
    expect(situacoes.map(s => s.situacao)).toEqual(['CONCLUIDO', 'CANCELADO', 'CANCELADO'])
  })

  test('CT-1039-06 — editar só a ocorrência (move a data) e depois a série inteira (muda o título)', async ({ page, request }) => {
    const token = await apiLogin(request)
    const titulo = `Revisar caixa ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), recorrencia: 'SEMANAL', diasSemana: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], quantidadeOcorrencias: 3 })
    await login(page)
    await abrirNoDia(page, titulo, 2)
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByLabel('Data').fill(hojeLocal(5))
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    expect((await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(10), titulo)).map(s => s.data)).toEqual([hojeLocal(1), hojeLocal(3), hojeLocal(5)])
    await abrirNoDia(page, titulo, 1)
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByRole('button', { name: 'A série inteira' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByLabel('Data')).toHaveCount(0)
    await page.getByLabel('Título').fill(`${titulo} (novo)`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('modal-evento')).toHaveCount(0)
    expect(await datasDaAgenda(request, token, hojeLocal(0), hojeLocal(10), `${titulo} (novo)`)).toHaveLength(3)
  })

  test('CT-1039-07 — insumo vinculado e depois inativado: o compromisso continua e mostra "Insumo removido"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const insumo = await criarInsumo(request, token, `QA1039-Linha-${Date.now()}`)
    const titulo = `Comprar linha ${Date.now()}`
    await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(1), insumoId: insumo.id })
    await login(page)
    await abrirNoDia(page, titulo, 1)
    await expect(page.getByTestId('vinculo-insumo').getByRole('button', { name: insumo.nome })).toBeVisible()
    await inativarInsumo(request, token, insumo.id)
    await page.reload()
    await abrirNoDia(page, titulo, 1)
    await expect(page.getByTestId('vinculo-insumo')).toHaveText('Insumo removido')
  })
})
