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

// CEN-NOVO-21 — ordenação de colunas na Lista de Orçamentos (#255, implementado, sem BDD nem E2E
// confirmado no Passo 0). Testa clicar no cabeçalho "Total" (via ?sort= no backend) e "Cliente"
// (campo aninhado cliente.nome), alternando asc/desc.
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    // 3 clientes com nomes ordenáveis (prefixo comum + sufixo A/B/C) e totais distintos, todos
    // criados agora (timestamp único evita colisão com massa histórica na 1ª página ordenada).
    const sufixo = Date.now();
    const nomes = [`ZZOrdenacao-C-${sufixo}`, `ZZOrdenacao-A-${sufixo}`, `ZZOrdenacao-B-${sufixo}`];
    const precos = [300, 100, 200];
    const produto = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: `QACEN21-Produto-${sufixo}`, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(produto.body.id);

    for (let i = 0; i < nomes.length; i++) {
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomes[i] }) });
      clienteIds.push(c.body.id);
      const orc = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: produto.body.id, precoUnitario: precos[i], margemAplicada: 0, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }) });
      orcamentoIds.push(orc.body.id);
    }

    await page.goto(`${APP_URL}/orcamentos`);
    await page.getByPlaceholder('Buscar por cliente ou número…').fill('ZZOrdenacao');
    await page.waitForTimeout(500);

    // Ordenar por "Total" ascendente — clique 1.
    await page.getByRole('button', { name: 'Total', exact: true }).click();
    await page.waitForTimeout(500);
    let linhas = await page.locator('[class*="grid"]:has-text("ZZOrdenacao")').allTextContents().catch(() => []);
    const ordemAsc = nomes
      .map((_, i) => i)
      .sort((a, b) => precos[a] - precos[b])
      .map((i) => nomes[i]);
    const textoTela = (await page.locator('body').innerText());
    const indices = ordemAsc.map((n) => textoTela.indexOf(n));
    check('Total asc: ordem dos 3 clientes por preço crescente', indices[0] < indices[1] && indices[1] < indices[2]);

    // Clique 2 no mesmo cabeçalho — inverte para desc.
    await page.getByRole('button', { name: 'Total', exact: true }).click();
    await page.waitForTimeout(500);
    const textoTela2 = (await page.locator('body').innerText());
    const ordemDesc = [...ordemAsc].reverse();
    const indices2 = ordemDesc.map((n) => textoTela2.indexOf(n));
    check('Total desc: ordem inverte para preço decrescente', indices2[0] < indices2[1] && indices2[1] < indices2[2]);

    // Ordenar por "Cliente" ascendente (alfabético: A, B, C).
    await page.getByRole('button', { name: 'Cliente', exact: true }).click();
    await page.waitForTimeout(500);
    const textoTela3 = (await page.locator('body').innerText());
    const nomesAlfabeticos = [...nomes].sort();
    const indices3 = nomesAlfabeticos.map((n) => textoTela3.indexOf(n));
    check('Cliente asc: ordem alfabética (A, B, C)', indices3[0] < indices3[1] && indices3[1] < indices3[2]);

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO ordenacao-colunas ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
