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

// CEN-NOVO-22 — busca de cliente (server-side, #243) em Novo Orçamento (ClienteSelect). Gap
// confirmado no Passo 0: implementado (CriarOrcamentoPage.tsx, clienteService.listar com busca +
// debounce 300ms, mesmo padrão de ItemSearch/ORC-029), mas sem cenário BDD nem E2E — só a busca de
// item de catálogo tem cobertura (ORC-CEN-059/060/061).
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const clienteIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    const sufixo = Date.now();
    const nomeAlvo = `QACEN22-Maria-${sufixo}`;
    const nomeOutro = `QACEN22-Joana-${sufixo}`;
    const cAlvo = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeAlvo }) });
    clienteIds.push(cAlvo.body.id);
    const cOutro = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeOutro }) });
    clienteIds.push(cOutro.body.id);

    await page.goto(`${APP_URL}/orcamentos/novo`);
    const campoCliente = page.getByPlaceholder('Selecionar cliente...');

    // Foco sem digitar — listagem completa aparece (mesmo padrão de ItemSearch, #243).
    await campoCliente.click();
    await page.waitForTimeout(400);
    check('foco sem digitar: listagem de clientes aparece (painel de resultados visível)', await page.getByText(nomeAlvo, { exact: true }).first().isVisible().catch(() => false));

    // Digita um termo específico — busca server-side filtra para só o cliente alvo.
    await campoCliente.fill(`QACEN22-Maria-${sufixo}`);
    await page.waitForTimeout(500);
    check('busca por "Maria": cliente alvo aparece', await page.getByText(nomeAlvo, { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false));
    check('busca por "Maria": cliente "Joana" (outro) NÃO aparece', (await page.getByText(nomeOutro, { exact: true }).count()) === 0);

    // Seleciona o cliente — input de busca some, vira card com nome + botão "Trocar".
    await page.getByText(nomeAlvo, { exact: true }).click();
    check('após selecionar: card do cliente selecionado exibe o nome', await page.getByText(nomeAlvo, { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false));
    check('após selecionar: input de busca desaparece', (await page.getByPlaceholder('Selecionar cliente...').count()) === 0);
    check('após selecionar: botão "Trocar" aparece', await page.getByRole('button', { name: 'Trocar', exact: true }).isVisible({ timeout: 3000 }).catch(() => false));

    await page.close();
  } finally {
    await browser.close();
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO busca-cliente-orcamento ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
