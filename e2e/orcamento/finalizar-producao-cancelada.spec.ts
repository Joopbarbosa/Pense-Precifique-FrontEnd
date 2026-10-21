import { test, expect } from '@playwright/test'
import { E2E_API_URL } from '../helpers/target'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarInsumoComEstoque } from '../helpers/insumo'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi, buscarOrcamento, vincularProducaoViaApi } from '../helpers/orcamento'
import {
  criarProdutoComFichaEEstoque,
  inativarProduto,
  criarProducaoViaApi,
  iniciarProducaoViaApi,
  travarProducaoViaApi,
  teardownProducoes,
} from '../helpers/producao'

const API_URL = E2E_API_URL

/**
 * #398 (V0.18.0, ORC-047) — finalizar um orçamento EM_PRODUCAO com produção vinculada cancelada mostra o
 * aviso "PRD-N cancelada" com "Continuar mesmo assim" / "Cancelar" (CEN-NOVO-74), sem prender a usuária num
 * laço (CEN-NOVO-75); produção pendente bloqueia e a lista sai pelo número crescente (CEN-NOVO-76).
 */
test.describe('#398 — Finalizar orçamento com produção vinculada cancelada ou pendente', () => {
  let produtoIds: string[] = []
  let insumoIds: string[] = []
  let producaoIds: string[] = []

  test.beforeEach(() => {
    produtoIds = []
    insumoIds = []
    producaoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, producaoIds)
    for (const id of produtoIds) await inativarProduto(request, token, id)
    for (const id of insumoIds) {
      await request.delete(`${API_URL}/insumos/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })

  async function prepararEmProducao(request: import('@playwright/test').APIRequestContext, token: string, prefixo: string) {
    const insumo = await criarInsumoComEstoque(request, token, `${prefixo}-Insumo-${Date.now()}`, 1000, true)
    insumoIds.push(insumo.id)
    const produto = await criarProdutoComFichaEEstoque(
      request, token, `${prefixo}-Produto-${Date.now()}`, [{ insumoId: insumo.id, quantidade: 1 }], 100
    )
    produtoIds.push(produto.id)
    const cliente = await criarCliente(request, token, `${prefixo}-Cliente-${Date.now()}`)
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id, [
      { produtoId: produto.id, precoUnitario: 20, margemAplicada: 50, quantidade: 2 },
    ])
    return { produto, orcamento }
  }

  async function levarAteEmProducao(request: import('@playwright/test').APIRequestContext, token: string, id: string) {
    for (let i = 0; i < 3; i++) await avancarStatusViaApi(request, token, id) // ENVIADO, APROVADO, EM_PRODUCAO
    expect((await buscarOrcamento(request, token, id)).status).toBe('EM_PRODUCAO')
  }

  test('CT-398-01 e CT-398-02 — aviso de produção cancelada; "Cancelar" não prende; "Continuar mesmo assim" finaliza', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { produto, orcamento } = await prepararEmProducao(request, token, 'QA398A')
    const producao = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 2 }])
    producaoIds.push(producao.id)
    await vincularProducaoViaApi(request, token, orcamento.id, producao.id)
    await request.post(`${API_URL}/producoes/${producao.id}/cancelar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { justificativa: 'Cancelada para o teste automatizado da tarefa 398 do pocket.' },
    })
    await levarAteEmProducao(request, token, orcamento.id)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)

    await page.getByRole('button', { name: 'Marcar como finalizado' }).click()
    await expect(page.getByText(/PRD-\d+ cancelada/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar mesmo assim' })).toBeVisible()

    // CEN-NOVO-75: "Cancelar" fecha o aviso e o orçamento continua EM_PRODUCAO
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('EM_PRODUCAO')

    // CEN-NOVO-74/75: de novo, agora confirmando — finaliza sem repetir o aviso
    await page.getByRole('button', { name: 'Marcar como finalizado' }).click()
    await page.getByRole('button', { name: 'Continuar mesmo assim' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar pagamento' })).toBeVisible({ timeout: 15_000 })
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('FINALIZADO')
  })

  test('CT-398-03 (negativo) — produção pendente bloqueia e a mensagem lista as produções do menor para o maior número', async ({ page, request }) => {
    const token = await apiLogin(request)
    const { produto, orcamento } = await prepararEmProducao(request, token, 'QA398B')
    const primeira = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    const segunda = await criarProducaoViaApi(request, token, [{ produtoId: produto.id, quantidade: 1 }])
    producaoIds.push(primeira.id, segunda.id)
    // vincula a de número maior primeiro, para provar que a ordem da mensagem não é a do vínculo
    await vincularProducaoViaApi(request, token, orcamento.id, segunda.id)
    await vincularProducaoViaApi(request, token, orcamento.id, primeira.id)
    await iniciarProducaoViaApi(request, token, segunda.id)
    await travarProducaoViaApi(request, token, segunda.id, 'Trava manual para o teste automatizado da tarefa 398.')
    await levarAteEmProducao(request, token, orcamento.id)

    await login(page)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Marcar como finalizado' }).click()

    const menor = Math.min(primeira.numero, segunda.numero)
    const maior = Math.max(primeira.numero, segunda.numero)
    const mensagem = page.getByText(/Produções PRD-\d+ \(.+\), PRD-\d+ \(.+\) ainda não foram finalizadas\./)
    await expect(mensagem).toBeVisible()
    const texto = (await mensagem.textContent()) ?? ''
    expect(texto.indexOf(`PRD-${menor}`)).toBeLessThan(texto.indexOf(`PRD-${maior}`))
    expect((await buscarOrcamento(request, token, orcamento.id)).status).toBe('EM_PRODUCAO')
  })
})
