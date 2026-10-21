import { expect, test } from '@playwright/test'
import { apiLogin } from '../helpers/api'
import { login } from '../helpers/auth'
import { criarCompromissoUsuaria, resumoAgenda } from '../helpers/agenda'
import { hojeLocal } from '../helpers/data'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarProdutoComEstoque } from '../helpers/producao'
import { registrarCompraPendente } from '../helpers/compra'

test.describe('#1058 — filtros visuais da Agenda (CEN-NOVO-85 a 87)', () => {
  test('CEN-NOVO-85 — somente atrasados preserva contagens e limpar restaura compromissos', async ({ page, request }) => {
    const token = await apiLogin(request)
    const atrasados = [`Filtro atrasado A ${Date.now()}`, `Filtro atrasado B ${Date.now()}`]
    const pendentes = Array.from({ length: 5 }, (_, i) => `Filtro pendente ${i + 1} ${Date.now()}`)
    // a conta de teste é compartilhada: os outros specs deixam atrasados e compromissos de hoje, então a conta parte do que já existe
    const antes = await resumoAgenda(request, token)
    for (const titulo of atrasados) await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(-2) })
    for (const titulo of pendentes) await criarCompromissoUsuaria(request, token, { titulo, data: hojeLocal(0) })

    await login(page)
    await page.goto('/agenda')
    await expect(page.getByTestId('resumo-atrasados')).toHaveText(`${antes.atrasados + 2} atrasados`)
    await expect(page.getByTestId('resumo-hoje')).toHaveText(`${antes.hoje + 5} para hoje`)
    const resumoAtrasados = await page.getByTestId('resumo-atrasados').innerText()
    const resumoHoje = await page.getByTestId('resumo-hoje').innerText()
    await page.getByLabel('Mostrar').selectOption('ATRASADOS')
    // o atrasado aparece em cada dia entre a origem e hoje (RN-NOVA-4 v2): pode haver mais de um chip
    for (const titulo of atrasados) await expect(page.getByTestId('compromisso').filter({ hasText: titulo }).first()).toBeVisible()
    for (const titulo of pendentes) await expect(page.getByTestId('compromisso').filter({ hasText: titulo })).toHaveCount(0)
    await expect(page.getByTestId('resumo-atrasados')).toHaveText(resumoAtrasados)
    await expect(page.getByTestId('resumo-hoje')).toHaveText(resumoHoje)

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    for (const titulo of [...atrasados, ...pendentes]) await expect(page.getByTestId('compromisso').filter({ hasText: titulo }).first()).toBeVisible()
  })

  test('CEN-NOVO-86 — origem e situação combinam; desmarcar origens mostra todas', async ({ page, request }) => {
    const token = await apiLogin(request)
    const sufixo = Date.now()
    const tituloEvento = `Filtro evento ${sufixo}`
    await criarCompromissoUsuaria(request, token, { titulo: tituloEvento, data: hojeLocal(1) })

    const insumo = await criarInsumoComEstoque(request, token, `Filtro insumo ${sufixo}`, 0, true)
    const compra = await registrarCompraPendente(request, token, [{ insumoId: insumo.id, quantidade: 1, precoTotal: 10 }], hojeLocal(2), hojeLocal(0))

    const produto = await criarProdutoComEstoque(request, token, `Filtro produto ${sufixo}`, 100)
    const cliente = await criarCliente(request, token, `Filtro cliente ${sufixo}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 40, margemAplicada: 50, quantidade: 1 }], { prazoProducaoDias: 2 })
    await avancarStatusViaApi(request, token, orcamento.id)
    await avancarStatusViaApi(request, token, orcamento.id)

    await login(page)
    await page.goto('/agenda')
    await page.getByLabel('Mostrar').selectOption('PENDENTES')
    await page.getByLabel('Compra', { exact: true }).check()
    await page.getByLabel('Meus eventos', { exact: true }).check()
    const chipEvento = page.getByTestId('compromisso').filter({ hasText: tituloEvento })
    const chipCompra = page.getByTestId('compromisso').filter({ hasText: compra.identificador })
    await expect(chipEvento).toBeVisible()
    await expect(chipCompra).toBeVisible()
    await expect(chipEvento).toHaveAttribute('data-situacao', 'PENDENTE')
    await expect(chipCompra).toHaveAttribute('data-situacao', 'PENDENTE')
    await expect(page.getByTestId('compromisso').filter({ hasText: `Entrega estimada — ORC-${orcamento.numero}` })).toHaveCount(0)

    await page.getByLabel('Compra', { exact: true }).uncheck()
    await page.getByLabel('Meus eventos', { exact: true }).uncheck()
    await expect(page.getByTestId('compromisso').filter({ hasText: tituloEvento })).toBeVisible()
    await expect(page.getByTestId('compromisso').filter({ hasText: compra.identificador })).toBeVisible()
    await expect(page.getByTestId('compromisso').filter({ hasText: `Entrega estimada — ORC-${orcamento.numero}` })).toBeVisible()
  })

  test('CEN-NOVO-87 — resultado vazio e filtros voltam ao padrão ao reabrir a Agenda', async ({ page }) => {
    await login(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mês', exact: true }).click()
    for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByLabel('Produção', { exact: true }).check()
    await expect(page.getByTestId('agenda-vazia-filtros')).toHaveText('Nenhum compromisso com esses filtros')

    await page.goto('/orcamentos')
    await page.goto('/agenda')
    await expect(page.getByLabel('Mostrar')).toHaveValue('TODOS')
    for (const origem of ['Orçamento', 'Produção', 'Compra', 'Meus eventos']) {
      await expect(page.getByLabel(origem, { exact: true })).not.toBeChecked()
    }
  })
})
