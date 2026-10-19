import { test, expect, type Page } from '@playwright/test'
import { registrarEmpresaEfemera, loginComoEmail, API_URL } from './helpers/auth'
import { getConfiguracao } from './helpers/api'

/**
 * V0.17.0 #983 — Configurações com um único "Salvar alterações" e aviso ao sair sem salvar
 * (RN-NOVA-28, CEN-NOVO-82..85). Conta efêmera (o onboarding grava valor da hora R$ 25,00,
 * margem 40% e o nome "Ateliê E2E"), para nunca alterar a conta fixa dos outros specs.
 */

const campoHora = (page: Page) => page.locator('input').first()
const campoNome = (page: Page) => page.getByPlaceholder('Nome do seu ateliê ou negócio')
const campoTelefone = (page: Page) => page.getByPlaceholder('(00) 00000-0000')
const irParaClientes = (page: Page) => page.getByRole('link', { name: 'Clientes e Fornecedores' }).click()

async function entrar(page: Page, request: Parameters<typeof registrarEmpresaEfemera>[0], prefixo: string) {
  const { email, token } = await registrarEmpresaEfemera(request, prefixo)
  await loginComoEmail(page, email, 'senha12345')
  await page.goto('/configuracoes')
  await expect(campoHora(page)).toHaveValue('25,00')
  return token
}

test.describe('#983 — Configurações: um só salvar e aviso de saída', () => {
  test('CEN-NOVO-82: um só botão salva Precificação e Perfil de uma vez', async ({ page, request }) => {
    await entrar(page, request, 'cfg-unico')
    await expect(page.getByText('Tudo salvo')).toBeVisible()

    await campoHora(page).fill('30,00')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await campoNome(page).fill('Ateliê Ana Souza')

    await expect(page.getByText('Você tem alterações não salvas')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()
    await expect(page.getByText('Tudo salvo')).toBeVisible()

    await page.reload()
    await expect(campoHora(page)).toHaveValue('30,00')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await expect(campoNome(page)).toHaveValue('Ateliê Ana Souza')
  })

  test('CEN-NOVO-84: trocar de aba não pergunta e mantém a alteração pendente', async ({ page, request }) => {
    await entrar(page, request, 'cfg-aba')
    await campoHora(page).fill('30,00')

    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()
    await page.getByRole('button', { name: 'Precificação' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(campoHora(page)).toHaveValue('30,00')
    await expect(page.getByText('Você tem alterações não salvas')).toBeVisible()
  })

  test('CEN-NOVO-83: sair com alteração pendente abre a modal com a lista e as três escolhas', async ({ page, request }) => {
    await entrar(page, request, 'cfg-sair')
    await campoHora(page).fill('30,00')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await campoNome(page).fill('Ateliê Ana Souza')

    await irParaClientes(page)
    const modal = page.getByRole('dialog')
    await expect(modal.getByText('Alterações não salvas')).toBeVisible()
    const lista = modal.getByTestId('lista-alteracoes')
    await expect(lista).toContainText(/Valor da hora:\s*R\$\s*25,00\s*→\s*R\$\s*30,00/)
    await expect(lista).toContainText(/Nome da empresa:\s*Ateliê E2E\s*→\s*Ateliê Ana Souza/)

    // Continuar editando: fica na tela, alterações intactas
    await modal.getByRole('button', { name: 'Continuar editando' }).click()
    await expect(page).toHaveURL(/\/configuracoes/)
    await expect(campoNome(page)).toHaveValue('Ateliê Ana Souza')

    // Sair sem salvar: descarta tudo
    await irParaClientes(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Sair sem salvar' }).click()
    await expect(page).toHaveURL(/\/clientes/)
    await page.goto('/configuracoes')
    await expect(campoHora(page)).toHaveValue('25,00')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await expect(campoNome(page)).toHaveValue('Ateliê E2E')

    // Salvar e sair: grava e sai
    await page.getByRole('button', { name: 'Precificação' }).click()
    await campoHora(page).fill('30,00')
    await irParaClientes(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar e sair' }).click()
    await expect(page).toHaveURL(/\/clientes/)
    await page.goto('/configuracoes')
    await expect(campoHora(page)).toHaveValue('30,00')
  })

  test('CEN-NOVO-85: "Salvar e sair" com telefone inválido bloqueia a saída e não grava nada', async ({ page, request }) => {
    const token = await entrar(page, request, 'cfg-invalido')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await campoTelefone(page).fill('(11) 1234')
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()

    await irParaClientes(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar e sair' }).click()

    await expect(page.getByTestId('modal-erro')).toContainText('Telefone inválido')
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    await expect(page).toHaveURL(/\/configuracoes/)
    const empresa = await (await request.get(`${API_URL}/empresa`, { headers: { Authorization: `Bearer ${token}` } })).json()
    expect(empresa.whatsapp ?? '').not.toContain('1234')

    await irParaClientes(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Sair sem salvar' }).click()
    await expect(page).toHaveURL(/\/clientes/)
  })

  test('falha parcial: o que gravou fica salvo, o que falhou continua pendente e a modal cita a aba', async ({ page, request }) => {
    const token = await entrar(page, request, 'cfg-parcial')
    await page.route('**/empresa', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Falha simulada no perfil.' }) })
      } else {
        route.continue()
      }
    })

    await campoHora(page).fill('33,00')
    await page.getByRole('button', { name: 'Perfil da empresa' }).click()
    await campoNome(page).fill('Ateliê Parcial')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByTestId('modal-erro')).toContainText('Perfil da empresa: Falha simulada no perfil.')
    await page.getByRole('button', { name: 'OK', exact: true }).click()

    expect((await getConfiguracao(request, token)).valorHora).toBe(33)
    await expect(page.getByText('Você tem alterações não salvas')).toBeVisible()
    await expect(campoNome(page)).toHaveValue('Ateliê Parcial')
  })

  test('método de pagamento alterado entra na lista de alterações da modal de saída', async ({ page, request }) => {
    await entrar(page, request, 'cfg-metodo')
    await page.getByRole('button', { name: 'Métodos de Pagamento' }).click()
    const linhaPix = page.getByText('Pix', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-input")]')
    await linhaPix.getByRole('button', { name: 'Não' }).click()

    await irParaClientes(page)
    await expect(page.getByTestId('lista-alteracoes')).toContainText(/Pix — Ativo:\s*Sim\s*→\s*Não/)
    await page.getByRole('dialog').getByRole('button', { name: 'Sair sem salvar' }).click()
    await expect(page).toHaveURL(/\/clientes/)
  })

  test('Sair da conta com alteração pendente também pergunta antes de encerrar a sessão', async ({ page, request }) => {
    await entrar(page, request, 'cfg-logout')
    await campoHora(page).fill('31,00')

    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByText('Alterações não salvas')).toBeVisible()

    await modal.getByRole('button', { name: 'Continuar editando' }).click()
    await expect(page).toHaveURL(/\/configuracoes/)
    await expect(campoHora(page)).toHaveValue('31,00')

    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sair sem salvar' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
