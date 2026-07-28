import { execSync } from 'child_process'

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

const CONTAINER = 'pense-precifique-db'
const DB_NAME = 'pense_precifique_db'
const DB_USER = 'pense_user'

// Todas as tabelas de domínio (schema atual, `\dt` confirmado em 2026-07-28) — deliberadamente
// SEM usuarios/empresas/configuracoes_precificacao/flyway_schema_history.
const TABELAS_DOMINIO = [
  'catalogos',
  'clientes',
  'ficha_tecnica_itens',
  'historico_status_producao',
  'insumos',
  'itens_catalogo',
  'itens_catalogo_customizacao',
  'lotes_compra',
  'movimentacoes_insumo',
  'movimentacoes_produto',
  'orcamento_item_customizacoes',
  'orcamento_itens',
  'orcamentos',
  'producao_insumos_consumidos',
  'producao_produtos',
  'producoes',
  'produtos',
  'recibos_estorno',
  'recibos_pagamento',
]

export default async function globalSetup() {
  console.log('[global-setup] Resetando dados de domínio antes da suíte E2E (TRUNCATE, mantém conta de teste)...')
  const sql = `TRUNCATE ${TABELAS_DOMINIO.join(', ')} CASCADE;`
  execSync(
    `docker exec ${CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "${sql}"`,
    { stdio: 'inherit' }
  )
  console.log('[global-setup] Banco limpo.')
}
