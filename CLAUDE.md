# Pense & Precifique — Front-End

> React 18 + TypeScript · Vite · React Router v6 · Zustand · Axios · Tailwind CSS
> Projeto pré-produção. Primeiro deploy estável com usuários reais = v1.
> Última atualização: 05/09/2026 · Branch padrão atual: `feature/V0.8.3`
> Se este arquivo e o prompt da sessão divergirem, este arquivo vence.
>
> Histórico de versões (V0.6 a V0.8.2) migrado para `docs-pense-precifique/version/[VX.Y]/
> DECISOES_VX.Y.md` e `modulos/*/decisoes-*.md` — não vive mais aqui.

---

## 1. Ambiente

```bash
cd "/home/joaobarbosa/Documentos/Projetos/Pense & Precifique"
docker compose up --build
```

**localhost:** `http://localhost:3000` (Docker) / `http://localhost:5173` (dev direto)
**Conta de teste:** `penseprecifique@admin.com` / `senha12345`

`npm run build` antes de qualquer commit. **"Compila limpo" nunca é validação suficiente** — toda
tela precisa de verificação visual real (Playwright, se disponível, ou navegador manual) antes de
reportar como concluída.

**E2E:** `npx playwright test e2e/<arquivo>.spec.ts --reporter=list` (containers de pé —
`docker compose up -d`). `e2e/global-setup.ts` faz `TRUNCATE ... CASCADE` das tabelas de domínio
**uma vez antes de toda a suíte** (preserva `usuarios`/`empresas`/`configuracoes_precificacao`) —
rodar sempre pelo Playwright (`npx playwright test`), nunca specs direto, senão o reset não
dispara e estados terminais sem hard-delete se acumulam entre rodadas.

---

## 2. Onde cada coisa vai

| Categoria | Local |
|---|---|
| Componentes base (`Button`, `Input`, `Badge`, `Card`, `ModalShell`, `Field`, `ConfirmacaoModal`, `EmptyState`, `Spinner`, `ActionMenu`) | `components/ui/`, `components/shared/` |
| Hooks (`usePaginatedList`, `useDebounceSearch`, `useAuth`, `useToast`) | `src/hooks/` |
| Constants (`METODOS_PAGAMENTO`, `MOTIVOS_BAIXA_INSUMO`, `MOTIVOS_BAIXA_PRODUTO`, `STATUS_LABEL`) | `src/constants/` |
| Testes E2E — specs por feature + helpers compartilhados (`auth.ts`, `api.ts`, `list.ts`) | `e2e/`, `e2e/helpers/` |
| Documentação funcional (regras, cenários, contrato, decisões) | **não vive aqui** — `../docs-pense-precifique/modulos/[MODULO]/` |

---

## 3. Verificar antes de criar

- **Service novo?** Conferir `src/services/` primeiro — todo módulo já tem o seu (`authService`,
  `catalogoService`, `clienteService`, `dashboardService`, `empresaService`, `insumoService`,
  `itemCatalogoService`, `loteCompraService`, `orcamentoService`, `producaoService`,
  `produtoService`, `usuarioService`).
- **Componente de UI novo?** Conferir `components/ui/`/`components/shared/` — wrapper de
  label+input é sempre `Field` (`components/ui/Field.tsx`, prop `size?: 'sm'|'md'`), modal é
  sempre `ModalShell`. Nunca reimplementar local.
- **Nota de backlog "decisão registrada"/"concluído" não é confirmação de código** — sempre
  conferir o código-fonte (ou curl na API) antes de escrever prompt/implementação em cima dela. A
  fonte de verdade é sempre o código e o `git log`, não o checkbox.
- **Novo teste E2E?** Reutilizar sempre `e2e/helpers/` — nunca recriar login/setup inline.

---

## 4. Convenções da stack

- **Tailwind CSS** — classes utilitárias. Nunca CSS inline com valores hardcoded, nunca classes
  CSS customizadas. Valores verdadeiramente dinâmicos (calculados em JS, prop, API) podem usar
  `style={{}}`.
- **Ícones:** sempre via Lucide React (`import { X } from 'lucide-react'`) — nunca SVG manual.
- **Design tokens** em `tailwind.config.ts` (`text-teal`, `bg-orange`, `text-dark`, `border-line`,
  `bg-app`, `text-muted`, `text-body`, `text-danger`, `spacing.section` = `18px`) — nunca hex
  hardcoded, sempre o token correspondente.
- **Toast:** sempre via `useToast` — proibido estado boolean local.
- **Busca em listagens é sempre server-side**, via `?busca=`, debounce ~300ms, reset de paginação
  para a página 0 a cada nova busca — nunca filtrar client-side sobre itens já carregados.
- Default export em todos os componentes de página.
- **`ModalShell` é o padrão oficial de todo modal** — nunca reimplementar overlay/painel/
  botão-fechar inline.
- `Button fullWidth` dentro de flex: `flexShrink: fullWidth ? 1 : 0`.
- Drawer lateral: `left: max(0px, calc(100vw - 440px))`.
- **NUNCA** `overflow: hidden` em container com dropdown, modal ou `ActionMenu` filho.
- Dados da empresa: sempre via `GET /empresa` — nunca hardcoded.
- **GitFlow por versão:** trabalho de uma versão vai para `feature/V[X.Y]`. PR para `main` só no
  fechamento formal (após a Retomada).
- Toda correção/tech debt termina com commit + push antes de encerrar o chat, mesmo sem
  fechamento de épico.
- **Todo prompt segue `PADRAO_PROMPTS.md`** (`Pense Software/Skills/`).
- **Commit:** `tipo(escopo): descrição — OpenProject #N` — `tipo` varia conforme a natureza real
  do commit (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`), número como **sufixo**, sempre
  com a palavra "OpenProject" (ex.: `fix(insumos): corrige busca — OpenProject #110`; múltiplas
  issues: `— OpenProject #94,#95`). Padrão canônico do projeto (decisão de 05/09/2026, alinhado aos
  outros 2 repos) — commits antigos não são reescritos.

---

## 5. Padrões consolidados

- **Padrão "resolver vínculos"** (canônico: `ListaProdutosPage.tsx`/`ListaInsumosPage.tsx`) —
  quando `POST /{id}/inativar` ou `DELETE /{id}` retorna 400 por vínculo pendente, o modal de
  resolução busca os vínculos estruturados via `GET` dedicado e oferece, por bloco de tipo de
  vínculo, `REMOVER_VINCULOS` ou `SUBSTITUIR` (seletor de item substituto), enviando tudo em
  `POST /{id}/resolver-vinculos` numa única chamada. Reaproveitar para qualquer módulo novo com
  bloqueio de exclusão/inativação por vínculo, em vez de inventar mecanismo novo.
- **`<KanbanBoard>`** (canônico: `components/kanban/KanbanBoard.tsx`, genérico, hoje só usado por
  Produção) — sensor `PointerSensor`+`KeyboardSensor`. **Em teste E2E via mouse,
  `page.dragTo()`/`click`+`force` não disparam os eventos de `dnd-kit` de forma confiável** — usar
  sempre a sequência manual do helper `arrastarCard` (`e2e/helpers/producao.ts`), nunca recriar
  inline.
- **Erro de geração/download assíncrono** usa `useRetryCooldown`+`RetryCooldownModal` (cooldown de
  10s), nunca `alert()` — padrão dos 4 pontos de preview/download de PDF de Orçamento.
- **Axios com `responseType: 'blob'`/`'text'` não faz parse automático do corpo de erro** —
  `err.response.data` chega como `Blob`/string crua. `normalizarErroBlob` (`src/utils/
  apiError.ts`) lê o Blob como texto e faz `JSON.parse` antes do catch.
- **`reporEstoque` em E2E é sempre via `POST /lotes-compra`** (`e2e/helpers/insumo.ts`) —
  `PUT /insumos/{id}` ignora `estoqueAtual` no backend, repor estoque com `PUT` não faz nada.
- **Modal sequencial "uma pergunta por vez"** (canônico: `ModalConfirmacaoVinculoSequencial`,
  `components/shared/`, V0.8.3/RN-NOVA-17) — quando uma ação tem N confirmações independentes
  (ex.: cancelar algo com múltiplos vínculos, cada um exigindo Sim/Não próprio), nunca agregar
  numa lista + confirmação única — abrir modal por item, resolver, avançar pro próximo, até
  esgotar a fila. Fila é `useState` local na página que dispara a ação (não hook/contexto
  genérico — só extrair se um 3º consumidor aparecer), construída **antes** de qualquer chamada
  que mude o estado do que está sendo enfileirado (endpoints de reversão validam estado atual no
  servidor, não snapshot — rodar a fila depois quebra sistematicamente).

---

## 6. Legado e exceções

- **`ListaProducaoPage.tsx` não usa `useDebounceSearch` — exceção justificada, não débito.** É a
  única das 6 listagens com dois modos de exibição (lista + Kanban) alimentados pelo mesmo
  filtro/busca compartilhado; `useDebounceSearch` envolve **uma** instância de `usePaginatedList`
  por chamada, não dá para chamá-lo duas vezes sem duplicar o estado de busca.
- **`CancelarProducaoModal` (Fluxo A) vs. `CancelarProducaoPage` (Fluxo B) não duplicam a
  montagem do payload** — são fluxos genuinamente diferentes por design (Modal só envia
  `{ justificativa }`; Page monta `consumoReal` via `ConsumoRealSection`, compartilhada também com
  `AgruparProducoesModal`).
- Rastreamento de tarefas migrou de ClickUp para OpenProject — commits antigos com
  `ClickUp <código> / <task-id>` são histórico, não o padrão atual.

---

## 7. Anti-padrões do projeto

| Anti-padrão | Contexto |
|---|---|
| `overflow: hidden` corta dropdowns/modais | Recorrente — checar sempre em container com dropdown/modal/ActionMenu filho |
| **ActionMenu apenas na lista, nunca duplicar no detalhe** | Prompt que descreve tela de Detalhe nunca deve incluir ActionMenu — checar este documento antes de escrever o prompt, não confiar na memória da sessão |
| API usa camelCase (nunca snake_case) | Backend default Spring/Jackson. Mapeamento errado causa `undefined` silencioso, sem erro visível |
| Campo condicionando exibição de UI precisa estar presente no response da API | Frontend correto + backend incompleto = falha silenciosa, sem erro visível |
| Campo de quantidade em ficha técnica depende de `fracionavel` do insumo | Não-fracionável: backend rejeita decimal, frontend usa `step="1"`. Fracionável: `step="0.01"`. Backend é fonte de verdade |
| **Nenhuma regra de negócio calculada no frontend, nem "só uma multiplicação simples"** | Única exceção consciente: preview de quantidade final em Produção (lotes × rendimento) — o valor gravado de fato vem sempre da resposta do POST, nunca do preview |
| **XOR com duas mensagens de erro distintas, nunca uma genérica** | Tratar "nenhum preenchido" e "os dois preenchidos" como erros diferentes, vindos da API |
| Commit pode ficar "misturado" quando duas mudanças tocam as mesmas linhas do mesmo arquivo | git não separa por trecho sem `git add -p` explícito — documentar no corpo do commit quando acontecer |
| Verificar `git status` no início de toda sessão, não só no fim | Mais de uma vez apareceu trabalho de sessão anterior sem commit, misturado com o que a sessão atual ia tocar |
| Reaproveitar padrão visual ≠ reaproveitar componente | Mesma UI em contexto editável e somente-leitura: recriar o padrão visual isolado, não importar o componente inteiro (que pode vir acoplado a estado editável) |
| Docker: reconstruir o ambiente é responsabilidade do Claude Code, sem perguntar | `docker compose up --build` sozinho — só pedir ajuda se o rebuild falhar por motivo diferente de "já está rodando" (porta ocupada, permissão) |
