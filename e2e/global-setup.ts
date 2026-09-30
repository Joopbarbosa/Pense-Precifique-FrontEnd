import { execFileSync } from 'child_process'

/**
 * Reset de banco antes da suíte E2E completa (FRENTE 2, V0.6.1 — achado do P-TESTE-001).
 *
 * `postgres_data` é volume Docker nomeado e persiste indefinidamente entre execuções — estados
 * terminais sem hard-delete (ex. produções NAO_REALIZADA, sem endpoint de exclusão) acumulavam de
 * rodada em rodada até quebrar asserções que assumem contagem/estado limpo (ex. Cenário 199 —
 * "colunas padrão visíveis no Kanban" — falhava por registros NAO_REALIZADA de execuções
 * anteriores aparecerem como badge na coluna compartilhada).
 *
 * Escolha: TRUNCATE seletivo via `docker exec` no container do Postgres, não
 * `docker compose down -v`/`up`. Motivo descoberto na investigação: a conta de teste
 * (`penseprecifique@admin.com`, ver `e2e/helpers/auth.ts`) não é criada por nenhuma migration nem
 * por setup automático — foi registrada manualmente uma vez e vive só no volume; derrubar o volume
 * inteiro apagaria a conta e quebraria o `login()` de toda a suíte (não trata fluxo de
 * registro/onboarding). TRUNCATE com `CASCADE` evita ter que manter manualmente a ordem de FK —
 * lista as tabelas de domínio uma vez, o Postgres resolve dependentes sozinho; preserva
 * `usuarios`/`empresas`/`configuracoes_precificacao` (conta + onboarding já feito) e
 * `flyway_schema_history` (bookkeeping do Flyway, nunca tocar). Mais rápido que recriar containers
 * e não depende de esperar o backend voltar a responder.
 */

const CONTAINER = process.env.E2E_DB_CONTAINER ?? 'pense-precifique-db'
const DB_NAME = process.env.E2E_DB_NAME ?? 'pense_precifique_db'
const DB_USER = 'pense_user'

const targetKeys = ['E2E_BASE_URL', 'E2E_API_URL', 'E2E_DB_CONTAINER', 'E2E_DB_NAME'] as const
const configuredKeys = targetKeys.filter((key) => process.env[key])
if (configuredKeys.length > 0 && configuredKeys.length !== targetKeys.length) {
  throw new Error(`Alvo E2E incompleto: defina ${targetKeys.join(', ')} juntos.`)
}
if (configuredKeys.length > 0 && ['pense_precifique_db', 'pense_precifique_test_v015'].includes(DB_NAME)) {
  throw new Error(`Banco ${DB_NAME} não pode ser usado no E2E isolado.`)
}

// Todas as tabelas de domínio (schema V0.15.0 conferido em 2026-09-30;
// `lotes_compra` foi removida e Compras/Listas foram adicionadas) — deliberadamente SEM usuarios/empresas/
// configuracoes_precificacao/metodos_pagamento/flyway_schema_history: as 4 primeiras são "conta +
// onboarding já feito" (mesmo motivo de sempre); metodos_pagamento entra na mesma categoria — só é
// semeada em `POST /auth/register`, nunca re-semeada depois de um TRUNCATE, então incluí-la aqui
// deixaria a conta de teste sem nenhum método de pagamento até a suíte inteira rodar de novo.
// unidades_medida (V0.14.0, #298) — mesma categoria de metodos_pagamento (sobrevive a `insumos` ser
// truncado, já que TRUNCATE...CASCADE só alcança quem referencia a tabela truncada, nunca o
// inverso), mas SEM seed automático em `POST /auth/register` — via SQL abaixo, garante pelo menos
// 1 unidade sempre disponível (achado: rodar `tipo-exibicao-quantidade.spec.ts` sozinho depois de
// esvaziar a tabela manualmente travava em "Salvar insumo" para sempre — nenhuma unidade para
// pré-selecionar, `podeSubmeter` nunca vira `true`).
// caixa_turnos/caixa_movimentos/venda_caixa* são achado de #487/#488 (V0.12.0) — sem FK para
// nenhuma tabela já listada aqui, então nunca eram truncadas antes desta linha (só venda_caixa*
// era truncada de forma transitiva, via CASCADE a partir de `produtos`) — turno ABERTO de uma
// rodada anterior sobrevivia e quebrava RN-NOVA-6 ("só 1 turno aberto por vez") na rodada seguinte.
const TABELAS_DOMINIO = [
  'caixa_movimentos',
  'caixa_turnos',
  'catalogos',
  'clientes',
  'compras',
  'compra_itens',
  'ficha_tecnica_itens',
  'fornecedor_insumo',
  'historico_status_producao',
  'insumos',
  'itens_catalogo',
  // V0.13.0 (#516) — itens_catalogo_customizacao foi DROPADA (migration V51): Item de Catálogo
  // deixou de ser "1 produto + N customizações anexadas" e virou composição livre de N
  // componentes (item_catalogo_componentes/orcamento_item_componentes/
  // venda_caixa_item_componentes) — todas alcançadas por CASCADE a partir de itens_catalogo/
  // orcamento_itens/venda_caixa_item, listadas aqui só por clareza (mesmo padrão já usado nas
  // demais tabelas desta lista).
  'item_catalogo_componentes',
  'orcamento_item_componentes',
  'venda_caixa_item_componentes',
  'listas_compra',
  'lista_compra_itens',
  'movimentacoes_insumo',
  'movimentacoes_produto',
  'orcamento_item_customizacoes',
  'orcamento_itens',
  'orcamento_producoes',
  'orcamentos',
  'producao_insumos_consumidos',
  'producao_produtos',
  'producoes',
  'produtos',
  'recibos_estorno',
  'recibos_pagamento',
  'venda_caixa',
  'venda_caixa_item',
  'venda_caixa_item_customizacao',
  'venda_caixa_pagamento',
]

const TEST_EMAIL = 'penseprecifique@admin.com'

export default async function globalSetup() {
  console.log(`[global-setup] Alvo: container=${CONTAINER}, banco=${DB_NAME}, API=${process.env.E2E_API_URL ?? 'http://localhost:8080'}, front=${process.env.E2E_BASE_URL ?? 'http://localhost:3000'}`)
  console.log('[global-setup] Resetando dados de domínio antes da suíte E2E (TRUNCATE, mantém conta de teste)...')
  const sql = `TRUNCATE ${TABELAS_DOMINIO.join(', ')} CASCADE;`
  execFileSync('docker', ['exec', CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'inherit' })

  // #298 — garante 1 unidade de medida sempre disponível (ver comentário de TABELAS_DOMINIO acima).
  // nome/sigla = 'unidade' (minúsculo) de propósito — mesmo valor que `resolverUnidadeMedidaId`
  // (e2e/helpers/unidadeMedida.ts) usa como default em toda a suíte; um valor diferente aqui
  // colide (unicidade de `nome` é case-insensitive) quando o helper tenta criar a sua própria.
  const seedUnidade = `
    INSERT INTO unidades_medida (usuario_id, nome, sigla)
    SELECT u.id, 'unidade', 'unidade' FROM usuarios u
    WHERE u.email = '${TEST_EMAIL}'
      AND NOT EXISTS (
        SELECT 1 FROM unidades_medida um WHERE um.usuario_id = u.id AND um.deleted_at IS NULL
      );
  `.replace(/\s+/g, ' ').trim()
  execFileSync('docker', ['exec', CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME,
    '-v', 'ON_ERROR_STOP=1', '-c', seedUnidade], { stdio: 'inherit' })

  console.log('[global-setup] Banco limpo.')
}
