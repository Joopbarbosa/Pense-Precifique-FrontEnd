import { expect, test, type Locator } from '@playwright/test'
import { E2E_API_URL } from './helpers/target'
import { apiLogin, criarInsumo, inativarInsumo } from './helpers/api'
import { apiAbrirTurno, apiCriarProdutoComEstoque, apiFecharTurnoSeAberto } from './helpers/caixa'
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
  const clientes: Array<{ id: string; nome: string }> = []

  try {
    const insumoBase = await criarInsumoComEstoque(request, token, `QA1195-Insumo-${sufixo}-00`, 1000)
    insumos.push(insumoBase.id)
    for (let i = 1; i < 15; i++) {
      const insumo = await criarInsumo(request, token, `QA1195-Insumo-${sufixo}-${String(i).padStart(2, '0')}`)
      insumos.push(insumo.id)
    }

    const produtoBase = await criarProdutoComFichaEEstoque(
      request, token, `QA1195-Produto-${sufixo}-00`, [{ insumoId: insumoBase.id, quantidade: 1 }], 3,
    )
    produtos.push(produtoBase.id)
    for (let i = 1; i < 12; i++) {
      const produto = await criarProdutoComFicha(
        request, token, `QA1195-Produto-${sufixo}-${String(i).padStart(2, '0')}`,
        [{ insumoId: insumoBase.id, quantidade: 1 }],
      )
      produtos.push(produto.id)
    }

    for (let i = 0; i < 10; i++) {
      const producao = await criarProducaoViaApi(request, token, [{ produtoId: produtoBase.id, quantidade: 1 }])
      producoes.push(producao.id)
    }

    for (let i = 0; i < 10; i++) {
      clientes.push(await criarCliente(request, token, `QA1195-Cliente-${sufixo}-${String(i + 1).padStart(2, '0')}`))
    }

    await login(page)
    await page.goto('/compras/nova')
    await page.getByPlaceholder('Adicionar insumo à compra…').click()
    await conferirSeisLinhasVisiveis(page.getByTestId('combo-busca-resultados'))

    await page.goto('/producao/nova')
    await page.getByPlaceholder('Buscar produto...').click()
    await conferirSeisLinhasVisiveis(page.getByTestId('busca-produtos-producao'))

    // #1107 — o vínculo sai da criação; a modal abre pelo detalhe do orçamento aprovado.
    const orcamento = await criarOrcamentoViaApi(request, token, clientes[0].id,
      [{ produtoId: produtoBase.id, precoUnitario: 20, margemAplicada: 50, quantidade: 5 }], { sinalAtivo: false })
    await avancarStatusViaApi(request, token, orcamento.id)
    await avancarStatusViaApi(request, token, orcamento.id)
    await page.goto(`/orcamentos/${orcamento.id}`)
    await page.getByRole('button', { name: 'Vincular produção', exact: true }).click()
    // Estoque insuficiente (precisa 5, tem 3): o aviso vem antes da escolha da produção.
    await page.getByRole('button', { name: 'OK, vincular produção', exact: true }).click()
    await expect(page.getByText('Escolha uma produção aguardando início')).toBeVisible()
    await conferirSeisLinhasVisiveis(page.getByTestId('producoes-disponiveis'))

    await page.goto('/orcamentos/novo')
    const buscaCliente = page.getByPlaceholder('Selecionar cliente...')
    await buscaCliente.click()
    const linhasCliente = page.locator('[data-search-row]')
    await expect.poll(() => linhasCliente.count()).toBe(10)
    const painelCliente = linhasCliente.first().locator('xpath=..')
    await conferirSeisLinhasVisiveis(painelCliente)
    await painelCliente.evaluate(el => { el.scrollTop = el.scrollHeight })
    await expect(linhasCliente.filter({ hasText: clientes[9].nome })).toBeVisible()
  } finally {
    const tokenLimpeza = await apiLogin(request)
    await teardownProducoes(request, tokenLimpeza, producoes)
    for (const id of produtos) await inativarProduto(request, tokenLimpeza, id)
    for (const id of insumos) await inativarInsumo(request, tokenLimpeza, id)
    for (const cliente of clientes) await request.delete(`${API_URL}/clientes/${cliente.id}`, { headers: { Authorization: `Bearer ${tokenLimpeza}` } }).catch(() => {})
  }
})

/** Painel do buscador: ancestral mais próximo com rolagem vertical de uma linha de resultado. */
function painelDoBuscador(page: import('@playwright/test').Page) {
  return page.locator('[data-search-row]').first().locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " overflow-y-auto ")][1]')
}

/** Rolar até o fim do painel deve trazer para dentro da área visível um registro que não está entre os 6 primeiros. */
async function conferirRolagemAlcanca(painel: Locator, nome: string) {
  await painel.evaluate(el => { el.scrollTop = el.scrollHeight })
  await expect.poll(() => painel.evaluate((el, alvoNome) => {
    const alvo = [...el.querySelectorAll<HTMLElement>('[data-search-row]')].find(linha => linha.textContent?.includes(alvoNome))
    if (!alvo) return false
    const caixa = el.getBoundingClientRect()
    const r = alvo.getBoundingClientRect()
    return r.top >= caixa.top - 1 && r.bottom <= caixa.bottom + 1
  }, nome)).toBe(true)
}

test('CEN-NOVO-160 — Item de venda do Caixa exibe 6 registros sem rolar', async ({ page, request }) => {
  const token = await apiLogin(request)
  const sufixo = Date.now()
  const produtos: string[] = []

  try {
    await apiAbrirTurno(request, token, 100)
    for (let i = 1; i <= 10; i++) {
      const produto = await apiCriarProdutoComEstoque(
        request, token, `QA1195-Caixa-${sufixo}-${String(i).padStart(2, '0')}`, 20, 10, true,
      )
      produtos.push(produto.id)
    }

    await login(page)
    await page.goto('/caixa')
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
    const busca = page.getByPlaceholder('Buscar produto ou item de catálogo...')
    await busca.click()
    await conferirSeisLinhasVisiveis(painelDoBuscador(page))

    await busca.fill(`QA1195-Caixa-${sufixo}`)
    await expect.poll(() => page.locator('[data-search-row]').count()).toBe(10)
    const painel = painelDoBuscador(page)
    await conferirSeisLinhasVisiveis(painel)
    await conferirRolagemAlcanca(painel, `QA1195-Caixa-${sufixo}-10`)
  } finally {
    const tokenLimpeza = await apiLogin(request)
    for (const id of produtos) await inativarProduto(request, tokenLimpeza, id)
    await apiFecharTurnoSeAberto(request, tokenLimpeza)
  }
})

test('CEN-NOVO-160 — Insumo da ficha técnica exibe 6 registros sem rolar', async ({ page, request }) => {
  const token = await apiLogin(request)
  const sufixo = Date.now()
  const insumos: string[] = []

  try {
    for (let i = 1; i <= 10; i++) {
      const insumo = await criarInsumo(request, token, `QA1195-Ficha-${sufixo}-${String(i).padStart(2, '0')}`)
      insumos.push(insumo.id)
    }

    await login(page)
    await page.goto('/produtos/novo')
    await page.getByPlaceholder('Ex: Kit Convite Casamento').fill(`QA1195-Produto-${sufixo}`)
    await page.getByPlaceholder('45').fill('30')
    await page.getByRole('button', { name: 'Próximo: Ficha Técnica' }).click()
    const busca = page.getByPlaceholder('Buscar insumo ou produto...')
    await busca.click()
    await conferirSeisLinhasVisiveis(painelDoBuscador(page))

    await busca.fill(`QA1195-Ficha-${sufixo}`)
    await expect.poll(() => page.locator('[data-search-row]').count()).toBe(10)
    const painel = painelDoBuscador(page)
    await conferirSeisLinhasVisiveis(painel)
    await conferirRolagemAlcanca(painel, `QA1195-Ficha-${sufixo}-10`)
  } finally {
    const tokenLimpeza = await apiLogin(request)
    for (const id of insumos) await inativarInsumo(request, tokenLimpeza, id)
  }
})
