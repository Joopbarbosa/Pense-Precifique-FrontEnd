import { chromium } from 'playwright';

const API_URL = 'http://localhost:8080';
const APP_URL = 'http://localhost:3000';
const TEST_EMAIL = 'penseprecifique@admin.com';
const TEST_SENHA = 'senha12345';

async function api(path, token, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const results = { pass: [], fail: [] };
const check = (desc, cond) => {
  if (cond) { results.pass.push(desc); console.log('PASS -', desc); }
  else { results.fail.push(desc); console.log('FAIL -', desc); }
};

async function loginUI(page) {
  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('seuemail@email.com').fill(TEST_EMAIL);
  await page.getByPlaceholder('Sua senha').fill(TEST_SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function selecionarClienteUI(page, nome) {
  await page.getByPlaceholder('Selecionar cliente...').fill(nome);
  await page.getByText(nome, { exact: true }).click();
}

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const insumoIds = [];
  const browser = await chromium.launch();

  try {
    // --- CEN-NOVO-17: adicionar item com estoque insuficiente nunca bloqueia, mesmo permitirEstoqueNegativo=false ---
    {
      const page = await browser.newPage();
      const nomeProduto = `QA218-SemBloqueio-${Date.now()}`;
      const produtoRes = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 0, permitirEstoqueNegativo: false, fichaTecnica: [] }) });
      produtoIds.push(produtoRes.body.id);
      const nomeCliente = `QA218-Cliente-062-${Date.now()}`;
      const clienteRes = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(clienteRes.body.id);

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();

      const itemVisivel = await page.getByText(nomeProduto, { exact: true }).isVisible().catch(() => false);
      const toastBloqueio = await page.getByText(/Estoque insuficiente para adicionar/i).count();
      check('CEN-NOVO-17: item entra na lista mesmo com permitirEstoqueNegativo=false e estoque 0', itemVisivel);
      check('CEN-NOVO-17: nenhum toast de bloqueio aparece', toastBloqueio === 0);
      await page.close();
    }

    // --- CEN-NOVO-15/17: tag de aviso inline aparece, independente de permitirEstoqueNegativo ---
    {
      const page = await browser.newPage();
      const nomeProduto = `QA218-Aviso-${Date.now()}`;
      const produtoRes = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 2, permitirEstoqueNegativo: true, fichaTecnica: [] }) });
      produtoIds.push(produtoRes.body.id);
      const nomeCliente = `QA218-Cliente-063-${Date.now()}`;
      const clienteRes = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(clienteRes.body.id);

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();

      await page.waitForTimeout(300);
      const semAvisoInicial = await page.getByText('Estoque insuficiente', { exact: true }).count();
      check('ORC-CEN-063: sem aviso quando qtd (1) <= estoque (2)', semAvisoInicial === 0);

      await page.getByRole('button', { name: '+', exact: true }).click();
      await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(700);
      const avisoAparece = await page.getByText('Estoque insuficiente', { exact: true }).isVisible().catch(() => false);
      check('ORC-CEN-063: aviso inline aparece ao subir qtd (3) acima do estoque (2)', avisoAparece);
      await page.close();
    }

    // --- CEN-NOVO-16: modal de checkpoint com checkbox + "Criar produção" em lote via router state ---
    {
      const page = await browser.newPage();
      const insumoRes = await api('/insumos', token, { method: 'POST', body: JSON.stringify({ nome: `QA218-Insumo-${Date.now()}`, unidadeMedida: 'unidade', fracionavel: true, tipoExibicaoQuantidade: 'DECIMAL', estoqueMinimo: 0.1, precoTotalCompraInicial: 1000, quantidadeCompradaInicial: 100, permitirEstoqueNegativo: false }) });
      insumoIds.push(insumoRes.body.id);
      const nomeProduto = `QA218-Modal-${Date.now()}`;
      const produtoRes = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, rendimento: 1, fichaTecnica: [{ insumoId: insumoRes.body.id, quantidade: 1 }], estoqueAtual: 2 }) });
      produtoIds.push(produtoRes.body.id);
      const nomeCliente = `QA218-Cliente-064-${Date.now()}`;
      const clienteRes = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(clienteRes.body.id);

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();

      // quantidade 5, estoque 2 -> falta 3 (stepper, não o campo de prazo).
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(600);
      const modalAntes = await page.getByText('Itens com estoque insuficiente').count();
      check('CEN-NOVO-16: modal de checkpoint não aparece antes de clicar Criar orçamento', modalAntes === 0);
      // Campo de prazo (placeholder "10") é obrigatório para habilitar "Criar orçamento".
      await page.locator('input[type="number"][placeholder="10"]').fill('5');

      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
      const modalDepois = await page.getByText('Itens com estoque insuficiente').isVisible({ timeout: 5000 }).catch(() => false);
      check('CEN-NOVO-16: modal de checkpoint aparece ao clicar Criar orçamento', modalDepois);

      const criarProducaoBtn = page.getByRole('button', { name: /^Criar produção/, exact: false });
      const desabilitadoSemSelecao = await criarProducaoBtn.isDisabled().catch(() => null);
      check('CEN-NOVO-16: botão Criar produção desabilitado sem seleção', desabilitadoSemSelecao === true);

      await page.getByRole('checkbox').check();
      const habilitadoComSelecao = await criarProducaoBtn.isEnabled().catch(() => null);
      check('CEN-NOVO-16: botão Criar produção habilitado após marcar checkbox', habilitadoComSelecao === true);

      await criarProducaoBtn.click();
      await page.waitForURL(/\/producao\/nova$/, { timeout: 5000 }).catch(() => {});
      const urlSemQuery = page.url().endsWith('/producao/nova');
      check('CEN-NOVO-16: navega para /producao/nova SEM query string (via router state, não ?produtoId=)', urlSemQuery);
      await page.close();
    }
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of insumoIds) if (id) await api(`/insumos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO bloqueio-aviso-estoque (re-executado como script avulso) ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
