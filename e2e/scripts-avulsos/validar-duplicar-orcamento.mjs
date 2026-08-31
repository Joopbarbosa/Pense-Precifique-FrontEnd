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

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;

  const cliente = (await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: `QA314-Cliente-${Date.now()}` }) })).body;
  const produto = (await api('/produtos?size=1&tipo=PRODUTO', token)).body.content[0];

  // ── Fixture 1: orçamento comum em RASCUNHO (fluxo feliz) ──────────────────────────────
  const orcamento = (await api('/orcamentos', token, {
    method: 'POST',
    body: JSON.stringify({
      clienteId: cliente.id,
      metodoPagamento: 'PIX',
      temPrazoProducao: false,
      inicioAssimQueAprovado: true,
      sinalAtivo: false,
      tipoDesconto: 'PERCENTUAL',
      descontoValor: 0,
      itens: [{ produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 2 }],
    }),
  })).body;
  console.log('Orçamento base criado:', orcamento.id, 'numero', orcamento.numero);

  // ── Fixture 2: orçamento com sinal por valor direto (caso antes bloqueado, P-B021) ────
  const orcamentoSinalDireto = (await api('/orcamentos', token, {
    method: 'POST',
    body: JSON.stringify({
      clienteId: cliente.id,
      metodoPagamento: 'PIX',
      temPrazoProducao: false,
      inicioAssimQueAprovado: true,
      sinalAtivo: true,
      valorSinal: 12.5,
      tipoDesconto: 'PERCENTUAL',
      descontoValor: 0,
      itens: [{ produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 }],
    }),
  })).body;
  console.log('Orçamento (sinal valor direto) criado:', orcamentoSinalDireto.id, 'valorSinal:', orcamentoSinalDireto.valorSinal);

  // ── Fixture 3: orçamento avançado até ENVIADO, para testar Duplicar fora de RASCUNHO ──
  const orcamentoEnviado = (await api('/orcamentos', token, {
    method: 'POST',
    body: JSON.stringify({
      clienteId: cliente.id,
      metodoPagamento: 'PIX',
      temPrazoProducao: false,
      inicioAssimQueAprovado: true,
      sinalAtivo: false,
      tipoDesconto: 'PERCENTUAL',
      descontoValor: 0,
      itens: [{ produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 }],
    }),
  })).body;
  await api(`/orcamentos/${orcamentoEnviado.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({}) });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await loginUI(page);

    // ── Teste 1: botão Duplicar visível e funcional em RASCUNHO ────────────────────────
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
    await page.waitForLoadState('networkidle');
    check('Botão Duplicar visível em RASCUNHO', await page.getByRole('button', { name: 'Duplicar' }).isVisible());

    await page.getByRole('button', { name: 'Duplicar' }).click();
    // Navega direto para o Detalhe do orçamento novo (sem modal de confirmação).
    await page.waitForURL(new RegExp(`/orcamentos/(?!${orcamento.id})[a-f0-9-]+$`), { timeout: 10000 });
    const urlDuplicado1 = page.url();
    const idDuplicado1 = urlDuplicado1.split('/orcamentos/')[1];
    check('Navegou direto para o Detalhe do orçamento novo (sem modal)', idDuplicado1 !== orcamento.id);

    const detalheDuplicado1 = (await api(`/orcamentos/${idDuplicado1}`, token)).body;
    check('Orçamento duplicado nasce em RASCUNHO', detalheDuplicado1.status === 'RASCUNHO');
    check('Orçamento duplicado tem número sequencial diferente do original', detalheDuplicado1.numero !== orcamento.numero);
    check('Itens copiados corretamente', detalheDuplicado1.itens.length === 1 && detalheDuplicado1.itens[0].quantidade === 2);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 5000 }).catch(() => {});
    check('Tela de Detalhe do duplicado carrega sem erro visual', await page.getByRole('heading', { level: 1 }).isVisible());

    // ── Teste 2: Duplicar com sinal por valor direto (caso antes bloqueado, P-B021) ────
    await page.goto(`${APP_URL}/orcamentos/${orcamentoSinalDireto.id}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Duplicar' }).click();
    await page.waitForURL(new RegExp(`/orcamentos/(?!${orcamentoSinalDireto.id})[a-f0-9-]+$`), { timeout: 10000 });
    const idDuplicadoSinal = page.url().split('/orcamentos/')[1];
    const detalheDuplicadoSinal = (await api(`/orcamentos/${idDuplicadoSinal}`, token)).body;
    check('Duplicar com sinal por valor direto NÃO falha mais (P-B021)', detalheDuplicadoSinal.sinalAtivo === true);
    check('valorSinal copiado corretamente (12.5)', detalheDuplicadoSinal.valorSinal === 12.5);
    await page.waitForLoadState('networkidle');
    const erroVisivel = await page.getByText(/Quando o sinal está ativo/i).isVisible().catch(() => false);
    check('Nenhum erro de validação de sinal exibido na tela', !erroVisivel);

    // ── Teste 3: Duplicar disponível fora de RASCUNHO (ENVIADO) ────────────────────────
    await page.goto(`${APP_URL}/orcamentos/${orcamentoEnviado.id}`);
    await page.waitForLoadState('networkidle');
    check('Botão Duplicar visível mesmo em ENVIADO (sem restrição de status)', await page.getByRole('button', { name: 'Duplicar' }).isVisible());
    check('Botão Editar NÃO aparece em ENVIADO (contraste — Duplicar não tem essa restrição)', !(await page.getByRole('button', { name: 'Editar' }).isVisible().catch(() => false)));

    await page.getByRole('button', { name: 'Duplicar' }).click();
    await page.waitForURL(new RegExp(`/orcamentos/(?!${orcamentoEnviado.id})[a-f0-9-]+$`), { timeout: 10000 });
    const idDuplicado3 = page.url().split('/orcamentos/')[1];
    const detalheDuplicado3 = (await api(`/orcamentos/${idDuplicado3}`, token)).body;
    check('Duplicar de orçamento ENVIADO gera novo RASCUNHO independente', detalheDuplicado3.status === 'RASCUNHO');

    // ── Teste 4: erro herdado de criar() tratado com mensagem clara (cliente excluído) ──
    const clienteTemp = (await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: `QA314-Excluido-${Date.now()}` }) })).body;
    const orcamentoClienteExcluido = (await api('/orcamentos', token, {
      method: 'POST',
      body: JSON.stringify({
        clienteId: clienteTemp.id,
        metodoPagamento: 'PIX',
        temPrazoProducao: false,
        inicioAssimQueAprovado: true,
        sinalAtivo: false,
        tipoDesconto: 'PERCENTUAL',
        descontoValor: 0,
        itens: [{ produtoId: produto.id, precoUnitario: produto.precoVenda, margemAplicada: 0, quantidade: 1 }],
      }),
    })).body;
    await api(`/clientes/${clienteTemp.id}`, token, { method: 'DELETE' });

    await page.goto(`${APP_URL}/orcamentos/${orcamentoClienteExcluido.id}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Duplicar' }).click();
    await page.waitForTimeout(1500);
    check('Permanece na tela do orçamento original (não navegou) após erro', page.url().includes(orcamentoClienteExcluido.id));
    const toastErroCliente = await page.getByText('Cliente não encontrado').isVisible().catch(() => false);
    check('Toast com mensagem clara do erro herdado de criar() (cliente excluído)', toastErroCliente);

  } finally {
    await browser.close();
  }

  console.log(`\n${results.pass.length} passaram, ${results.fail.length} falharam.`);
  if (results.fail.length > 0) {
    console.log('FALHAS:', results.fail);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
