import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, criarProdutoComFichaEEstoque, criarProducaoComData, iniciarProducaoViaApi, travarProducaoViaApi, inativarProduto } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

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
    const titulo = page.getByTestId('titulo-periodo')
    const semana = await titulo.textContent()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(titulo).not.toHaveText(semana ?? '')
    await page.getByRole('button', { name: 'Hoje', exact: true }).click()
    await expect(titulo).toHaveText(semana ?? '')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    await expect(page.getByTestId('grade-mes')).toBeVisible()
    expect(await page.locator('[data-testid^="dia-"]').count()).toBe(42)
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await expect(page.getByTestId('grade-horas')).toBeVisible()
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

  test('CT-1066 / CEN-NOVO-101 — resumo aparece no hover (título, data, início–término, origem, atraso e marcações) e some ao sair do compromisso', async ({ page, request }) => {
    const token = await apiLogin(request)
    // dois dias atrás, para o cartão trazer atraso; o avulso tem início e término (RN-NOVA-2 v4)
    const dia = hojeLocal(-2)
    const dataBr = `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`
    await criarCompromissoUsuaria(request, token, { titulo: 'Revisar tecido', data: dia, horario: '14:30', horarioFim: '15:45' })
    // produção com término previsto já passado e travada: o cartão traz a marcação "Travada" e o atraso
    const insumo = await criarInsumoComEstoque(request, token, `QA1066-Insumo-${Date.now()}`, 100)
    const produto = await criarProdutoComFichaEEstoque(request, token, `QA1066-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 0, 1)
    produtoIds.push(produto.id)
    // início e término no dia alvo (o término não pode ser anterior ao início); iniciada e depois travada
    const producao = await criarProducaoComData(request, token, produto.id, dia, dia)
    const iniciou = await iniciarProducaoViaApi(request, token, producao.id)
    if (!iniciou.ok()) throw new Error(`Falha ao iniciar produção de teste: ${iniciou.status()} ${await iniciou.text()}`)
    await travarProducaoViaApi(request, token, producao.id, 'Travada pelo teste E2E do CT-1066 para o cartão mostrar a marcação')

    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    await page.getByRole('button', { name: 'Anterior' }).click()
    await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(page.getByTestId(`cabecalho-dia-${dia}`)).toBeVisible()

    const chip = page.getByTestId('compromisso').filter({ hasText: 'Revisar tecido' })
    await chip.hover()
    const cartao = page.getByTestId('cartao-resumo')
    await expect(cartao).toContainText('Revisar tecido')
    await expect(cartao).toContainText(`${dataBr} · 14:30–15:45`)
    await expect(cartao).toContainText('Avulso')
    await expect(cartao).toContainText('Atrasado há 2 dias')

    const chipProducao = page.getByTestId('compromisso').filter({ hasText: 'Término previsto' }).filter({ hasText: produto.nome })
    await chipProducao.hover()
    await expect(cartao).toContainText('Término previsto')
    await expect(cartao).toContainText(dataBr)
    await expect(cartao).toContainText('Atrasado há 2 dias')
    await expect(cartao).toContainText('Travada')

    await page.getByRole('heading', { name: 'Agenda' }).hover()
    await expect(cartao).toHaveCount(0)
    await chip.click()
    await expect(page.getByTestId('detalhe-compromisso')).toBeVisible()
  })

  test('CT-1067 / CEN-NOVO-102 — mostra a semana 43 de 18 a 24/10/2026', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    // vai até a semana fixa (domingo 18/10/2026) a partir da semana de hoje, para não depender do dia da execução
    const [a, m, d] = hojeLocal().split('-').map(Number)
    const hoje = Date.UTC(a, m - 1, d)
    const domingoAtual = hoje - new Date(hoje).getUTCDay() * 86_400_000
    const semanas = Math.round((domingoAtual - Date.UTC(2026, 9, 18)) / (7 * 86_400_000))
    for (let i = 0; i < Math.abs(semanas); i++) await page.getByRole('button', { name: semanas > 0 ? 'Anterior' : 'Próximo' }).click()
    await expect(page.getByTestId('numero-semana')).toHaveText('Sem 43')
  })

  test('CT-1069 / CEN-NOVO-95 — clicar no espaço vazio do Mês cria evento sem horário; o número abre a lista do dia', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    const celula = page.getByTestId('dia-2026-10-25')
    await celula.getByRole('button', { name: 'Ver o dia 2026-10-25' }).click()
    await expect(page.getByRole('dialog')).toContainText('domingo, 25 de outubro')
    await page.keyboard.press('Escape')
    await page.getByTestId('criar-dia-2026-10-25').click()
    const modal = page.getByTestId('modal-evento')
    await expect(modal.getByLabel('Data')).toHaveValue('2026-10-25')
    await expect(modal.getByLabel('Horário')).toHaveValue('')
  })
})
