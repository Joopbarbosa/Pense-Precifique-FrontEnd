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

async function criarOrcamentoComNumeroDeDoisDigitos(token, clienteId, produtoId, overrides = {}) {
  let ultimo = null;
  for (let i = 0; i < 15; i++) {
    const res = await api('/orcamentos', token, {
      method: 'POST',
      body: JSON.stringify({ clienteId, itens: [{ produtoId, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false, ...overrides }),
    });
    ultimo = res.body;
    if (ultimo.numero >= 10) return ultimo;
  }
  throw new Error('não alcançou número de 2 dígitos');
}

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const nomeProduto = `QA237-Produto-${Date.now()}`;
    const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(p.body.id);

    // --- Cenário 237 ---
    {
      const nomeClientePago = `QA237-ClientePago-${Date.now()}`;
      const cp = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeClientePago }) });
      clienteIds.push(cp.body.id);
      const orcamentoPago = await criarOrcamentoComNumeroDeDoisDigitos(token, cp.body.id, p.body.id, { sinalAtivo: true, percentualSinal: 30 });
      orcamentoIds.push(orcamentoPago.id);
      check('237 setup: numero >= 10', orcamentoPago.numero >= 10);

      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // AGUARDANDO_SINAL
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // SINAL_PAGO
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // EM_PRODUCAO
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // FINALIZADO
      await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENTREGUE
      const resPago = await api(`/orcamentos/${orcamentoPago.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // PAGO
      check('237 setup: chegou em PAGO', resPago.body.status === 'PAGO');

      const numeroPuro = `#${orcamentoPago.numero}`;
      const numeroPadded = `#${String(orcamentoPago.numero).padStart(4, '0')}`;

      await loginUI(page);

      await page.goto(`${APP_URL}/orcamentos/${orcamentoPago.id}/preview`);
      const previewFrame = page.frameLocator('iframe[title="Preview do orçamento"]');
      check('237: preview (iframe) mostra número puro', await previewFrame.getByText(numeroPuro, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false));
      check('237: preview NÃO mostra número com zero-padding', (await previewFrame.getByText(numeroPadded, { exact: true }).count()) === 0);

      // NOTA (achado desta auditoria): recibo-sinal/recibo-pagamento/multa migraram para o padrão
      // de iframe (épico #248, mesmo pocket) DEPOIS que numero-sem-padding.spec.ts foi escrito —
      // o spec original usa page.getByText direto (sem frameLocator), que não alcança mais o
      // conteúdo real. Corrigido aqui para usar frameLocator, mesmo padrão já usado para "preview".
      await page.goto(`${APP_URL}/orcamentos/${orcamentoPago.id}/recibo-sinal`);
      const reciboSinalFrame = page.frameLocator('iframe[title="Preview do recibo do sinal"]');
      check('237: recibo-sinal (iframe) mostra número puro', await reciboSinalFrame.getByText(numeroPuro, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
      check('237: recibo-sinal (iframe) NÃO mostra zero-padding', (await reciboSinalFrame.getByText(numeroPadded, { exact: true }).count()) === 0);

      await page.goto(`${APP_URL}/orcamentos/${orcamentoPago.id}/recibo-pagamento`);
      const reciboPagamentoFrame = page.frameLocator('iframe[title="Preview do recibo de pagamento"]');
      check('237: recibo-pagamento (iframe) mostra número puro', await reciboPagamentoFrame.getByText(numeroPuro, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
      check('237: recibo-pagamento (iframe) NÃO mostra zero-padding', (await reciboPagamentoFrame.getByText(numeroPadded, { exact: true }).count()) === 0);

      // P-T002 — achado adicional (mesmo bug, segunda causa): "Detalhes financeiros" não existe
      // mais desde #248 (seção atual é SecaoStatus, título "Pedido quitado"); a classe Tailwind
      // `text-success` também nunca existiria aqui (microsserviço de PDF é CSS-in-JS puro, sem
      // Tailwind). Checagem real: cor aplicada via style inline, COLORS.success = #1F8A5B.
      const tituloStatusPagamento = reciboPagamentoFrame.getByText('Pedido quitado', { exact: true });
      check('237: recibo-pagamento (iframe) título "Pedido quitado" visível', await tituloStatusPagamento.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false));
      const corIconeStatus = await tituloStatusPagamento.first().locator('..').locator('span').first().evaluate((el) => getComputedStyle(el).color).catch(() => null);
      check('237: ícone do status é verde (rgb(31, 138, 91)), não teal', corIconeStatus === 'rgb(31, 138, 91)');

      const nomeClienteCancelado = `QA237-ClienteCancelado-${Date.now()}`;
      const cc = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeClienteCancelado }) });
      clienteIds.push(cc.body.id);
      const orcamentoCancelado = await criarOrcamentoComNumeroDeDoisDigitos(token, cc.body.id, p.body.id);
      orcamentoIds.push(orcamentoCancelado.id);
      await api(`/orcamentos/${orcamentoCancelado.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamentoCancelado.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamentoCancelado.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      const resCancelado = await api(`/orcamentos/${orcamentoCancelado.id}/cancelar`, token, { method: 'POST', body: JSON.stringify({ percentualMulta: 50, motivoCancelamento: 'Cliente desistiu da encomenda' }) });
      check('237 setup: cancelamento com multa OK', resCancelado.status === 200);

      const numeroPuroCancelado = `#${orcamentoCancelado.numero}`;
      const numeroPaddedCancelado = `#${String(orcamentoCancelado.numero).padStart(4, '0')}`;
      await page.goto(`${APP_URL}/orcamentos/${orcamentoCancelado.id}/multa`);
      const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]');
      check('237: multa (iframe) mostra número puro', await multaFrame.getByText(numeroPuroCancelado, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false));
      check('237: multa (iframe) NÃO mostra zero-padding', (await multaFrame.getByText(numeroPaddedCancelado, { exact: true }).count()) === 0);
    }

    // --- Cenário 238 ---
    {
      const nomeCliente = `QA238-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const orcamento = await criarOrcamentoComNumeroDeDoisDigitos(token, c.body.id, p.body.id, { sinalAtivo: true, percentualSinal: 30 });
      orcamentoIds.push(orcamento.id);

      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' });
      const resSinalPago = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) });
      check('238 setup: chegou em SINAL_PAGO', resSinalPago.body.status === 'SINAL_PAGO');

      const numeroPuro = `#${orcamento.numero}`;
      const numeroPadded = `#${String(orcamento.numero).padStart(4, '0')}`;

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      const h1 = page.getByRole('heading', { level: 1 });
      check('238: H1 contém número puro', (await h1.textContent().catch(() => ''))?.includes(numeroPuro) ?? false);
      check('238: H1/página não mostra zero-padding', (await page.getByText(numeroPadded).count()) === 0);

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      check('238: wizard "Estornar sinal para" visível', await page.getByText(/Estornar sinal para/).isVisible({ timeout: 5000 }).catch(() => false));
      await page.getByRole('button', { name: 'Próximo →', exact: true }).click();

      check('238: "Confirmar estorno do sinal" visível no Passo 2', await page.getByText('Confirmar estorno do sinal', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false));
      check('238: resumo do Passo 2 mostra número puro', await page.getByText(numeroPuro, { exact: true }).isVisible().catch(() => false));
      check('238: resumo do Passo 2 NÃO mostra zero-padding', (await page.getByText(numeroPadded, { exact: true }).count()) === 0);

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('238: cancelamento não foi persistido (só chegou até a confirmação)', orcDepois.body.status === 'SINAL_PAGO');
    }

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO numero-sem-padding (re-executado como script avulso) ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
