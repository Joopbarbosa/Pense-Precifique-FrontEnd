import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin, inativarInsumo } from '../helpers/api'
import { baixaManualInsumo, criarInsumoComEstoque } from '../helpers/insumo'
import { criarProdutoComFicha, criarProducaoEmAndamento, inativarProduto, teardownProducoes } from '../helpers/producao'

/**
 * Cenário 229 — Motivo de saída no histórico de movimentação de Insumo (#195)
 *
 * Cobre os 6 motivos de saída alcançáveis via fluxo real: PRODUCAO (automática, ao iniciar uma
 * produção que consome o insumo) e PERDA/AVARIA/USO_EXTRA/CORRECAO/OUTRO (via baixa manual) —
 * com foco em USO_EXTRA e AVARIA, que caíam no fallback quebrado antes da correção do backend
 * (commit 81d6546, #148: InsumoService.baixaManual() gravava tudo como BAIXA_MANUAL hardcoded).
 *
 * ORCAMENTO (7º motivo do enum) não é exercitado aqui — nenhum fluxo real (API ou UI) grava
 * MovimentacaoInsumo com esse motivo (ver nota do Cenário 229 em docs/SCENARIOS.md).
 */
test.describe('Cenário 229 — Motivo de saída no histórico de Insumo (#195)', () => {
  let insumoId: string
  let produtoId: string
  let producaoId: string

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeInsumo = `E2E MotivoSaida ${Date.now()}`
    const insumo = await criarInsumoComEstoque(request, token, nomeInsumo, 100, true)
    insumoId = insumo.id

    const obs = (motivo: string) => `Baixa de teste E2E QA-229 para o motivo ${motivo} — homologação #195.`
    await baixaManualInsumo(request, token, insumoId, 'PERDA', 1, obs('PERDA'))
    await baixaManualInsumo(request, token, insumoId, 'AVARIA', 1, obs('AVARIA'))
    await baixaManualInsumo(request, token, insumoId, 'USO_EXTRA', 1, obs('USO_EXTRA'))
    await baixaManualInsumo(request, token, insumoId, 'CORRECAO', 1, obs('CORRECAO'))
    await baixaManualInsumo(request, token, insumoId, 'OUTRO', 1, obs('OUTRO'))

    const produto = await criarProdutoComFicha(request, token, `E2E Produto MotivoSaida ${Date.now()}`, [
      { insumoId, quantidade: 2 },
    ])
    produtoId = produto.id
    const producao = await criarProducaoEmAndamento(request, token, [{ produtoId, quantidade: 1 }])
    producaoId = producao.id

    await login(page)
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    await teardownProducoes(request, token, [producaoId])
    await inativarProduto(request, token, produtoId)
    await inativarInsumo(request, token, insumoId)
  })

  test('histórico exibe texto legível para todos os motivos de saída alcançáveis, sem fallback de enum cru', async ({ page }) => {
    await page.goto(`/insumos/${insumoId}`)

    // HistRows renderiza a linha desktop e o card mobile no mesmo map (só um fica visível por
    // CSS, ambos existem no DOM) — .first() pega a ocorrência, mesmo padrão de
    // insumo-desativar-confirmacao.spec.ts.
    await expect(page.getByText('Saída — Produção', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Saída — Perda', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Saída — Avaria', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Saída — Uso extra', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Saída — Correção de estoque', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Saída — Outro', { exact: true }).first()).toBeVisible()

    // regressão específica do fallback quebrado: nunca mostrar o nome cru do enum
    await expect(page.getByText('Saída — USO_EXTRA', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Saída — AVARIA', { exact: true })).toHaveCount(0)
  })
})
