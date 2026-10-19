import { test, expect } from '@playwright/test'
import { loginComoEmail, registrarEmpresaEfemera, TEST_SENHA } from '../helpers/auth'
import { criarInsumo } from '../helpers/api'
import { registrarCompraConfirmada } from '../helpers/compra'

/**
 * V0.17.0 #989 (RN-NOVA-29, CEN-NOVO-91 e 92): a evolução de preço aceita de 1 a 5 insumos, uma linha e uma cor por insumo,
 * legenda com a unidade, clique no ponto abre as compras do insumo no mês e o 6º insumo é bloqueado. Conta efêmera.
 */
test('V0.17.0 — #989 vários insumos: uma linha e uma cor por insumo, clique no ponto, cor fixa e limite de 5', async ({ page, request }) => {
  const { token, email } = await registrarEmpresaEfemera(request, 'evo989')
  const sufixo = Date.now()
  const nomes = ['Fita', 'Papel', 'Cola', 'Linha', 'Botão', 'Etiqueta'].map(n => `QA989-${n}-${sufixo}`)
  const insumos = []
  for (const nome of nomes) insumos.push(await criarInsumo(request, token, nome))
  // compras confirmadas no mês atual para os três primeiros (um ponto por insumo, com preços diferentes)
  for (const [i, precoTotal] of [[0, 20], [1, 30], [2, 40]] as const) {
    await registrarCompraConfirmada(request, token, [{ insumoId: insumos[i].id, quantidade: 10, precoTotal }])
  }

  await loginComoEmail(page, email, TEST_SENHA)
  await page.goto('/cadastros/dashboard')
  const painel = page.getByTestId('ind-evolucao-preco')
  // o seletor continua aberto depois de marcar um insumo (múltipla escolha): só abre se estiver fechado
  const marcar = async (nome: string) => {
    const botao = painel.getByRole('button', { name: /^Insumos \(/ })
    if ((await botao.getAttribute('aria-expanded')) !== 'true') await botao.click()
    await page.getByRole('listbox', { name: 'Insumos da evolução de preço' }).getByText(nome, { exact: true }).click()
  }

  // padrão: um insumo (o mais comprado no período); escolhe mais dois
  await expect(painel.getByRole('button', { name: /^Insumos \(1\/5\)/ })).toBeVisible({ timeout: 15_000 })
  for (const nome of nomes.slice(0, 3)) {
    const chip = painel.getByRole('button', { name: `Remover ${nome}` })
    if (!(await chip.count())) await marcar(nome)
  }
  await page.keyboard.press('Escape')
  await page.mouse.click(5, 5)
  await expect(painel.getByRole('button', { name: /^Insumos \(3\/5\)/ })).toBeVisible()

  // três linhas, cada uma com cor própria, e a legenda com a unidade
  await expect(painel.locator('.recharts-line')).toHaveCount(3)
  // cada insumo tem um só ponto (um mês): a cor da linha é a do contorno do ponto
  const traco = (n: number) => painel.locator(`[data-testid="ponto-${insumos[n].id}"]`).first().getAttribute('stroke')
  const cores = await Promise.all([0, 1, 2].map(traco))
  expect(new Set(cores).size).toBe(3)
  const legenda = painel.getByRole('list', { name: 'Legenda da evolução de preço' })
  for (const nome of nomes.slice(0, 3)) await expect(legenda).toContainText(nome)
  await expect(legenda).toContainText('(unidade)')

  // clique no ponto da primeira linha abre as compras só desse insumo
  await painel.locator(`[data-testid="ponto-${insumos[0].id}"]`).first().click()
  await expect(page.getByTestId('modal-listagem')).toBeVisible()
  await expect(page.getByTestId('modal-listagem')).toContainText(nomes[0])
  await expect(page.getByTestId('modal-listagem')).not.toContainText(nomes[1])
  await page.keyboard.press('Escape')

  // remover um insumo deixa duas linhas e não muda a cor dos outros
  const corPrimeiro = await traco(0)
  const corTerceiro = await traco(2)
  await painel.getByRole('button', { name: `Remover ${nomes[1]}` }).click()
  await expect(painel.locator('.recharts-line')).toHaveCount(2)
  expect(await traco(0)).toBe(corPrimeiro)
  expect(await traco(2)).toBe(corTerceiro)

  // CEN-NOVO-92: até 5; o 6º é bloqueado e as linhas continuam
  await marcar(nomes[1])
  await marcar(nomes[3])
  await marcar(nomes[4])
  await expect(painel.getByRole('button', { name: /^Insumos \(5\/5\)/ })).toBeVisible()
  await marcar(nomes[5])
  await expect(painel.getByRole('alert')).toHaveText('Escolha no máximo 5 insumos')
  await expect(painel.getByRole('button', { name: /^Insumos \(5\/5\)/ })).toBeVisible()
})
