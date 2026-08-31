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

function brl(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function criarAteEmProducaoComSinal(token, clienteId, produtoId, percentualSinal) {
  const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId, itens: [{ produtoId, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', temPrazoProducao: true, prazoProducaoDias: 5, sinalAtivo: true, percentualSinal }) });
  const orcamento = orcRes.body;
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // AGUARDANDO_SINAL
  const resSinal = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // SINAL_PAGO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // EM_PRODUCAO
  return { orcamento, valorSinal: resSinal.body.valorSinal, total: resSinal.body.total };
}

// P-F006 — mini-estorno de multa (RN-NOVA-1/ORC-036, V0.8.2): sinal pago > multa bruta.
// Caso 1: preview (ModalCancelMulta, passos 2/3) mostra aviso qualitativo, sem valor calculado no
// client. Caso 2: tela final (banner CANCELADO) mostra valorDevolvidoMulta com texto claro.
// Caso 3 (regressão): sinal == multa bruta (piso zero "puro", sem mini-estorno) NÃO mostra o aviso.
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    const nomeProduto = `QAF006-Produto-${Date.now()}`;
    const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(p.body.id);

    // --- Caso 1+2: mini-estorno de verdade (sinal 60% > multa 30%) ---
    {
      const nomeCliente = `QAF006-ClienteMiniEstorno-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(token, c.body.id, p.body.id, 60);
      orcamentoIds.push(orcamento.id);

      const percentualMulta = 30;
      const multaBruta = (total * percentualMulta) / 100;
      const devolvidoEsperado = valorSinal - multaBruta;
      check('setup: sinal > multa bruta (cenário de mini-estorno)', valorSinal > multaBruta);

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await page.getByRole('button', { name: 'Próximo →', exact: true }).click(); // Passo 1 -> 2
      await page.getByPlaceholder('50').fill(String(percentualMulta));
      check('Passo 2: multa mostrada é R$ 0,00 (piso, sem número negativo)', await page.getByText('R$ 0,00', { exact: true }).first().isVisible({ timeout: 5000 }).catch(() => false));
      check('Passo 2: aviso qualitativo de mini-estorno visível (sem valor calculado no client)', await page.getByText('O sinal pago é maior que a multa — a cliente vai receber a diferença de volta.', { exact: false }).isVisible({ timeout: 5000 }).catch(() => false));

      await page.getByRole('button', { name: 'Próximo →', exact: true }).click(); // Passo 2 -> 3
      check('Passo 3 (resumo): aviso qualitativo de mini-estorno visível', await page.getByText('O sinal pago é maior que a multa — a cliente vai receber a diferença de volta.', { exact: false }).isVisible({ timeout: 5000 }).catch(() => false));

      await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
      await page.waitForTimeout(1500);

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('valorDevolvidoMulta persistido bate com a fórmula (sinal - multa bruta)', Math.abs(orcDepois.body.valorDevolvidoMulta - devolvidoEsperado) < 0.01);
      check('valorMulta persistido = 0,00', orcDepois.body.valorMulta === 0);

      check('Tela final: banner mostra "Você recebeu de volta" com o valor devolvido', await page.getByText(`Você recebeu de volta`, { exact: false }).isVisible({ timeout: 5000 }).catch(() => false));
      check('Tela final: valor exato do mini-estorno visível no banner', await page.getByText(brl(devolvidoEsperado), { exact: true }).isVisible({ timeout: 5000 }).catch(() => false));

      // reload real — confirma que o valor persistido (não só estado local) é o exibido
      await page.reload();
      await page.waitForLoadState('networkidle');
      check('Tela final (após reload): banner de mini-estorno continua visível', await page.getByText(`Você recebeu de volta`, { exact: false }).isVisible({ timeout: 10000 }).catch(() => false));
    }

    // --- Caso 3 (regressão): sinal == multa bruta, sem mini-estorno (diferença = 0, não > 0) ---
    {
      const nomeCliente = `QAF006-ClientePisoPuro-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(token, c.body.id, p.body.id, 30);
      orcamentoIds.push(orcamento.id);

      const percentualMulta = 30;
      const multaBruta = (total * percentualMulta) / 100;
      check('setup: sinal == multa bruta (piso zero puro, sem mini-estorno)', Math.abs(valorSinal - multaBruta) < 0.01);

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await page.getByRole('button', { name: 'Próximo →', exact: true }).click(); // Passo 1 -> 2
      await page.getByPlaceholder('50').fill(String(percentualMulta));
      check('Passo 2: sem mini-estorno, aviso NÃO aparece (diferença = 0, não > 0)', (await page.getByText('O sinal pago é maior que a multa', { exact: false }).count()) === 0);
    }

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO mini-estorno-multa (P-F006) ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
