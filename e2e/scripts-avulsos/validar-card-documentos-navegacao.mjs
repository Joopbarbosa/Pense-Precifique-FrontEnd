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

// CEN-NOVO-20 — card "Documentos" (DownloadsCard, P-F013): botões aparecem só quando aplicável
// (por status/flag) e navegam para a rota de preview correta. Gap confirmado no Passo 0: nenhum
// spec testava a lógica de gate (visibilidade condicional) dos 4 botões, só a navegação isolada
// de um por vez em specs de outro propósito (numero-sem-padding).
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    const nomeProduto = `QACEN20-Produto-${Date.now()}`;
    const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(p.body.id);

    // --- Caso A: RASCUNHO recém-criado, sem sinal — só "PDF do orçamento" deve aparecer ---
    {
      const nomeCliente = `QACEN20-ClienteRascunho-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }) });
      orcamentoIds.push(orcRes.body.id);

      await page.goto(`${APP_URL}/orcamentos/${orcRes.body.id}`);
      await page.getByRole('heading', { name: 'Documentos', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
      check('caso A (RASCUNHO, sem sinal): "Baixar PDF do orçamento" visível', await page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true }).waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false));
      check('caso A: "Recibo do sinal" NÃO aparece', (await page.getByRole('button', { name: 'Recibo do sinal', exact: true }).count()) === 0);
      check('caso A: "Recibo de pagamento" NÃO aparece', (await page.getByRole('button', { name: 'Recibo de pagamento', exact: true }).count()) === 0);
      check('caso A: "PDF de multa" NÃO aparece', (await page.getByRole('button', { name: 'PDF de multa', exact: true }).count()) === 0);
      check('caso A: "Recibo de estorno" NÃO aparece', (await page.getByRole('button', { name: 'Recibo de estorno', exact: true }).count()) === 0);
    }

    // --- Caso B: PAGO com sinal — "Recibo do sinal" + "Recibo de pagamento" navegam certo ---
    {
      const nomeCliente = `QACEN20-ClientePago-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: true, percentualSinal: 30 }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // PAGO

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('heading', { name: 'Documentos', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
      check('caso B (PAGO): "PDF do orçamento" continua presente (status PAGO≠CANCELADO)', await page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true }).waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false));
      await page.getByRole('button', { name: 'Recibo do sinal', exact: true }).click();
      check('caso B: "Recibo do sinal" navega para /recibo-sinal', page.url().endsWith(`/orcamentos/${orcamento.id}/recibo-sinal`));

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('heading', { name: 'Documentos', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Recibo de pagamento', exact: true }).click();
      check('caso B: "Recibo de pagamento" navega para /recibo-pagamento', page.url().endsWith(`/orcamentos/${orcamento.id}/recibo-pagamento`));
    }

    // --- Caso C: CANCELADO com multa — "PDF do orçamento" some, "PDF de multa" navega certo ---
    {
      const nomeCliente = `QACEN20-ClienteMulta-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 50, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // EM_PRODUCAO
      await api(`/orcamentos/${orcamento.id}/cancelar`, token, { method: 'POST', body: JSON.stringify({ percentualMulta: 50 }) });

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('heading', { name: 'Documentos', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
      check('caso C (CANCELADO): "PDF do orçamento" some', (await page.getByRole('button', { name: 'Baixar PDF do orçamento', exact: true }).count()) === 0);
      await page.getByRole('button', { name: 'PDF de multa', exact: true }).click();
      check('caso C: "PDF de multa" navega para /multa', page.url().endsWith(`/orcamentos/${orcamento.id}/multa`));
    }

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO card-documentos-navegacao ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
