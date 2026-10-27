import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, inativarInsumo } from '../helpers/api'
import {
  criarCliente,
  criarOrcamentoViaApi,
  avancarStatusViaApi,
  buscarOrcamento,
  vincularProducaoViaApi,
} from '../helpers/orcamento'
import { criarProdutoComFichaEEstoque, inativarProduto, criarProducaoViaApi } from '../helpers/producao'
import { criarInsumoComEstoque } from '../helpers/insumo'

/** #1110 — "Confirmar início" virou "Iniciar produção"; sem produção vinculada o botão principal é "Vincular produção". */
test.describe('#1110 — Rótulo do botão no orçamento aprovado', () => {
  const produtoIds: string[] = []
  const insumoIds: string[] = []

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of produtoIds.splice(0)) await inativarProduto(request, token, id)
    for (const id of insumoIds.splice(0)) await inativarInsumo(request, token, id)
  })

  async function aprovado(request: import('@playwright/test').APIRequestContext, token: string, prefixo: string) {
    // criar a produção exige ficha técnica completa
    const insumo = await criarInsumoComEstoque(request, token, `${prefixo}-Insumo-${Date.now()}`, 1000, true)
    insumoIds.push(insumo.id)
    const produto = await criarProdutoComFichaEEstoque(request, token, `${prefixo}-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 100)
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${prefixo}-Cliente-${Date.now()}`)
    const orc = await criarOrcamentoViaApi(
      request, token, cliente.id,
      [{ produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }],
      { sinalAtivo: false }
    )
    await avancarStatusViaApi(request, token, orc.id) // ENVIADO
    await avancarStatusViaApi(request, token, orc.id) // APROVADO
    expect((await buscarOrcamento(request, token, orc.id)).status).toBe('APROVADO')
    return { orc, produto }
  }

  test('CT-1110-01 (positivo) — sem produção vinculada o botão é "Vincular produção" e abre a modal de vínculo', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orc } = await aprovado(request, token, 'QA1110A')

    await login(page)
    await page.goto(`/orcamentos/${orc.id}`)

    await expect(page.getByRole('button', { name: 'Confirmar início' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Iniciar produção' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Vincular produção', exact: true }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
  })

  test('CT-1110-02 (positivo) — com produção vinculada o botão é "Iniciar produção" e avança para Em produção', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { orc, produto } = await aprovado(request, token, 'QA1110B')
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    await vincularProducaoViaApi(request, token, orc.id, producao.id)

    await login(page)
    await page.goto(`/orcamentos/${orc.id}`)

    await expect(page.getByRole('button', { name: 'Vincular produção', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Iniciar produção', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marcar como finalizado', exact: true })).toBeVisible({ timeout: 10000 })
    expect((await buscarOrcamento(request, token, orc.id)).status).toBe('EM_PRODUCAO')
  })
})
