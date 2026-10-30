import { test, expect, type Page } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCompromissoUsuaria } from '../helpers/agenda'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/**
 * #1165 (V0.18.0, RN-NOVA-38) — a busca da Agenda filtra a visão atual por título, cliente e número do orçamento, sem diferenciar
 * maiúscula e acento. CEN-NOVO-132 e CEN-NOVO-133.
 */
test.describe('#1165 — Busca na Agenda', () => {
  async function irParaODia(page: Page, diasAFrente: number) {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia', exact: true }).click()
    for (let i = 0; i < diasAFrente; i++) await page.getByRole('button', { name: 'Próximo' }).click()
  }

  test('CT-1165-01 / CEN-NOVO-132 — busca por título (sem acento nem maiúscula), sem resultado e limpar', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    // com horário: a linha de dia inteiro mostra só 2 e esconde o resto atrás do "+N" quando outros specs deixam compromissos no mesmo dia (#1204)
    await criarCompromissoUsuaria(request, token, { titulo: `Reunião Ana ${ts}`, data: hojeLocal(1), horario: '09:00', horarioFim: '09:30' })
    await criarCompromissoUsuaria(request, token, { titulo: `Compras Beto ${ts}`, data: hojeLocal(1), horario: '10:00', horarioFim: '10:30' })
    await irParaODia(page, 1)
    const ana = page.getByTestId('compromisso').filter({ hasText: `Reunião Ana ${ts}` })
    const beto = page.getByTestId('compromisso').filter({ hasText: `Compras Beto ${ts}` })
    await expect(ana).toBeVisible()
    await expect(beto).toBeVisible()

    await page.getByLabel('Buscar na agenda').fill(`REUNIAO ana ${ts}`)
    await expect(ana).toBeVisible()
    await expect(beto).toHaveCount(0)
    await expect(page.getByTestId('busca-resultados')).toHaveText('1 resultado neste período')

    await page.getByLabel('Buscar na agenda').fill('xyz-sem-resultado')
    await expect(page.getByTestId('agenda-vazia-busca')).toHaveText('Nenhum compromisso encontrado neste período.')
    await expect(page.getByTestId('busca-resultados')).toHaveText('0 resultados neste período')

    await page.getByLabel('Buscar na agenda').fill('')
    await expect(ana).toBeVisible()
    await expect(beto).toBeVisible()
    await expect(page.getByTestId('busca-resultados')).toHaveCount(0)
  })

  test('CT-1165-02 / CEN-NOVO-132 — busca pelo número do orçamento (ORC-n) e pelo nome do cliente', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    const produto = await criarProdutoComEstoque(request, token, `QA1165-Produto-${ts}`, 100)
    try {
      const nomeCliente = `Maria Souza ${ts}`
      const cliente = await criarCliente(request, token, nomeCliente)
      const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
        [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], { prazoProducaoDias: 3 })
      for (let i = 0; i < 2; i++) await avancarStatusViaApi(request, token, orcamento.id)
      await criarCompromissoUsuaria(request, token, { titulo: `Outro assunto ${ts}`, data: hojeLocal(3) })
      await irParaODia(page, 3)
      const entrega = page.getByTestId('compromisso').filter({ hasText: `Entrega estimada — ORC-${orcamento.numero}` })
      const outro = page.getByTestId('compromisso').filter({ hasText: `Outro assunto ${ts}` })

      await page.getByLabel('Buscar na agenda').fill(`orc-${orcamento.numero}`)
      await expect(entrega).toBeVisible()
      await expect(outro).toHaveCount(0)

      await page.getByLabel('Buscar na agenda').fill(`maria souza ${ts}`)
      await expect(entrega).toBeVisible()
      await expect(outro).toHaveCount(0)
    } finally {
      await inativarProduto(request, token, produto.id)
    }
  })

  test('CT-1165-03 (negativo) / CEN-NOVO-133 — só espaços não filtra; o campo não aceita mais de 100 caracteres', async ({ page, request }) => {
    const token = await apiLogin(request)
    const ts = Date.now()
    await criarCompromissoUsuaria(request, token, { titulo: `Evento espaços ${ts}`, data: hojeLocal(1), horario: '09:00', horarioFim: '09:30' })
    await irParaODia(page, 1)
    const evento = page.getByTestId('compromisso').filter({ hasText: `Evento espaços ${ts}` })
    await expect(evento).toBeVisible()

    await page.getByLabel('Buscar na agenda').fill('     ')
    await expect(evento).toBeVisible()
    await expect(page.getByTestId('busca-resultados')).toHaveCount(0)
    await expect(page.getByTestId('agenda-vazia-busca')).toHaveCount(0)

    await page.getByLabel('Buscar na agenda').fill('a'.repeat(150))
    await expect(page.getByLabel('Buscar na agenda')).toHaveValue('a'.repeat(100))
  })

  test('CT-1190-01 — o campo de busca fica embaixo do botão Resumo do dia, alinhado à esquerda', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    const resumo = await page.getByRole('button', { name: 'Resumo do dia' }).boundingBox()
    const busca = await page.getByLabel('Buscar na agenda').boundingBox()
    expect(resumo && busca).toBeTruthy()
    expect(busca!.y).toBeGreaterThanOrEqual(resumo!.y + resumo!.height - 1)
    expect(Math.abs(busca!.x - resumo!.x)).toBeLessThan(4)
  })
})
