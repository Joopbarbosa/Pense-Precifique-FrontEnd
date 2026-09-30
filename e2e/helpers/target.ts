/** Alvo das chamadas diretas dos specs. O setup valida o conjunto de variáveis antes de executar. */
export const E2E_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080'
/** URL que o navegador usa com o proxy do Vite no ambiente isolado. */
export const E2E_BROWSER_API_URL = process.env.E2E_BASE_URL
  ? `${process.env.E2E_BASE_URL}/api`
  : E2E_API_URL
