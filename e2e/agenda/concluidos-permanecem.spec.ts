import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { hojeLocal } from '../helpers/data'
import { criarCliente, criarOrcamentoViaApi, avancarStatusViaApi } from '../helpers/orcamento'
import { criarProdutoComEstoque, inativarProduto } from '../helpers/producao'

/** #1157 (V0.18.0) — o concluído não some da Agenda: fica verde e riscado e entra no filtro "Somente concluídos". */
test.describe('#1157 — Concluídos permanecem na Agenda', () => {
  test('CT-1157-01 — validade de orçamento aprovado fica concluída e aparece só em "Somente concluídos" e "Todos"', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoComEstoque(request, token, `QA1157-Produto-${Date.now()}`, 100)
    try {
      const cliente = await criarCliente(request, token, `QA1157-Cliente-${Date.now()}`)
      const dia = hojeLocal(3)
      const orcamento = await criarOrcamentoViaApi(request, token, cliente.id,
        [{ produtoId: produto.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], { dataValidade: `${dia}T12:00:00` })
      await avancarStatusViaApi(request, token, orcamento.id) // ENVIADO
      await avancarStatusViaApi(request, token, orcamento.id) // APROVADO

      await login(page)
      await page.goto('/agenda')
      await page.getByRole('button', { name: 'Dia', exact: true }).click()
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próximo' }).click()
      const chip = page.getByTestId('compromisso').filter({ hasText: `Validade — ORC-${orcamento.numero}` })
      await expect(chip).toHaveAttribute('data-situacao', 'CONCLUIDO')

      await page.getByLabel('Mostrar').selectOption('CONCLUIDOS')
      await expect(chip).toHaveCount(1)
      await page.getByLabel('Mostrar').selectOption('PENDENTES')
      await expect(chip).toHaveCount(0)
    } finally {
      await inativarProduto(request, token, produto.id)
    }
  })
})
