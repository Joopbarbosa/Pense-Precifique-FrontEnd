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

  // Dados reais já existentes (sessão de curl 2026-08-24/28, produto com ficha técnica + insumo)
  const produtoNome = 'TESTE-316-Produto-C-FichaTecnica';
  const produtoBusca = (await api('/produtos?busca=TESTE-316-Produto-C&size=5', token)).body.content[0];
  const producoesAntes = (await api('/producoes?estado=AGUARDANDO_INICIO&size=10', token)).body.content;
  const prd1 = producoesAntes.find(p => p.identificador === 'PRD-1');
  console.log('estoqueAtual produto:', produtoBusca.estoqueAtual, '| PRD-1 quantidade antes:', prd1.produtos[0].quantidade);

  const nomeCliente = `QA320-Cliente-${Date.now()}`;
  const cliente = (await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente }) })).body;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await loginUI(page);

    // ── Teste 1: fluxo feliz — vincular produção existente embutido na criação ──────────────
    await page.goto(`${APP_URL}/orcamentos/novo`);
    await page.getByPlaceholder('Selecionar cliente...').fill(nomeCliente);
    await page.getByText(nomeCliente, { exact: true }).click();

    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(produtoNome);
    await page.getByText(produtoNome, { exact: true }).click();
    const qtdAlvo = Math.ceil(produtoBusca.estoqueAtual) + 2; // ultrapassa o estoque de propósito
    for (let i = 1; i < qtdAlvo; i++) {
      await page.getByRole('button', { name: '+', exact: true }).click();
    }
    // temPrazoProducao=true é o default do formulário — sem isso, handleSubmit trava em validação
    // de campo (prazoDias vazio) antes mesmo de chegar no checkpoint de estoque.
    await page.getByRole('button', { name: 'Não', exact: true }).first().click();

    // Aguarda o debounce de 300ms + resposta de simular-alertas assentar antes de submeter — senão
    // `calcularItensPendentesAvanco()` roda com `simulacoes` desatualizado e pula o checkpoint.
    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST', { timeout: 5000 });
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
    await page.waitForTimeout(1200);
    check('checkpoint de estoque insuficiente aparece', await page.getByText('Itens com estoque insuficiente').isVisible());
    await page.screenshot({ path: '/tmp/vinc-01-checkpoint.png' });

    check('botão "Vincular produção existente" visível no checkpoint', await page.getByRole('button', { name: /Vincular produção existente/ }).isVisible());
    await page.getByRole('button', { name: /Vincular produção existente/ }).click();

    await page.waitForTimeout(500);
    check('modal de vincular produção abre, lista só "Aguardando início"', await page.getByText('Escolha uma produção aguardando início').isVisible());
    check('PRD-1 aparece na lista', await page.getByText('PRD-1', { exact: true }).isVisible());
    check('badge "Aguardando início" visível', (await page.getByText('Aguardando início').count()) > 0);
    await page.screenshot({ path: '/tmp/vinc-02-lista.png' });

    await page.getByText('PRD-1', { exact: true }).click();
    await page.waitForTimeout(800);
    check('tela de confirmação/preview do vínculo abre', await page.getByText('Confirmar vínculo').first().isVisible());
    await page.screenshot({ path: '/tmp/vinc-03-preview.png' });

    // Orçamento deve já existir neste ponto (efeito colateral da simulação) — via API
    const orcsAposSimular = (await api(`/orcamentos?busca=${encodeURIComponent(nomeCliente)}&size=5`, token)).body;
    check('orçamento já foi criado (silenciosamente) ao simular o vínculo', orcsAposSimular.totalElements === 1);
    const orcamentoId = orcsAposSimular.content[0].id;

    const semAlerta = await page.getByText('Estoque de insumo suficiente para essa soma, sem alertas.').isVisible().catch(() => false);
    console.log('preview sem alerta relevante?', semAlerta);

    await page.getByRole('button', { name: 'Confirmar vínculo', exact: true }).click();
    await page.waitForURL(/\/orcamentos\/[0-9a-f-]+$/, { timeout: 10000 });
    check('navegou para o Detalhe do Orçamento após confirmar', page.url().includes(orcamentoId));
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/vinc-04-detalhe.png' });

    check('card "Vinculado a produção: PRD-1" aparece no Detalhe', await page.getByText(/Vinculado a produção:.*PRD-1/).isVisible());

    // Efeito real: quantidade do produto na produção deve ter subido (checagem visual != só toast)
    const prd1Depois = (await api(`/producoes/${prd1.id}`, token)).body;
    const qtdDepois = prd1Depois.produtos.find(p => p.produtoId === produtoBusca.id).quantidade;
    check(`efeito real confirmado: PRD-1 ${prd1.produtos[0].quantidade} → ${qtdDepois} (esperado ${prd1.produtos[0].quantidade + qtdAlvo})`, qtdDepois === prd1.produtos[0].quantidade + qtdAlvo);

    // Só 1 orçamento criado nesse fluxo inteiro, nenhum duplicado
    const orcsFinal = (await api(`/orcamentos?busca=${encodeURIComponent(nomeCliente)}&size=5`, token)).body;
    check('nenhum orçamento duplicado criado no fluxo feliz', orcsFinal.totalElements === 1);

    // reverte para não acumular dado de teste na produção real
    const desvinc = await api(`/orcamentos/${orcamentoId}/vincular-producao/${prd1.id}`, token, { method: 'DELETE' });
    check('desvincular reverte a quantidade (limpeza pós-teste)', desvinc.status === 204);
    const prd1Revertido = (await api(`/producoes/${prd1.id}`, token)).body;
    check('PRD-1 voltou à quantidade original após desvincular', prd1Revertido.produtos.find(p => p.produtoId === produtoBusca.id).quantidade === prd1.produtos[0].quantidade);

    // ── Teste 2: fechar a modal DEPOIS de já ter criado (silenciosamente) o orçamento ───────
    const nomeCliente2 = `QA320-Cliente2-${Date.now()}`;
    await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: nomeCliente2 }) });

    await page.goto(`${APP_URL}/orcamentos/novo`);
    await page.getByPlaceholder('Selecionar cliente...').fill(nomeCliente2);
    await page.getByText(nomeCliente2, { exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(produtoNome);
    await page.getByText(produtoNome, { exact: true }).click();
    for (let i = 1; i < qtdAlvo; i++) {
      await page.getByRole('button', { name: '+', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Não', exact: true }).first().click();
    await page.waitForResponse(res => res.url().includes('/orcamentos/simular-alertas') && res.request().method() === 'POST', { timeout: 5000 });
    await page.getByRole('button', { name: 'Criar orçamento', exact: true }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Vincular produção existente/ }).click();
    await page.waitForTimeout(500);
    await page.getByText('PRD-1', { exact: true }).click();
    await page.waitForTimeout(800);

    const orcsAposSimular2 = (await api(`/orcamentos?busca=${encodeURIComponent(nomeCliente2)}&size=5`, token)).body;
    check('teste 2: orçamento já criado ao entrar no preview (antes de confirmar)', orcsAposSimular2.totalElements === 1);
    const orcamentoId2 = orcsAposSimular2.content[0].id;

    // Fecha sem confirmar — já que o orçamento existe, deve navegar pro detalhe dele, não ficar
    // preso no formulário de criação (evita duplicar se clicar em "Criar orçamento" de novo)
    await page.getByRole('button', { name: 'Fechar', exact: false }).click().catch(async () => {
      // "Fechar" não é o botão desta tela (é "Voltar"/"Confirmar vínculo") — usa Escape do ModalShell
      await page.keyboard.press('Escape');
    });
    await page.waitForTimeout(600);
    check('teste 2: fechar sem confirmar navega para o orçamento já criado (evita duplicar)', page.url().includes(orcamentoId2));

    const orcsFinal2 = (await api(`/orcamentos?busca=${encodeURIComponent(nomeCliente2)}&size=5`, token)).body;
    check('teste 2: nenhum orçamento duplicado', orcsFinal2.totalElements === 1);

    const prd1SemVinculo = (await api(`/producoes/${prd1.id}`, token)).body;
    check('teste 2: como não confirmou o vínculo, PRD-1 não recebeu produtos', prd1SemVinculo.produtos.find(p => p.produtoId === produtoBusca.id).quantidade === prd1.produtos[0].quantidade);
  } finally {
    await browser.close();
  }

  console.log(`\n${results.pass.length} passaram, ${results.fail.length} falharam`);
  if (results.fail.length > 0) {
    console.log('FALHAS:', results.fail);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
