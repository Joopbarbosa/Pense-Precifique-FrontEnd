import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1034 (V0.18.0, RN-NOVA-1 a RN-NOVA-7) — a Agenda: visões Dia, Semana e Mês, faixa de atrasados e de hoje, "+N" do mês,
 * detalhe do compromisso. Dados pela API; datas relativas a hoje (fuso de Brasília). CEN-NOVO-4 a 7, 9 a 12.
 */
test.describe('#1034 — Agenda', () => {
  let produtoIds: string[] = []

  test.beforeEach(() => { produtoIds = [] })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds) await inativarProduto(request, token, id)
  })

  test('CT-1034-01 — abre na visão Semana e mostra a entrega estimada do orçamento no dia certo, com link para o orçamento', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA1034-Produto-${Date.now()}`, 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `QA1034-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 1 }], { prazoProducaoDias: 1 })
    await avancarStatusViaApi(request, token, orcamento.id)
    await avancarStatusViaApi(request, token, orcamento.id) // APROVADO: entrega estimada = amanhã

    await login(page)
    await page.goto('/agenda')
    await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const hoje = hojeLocal(0)
    const cabecalhoHoje = page.getByTestId(`cabecalho-dia-${hoje}`)
    await expect(cabecalhoHoje.locator('span')).toHaveText([
      new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${hoje}T12:00:00Z`)).replace('.', ''),
      String(Number(hoje.slice(8, 10))),
    ])
    await expect(cabecalhoHoje.locator('span').first()).toHaveClass(/uppercase/)
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await expect(page.getByTestId(`cabecalho-dia-${hoje}`).locator('span')).toHaveCount(2)
    await page.getByRole('button', { name: 'Próximo' }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: `Entrega estimada — ORC-${orcamento.numero}` })
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(page.getByTestId('detalhe-compromisso')).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`Abrir orçamento ORC-${orcamento.numero}`) })).toBeVisible()
  })

  test('CT-1034-02 — troca de visão e navegação: Dia, Semana, Mês, Anterior, Próximo e Hoje', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    const hoje = hojeLocal(0)
    const botaoHoje = page.getByRole('button', { name: 'Hoje', exact: true })
    await expect(botaoHoje).toHaveClass(/bg-orange/)
    await expect(page.getByTestId(`dia-${hoje}`)).toHaveClass(/bg-orange\/5/)
    const titulo = page.getByTestId('titulo-periodo')
    const semana = await titulo.textContent()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(titulo).not.toHaveText(semana ?? '')
    await expect(botaoHoje).toHaveClass(/bg-white/)
    await page.getByRole('button', { name: 'Hoje', exact: true }).click()
    await expect(titulo).toHaveText(semana ?? '')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    await expect(page.getByTestId('grade-mes')).toBeVisible()
    await expect(page.getByTestId(`dia-${hoje}`)).toHaveClass(/bg-orange\/5/)
    await expect(page.getByTestId(`dia-${hoje}`).locator('button').first()).toHaveClass(/bg-orange/)
    expect(await page.locator('[data-testid^="dia-"]').count()).toBe(42)
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await expect(page.getByTestId('grade-horas')).toBeVisible()
    await expect(page.getByTestId(`cabecalho-dia-${hoje}`).locator('span').nth(1)).toHaveClass(/bg-orange/)
    await expect(page.getByTestId(`dia-${hoje}`)).toHaveClass(/bg-orange\/5/)
    await expect(page.getByTestId('agenda-vazia')).toContainText('Nenhum compromisso neste período')
  })

  test('CT-1034-03 — faixa de atrasados e de hoje, lista de atrasados e atalho para hoje', async ({ page, request }) => {
    const token = await apiLogin(request)
    await criarCompromissoUsuaria(request, token, { titulo: 'Levar encomenda à transportadora', data: hojeLocal(-3) })
    await criarCompromissoUsuaria(request, token, { titulo: 'Conferir fita', data: hojeLocal(0), horario: '23:59' })

    await login(page)
    await page.goto('/agenda')
    await expect(page.getByTestId('resumo-atrasados')).toContainText('1 atrasado')
    await expect(page.getByTestId('resumo-hoje')).toContainText('1 para hoje')
    await page.getByTestId('resumo-atrasados').click()
    const lista = page.getByTestId('lista-atrasados')
    await expect(lista).toContainText('Levar encomenda à transportadora')
    await expect(lista).toContainText('Atrasado há 3 dias')
    await expect(lista.getByTestId('compromisso').filter({ hasText: 'Levar encomenda à transportadora' })).toHaveClass(/bg-danger-strong/)
    await expect(lista.getByTestId('compromisso').filter({ hasText: 'Levar encomenda à transportadora' }).locator('span').first()).toHaveClass(/text-white/)
    await page.getByRole('button', { name: 'Fechar' }).first().click()
    await page.getByTestId('resumo-hoje').click()
    await expect(page.getByTestId('grade-horas')).toBeVisible()
    await expect(page.getByTestId('compromisso').filter({ hasText: 'Conferir fita' })).toBeVisible()
  })

  test('CT-1034-04 — visão Mês: até 3 compromissos por dia e "+N" que abre a lista completa do dia', async ({ page, request }) => {
    const token = await apiLogin(request)
    // um dia do mês seguinte, para não somar com os compromissos de hoje criados pelos outros testes
    const dia = hojeLocal(35)
    for (let i = 1; i <= 5; i++) {
      await criarCompromissoUsuaria(request, token, { titulo: `Tarefa ${i}`, data: dia, horario: `0${i}:00` })
    }
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    const mesesAFrente = (Number(dia.slice(0, 4)) - Number(hojeLocal(0).slice(0, 4))) * 12 + Number(dia.slice(5, 7)) - Number(hojeLocal(0).slice(5, 7))
    for (let i = 0; i < mesesAFrente; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    const celula = page.getByTestId(`dia-${dia}`)
    await expect(celula.getByTestId('compromisso')).toHaveCount(3)
    await expect(page.getByTestId(`mais-${dia}`)).toHaveText('+2')
    await page.getByTestId(`mais-${dia}`).click()
    await expect(page.getByTestId('lista-do-dia').getByTestId('compromisso')).toHaveCount(5)
  })

  test('CT-1066 / CEN-NOVO-101 — resumo aparece no hover e some ao sair do compromisso', async ({ page, request }) => {
    const token = await apiLogin(request)
    await criarCompromissoUsuaria(request, token, { titulo: 'Revisar tecido', data: hojeLocal(0), horario: '14:30' })
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    const chip = page.getByTestId('compromisso').filter({ hasText: 'Revisar tecido' })
    await chip.hover()
    const cartao = page.getByTestId('cartao-resumo')
    await expect(cartao).toContainText('Revisar tecido')
    await expect(cartao).toContainText('14:30')
    await expect(cartao).toContainText('Avulso')
    await page.getByRole('heading', { name: 'Agenda' }).hover()
    await expect(cartao).toHaveCount(0)
    await chip.click()
    await expect(page.getByTestId('detalhe-compromisso')).toBeVisible()
  })
})
