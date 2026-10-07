import { test, expect } from '@playwright/test'
import { validarAlvoE2E, VARIAVEL_DE_CONFIRMACAO } from './helpers/alvo-e2e'

// #746 (achado da QA da #689): as travas do alvo do E2E, testadas na função pura — nenhum comando roda no banco.
const isolado = { E2E_BASE_URL: 'http://localhost:13003', E2E_API_URL: 'http://localhost:18093', DB_CONTAINER: 'test_alvo', DB_NAME: 'test_alvo' }

test.describe('Travas do alvo do E2E (global-setup)', () => {
  test('alvo isolado completo (test_*) passa sem confirmação', () => {
    expect(() => validarAlvoE2E({ ...isolado, POCKET_TEST_DB: '1' })).not.toThrow()
  })

  test('sem nenhuma variável e sem confirmação: para antes do banco, com mensagem que explica como confirmar', () => {
    expect(() => validarAlvoE2E({})).toThrow(/apagaria os dados de domínio do banco de dev \(pense-precifique-db\/pense_precifique_db\)/)
    expect(() => validarAlvoE2E({})).toThrow(new RegExp(`${VARIAVEL_DE_CONFIRMACAO}=1`))
  })

  test('confirmação com valor diferente de 1 não vale', () => {
    expect(() => validarAlvoE2E({ [VARIAVEL_DE_CONFIRMACAO]: 'true' })).toThrow(/apagaria os dados de domínio/)
    expect(() => validarAlvoE2E({ [VARIAVEL_DE_CONFIRMACAO]: '' })).toThrow(/apagaria os dados de domínio/)
  })

  test('sem variáveis de alvo e com CONFIRMO_APAGAR_BANCO_DEV=1: libera o alvo padrão', () => {
    expect(() => validarAlvoE2E({ [VARIAVEL_DE_CONFIRMACAO]: '1' })).not.toThrow()
  })

  test('o alvo isolado não depende da confirmação', () => {
    expect(() => validarAlvoE2E({ ...isolado })).not.toThrow()
  })

  test('alvo incompleto continua recusado, mesmo com a confirmação', () => {
    expect(() => validarAlvoE2E({ E2E_BASE_URL: 'http://localhost:1', [VARIAVEL_DE_CONFIRMACAO]: '1' })).toThrow(/Alvo E2E incompleto/)
  })

  test('banco de dev nunca vale como alvo isolado', () => {
    expect(() => validarAlvoE2E({ ...isolado, DB_NAME: 'pense_precifique_db' })).toThrow(/não pode ser usado no E2E isolado/)
    expect(() => validarAlvoE2E({ ...isolado, DB_NAME: 'pense_precifique_test_v015' })).toThrow(/não pode ser usado no E2E isolado/)
  })

  test('POCKET_TEST_DB=1 exige banco e container test_*', () => {
    expect(() => validarAlvoE2E({ ...isolado, DB_NAME: 'meu_banco', POCKET_TEST_DB: '1' })).toThrow(/exige banco e container test_\*/)
    expect(() => validarAlvoE2E({ ...isolado, DB_CONTAINER: 'pense-precifique-db', POCKET_TEST_DB: '1' })).toThrow(/exige banco e container test_\*/)
  })
})
