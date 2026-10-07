import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // #754: o backend usa America/Sao_Paulo; o navegador do teste também, para as datas locais baterem.
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // V0.16.0 (#681) — leitor-fiscal falso para o E2E da compra por nota; o backend da pilha de teste aponta
  // LEITOR_FISCAL_BASE_URL para http://localhost:${E2E_LEITOR_FALSO_PORT ?? 13501}.
  webServer: {
    command: 'node e2e/fakes/leitor-fiscal-falso.mjs',
    url: `http://localhost:${process.env.E2E_LEITOR_FALSO_PORT ?? 13501}/saude`,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
