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

async function adicionarItemAvulsoUI(page, nomeProduto, quantidade) {
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
  await page.getByText(nomeProduto, { exact: true }).click();
  for (let i = 1; i < quantidade; i++) await page.getByRole('button', { name: '+', exact: true }).click();
}

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    // --- Cenário 207 — aviso inline + checkpoint pré-criação, sem modal pós-criação ---
    {
      const page = await browser.newPage();
      const nomeProduto = `QA189-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 5, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const nomeCliente = `QA189-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await adicionarItemAvulsoUI(page, nomeProduto, 10);

      await page.waitForTimeout(600);
      check('207: aviso inline "Estoque insuficiente" visível (qtd 10 > estoque 5)', await page.getByText('Estoque insuficiente', { exact: true }).isVisible().catch(() => false));

      await page.locator('input[type="number"][placeholder="10"]').fill('7');
      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();

      check('207: modal "Itens com estoque insuficiente" aparece', await page.getByText('Itens com estoque insuficiente').isVisible({ timeout: 5000 }).catch(() => false));
      check('207: modal mostra "disponível 5, necessário 10"', await page.getByText(/disponível 5, necessário 10/i).isVisible().catch(() => false));
      await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click();

      await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 }).catch(() => {});
      check('207: sem tela intermediária — vai direto ao Detalhe do Orçamento', /\/orcamentos\/[0-9a-f-]+$/.test(page.url()));
      const orcId = page.url().split('/orcamentos/')[1];
      if (orcId) orcamentoIds.push(orcId);
      await page.close();
    }

    // --- Cenário 208 — avisosEstoque no payload de POST /orcamentos, status RASCUNHO ---
    {
      const page = await browser.newPage();
      const nomeProduto = `QA190-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 5, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const nomeCliente = `QA190-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);

      let avisosEstoqueCapturado = null;
      page.on('response', (res) => {
        if (res.url().includes('/orcamentos') && res.request().method() === 'POST') {
          res.json().then((body) => { avisosEstoqueCapturado = body.avisosEstoque; }).catch(() => {});
        }
      });

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await adicionarItemAvulsoUI(page, nomeProduto, 10);
      await page.waitForTimeout(600);
      await page.locator('input[type="number"][placeholder="10"]').fill('7');
      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();

      check('208: modal de checkpoint aparece antes do POST', await page.getByText('Itens com estoque insuficiente').isVisible({ timeout: 5000 }).catch(() => false));
      await page.getByRole('button', { name: 'Continuar mesmo assim', exact: true }).click();
      await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 }).catch(() => {});
      check('208: vai direto ao Detalhe (sem modal pós-criação)', /\/orcamentos\/[0-9a-f-]+$/.test(page.url()));

      await page.waitForTimeout(500);
      const esperado = avisosEstoqueCapturado && avisosEstoqueCapturado.length === 1
        && avisosEstoqueCapturado[0].nomeProduto === nomeProduto
        && avisosEstoqueCapturado[0].estoqueAtual === 5
        && avisosEstoqueCapturado[0].quantidadeNecessaria === 10;
      check('208: avisosEstoque do POST tem o item correto (nome/estoqueAtual/quantidadeNecessaria)', !!esperado);

      const orcId = page.url().split('/orcamentos/')[1];
      if (orcId) {
        orcamentoIds.push(orcId);
        const orcApi = await api(`/orcamentos/${orcId}`, token);
        check('208: orçamento persistido como RASCUNHO', orcApi.body.status === 'RASCUNHO');
      } else {
        check('208: orçamento persistido como RASCUNHO', false);
      }
      await page.close();
    }

    // --- RN-052 ampliada — modal de confirmação ao finalizar com estoque negativo ---
    {
      const page = await browser.newPage();
      const nomeProduto = `QA-RN052-Orc-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 5, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const nomeCliente = `QA-RN052-Orc-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);

      const orcRes = await api('/orcamentos', token, {
        method: 'POST',
        body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, margemAplicada: 50, precoUnitario: 20, quantidade: 10 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }),
      });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);

      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      const emProducaoRes = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      check('RN-052: orçamento avançou para EM_PRODUCAO via API', emProducaoRes.body.status === 'EM_PRODUCAO');

      const errosRuntime = [];
      page.on('pageerror', (err) => errosRuntime.push(err.message));

      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Marcar como finalizado', exact: true }).click();

      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      check('RN-052: modal de confirmação mostra "Estoque insuficiente"', await dialog.getByText('Estoque insuficiente').isVisible().catch(() => false));
      check('RN-052: modal mostra o nome do produto', await dialog.getByText(new RegExp(nomeProduto)).isVisible().catch(() => false));

      const orcAntes = await api(`/orcamentos/${orcamento.id}`, token);
      check('RN-052: ainda EM_PRODUCAO antes de confirmar (não persistido silenciosamente)', orcAntes.body.status === 'EM_PRODUCAO');

      await page.getByRole('button', { name: 'Confirmar mesmo assim', exact: true }).click();
      const fechou = await dialog.waitFor({ state: 'hidden', timeout: 8000 }).then(() => true).catch(() => false);
      check('RN-052: modal fecha após confirmar', fechou);

      let orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      for (let i = 0; i < 10 && orcDepois.body.status !== 'FINALIZADO'; i++) {
        await new Promise((r) => setTimeout(r, 300));
        orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      }
      check('RN-052: status avançou para FINALIZADO', orcDepois.body.status === 'FINALIZADO');
      check('RN-052: nenhum erro de runtime JS na página', errosRuntime.length === 0);
      await page.close();
    }
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO validacao-estoque (re-executado como script avulso) ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
