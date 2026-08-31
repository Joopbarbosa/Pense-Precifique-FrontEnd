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

  const cliente = (await api('/clientes', token, { method: 'POST', body: JSON.stringify({ nome: `QA312-Cliente-${Date.now()}` }) })).body;
  const produtos = (await api('/produtos?size=5&tipo=PRODUTO', token)).body.content;
  const produtoA = produtos[0]; // fica no orçamento, só muda quantidade
  const produtoB = produtos[1]; // removido na edição
  const produtoC = produtos[2]; // adicionado na edição — simula "trocar produto"

  const orcamento = (await api('/orcamentos', token, {
    method: 'POST',
    body: JSON.stringify({
      clienteId: cliente.id,
      metodoPagamento: 'PIX',
      temPrazoProducao: true,
      prazoProducaoDias: 7,
      inicioAssimQueAprovado: true,
      sinalAtivo: true,
      percentualSinal: 30,
      tipoDesconto: 'PERCENTUAL',
      descontoValor: 5,
      observacoes: 'Pedido de teste P-F007',
      itens: [
        { produtoId: produtoA.id, precoUnitario: produtoA.precoVenda, margemAplicada: 0, quantidade: 2 },
        { produtoId: produtoB.id, precoUnitario: produtoB.precoVenda, margemAplicada: 0, quantidade: 1 },
      ],
    }),
  })).body;
  console.log('Orçamento criado:', orcamento.id, 'RASCUNHO, itens:', orcamento.itens.map(i => i.nomeProduto));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await loginUI(page);

    // ── Teste 1: botão Editar visível só em RASCUNHO ──────────────────────────────────────
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
    await page.waitForLoadState('networkidle');
    check('Botão Editar visível na tela de Detalhe (status RASCUNHO)', await page.getByRole('button', { name: 'Editar' }).isVisible());

    // ── Teste 2: clicar Editar abre o formulário pré-preenchido ───────────────────────────
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.waitForURL(/\/orcamentos\/.+\/editar/, { timeout: 10000 });
    await page.getByRole('heading', { name: 'Editar Orçamento' }).waitFor({ timeout: 10000 });
    check('Título "Editar Orçamento" exibido', await page.getByRole('heading', { name: 'Editar Orçamento' }).isVisible());
    check('Cliente pré-preenchido', await page.getByText(cliente.nome, { exact: true }).first().isVisible());
    check(`Item ${produtoA.nome} pré-preenchido`, await page.getByText(produtoA.nome, { exact: true }).isVisible());
    check(`Item ${produtoB.nome} pré-preenchido`, await page.getByText(produtoB.nome, { exact: true }).isVisible());
    check('Toggle "Vai ter prazo de produção" = Sim (pré-preenchido)', await page.locator('button:has-text("Sim")').first().isVisible());
    check('Campo de prazo pré-preenchido com 7', (await page.getByPlaceholder('10').inputValue()) === '7');
    check('Botão "Salvar alterações" exibido (não "Criar orçamento")', await page.getByRole('button', { name: 'Salvar alterações' }).isVisible());

    // ── Teste 3: editar — muda quantidade do item A, remove item B, adiciona item C (troca) ─
    // Escopo por linha (ItemRow renderiza cada item num container `div.animate-fade-up` próprio) —
    // nunca `.first()` cego, que dependeria da ordem de renderização coincidir com a ordem esperada.
    const linhaA = page.locator('div.animate-fade-up', { hasText: produtoA.nome });
    const linhaB = page.locator('div.animate-fade-up', { hasText: produtoB.nome });

    // Aumenta quantidade do item A (2 -> 3) via botão "+" do Stepper, escopado à linha do item A.
    await linhaA.getByRole('button', { name: '+', exact: true }).click();

    // Remove item B (ícone de lixeira), escopado à linha do item B.
    await linhaB.locator('button:has(svg.lucide-trash2)').click();
    check(`Item ${produtoB.nome} removido visualmente`, !(await page.getByText(produtoB.nome, { exact: true }).isVisible().catch(() => false)));

    // Adiciona item C (simula troca de produto: item novo, backend trata como remover+adicionar).
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.getByPlaceholder('Buscar produto ou item de catálogo...').fill(produtoC.nome);
    await page.getByText(produtoC.nome, { exact: true }).click();
    check(`Item ${produtoC.nome} adicionado visualmente`, await page.getByText(produtoC.nome, { exact: true }).isVisible());

    // ── Teste 4: salvar — chama PUT, navega para o Detalhe com os dados atualizados ────────
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await page.waitForURL(new RegExp(`/orcamentos/${orcamento.id}$`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const detalheApos = (await api(`/orcamentos/${orcamento.id}`, token)).body;
    check('PUT persistiu: item A com quantidade 3', detalheApos.itens.find(i => i.produtoId === produtoA.id)?.quantidade === 3);
    check('PUT persistiu: item B removido', !detalheApos.itens.some(i => i.produtoId === produtoB.id));
    check('PUT persistiu: item C adicionado (id novo, tratado como remover+adicionar)', detalheApos.itens.some(i => i.produtoId === produtoC.id));
    check('Status continua RASCUNHO após editar', detalheApos.status === 'RASCUNHO');
    await page.getByText(produtoA.nome, { exact: true }).waitFor({ timeout: 5000 }).catch(() => {});
    check(`Tela de Detalhe exibe ${produtoA.nome} sem quebrar visualmente (id novo do item)`, await page.getByText(produtoA.nome, { exact: true }).isVisible());
    check(`Tela de Detalhe exibe ${produtoC.nome} (item trocado)`, await page.getByText(produtoC.nome, { exact: true }).isVisible());
    check(`Tela de Detalhe NÃO exibe mais ${produtoB.nome}`, !(await page.getByText(produtoB.nome, { exact: true }).isVisible().catch(() => false)));

    // ── Teste 4b: avisosEstoque recalculado — checkpoint de estoque insuficiente na edição ──
    // (RN-NOVA-11 revisada) — decisão do Passo 0: mesmo checkpoint da criação, mas sem os botões
    // de vínculo de produção (ver comentário no código-fonte).
    const orcamento2 = (await api('/orcamentos', token, {
      method: 'POST',
      body: JSON.stringify({
        clienteId: cliente.id,
        metodoPagamento: 'PIX',
        temPrazoProducao: false,
        inicioAssimQueAprovado: true,
        sinalAtivo: false,
        tipoDesconto: 'PERCENTUAL',
        descontoValor: 0,
        itens: [{ produtoId: produtoA.id, precoUnitario: produtoA.precoVenda, margemAplicada: 0, quantidade: 1 }],
      }),
    })).body;

    await page.goto(`${APP_URL}/orcamentos/${orcamento2.id}/editar`);
    await page.getByRole('heading', { name: 'Editar Orçamento' }).waitFor({ timeout: 10000 });
    // Álbum de Fotos Artesanal tem estoqueAtual=10 — sobe a quantidade bem além disso.
    const linhaA2 = page.locator('div.animate-fade-up', { hasText: produtoA.nome });
    await linhaA2.locator('input[type="number"]').fill('999');
    await linhaA2.locator('input[type="number"]').blur();
    await page.waitForTimeout(600); // debounce de simularEstoque (300ms)
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await page.getByText('Itens com estoque insuficiente').waitFor({ timeout: 10000 });
    check('Checkpoint de estoque insuficiente aparece na edição', await page.getByText('Itens com estoque insuficiente').isVisible());
    check('Subtítulo do checkpoint adaptado para edição', await page.getByText('Aviso antes de salvar as alterações').isVisible());
    check('Botão "Vincular produção existente" NÃO aparece na edição (decisão Passo 0)', !(await page.getByRole('button', { name: 'Vincular produção existente' }).isVisible().catch(() => false)));
    check('Botão "Criar produção" continua disponível na edição', await page.getByRole('button', { name: /Criar produção/ }).isVisible());
    await page.getByRole('button', { name: 'Salvar mesmo assim' }).click();
    await page.waitForURL(new RegExp(`/orcamentos/${orcamento2.id}$`), { timeout: 10000 });

    const detalhe2Apos = (await api(`/orcamentos/${orcamento2.id}`, token)).body;
    check('avisosEstoque recalculado e persistido após salvar com estoque insuficiente', detalhe2Apos.itens[0]?.quantidade === 999);

    // ── Teste 5: guard defensivo — orçamento fora de RASCUNHO não mostra Editar ────────────
    await api(`/orcamentos/${orcamento.id}/avancar-status`, token, { method: 'POST', body: JSON.stringify({}) }); // RASCUNHO -> ENVIADO
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}`);
    await page.waitForLoadState('networkidle');
    check('Botão Editar NÃO aparece fora de RASCUNHO (status ENVIADO)', !(await page.getByRole('button', { name: 'Editar' }).isVisible().catch(() => false)));

    // Tentativa direta via URL também não deve quebrar (defesa em profundidade — backend rejeita).
    await page.goto(`${APP_URL}/orcamentos/${orcamento.id}/editar`);
    await page.waitForLoadState('networkidle');
    check('Formulário de edição ainda carrega mesmo fora de RASCUNHO (sem crash)', await page.getByRole('heading', { name: 'Editar Orçamento' }).isVisible());
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await page.waitForTimeout(1500);
    const toastErro = await page.getByText('Só é possível editar um orçamento em Rascunho.').isVisible().catch(() => false);
    check('Toast de erro exibido ao tentar salvar edição fora de RASCUNHO (defesa em profundidade)', toastErro);

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
