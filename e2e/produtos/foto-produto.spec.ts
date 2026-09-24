import { test, expect } from '@playwright/test'
import { login } from '../helpers/auth'
import { apiLogin } from '../helpers/api'
import { criarProdutoSemFicha, inativarProduto } from '../helpers/producao'

/**
 * #531 (V0.14.0) — upload de foto do Produto na aba "Dados Básicos" (`CadastrarProdutoPage.tsx`,
 * componente `FotoProduto`), endpoint `POST/DELETE /produtos/{id}/foto`. Mesmo padrão (e mesmo
 * `ValidadorArquivoImagem` compartilhado) do Item de Catálogo — `e2e/catalogo-foto-descricao-pdf.spec.ts`
 * já cobre esse padrão lá; aqui é o 1º E2E do fluxo em Produto. Mensagens confirmadas em
 * `ValidadorArquivoImagem.java` (backend): "Só são aceitos arquivos JPG ou PNG." (formato) e
 * "Arquivo muito grande. O tamanho máximo permitido é 5MB." (tamanho) — a validação do backend é
 * só por `Content-Type` do multipart + `size`, não inspeciona os bytes da imagem, por isso os
 * testes de formato/tamanho podem usar um buffer qualquer com o mimetype certo (mesma técnica já
 * usada em `catalogo-foto-descricao-pdf.spec.ts`).
 */
test.describe('#531 — Foto do Produto (CEN-NOVO-3/4/5)', () => {
  let criadosProdutoIds: string[] = []

  test.beforeEach(() => {
    criadosProdutoIds = []
  })

  test.afterEach(async ({ request }) => {
    const token = await apiLogin(request)
    for (const id of criadosProdutoIds) await inativarProduto(request, token, id)
  })

  test('CEN-NOVO-3 — arquivo com formato inválido (.pdf) é bloqueado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoSemFicha(request, token, `QA531-3-Produto-${Date.now()}`)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('nao e uma imagem'),
    })

    await expect(page.getByText('Só são aceitos arquivos JPG ou PNG.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    const produtoDepois = await (await request.get(`http://localhost:8080/produtos/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.fotoUrl).toBeFalsy()
  })

  test('CEN-NOVO-4 — arquivo acima de 5MB é bloqueado', async ({ page, request }) => {
    const token = await apiLogin(request)
    const produto = await criarProdutoSemFicha(request, token, `QA531-4-Produto-${Date.now()}`)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    const seisMegabytes = Buffer.alloc(6 * 1024 * 1024, 1)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'foto-grande.png',
      mimeType: 'image/png',
      buffer: seisMegabytes,
    })

    await expect(page.getByText('Arquivo muito grande. O tamanho máximo permitido é 5MB.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    const produtoDepois = await (await request.get(`http://localhost:8080/produtos/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.fotoUrl).toBeFalsy()
  })

  test('CEN-NOVO-5 — upload válido aparece no card da listagem de Produtos', async ({ page, request }) => {
    const token = await apiLogin(request)
    const nomeProduto = `QA531-5-Produto-${Date.now()}`
    const produto = await criarProdutoSemFicha(request, token, nomeProduto)
    criadosProdutoIds.push(produto.id)

    await login(page)
    await page.goto(`/produtos/${produto.id}/editar`)
    await expect(page.getByText('Adicionar foto')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from('conteudo-de-teste-nao-e-uma-imagem-real'),
    })

    await expect(page.getByRole('button', { name: 'Remover foto' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Adicionar foto')).toHaveCount(0)

    const produtoDepois = await (await request.get(`http://localhost:8080/produtos/${produto.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json()
    expect(produtoDepois.fotoUrl).toBeTruthy()

    await page.goto('/produtos')
    await page.getByPlaceholder('Buscar por nome...').fill(nomeProduto)
    await expect(page.getByRole('img', { name: nomeProduto })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Sem foto')).toHaveCount(0)
  })
})
