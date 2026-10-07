/**
 * Travas do alvo do E2E, antes de qualquer comando no banco. Extraídas do `global-setup.ts` para serem testadas
 * sem apagar nada (`e2e/global-setup-alvo.spec.ts`). Alvo isolado = as quatro variáveis juntas; sem nenhuma, o padrão
 * é o banco de dev, que o `TRUNCATE` apaga — #746 (achado da QA da #689) exige confirmação explícita para isso.
 * #752: alvo configurado exige banco e container `test_*`, com ou sem `POCKET_TEST_DB`.
 */
export const CHAVES_DO_ALVO = ['E2E_BASE_URL', 'E2E_API_URL', 'DB_CONTAINER', 'DB_NAME'] as const
export const VARIAVEL_DE_CONFIRMACAO = 'CONFIRMO_APAGAR_BANCO_DEV'
export const CONTAINER_PADRAO = 'pense-precifique-db'
export const BANCO_PADRAO = 'pense_precifique_db'

export function validarAlvoE2E(env: Record<string, string | undefined>): void {
  const container = env.DB_CONTAINER ?? CONTAINER_PADRAO
  const banco = env.DB_NAME ?? BANCO_PADRAO
  const configuradas = CHAVES_DO_ALVO.filter((chave) => env[chave])
  if (configuradas.length > 0 && configuradas.length !== CHAVES_DO_ALVO.length) {
    throw new Error(`Alvo E2E incompleto: defina ${CHAVES_DO_ALVO.join(', ')} juntos.`)
  }
  if (configuradas.length > 0 && [BANCO_PADRAO, 'pense_precifique_test_v015'].includes(banco)) {
    throw new Error(`Banco ${banco} não pode ser usado no E2E isolado.`)
  }
  // #752: alvo configurado (as quatro variáveis) ou POCKET_TEST_DB=1 só valem com banco e container `test_*`;
  // a trava não depende de POCKET_TEST_DB estar presente.
  if ((configuradas.length > 0 || env.POCKET_TEST_DB === '1') && !(banco.startsWith('test_') && container.startsWith('test_'))) {
    throw new Error(`Alvo E2E isolado exige banco e container test_*: ${container}/${banco}.`)
  }
  // Sem alvo configurado o padrão é o banco de dev: o TRUNCATE apagaria os dados de domínio dele.
  if (configuradas.length === 0 && env[VARIAVEL_DE_CONFIRMACAO] !== '1') {
    throw new Error(
      `O E2E sem alvo configurado apagaria os dados de domínio do banco de dev (${container}/${banco}). `
      + `Para o alvo isolado, defina ${CHAVES_DO_ALVO.join(', ')} juntos. `
      + `Para apagar o banco de dev de propósito, defina ${VARIAVEL_DE_CONFIRMACAO}=1.`,
    )
  }
}
