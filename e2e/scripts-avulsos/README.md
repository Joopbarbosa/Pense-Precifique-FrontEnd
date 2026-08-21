# Scripts avulsos de validação E2E

Scripts `.mjs` que usam `chromium.launch()` (pacote `playwright` puro) direto, sem o test runner
do `@playwright/test`. Existem porque `e2e/global-setup.ts` faz `TRUNCATE ... CASCADE` em todas as
tabelas de domínio **antes de qualquer execução de `npx playwright test`, mesmo filtrando por um
único arquivo** — isso destruiria dado real (ex. orçamentos históricos de usuários reais) sempre
que alguém precisar rodar/reproduzir um cenário fora de uma suíte completa intencional.

Cobrem cenários já existentes nos specs formais (`e2e/orcamento/*.spec.ts`) — não são a fonte de
verdade dos cenários, são a via de execução segura para reproduzir/validar um cenário pontual
contra o ambiente rodando sem truncar o banco. Mantidos aqui (não deletados) porque, na prática
desta versão do projeto, são o único jeito viável de colar "output real de execução" em prompts de
homologação sem risco de perda de dado — decisão de `P-T002` (V0.8.1).

Uso: `node e2e/scripts-avulsos/<arquivo>.mjs` (stack já precisa estar de pé — `docker compose up -d`).
