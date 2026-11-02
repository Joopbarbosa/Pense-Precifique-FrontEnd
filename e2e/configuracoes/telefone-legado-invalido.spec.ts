import { execFileSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { API_URL, loginComoEmail, registrarEmpresaEfemera } from '../helpers/auth'

/** PP-702 — prepara telefone legado inválido diretamente no banco isolado do E2E. */
test('mantém telefone legado inválido ao salvar os outros dados do Perfil', async ({ page, request }) => {
  const { email, token, usuarioId } = await registrarEmpresaEfemera(request, 'pp702-telefone-legado')
  const container = process.env.DB_CONTAINER
  const banco = process.env.DB_NAME
  if (!container || !banco) throw new Error('Configure DB_CONTAINER e DB_NAME do banco E2E isolado.')

  await loginComoEmail(page, email, 'senha12345')
  execFileSync('docker', [
    'exec', container, 'psql', '-U', 'pense_user', '-d', banco,
    '-v', 'ON_ERROR_STOP=1', '-c',
    `UPDATE empresas SET whatsapp = '123' WHERE usuario_id = '${usuarioId}'::uuid`,
  ], { stdio: 'ignore' })
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Perfil da empresa' }).click()

  await expect(page.getByRole('status')).toContainText('O telefone salvo é antigo e inválido.')
  await page.getByLabel('Nome da empresa').fill('Ateliê PP-702 atualizado')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Configurações salvas com sucesso!')).toBeVisible()

  const resposta = await request.get(`${API_URL}/empresa`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(resposta.ok()).toBeTruthy()
  expect(await resposta.json()).toMatchObject({ nome: 'Ateliê PP-702 atualizado', whatsapp: '123' })
})
