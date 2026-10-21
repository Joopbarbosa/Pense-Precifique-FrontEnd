import { expect, test, type Locator } from '@playwright/test'
import { E2E_API_URL } from './helpers/target'
import { apiLogin, criarInsumo, inativarInsumo } from './helpers/api'
import { login } from './helpers/auth'
import { criarCliente, selecionarCliente, adicionarItemAvulso } from './helpers/orcamento'
import { criarInsumoComEstoque } from './helpers/insumo'
import {
  criarProdutoComFicha,
  criarProdutoComFichaEEstoque,
  criarProducaoViaApi,
  inativarProduto,
  teardownProducoes,
} from './helpers/producao'

const API_URL = E2E_API_URL

async function conferirOitoLinhasVisiveis(painel: Locator) {
  await expect(painel).toBeVisible()
  await expect.poll(() => painel.locator('[data-search-row]').count()).toBeGreaterThanOrEqual(8)

  await expect.poll(() => painel.evaluate(el => {
    const linhas = [...el.querySelectorAll<HTMLElement>('[data-search-row]')]
    const painelBox = el.getBoundingClientRect()
    const primeirasOitoDentro = linhas.slice(0, 8).every(linha => linha.getBoundingClientRect().bottom <= painelBox.bottom + 1)
    const nonaFora = linhas[8] ? linhas[8].getBoundingClientRect().top >= painelBox.bottom - 1 : false
    return primeirasOitoDentro && nonaFora && el.scrollHeight > el.clientHeight && el.scrollTop === 0
  })).toBe(true)
}

test('CEN-NOVO-70 — Registrar compra, Nova produção e vínculo exibem 8 registros sem rolar', async ({ page, request }) => {
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
    await conferirOitoLinhasVisiveis(page.getByTestId('combo-busca-resultados'))

    await page.goto('/producao/nova')
    await page.getByPlaceholder('Buscar produto...').click()
    await conferirOitoLinhasVisiveis(page.getByTestId('busca-produtos-producao'))

    await page.goto('/orcamentos/novo')
    await selecionarCliente(page, cliente.nome)
    await adicionarItemAvulso(page, produtoBase.nome, 5)
    await page.getByRole('button', { name: 'Não', exact: true }).first().click()
    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click()
    await expect(page.getByText('Itens com estoque insuficiente')).toBeVisible()
    await page.getByRole('button', { name: /Vincular produção existente/ }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
    await conferirOitoLinhasVisiveis(page.getByTestId('producoes-disponiveis'))
  } finally {
    const tokenLimpeza = await apiLogin(request)
    await teardownProducoes(request, tokenLimpeza, producoes)
    for (const id of produtos) await inativarProduto(request, tokenLimpeza, id)
    for (const id of insumos) await inativarInsumo(request, tokenLimpeza, id)
    if (clienteId) await request.delete(`${API_URL}/clientes/${clienteId}`, { headers: { Authorization: `Bearer ${tokenLimpeza}` } }).catch(() => {})
  }
})
