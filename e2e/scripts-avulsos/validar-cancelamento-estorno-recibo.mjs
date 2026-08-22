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

// CEN-NOVO-18 — SINAL_PAGO -> cancelamento com Estorno (wizard completo) -> Recibo de Estorno em
// 9 seções, validado via frameLocator (nunca page.getByText direto — mesmo achado da Tarefa 0 de
// P-T002, ver numero-sem-padding.spec.ts).
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const nomeProduto = `QACEN18-Produto-${Date.now()}`;
    const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(p.body.id);

    const nomeCliente = `QACEN18-Cliente-${Date.now()}`;
    const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
    clienteIds.push(c.body.id);

    const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: true, percentualSinal: 30 }) });
    const orcamento = orcRes.body;
    orcamentoIds.push(orcamento.id);

    await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO
    await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO
    await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // AGUARDANDO_SINAL
    const resSinal = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // SINAL_PAGO
    check('setup: chegou em SINAL_PAGO', resSinal.body.status === 'SINAL_PAGO');
    const valorSinal = resSinal.body.valorSinal;

    await loginUI(page);
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);

    await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
    check('Passo 1: título "Estornar sinal para {cliente}?" visível', await page.getByText(`Estornar sinal para ${nomeCliente}?`).isVisible({ timeout: 5000 }).catch(() => false));

    // Passo 1: sinal recebido exibido, toggle "Sim" já é o default, escolhe data retroativa (ontem).
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(ontem);
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();

    check('Passo 2: "Confirmar estorno do sinal" visível', await page.getByText('Confirmar estorno do sinal', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false));
    const [d, m, y] = [ontem.slice(8, 10), ontem.slice(5, 7), ontem.slice(0, 4)];
    check('Passo 2: resumo mostra a data escolhida (não a de hoje)', await page.getByText(`${d}/${m}/${y}`).isVisible().catch(() => false));

    await page.getByRole('button', { name: 'Confirmar e gerar recibo de estorno', exact: true }).click();
    await page.waitForTimeout(1500);

    const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
    check('orçamento persistido como CANCELADO', orcDepois.body.status === 'CANCELADO');
    check('estornoSinal = true persistido', orcDepois.body.estornoSinal === true);

    // Card Documentos deve mostrar "Recibo de estorno" e navegar corretamente.
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
    await page.getByRole('button', { name: 'Recibo de estorno', exact: true }).click();
    await page.waitForURL(/\/recibo-estorno$/, { timeout: 5000 });

    const reciboFrame = page.frameLocator('iframe[title="Preview do recibo de estorno"]');
    check('recibo-estorno (iframe) mostra "Sinal estornado"', await reciboFrame.getByText('Sinal estornado', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false));
    check('recibo-estorno (iframe) mostra nome do cliente', await reciboFrame.getByText(nomeCliente, { exact: true }).first().isVisible().catch(() => false));
    check('recibo-estorno (iframe) mostra "Valor devolvido"', await reciboFrame.getByText('Valor devolvido', { exact: true }).isVisible().catch(() => false));
    check('recibo-estorno (iframe) mostra número do orçamento', await reciboFrame.getByText(`#${orcamento.numero}`, { exact: true }).first().isVisible().catch(() => false));
    check('recibo-estorno (iframe) mostra valor do sinal devolvido', (await reciboFrame.getByText(new RegExp(String(valorSinal).replace('.', ',')), { exact: false }).count()) > 0);
    check('recibo-estorno (iframe) mostra a data escolhida (não a de hoje)', await reciboFrame.getByText(`${d}/${m}/${y}`).first().isVisible().catch(() => false));
    check('recibo-estorno (iframe) NÃO mostra "Método de devolução" (achado antigo, confirmado ausente)', (await reciboFrame.getByText('Método de devolução').count()) === 0);

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO cancelamento-estorno-recibo ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
