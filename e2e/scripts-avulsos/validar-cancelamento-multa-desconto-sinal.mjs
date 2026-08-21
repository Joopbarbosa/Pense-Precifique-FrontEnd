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
  const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId, itens: [{ produtoId, precoUnitario: 100, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: true, percentualSinal }) });
  const orcamento = orcRes.body;
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // AGUARDANDO_SINAL
  const resSinal = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // SINAL_PAGO
  await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // EM_PRODUCAO
  return { orcamento, valorSinal: resSinal.body.valorSinal, total: resSinal.body.total };
}

// CEN-NOVO-19 — EM_PRODUCAO -> cancelamento com Multa, preview (ModalCancelMulta) e PDF refletindo
// o desconto do sinal ja pago, piso zero (P-B002/ORC-036). Gap confirmado no Passo 0: ORC-036 nao
// tem cenario BDD nem cobertura E2E de frontend/PDF (so IT de backend).
async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    const nomeProduto = `QACEN19-Produto-${Date.now()}`;
    const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
    produtoIds.push(p.body.id);

    // --- Caso 1: multa parcialmente descontada (multa bruta > sinal) ---
    {
      const nomeCliente = `QACEN19-ClienteParcial-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(token, c.body.id, p.body.id, 30);
      orcamentoIds.push(orcamento.id);

      const percentualMulta = 50;
      const multaBruta = (total * percentualMulta) / 100;
      const multaEsperada = Math.max(multaBruta - valorSinal, 0);
      check('caso 1 setup: multa bruta > sinal (cenário de desconto parcial)', multaBruta > valorSinal);

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await page.getByRole('button', { name: 'Próximo →', exact: true }).click(); // Passo 1 -> 2
      check('caso 1: texto "Já descontado o sinal de X pago pela cliente" visível no Passo 2', await page.getByText(`Já descontado o sinal de ${brl(valorSinal)} pago pela cliente.`).isVisible({ timeout: 5000 }).catch(() => false));
      check('caso 1: preview da multa (Passo 2) já mostra valor descontado', await page.getByText(brl(multaEsperada), { exact: true }).first().isVisible().catch(() => false));

      await page.getByRole('button', { name: 'Próximo →', exact: true }).click(); // Passo 2 -> 3
      check('caso 1: resumo (Passo 3) mostra valor descontado', await page.getByText(brl(multaEsperada), { exact: true }).first().isVisible({ timeout: 5000 }).catch(() => false));

      await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
      await page.waitForTimeout(1500);

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('caso 1: valorMulta persistido bate com a fórmula (multa bruta - sinal)', Math.abs(orcDepois.body.valorMulta - multaEsperada) < 0.01);

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}/multa`);
      const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]');
      check('caso 1: PDF de multa (iframe) mostra o valor já descontado', await multaFrame.getByText(brl(multaEsperada), { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false));
      check('caso 1: PDF de multa (iframe) NÃO mostra o valor bruto (sem desconto)', (await multaFrame.getByText(brl(multaBruta), { exact: true }).count()) === 0);
    }

    // --- Caso 2: piso zero (sinal >= multa bruta) ---
    {
      const nomeCliente = `QACEN19-ClientePiso-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const { orcamento, valorSinal, total } = await criarAteEmProducaoComSinal(token, c.body.id, p.body.id, 80);

      const percentualMulta = 10;
      const multaBruta = (total * percentualMulta) / 100;
      check('caso 2 setup: sinal >= multa bruta (cenário de piso zero)', valorSinal >= multaBruta);

      const resCancel = await api(`/orcamentos/${orcamento.id}/cancelar`, token, { method: 'POST', body: JSON.stringify({ percentualMulta }) });
      orcamentoIds.push(orcamento.id);
      check('caso 2: cancelamento OK', resCancel.status === 200);
      check('caso 2: valorMulta persistido = 0,00 (piso, não negativo)', resCancel.body.valorMulta === 0);

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}/multa`);
      const multaFrame = page.frameLocator('iframe[title="Preview do PDF de multa"]');
      check('caso 2: PDF de multa (iframe) mostra R$ 0,00', await multaFrame.getByText('R$ 0,00', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false));
    }

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO cancelamento-multa-desconto-sinal ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
