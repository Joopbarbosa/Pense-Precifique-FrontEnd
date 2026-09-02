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

  const insumoRes = await api('/insumos', token, { method: 'POST', body: JSON.stringify({
    nome: `QA375-Insumo-${Date.now()}`, unidadeMedida: 'UN', precoTotalCompraInicial: 100, quantidadeCompradaInicial: 1000, fracionavel: true, permitirEstoqueNegativo: true,
  }) });
  const insumoId = insumoRes.body.id;

  const nomeProduto = `QA375-Prod-${Date.now()}`;
  const produtoRes = await api('/produtos', token, { method: 'POST', body: JSON.stringify({
    nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 30, rendimento: 1, precoVenda: 10, estoqueAtual: 2, permitirEstoqueNegativo: true,
    fichaTecnica: [{ insumoId, quantidade: 1 }],
  }) });
  const produtoId = produtoRes.body.id;

  const nomeCliente = `QA375-Cliente-${Date.now()}`;
  const clienteRes = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente, telefone: '11999990000' }) });

  const browser = await chromium.launch();

  try {
    // ---------- Cenário A: checkpoint em modo CRIAÇÃO — persiste + cria produção vinculada só com o item selecionado ----------
    {
      const page = await browser.newPage();
      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Não', exact: true }).first().click();

      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();

      // estoque 2, sobe pra 5 -> falta 3
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(600);

      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
      await page.waitForSelector('text=Itens com estoque insuficiente', { timeout: 5000 });

      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /^Criar produção \(1\)/ }).click();

      // Mini-modal próprio deve abrir (não navega direto pra /producao/nova)
      await page.waitForSelector('text=Criar produção', { timeout: 5000 });
      check('A1: mini-modal "Criar produção" abre (não navega direto)', page.url().includes('/orcamentos/novo'));

      await page.locator('label:has-text("Término previsto") input[type="date"]').fill('2026-12-01');
      await page.getByRole('button', { name: 'Criar produção', exact: true }).click();

      await page.waitForURL(/\/orcamentos\/[0-9a-f-]{36}$/, { timeout: 8000 });
      const orcId = page.url().split('/orcamentos/')[1];
      check('A2: navegou de volta para /orcamentos/{id} após sucesso (RN-NOVA-14 ponto 1)', /^[0-9a-f-]{36}$/.test(orcId));

      const orcCheck = await api(`/orcamentos/${orcId}`, token);
      check('A3: orçamento foi persistido de verdade (GET 200)', orcCheck.status === 200);
      check('A4: orçamento tem 1 produção vinculada', (orcCheck.body.producoesVinculadas || []).length === 1);

      const producaoId = orcCheck.body.producoesVinculadas[0].producaoId;
      const prodCheck = await api(`/producoes/${producaoId}`, token);
      check('A5: produção criada cobre só o item selecionado (produtoIds subset)', prodCheck.body.produtos.length === 1 && prodCheck.body.produtos[0].nomeProduto === nomeProduto);

      await page.close();
    }

    // ---------- Cenário B: badge na Listagem e no Kanban de Produção ----------
    {
      const page = await browser.newPage();
      await loginUI(page);
      await page.goto(`${APP_URL}/producao`);
      await page.waitForTimeout(1000);
      const badgeLista = await page.getByText('Tem orçamento vinculado').first().isVisible().catch(() => false);
      check('B1: badge "Tem orçamento vinculado" visível na Listagem', badgeLista);

      await page.getByRole('button', { name: 'Kanban' }).click().catch(() => {});
      await page.waitForTimeout(1000);
      const badgeKanban = await page.getByText('Orçamento vinculado').first().isVisible().catch(() => false);
      check('B2: badge "Orçamento vinculado" visível no Kanban', badgeKanban);

      await page.close();
    }

    // ---------- Cenário C: checkpoint em modo EDIÇÃO — PUT antes de criar produção ----------
    {
      // cria um orçamento em rascunho direto via API pra editar
      const produtoRes2 = await api('/produtos', token, { method: 'POST', body: JSON.stringify({
        nome: `${nomeProduto}-Edit`, tipo: 'PRODUTO', tempoProducao: 30, rendimento: 1, precoVenda: 10, estoqueAtual: 1, permitirEstoqueNegativo: true,
        fichaTecnica: [{ insumoId, quantidade: 1 }],
      }) });
      const produtoIdEdit = produtoRes2.body.id;
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({
        clienteId: clienteRes.body.id,
        itens: [{ produtoId: produtoIdEdit, precoUnitario: 10, quantidade: 1, customizacoes: [] }],
        metodoPagamento: 'PIX', temPrazoProducao: false, inicioAssimQueAprovado: true, sinalAtivo: false,
      }) });
      const orcIdEdit = orcRes.body.id;

      const page = await browser.newPage();
      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/${orcIdEdit}/editar`);
      await page.waitForSelector('text=Editar Orçamento', { timeout: 8000 });

      // sobe quantidade além do estoque (1) pra disparar o checkpoint
      await page.waitForTimeout(600);
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(600);

      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await page.waitForSelector('text=Itens com estoque insuficiente', { timeout: 5000 });

      // "Vincular produção existente" não deve aparecer em modo edição (comportamento preservado)
      const vincularExistenteVisivel = await page.getByRole('button', { name: 'Vincular produção existente' }).isVisible().catch(() => false);
      check('C1: "Vincular produção existente" continua oculto em edição (P-F007 preservado)', !vincularExistenteVisivel);

      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /^Criar produção \(1\)/ }).click();
      await page.waitForSelector('text=Criar produção', { timeout: 5000 });

      await page.locator('label:has-text("Término previsto") input[type="date"]').fill('2026-12-15');
      await page.getByRole('button', { name: 'Criar produção', exact: true }).click();

      await page.waitForURL(new RegExp(`/orcamentos/${orcIdEdit}$`), { timeout: 8000 });
      check('C2: edição navega de volta para /orcamentos/{id} (mesmo id, não um novo)', page.url().endsWith(`/orcamentos/${orcIdEdit}`));

      const orcEditCheck = await api(`/orcamentos/${orcIdEdit}`, token);
      check('C3: PUT persistiu a alteração de quantidade (item com quantidade 5)', orcEditCheck.body.itens[0].quantidade === 5);
      check('C4: produção vinculada criada em modo edição', (orcEditCheck.body.producoesVinculadas || []).length === 1);

      await page.close();
    }

    // ---------- Cenário D: falha de persistência (POST /orcamentos) — toast, sem navegar ----------
    {
      const page = await browser.newPage();
      await loginUI(page);
      await page.route('**/orcamentos', route => {
        if (route.request().method() === 'POST') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Falha simulada QA375' }) });
        return route.continue();
      });

      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Não', exact: true }).first().click();

      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(600);

      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
      await page.waitForSelector('text=Itens com estoque insuficiente', { timeout: 5000 });
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /^Criar produção \(1\)/ }).click();
      await page.waitForSelector('text=Criar produção', { timeout: 5000 });

      await page.locator('label:has-text("Término previsto") input[type="date"]').fill('2026-12-01');
      await page.getByRole('button', { name: 'Criar produção', exact: true }).click();

      // extractApiError usa a mensagem real do backend (err.response.data.message) quando presente,
      // só cai no fallback genérico se o corpo de erro não tiver .message.
      const toastVisivel = await page.getByText('Falha simulada QA375').isVisible({ timeout: 5000 }).catch(() => false);
      check('D1: toast de erro aparece com a mensagem real do backend quando o POST /orcamentos falha', toastVisivel);
      check('D2: continua em /orcamentos/novo, sem navegar em falha de persistência', page.url().includes('/orcamentos/novo'));

      await page.unroute('**/orcamentos');
      await page.close();
    }

    // ---------- Cenário E: cancelar o mini-modal ANTES de persistir — não navega, preserva rascunho ----------
    {
      const page = await browser.newPage();
      await loginUI(page);
      await page.goto(`${APP_URL}/orcamentos/novo`);
      await selecionarClienteUI(page, nomeCliente);
      await page.getByRole('button', { name: 'Não', exact: true }).first().click();

      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+', exact: true }).click();
      await page.waitForTimeout(600);

      await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
      await page.waitForSelector('text=Itens com estoque insuficiente', { timeout: 5000 });
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: /^Criar produção \(1\)/ }).click();
      await page.waitForSelector('text=Criar produção', { timeout: 5000 });

      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.waitForTimeout(500);
      check('E1: cancelar antes de persistir mantém a artesã em /orcamentos/novo (rascunho preservado)', page.url().includes('/orcamentos/novo'));
      check('E2: item continua na lista após cancelar (rascunho em memória intacto)', await page.getByText(nomeProduto, { exact: true }).first().isVisible());

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${results.pass.length} PASS, ${results.fail.length} FAIL`);
  if (results.fail.length > 0) {
    console.log('Falhas:', results.fail);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
