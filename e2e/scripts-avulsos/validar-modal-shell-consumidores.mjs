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

async function tituloAcimaDoSubtitle(dialog, titulo, subtitle) {
  const tituloLoc = dialog.getByText(titulo, { exact: true }).first();
  const subtitleLoc = dialog.getByText(subtitle, { exact: true }).first();
  const tituloVisivel = await tituloLoc.isVisible().catch(() => false);
  const subtitleVisivel = await subtitleLoc.isVisible().catch(() => false);
  if (!tituloVisivel || !subtitleVisivel) return false;
  const tb = await tituloLoc.boundingBox();
  const sb = await subtitleLoc.boundingBox();
  return !!tb && !!sb && tb.y < sb.y;
}

async function main() {
  const token = (await api('/auth/login', null, { method: 'POST', body: JSON.stringify({ email: TEST_EMAIL, senha: TEST_SENHA }) })).body.token;
  const produtoIds = [];
  const clienteIds = [];
  const orcamentoIds = [];
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await loginUI(page);

    // --- 239a: ModalCustomizacoes ---
    {
      const nomeCliente = `QA239a-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const nomeProduto = `QA239a-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 10, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);

      await page.goto(`${APP_URL}/orcamentos/novo`);
      await page.getByPlaceholder('Selecionar cliente...').fill(nomeCliente);
      await page.getByText(nomeCliente, { exact: true }).click();
      await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(nomeProduto);
      await page.getByText(nomeProduto, { exact: true }).click();

      await page.getByRole('button', { name: 'Customizações', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      check('239a: título (nome produto) acima de "Customizações"', await tituloAcimaDoSubtitle(dialog, nomeProduto, 'Customizações'));
      await page.keyboard.press('Escape');
      check('239a: Escape fecha o modal', await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false));
    }

    // --- 239c: ModalSinal ---
    {
      const nomeCliente = `QA239c-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const nomeProduto = `QA239c-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 10, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: true, percentualSinal: 30 }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // RASCUNHO -> ENVIADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO -> APROVADO
      const r3 = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO -> AGUARDANDO_SINAL
      check('239c setup: chegou em AGUARDANDO_SINAL', r3.body.status === 'AGUARDANDO_SINAL');

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Confirmar recebimento do sinal', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      check('239c: título "Confirmar recebimento do sinal" acima de "Aguardando Sinal"', await tituloAcimaDoSubtitle(dialog, 'Confirmar recebimento do sinal', 'Aguardando Sinal'));

      await page.locator('[role="dialog"] button[aria-label="Fechar"]').click();
      check('239c: X fecha o modal', await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false));

      await page.getByRole('button', { name: 'Confirmar recebimento do sinal', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.keyboard.press('Escape');
      check('239c: Escape fecha o modal', await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false));

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('239c: status permanece AGUARDANDO_SINAL (fechamentos não confirmaram nada)', orcDepois.body.status === 'AGUARDANDO_SINAL');
    }

    // --- 239d: ModalCancelJustificativa (ENTREGUE) ---
    {
      const nomeCliente = `QA239d-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const nomeProduto = `QA239d-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // RASCUNHO -> ENVIADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO -> APROVADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO -> EM_PRODUCAO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // EM_PRODUCAO -> FINALIZADO
      const r5 = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // FINALIZADO -> ENTREGUE
      check('239d setup: chegou em ENTREGUE', r5.body.status === 'ENTREGUE');

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      check('239d: "Cancelar pedido já entregue?" acima de "Justificativa obrigatória"', await tituloAcimaDoSubtitle(dialog, 'Cancelar pedido já entregue?', 'Justificativa obrigatória'));

      await dialog.getByRole('button', { name: 'Voltar', exact: true }).click();
      check('239d: "Voltar" fecha o modal', await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false));

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.keyboard.press('Escape');
      check('239d: Escape fecha o modal', await dialog.waitFor({ state: 'hidden', timeout: 3000 }).then(() => true).catch(() => false));

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('239d: status permanece ENTREGUE (fechamentos não cancelaram)', orcDepois.body.status === 'ENTREGUE');
    }

    // --- 239e: ModalCancelMulta (3 passos) ---
    {
      const nomeCliente = `QA239e-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const nomeProduto = `QA239e-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: false }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // RASCUNHO -> ENVIADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO -> APROVADO
      const r3 = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // APROVADO -> EM_PRODUCAO
      check('239e setup: chegou em EM_PRODUCAO', r3.body.status === 'EM_PRODUCAO');

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      const dialog = page.getByRole('dialog');

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      check('239e Passo 1: "Itens deste pedido" acima de "Cancelar · Passo 1 de 3"', await tituloAcimaDoSubtitle(dialog, 'Itens deste pedido', 'Cancelar · Passo 1 de 3'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await dialog.getByRole('button', { name: 'Próximo →', exact: true }).click();
      check('239e Passo 2: título acima de "Cancelar · Passo 2 de 3"', await tituloAcimaDoSubtitle(dialog, 'Deseja cobrar multa pelo cancelamento?', 'Cancelar · Passo 2 de 3'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await dialog.getByRole('button', { name: 'Próximo →', exact: true }).click();
      await dialog.getByRole('button', { name: 'Próximo →', exact: true }).click();
      check('239e Passo 3: "Resumo do cancelamento" acima de "Cancelar · Passo 3 de 3"', await tituloAcimaDoSubtitle(dialog, 'Resumo do cancelamento', 'Cancelar · Passo 3 de 3'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('239e: status permanece EM_PRODUCAO (nenhum Escape confirmou o cancelamento)', orcDepois.body.status === 'EM_PRODUCAO');
    }

    // --- 239f: ModalCancelEstorno (2 passos) ---
    {
      const nomeCliente = `QA239f-Cliente-${Date.now()}`;
      const c = await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) });
      clienteIds.push(c.body.id);
      const nomeProduto = `QA239f-Produto-${Date.now()}`;
      const p = await api('/produtos', token, { method: 'POST', body: JSON.stringify({ nome: nomeProduto, tipo: 'PRODUTO', tempoProducao: 10, estoqueAtual: 1000, fichaTecnica: [] }) });
      produtoIds.push(p.body.id);
      const orcRes = await api('/orcamentos', token, { method: 'POST', body: JSON.stringify({ clienteId: c.body.id, itens: [{ produtoId: p.body.id, precoUnitario: 20, margemAplicada: 50, quantidade: 1 }], metodoPagamento: 'PIX', prazoProducaoDias: 5, sinalAtivo: true, percentualSinal: 30 }) });
      const orcamento = orcRes.body;
      orcamentoIds.push(orcamento.id);
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // RASCUNHO -> ENVIADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: '{}' }); // ENVIADO -> APROVADO
      await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // APROVADO -> AGUARDANDO_SINAL
      const r4 = await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({ metodoSinalRecebido: 'PIX' }) }); // AGUARDANDO_SINAL -> SINAL_PAGO
      check('239f setup: chegou em SINAL_PAGO', r4.body.status === 'SINAL_PAGO');

      await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
      const dialog = page.getByRole('dialog');

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      check('239f Passo 1: "Estornar sinal para {cliente}?" acima de "Cancelar · Passo 1 de 2"', await tituloAcimaDoSubtitle(dialog, `Estornar sinal para ${nomeCliente}?`, 'Cancelar · Passo 1 de 2'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

      await page.getByRole('button', { name: 'Cancelar orçamento', exact: true }).click();
      await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await dialog.getByRole('button', { name: 'Próximo →', exact: true }).click();
      check('239f Passo 2: "Confirmar estorno do sinal" acima de "Cancelar · Passo 2 de 2"', await tituloAcimaDoSubtitle(dialog, 'Confirmar estorno do sinal', 'Cancelar · Passo 2 de 2'));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

      const orcDepois = await api(`/orcamentos/${orcamento.id}`, token);
      check('239f: status permanece SINAL_PAGO (nenhum Escape confirmou o estorno)', orcDepois.body.status === 'SINAL_PAGO');
    }

    await page.close();
  } finally {
    await browser.close();
    for (const id of produtoIds) if (id) await api(`/produtos/${id}`, token, { method: 'DELETE' });
    for (const id of clienteIds) if (id) await api(`/clientes/${id}`, token, { method: 'DELETE' });
  }

  console.log('\n=== RESUMO modal-shell-consumidores (re-executado como script avulso) ===');
  console.log(`PASS: ${results.pass.length}  FAIL: ${results.fail.length}`);
  console.log('Orçamentos de teste criados (sem endpoint de exclusão):', orcamentoIds.join(', '));
  if (results.fail.length > 0) { console.log('Falhas:', results.fail); process.exit(1); }
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
