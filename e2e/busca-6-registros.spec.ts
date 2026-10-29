import { expect, test, type Locator } from '@playwright/test'
import { E2E_API_URL } from './helpers/target'
import { apiLogin, criarInsumo, inativarInsumo } from './helpers/api'
import { login } from './helpers/auth'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from './helpers/orcamento'
import { criarInsumoComEstoque } from './helpers/insumo'
import {
  criarProdutoComFicha,
  criarProdutoComFichaEEstoque,
  criarProducaoViaApi,
  inativarProduto,
  teardownProducoes,
} from './helpers/producao'

const API_URL = E2E_API_URL

async function conferirSeisLinhasVisiveis(painel: Locator) {
  await expect(painel).toBeVisible()
  await expect.poll(() => painel.locator('[data-search-row]').count()).toBeGreaterThanOrEqual(6)

  await expect.poll(() => painel.evaluate(el => {
    const linhas = [...el.querySelectorAll<HTMLElement>('[data-search-row]')]
    const painelBox = el.getBoundingClientRect()
    const primeirasSeisDentro = linhas.slice(0, 6).every(linha => linha.getBoundingClientRect().bottom <= painelBox.bottom + 1)
    const setimaFora = linhas[6] ? linhas[6].getBoundingClientRect().top >= painelBox.bottom - 1 : false
    return primeirasSeisDentro && setimaFora && el.scrollHeight > el.clientHeight && el.scrollTop === 0
  })).toBe(true)
}

test('CEN-NOVO-160 — Registrar compra, Nova produção e vínculo exibem 6 registros sem rolar', async ({ page, request }) => {
  const token = await apiLogin(request)
  const sufixo = Date.now()
  const insumos: string[] = []
  const produtos: string[] = []
  const producoes: string[] = []
  let clienteId: string | undefined

  try {
    const insumoBase = await criarInsumoComEstoque(request, token, `QA322-Insumo-${sufixo}-00`, 1000)
    insumos.push(insumoBase.id)
    for (let i = 1; i < 15; i++) {
      const insumo = await criarInsumo(request, token, `QA322-Insumo-${sufixo}-${String(i).padStart(2, '0')}`)
      insumos.push(insumo.id)
    }

    const produtoBase = await criarProdutoComFichaEEstoque(
      request, token, `QA322-Produto-${sufixo}-00`, [{ insumoId: insumoBase.id, quantidade: 1 }], 3,
    )
    produtos.push(produtoBase.id)
    for (let i = 1; i < 12; i++) {
      const produto = await criarProdutoComFicha(
        request, token, `QA322-Produto-${sufixo}-${String(i).padStart(2, '0')}`,
        [{ insumoId: insumoBase.id, quantidade: 1 }],
      )
      produtos.push(produto.id)
    }

    for (let i = 0; i < 10; i++) {
      const producao = await criarProducaoViaApi(request, token, [{ produtoId: produtoBase.id, quantidade: 1 }])
      producoes.push(producao.id)
    }

    const cliente = await criarCliente(request, token, `QA322-Cliente-${sufixo}`)
    clienteId = cliente.id

    await login(page)
    await page.goto('/compras/nova')
    await page.getByPlaceholder('Adicionar insumo à compra…').click()
    await conferirSeisLinhasVisiveis(page.getByTestId('combo-busca-resultados'))

    await page.goto('/producao/nova')
    await page.getByPlaceholder('Buscar produto...').click()
    await conferirSeisLinhasVisiveis(page.getByTestId('busca-produtos-producao'))

    // #1107 — o vínculo sai da criação; a modal abre pelo detalhe do orçamento aprovado.
    const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
      [{ produtoId: produtoBase.id, precoUnitario: 20, margemAplicada: 50, quantidade: 5 }], { sinalAtivo: false })
    await avancarStatusViaApi(request, token, orcamento.id)
    await avancarStatusViaApi(request, token, orcamento.id)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Vincular produção', exact: true }).click()
    // Estoque insuficiente (precisa 5, tem 3): o aviso vem antes da escolha da produção.
    await page.getByRole('button', { name: 'OK, vincular produção', exact: true }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
    await conferirSeisLinhasVisiveis(page.getByTestId('producoes-disponiveis'))
  } finally {
    const tokenLimpeza = await apiLogin(request)
    await teardownProducoes(request, tokenLimpeza, producoes)
    for (const id of produtos) await inativarProduto(request, tokenLimpeza, id)
    for (const id of insumos) await inativarInsumo(request, tokenLimpeza, id)
    if (clienteId) await request.delete(`${API_URL}/clientes/${clienteId}`, { headers: { Authorization: `Bearer ${tokenLimpeza}` } }).catch(() => {})
  }
})
