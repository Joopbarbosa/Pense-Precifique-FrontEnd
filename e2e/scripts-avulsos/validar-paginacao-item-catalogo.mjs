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

// Espelha e2e/orcamento/busca-listagem-item-catalogo.spec.ts — RN-NOVA-18/CEN-NOVO-19.
async function rodar(browser, token, run) {
  const ts = `${Date.now()}-${run}`;
  const catRes = await api('/catalogos', token, { method: 'POST', body: JSON.stringify({ nome: `QA-217c-Catalogo-${ts}` }) });
  const catalogo = catRes.body;
  if (!catalogo.id) { console.log('FALHA setup catalogo:', JSON.stringify(catRes)); return false; }

  const nomes = Array.from({ length: 10 }, (_, i) => `QA-217c-Item-${ts}-${String(i + 1).padStart(2, '0')}`);
  const produtoIds = [];
  for (const nome of nomes) {
    const pRes = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome, tipo: 'PRODUTO', tempoProducao: 10, fichaTecnica: [] }) });
    if (!pRes.body.id) { console.log('FALHA setup produto:', JSON.stringify(pRes)); return false; }
    produtoIds.push(pRes.body.id);
    const iRes = await api(`/catalogos/${catalogo.id}/itens`, token, { method: 'POST', body: JSON.stringify({ produtoId: pRes.body.id, quantidadePacote: 1, precoVenda: 10 }) });
    if (!iRes.body.id) { console.log('FALHA setup item catalogo:', JSON.stringify(iRes)); return false; }
  }

  const cRes = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: `QA-217c-Cliente-${ts}` }) });
  const cliente = cRes.body;

  const page = await browser.newPage();
  const erros = [];
  page.on('pageerror', err => erros.push(err.message));
  page.on('response', async res => {
    if (res.status() >= 400) {
      let body = ''; try { body = await res.text(); } catch {}
      console.log(`  >> ${res.request().method()} ${res.url()} -> ${res.status()}: ${body}`);
    }
  });

  await loginUI(page);
  await page.goto(`${APP_URL}/orcamentos/novo`);
  await page.getByPlaceholder('Selecionar cliente...').fill(cliente.nome);
  await page.getByText(cliente.nome, { exact: true }).click();
  await page.getByRole('button', { name: 'Catálogo' }).click();
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();

  const dropdown = page.locator('div.animate-pop');
  await dropdown.waitFor({ state: 'visible' });
  const buttons = dropdown.getByRole('button').filter({ hasText: `QA-217c-Item-${ts}` });

  await page.waitForTimeout(600); // debounce inicial (300ms) + fetch
  const countPagina1 = await buttons.count();
  check(`run${run} A1: 8 itens na primeira página (achou ${countPagina1})`, countPagina1 === 8);
  check(`run${run} A2: item 09 ainda NÃO no DOM`, await page.getByText(`QA-217c-Item-${ts}-09`).count() === 0);
  check(`run${run} A3: item 10 ainda NÃO no DOM`, await page.getByText(`QA-217c-Item-${ts}-10`).count() === 0);

  const carregarMais = page.getByRole('button', { name: 'Carregar mais', exact: true });
  check(`run${run} A4: botão "Carregar mais" visível`, await carregarMais.isVisible().catch(() => false));

  await carregarMais.click();
  await page.waitForTimeout(800);

  const countPagina2 = await buttons.count();
  check(`run${run} A5: 10 itens após "Carregar mais" (achou ${countPagina2})`, countPagina2 === 10);
  check(`run${run} A6: "Carregar mais" some (hasMore=false)`, await carregarMais.count() === 0);
  check(`run${run} A7: sem erro de runtime`, erros.length === 0);

  // teardown
  await api(`/catalogos/${catalogo.id}/desativar`, token, { method: 'POST' }).catch(() => {});
  for (const id of produtoIds) await api(`/produtos/${id}/inativar`, token, { method: 'POST' }).catch(() => {});

  await page.close();
  return results.fail.length === 0;
}

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const browser = await chromium.launch();
  try {
    await rodar(browser, token, 1);
    await rodar(browser, token, 2);
  } finally {
    await browser.close();
  }
  console.log(`\n${results.pass.length} PASS, ${results.fail.length} FAIL`);
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch(err => { console.error(err); process.exit(1); });
