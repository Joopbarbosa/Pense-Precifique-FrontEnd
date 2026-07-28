# Pense & Precifique — Front-End

> **V0.6** — Lido automaticamente pelo Claude Code.
> Caminho: `/home/joaobarbosa/Documentos/Projetos/Pense & Precifique/pense-precifique-frontend`
> Projeto pré-produção. Primeiro deploy estável com usuários reais = v1.
> Atualizado em: 2026-07-20 — Retomada de fechamento V0.6: ciclo de vida completo de Produção (Kanban, cancelar Fluxo A/B, agrupar, dividir), varredura de resíduos do fluxo antigo (nenhum encontrado — `RegistroProducaoPage` já não existe, substituída pelas telas abaixo; CLAUDE.md antigo ainda a citava, corrigido aqui), numeração de cenários E2E V0.6 (150–195) documentada com o offset para o doc oficial (168–213), bug de z-index no modal de Agrupar registrado.
>
> **Nota:** este épico foi desenvolvido inteiro na branch `feat/producao-criar-editar` (12 commits), ainda não mergeada em `main` no momento desta retomada — `main` local/remoto não tem nenhum dos componentes de Produção V0.6 (`KanbanBoard`, `ConsumoRealSection`, etc.). Decisão registrada em 2026-07-20: continuar trabalhando na branch, sem merge/push automático.

---

## Stack

React 18 + TypeScript | Vite | React Router v6 | Zustand | Axios
**Estilo:** Tailwind CSS — classes utilitárias. Nunca CSS inline com valores hardcoded. Nunca classes CSS customizadas. Valores verdadeiramente dinâmicos (calculados em JS, vindos de prop ou da API) podem usar `style={{}}`.
**Ícones:** sempre via Lucide React (`import { X } from 'lucide-react'`). Nunca criar SVG manual inline.
**Design system:** tokens em `tailwind.config.ts`. Cores: `text-teal`, `bg-orange`, `text-dark`, `border-line`, `bg-app`, `text-muted`, `text-body`, `text-danger`, etc. Nunca usar valores hex hardcoded — sempre o token correspondente.
**Componentes base:** `Button`, `Input`, `Badge`, `Card`, `ModalShell`, `ConfirmacaoModal`, `EmptyState`, `Spinner`, `ActionMenu` em `components/ui/` e `components/shared/`.
**Hooks:** `usePaginatedList`, `useDebounceSearch`, `useAuth`, `useToast` em `src/hooks/`.
**Constants:** `METODOS_PAGAMENTO`, `MOTIVOS_BAIXA_INSUMO`, `MOTIVOS_BAIXA_PRODUTO`, `STATUS_LABEL` em `src/constants/`.
**Regra overflow:** nunca `overflow-hidden` em container que tenha dropdown, modal ou ActionMenu filho.
**localhost:** `http://localhost:3000` (Docker) / `http://localhost:5173` (dev direto)
**Conta de teste:** `penseprecifique@admin.com` / `senha12345`

---

## Padrões de UI

- Toast: sempre via hook `useToast` — proibido estado boolean local
- **Busca em listagens é sempre server-side**, via `?busca=` para a API, com debounce (~300ms) e reset de paginação para a página 0 a cada nova busca — nunca filtrar client-side sobre os itens já carregados na página. Padrão consolidado em Produtos, Insumos (#110/V0.5) e Orçamentos (#93/V0.5). Filtro client-side é bug, não atalho aceitável — ver histórico de `BUG-BUSCA-PRODUTO`/`BUG-BUSCA-ORCAMENTO` em Bugs conhecidos.
- **Aba Conta (Configurações — alteração de senha):** validação client-side mínima antes de chamar a API (tamanho da nova senha ≥ 8, nova senha === confirmação); erro vindo da API (ex. senha atual incorreta) é lido de `err.response?.data?.message`. Ver `usuarioService.ts` e `ConfiguracoesPage.tsx`.

---

## Cores

| Token | Valor |
|-------|-------|
| teal | `#2A9D8F` |
| orange | `#F97316` |
| dark | `#3A372F` |
| line | `#EFEDE8` |
| app (bg do sistema) | `#FAFAF8` |
| azul (destaque de custo) | `#3A6FA0` |

---

## Regras críticas

- **NUNCA** `overflow: hidden` em containers com dropdowns, modais ou ActionMenu filhos
- `Button fullWidth` dentro de flex: `flexShrink: fullWidth ? 1 : 0`
- Drawer lateral: `left: max(0px, calc(100vw - 440px))`
- Default export em todos os componentes de página
- Dados da empresa: sempre via `GET /empresa` — nunca hardcoded
- **Antes de criar um service novo, conferir `src/services/`** — todo módulo tem o seu (`authService`, `catalogoService`, `clienteService`, `dashboardService`, `empresaService`, `insumoService`, `itemCatalogoService`, `loteCompraService`, `orcamentoService`, `producaoService`, `produtoService`, `usuarioService`). `usuarioService.ts` existe desde o Épico 1 (dados do usuário) e ganhou `alterarSenha` na V0.5 (#111) — não recriar.
- `npm run build` antes de qualquer commit
- **"Compila limpo" nunca é validação suficiente** — toda tela precisa de verificação visual real (Playwright, se disponível no ambiente, ou navegador manual) antes de reportar como concluída. Recorrente no bloco Catálogo: C-003/004/005 foram inicialmente "validados" só por curl, sem checagem visual, até isso ser explicitamente exigido no corpo do prompt a partir do C-005.
- Toda correção de bug ou tarefa de tech debt termina com commit + push antes de considerar o chat encerrado — mesmo sem fechamento de épico. Branch sempre `main`: `git push origin main`. Nunca deixar mudança sem commit entre chats.
- **Rastreamento migrou de ClickUp para OpenProject.** Padrão real confirmado em `git log --oneline -15`: `tipo(escopo): descrição — OpenProject #N` (ex. `fix(insumos): corrige busca de insumos para usar API server-side — OpenProject #110`) — número como **sufixo**, sempre com a palavra "OpenProject" antes do `#N`. Vários números na mesma tarefa: `— OpenProject #94,#95,#96,#97`. Commits antigos com `ClickUp <código> / <task-id>` são histórico, não o padrão atual. **Diferente do backend**, que usa o número como prefixo sem a palavra "OpenProject" (`#N tipo: descrição`) — cada repo segue o próprio `git log`.
- **Todo prompt segue a estrutura fixa de `PADRAO_PROMPTS.md`** (ambiente, comando de commit pronto, conta de teste, checklist de validação) — decidido em 2026-07-09. Arquivo confirmado em `/home/joaobarbosa/Documentos/Projetos/Pense Software/Skills/PADRAO_PROMPTS.md` (fora deste projeto, pasta irmã "Pense Software").

---

## Tipos principais

```ts
type TipoProduto = 'PRODUTO' | 'PRODUTO_BASE' | 'CUSTOMIZACAO'
type StatusOrcamento = 'RASCUNHO'|'ENVIADO'|'APROVADO'|'AGUARDANDO_SINAL'|'SINAL_PAGO'|'EM_PRODUCAO'|'FINALIZADO'|'ENTREGUE'|'PAGO'|'CANCELADO'
type MetodoPagamento = 'PIX'|'DINHEIRO'|'CREDITO'|'DEBITO'|'TRANSFERENCIA'|'BOLETO'|'OUTRO'
```

**Nota (bloco Catálogo):** `Produto` tipo `PRODUTO` não tem mais `precoVenda`/`margemLucro` próprios no formulário (vêm do Catálogo, ou de `margemAplicada` ad-hoc na venda avulsa — RN-054). Ganhou `rendimento`, `custoTotalLote`, `custoUnitario`, `algumInsumoNaoFracionavel`. `CUSTOMIZACAO` manteve `precoVenda`/`margemLucro` normalmente.

---

## Cores de badge por tipo de produto (errata v6)

| Tipo | Cor |
|------|-----|
| PRODUTO | Azul |
| PRODUTO_BASE | Cinza |
| CUSTOMIZACAO | Teal |

Helper: `src/utils/badges.ts` — nunca reimplementar inline.

---

## Telas implementadas ✅

| Tela | Componente | Status |
|------|------------|--------|
| Login | LoginPage | ✅ |
| Cadastro | CadastroPage | ✅ |
| Onboarding | OnboardingPage | ✅ |
| Dashboard | DashboardPage | ✅ |
| Clientes | ClientesPage | ✅ (identificador CLI-N desde V0.2D0) |
| Criar Orçamento | CriarOrcamentoPage | ✅ (ganhou toggle Tudo/Catálogo, RN-054, V0.2D0) |
| Preview PDF | PreviewPdfPage | ✅ |
| Detalhe Orçamento | DetalheOrcamentoPage | ✅ (badge de origem com nome do catálogo + nível "Customizações (N)" separado das pills individuais, desde v0.2.1 — ver Aprendizados críticos) |
| Lista Orçamentos | ListaOrcamentosPage | ✅ (identificador `ORC-N`, **sem cedilha** — corrigido no backend em #93/V0.5; formato antigo `ORÇ-N` estava desatualizado. Busca por cliente ponta a ponta funcional desde #93.) |
| Preview Multa | PreviewMultaPage | ✅ |
| Recibo Sinal | ReciboSinalPage | ✅ |
| Recibo Pagamento | ReciboPagamentoPage | ✅ |
| Lista Insumos | ListaInsumosPage | ✅ (identificador INS-N desde V0.2D0; busca migrada para server-side via `?busca=` em #110/V0.5 — era client-side sobre itens da página, bug corrigido) |
| Form Insumo | FormInsumoPage | ✅ |
| Detalhe Insumo | DetalheInsumoPage | ✅ (produtos relacionados clicáveis, PRO-N, desde V0.2D0) |
| Lista Produtos | ListaProdutosPage | ✅ (identificador PRO-N desde V0.2D0) |
| Cadastrar/Editar Produto | CadastrarProdutoPage | ✅ (única página, cobre os dois — ajustada no bloco Catálogo: sem foto, sem preço/margem exceto CUSTOMIZACAO, rendimento obrigatório, botão "Criar produto catálogo") |
| Detalhe Produto | DetalheProdutoPage | ✅ (rendimento, custo, histórico com catálogo/preço vendido, PRO-N, desde V0.2D0) |
| Lista/Kanban Produção | ListaProducaoPage | ✅ (V0.6 — toggle lista/Kanban, busca por produto, seleção múltipla para agrupar) |
| Nova Produção | NovaProducaoPage | ✅ (V0.6 — N produtos por produção, substituiu `RegistroProducaoPage` do v0/V0.2D0, que não existe mais) |
| Editar Produção | EditarProducaoPage | ✅ (V0.6 — só `AGUARDANDO_INICIO`) |
| Detalhe Produção | DetalheProducaoPage | ✅ (V0.6 — histórico de status, produções filhas, alertas de insumo) |
| Cancelar Produção (Fluxo B) | CancelarProducaoPage | ✅ (V0.6 — `EM_ANDAMENTO`/`TRAVADA`, com `ConsumoRealSection`) |
| Configurações | ConfiguracoesPage | ✅ (aba Conta conectada a `PUT /usuarios/me/senha` desde #111/V0.5 — validação client-side mínima antes da chamada, ver Padrões de UI) |
| **Novo Catálogo** | **NovoCatalogoPage** | ✅ (V0.2D0) |
| **Lista de Catálogos** | **ListaCatalogosPage** | ✅ (V0.2D0 — ActionMenu Editar/Duplicar/Ativar-Desativar vive aqui, não no Detalhe) |
| **Detalhe do Catálogo** | **DetalheCatalogoPage** | ✅ (V0.2D0 — só visualização + lista de itens, sem ActionMenu) |
| **Novo Item de Catálogo** | **NovoItemCatalogoPage** | ✅ (V0.2D0 — também usada para adicionar Produto avulso quando vem do modo "Tudo" do orçamento, RN-054) |

---

## Módulo de Produção (V0.6)

Ciclo de vida completo (6 estados, ver backend `CLAUDE.md`) com lista + Kanban, cancelamento em dois fluxos, agrupamento e divisão. `producaoService.ts` cobre todos os endpoints (`listar`, `buscarPorId`, `criar`, `editar`, `iniciar`, `travar`, `retomar`, `finalizar`, `cancelar`, `agrupar`) — sem resíduo do endpoint antigo `/producoes/lote`.

- **`<KanbanBoard>`** (`components/kanban/KanbanBoard.tsx`) é genérico, usado só por Produção hoje. Sensor de arraste é **só `PointerSensor`** (`activationConstraint: { distance: 6 }`) — sem `KeyboardSensor`, então arrastar card não é acessível por teclado (débito, ver OP). Em teste E2E, `page.dragTo()`/`click`+`force` não disparam os eventos de `dnd-kit` de forma confiável — usar sempre a sequência manual de mouse do helper `arrastarCard` (`e2e/helpers/producao.ts`), não recriar inline.
- **`ConsumoRealSection`** (`components/producao/ConsumoRealSection.tsx`) é compartilhado entre `CancelarProducaoPage` (Fluxo B) e `AgruparProducoesModal` — mesma UI de declarar consumo real por item. Os inputs não têm `data-testid` (débito, seletores em teste usam label/placeholder).
- **`CancelarProducaoModal` (Fluxo A, `AGUARDANDO_INICIO`) vs. `CancelarProducaoPage` (Fluxo B, `EM_ANDAMENTO`/`TRAVADA`)** não duplicam a montagem do payload — são fluxos genuinamente diferentes por design: o Modal só envia `{ justificativa }` (produção nunca baixou insumo), a Page monta `consumoReal` via `ConsumoRealSection`. A única repetição é o padrão trivial de validação `MIN_CHARS = 30`/`len`/`valido`, comum a todo formulário de justificativa do sistema — não é o mesmo débito.
- **`reporEstoque` em E2E é sempre via `POST /lotes-compra`** (`e2e/helpers/insumo.ts`) — é o caminho real de entrada de estoque usado pelo `loteCompraService`; `PUT /insumos/{id}` ignora `estoqueAtual` no backend, então repor estoque com `PUT` silenciosamente não faz nada.
- **Criação de produções em massa em teste E2E é sempre sequencial** (`for...of` com `await`), nunca `Promise.all` — o backend gera `numero` via `MAX+1` sem lock (`uq_producao_usuario_numero`); criação concorrente real do mesmo usuário pode colidir na constraint (ver backend `CLAUDE.md`, Race condition conhecida).
- **Bug de UI conhecido — botão "Agrupar" fisicamente inacessível a clique de mouse:** `ModalShell` renderiza o rodapé do modal em `z-[110]`, mas a barra fixa de seleção "N selecionada(s) / Agrupar selecionadas" de `ListaProducaoPage.tsx:624` fica em `z-[150]` e **continua renderizada por baixo do `AgruparProducoesModal`** (só é desligada em `encerrarSelecao()`, chamada depois do sucesso, nunca ao abrir o modal). O botão "Agrupar" do modal fica coberto pela barra externa — um clique real de mouse nesse ponto da tela atinge a barra, não o modal; `force: true` não contorna (o hit-testing físico do navegador ainda aponta pro elemento de cima). Testes E2E usam `dispatchEvent('click')` no botão do modal para validar a lógica de negócio (não é uma correção do bug — ver comentário completo em `e2e/producao/agrupar-producoes.spec.ts:1-74`). **Bug real, bloqueia o fluxo de agrupamento para a usuária final** — não corrigido nesta varredura, ver OP.

---

## Bugs conhecidos (v0)

| ID | Descrição |
|----|-----------|
| C10 | Upload de logo do perfil não funciona nas Configurações |
| 006.1 | Campo de quantidade em ficha técnica exibe "025" ao digitar "0,25" em insumo não-fracionável (exibição cosmética; validação de envio funciona) — adiado, sem data |

**Bugs de backend que afetavam a UI — ambos corrigidos:**
- `GET /produtos?busca=` ignorava o parâmetro de busca (`BUG-BUSCA-PRODUTO`). Corrigido no backend em 2026-07-09, commit `222b939`. Validado via curl e Playwright na tela de Orçamento (modo "Tudo").
- `GET /orcamentos` não tinha parâmetro `busca` em nenhuma camada (`BUG-BUSCA-ORCAMENTO`, descoberto no P006/V0.4). **Resolvido em #93 (V0.5):** backend implementou `?busca=` filtrando por `cliente.nome` (case-insensitive, combinável com `?status=`); o frontend já enviava o parâmetro desde o P006, então a busca funciona ponta a ponta desde #93 sem mudança no frontend.

Nenhum dos dois é mais uma hipótese a descartar antes de investigar o frontend — se uma busca em listagem parecer quebrada agora, o bug está no frontend.

---

## Aprendizados críticos

| Regra | Contexto |
|-------|----------|
| `overflow: hidden` corta dropdowns/modais | Recorrente em C-018, C-019, C-033 (v0) e novamente no C-006.1 (bloco Catálogo) |
| Empresa: sempre `GET /empresa`, nunca hardcoded | Corrigido em PreviewPdfPage, PreviewMultaPage, ReciboSinalPage, ReciboPagamentoPage |
| `Button fullWidth` dentro de flex precisa `flexShrink` | C-018 |
| **ActionMenu apenas na lista, não duplicar no detalhe** | C-033 (v0). Regredido no C-006 (Detalhe do Catálogo ganhou ActionMenu por engano), corrigido no C-006.1. **Prompt que descreve tela de Detalhe nunca deve incluir ActionMenu — checar este documento antes de escrever o prompt, não confiar na memória da sessão.** |
| Empty state em filtro deve preservar layout da lista | Épico 7 |
| Botões condicionais por estado do orçamento | DetalheOrcamentoPage: Recibo sinal, PDF multa, Recibo estorno |
| API usa camelCase (nunca snake_case) | Backend default Spring/Jackson, camelCase puro. Mapeamento errado causa `undefined` silencioso, sem erro visível |
| Campo condicionando exibição de botão/UI precisa estar presente no response da API | Botão "PDF de multa" não aparecia por campo ausente no DTO Java, mesmo existindo no tipo TypeScript e na entidade. Frontend correto + backend incompleto = falha silenciosa. |
| Campo de quantidade em ficha técnica depende de `fracionavel` do insumo | Insumo não-fracionável: backend rejeita decimal, frontend usa `step="1"`. Fracionável: `step="0.01"`. Backend é fonte de verdade. |
| **Nenhuma regra de negócio calculada no frontend, nem "só uma multiplicação simples"** | Única exceção aberta conscientemente: preview de quantidade final em Produção (lotes × rendimento, C-009) — porque os dois valores já estão na tela e o valor gravado de fato vem sempre da resposta do POST, nunca do preview. Qualquer outro cálculo (preço sugerido, custo) é sempre do backend. |
| **XOR com duas mensagens de erro distintas, nunca uma genérica** | Quantidade/lotes na Produção (RN-051), origem do item no Orçamento (RN-054). Sempre tratar "nenhum preenchido" e "os dois preenchidos" como erros diferentes, vindos da API. |
| Commit pode ficar "misturado" quando duas mudanças tocam as mesmas linhas do mesmo arquivo | C-007 (toggle Tudo/Catálogo) e um fix pré-existente de customizações via API ficaram no mesmo commit porque mexiam nas mesmas linhas de `CriarOrcamentoPage.tsx` — git não separa por trecho de mudança sem `git add -p` explícito. Documentar no corpo do commit quando isso acontecer. |
| Verificar `git status` no início de toda sessão, não só no fim | Mais de uma vez neste bloco (C-001, C-007) apareceu trabalho de sessão anterior sem commit, misturado com o que a sessão atual ia tocar. Perguntar como tratar (commitar separado antes) antes de começar a editar. |
| Reaproveitar padrão visual ≠ reaproveitar componente | `DetalheOrcamentoPage` precisava do mesmo padrão de badges do `ItemRow` em `CriarOrcamentoPage` (origem + "Customizações (N)" + pills), mas `ItemRow` está acoplado a estado editável (stepper, modal, remover) que não existe numa tela somente-leitura. Solução: recriar o padrão visual isolado, não importar/reaproveitar o componente inteiro. Vale sempre que a mesma UI aparece em contexto editável e contexto somente-leitura. |
| Docker: Claude Code reconstrói o ambiente sozinho, sem perguntar | Regra antiga era não mexer em Docker e pedir pro usuário subir o ambiente — revertida em 2026-07-09. `docker compose up --build` é responsabilidade do Claude Code a partir de agora; só pedir ajuda se o rebuild falhar por motivo diferente de "já está rodando" (porta ocupada, permissão). |

---

## Testes E2E (infra nova — V0.5)

`playwright.config.ts` na raiz + `e2e/` com specs por feature e um `e2e/helpers/` compartilhado:

```
e2e/
├── helpers/
│   ├── auth.ts     # login/setup — sempre reutilizar, nunca recriar inline
│   ├── api.ts       # helpers de chamada direta à API (setup/cleanup de dados de teste)
│   └── list.ts       # helpers de listagem paginada/busca
├── insumo-desativar-confirmacao.spec.ts     # cenário 159
├── cliente-drawer-scroll.spec.ts             # cenário 160
├── sidebar-overlay.spec.ts                    # cenário 161
├── configuracoes-toast.spec.ts                # cenário 162
├── insumo-busca-server-side.spec.ts          # cenários 163-164 (#110)
├── configuracoes-alterar-senha.spec.ts       # cenários 165-167 (#111)
├── producao/                                  # cenários 150-195 (V0.6, ver nota de numeração abaixo)
│   ├── criar-producao.spec.ts                 # cenários 150-157 (Fluxo A)
│   ├── editar-producao.spec.ts                # cenários 158-159 (Fluxo A.1)
│   ├── iniciar-travar-retomar.spec.ts        # cenários 160-167 (Fluxo B)
│   ├── finalizar-producao.spec.ts             # cenários 168-169 (Fluxo C)
│   ├── cancelar-producao.spec.ts              # cenários 170-176 (Fluxo D)
│   ├── lista-producao.spec.ts                 # cenários 177-180 (Fluxo E)
│   ├── kanban-producao.spec.ts                # cenários 181-184 (Fluxo F)
│   ├── detalhe-producao.spec.ts               # cenários 185-188 (Fluxo G)
│   ├── agrupar-producoes.spec.ts              # cenários 191-195 (Fluxo I)
│   └── smoke-tech-debt.spec.ts                # smoke #127/#148, sem número de cenário
└── orcamento/
    └── validacao-estoque.spec.ts              # cenários 189-190 (Fluxo H — aviso de estoque no orçamento, #126)
```

Cenários renumerados na retomada V0.5 (146–154 → 159–167, colisão com a v0.3 — ver `docs/SCENARIOS(2).md`). Numeração mais alta confirmada nos specs de fora de Produção: **167**.

**Numeração V0.6 (Produção) — offset conhecido:** os specs em `e2e/producao/` usam **150–195** (numeração do momento em que foram escritos). O doc oficial de cenários (`docs/version/V0.6/SCENARIOS_EP-PRODUCAO_V0.6D0.md`) foi renumerado depois para **168–213** (offset **+18**) — confirmado por grep direto no doc (`Cenário 168 — Criar produção...`, `Cenário 213 — Datas da nova produção agrupada...`). Os specs **não foram renumerados** para acompanhar (débito, ver OP). **Ao criar um spec novo para Produção, seguir a numeração do doc oficial (168–213), não a dos specs existentes (150–195)** — e não presumir que o offset é constante em cenários intermediários sem conferir os dois lados.

**Novos testes E2E sempre reutilizam os helpers de `e2e/helpers/`** — nunca recriar login/setup inline em um spec novo.

Rodar: `npx playwright test e2e/<arquivo>.spec.ts --reporter=list` (containers precisam estar de pé — `docker compose up -d`).

**Reset de banco entre execuções (V0.6.1, achado do P-TESTE-001):** `e2e/global-setup.ts`, ligado via `globalSetup` em `playwright.config.ts`, roda **uma vez antes de toda a suíte** (mesmo filtrando por arquivo) e faz `TRUNCATE ... CASCADE` de todas as tabelas de domínio direto no container do Postgres (`docker exec pense-precifique-db psql ...`) — nunca `docker compose down -v`/`up`, porque a conta de teste (`penseprecifique@admin.com`) não é seedada por nenhuma migration nem script, só existe porque foi cadastrada manualmente uma vez e vive no volume; derrubar o volume apagaria a conta e quebraria `login()` (que não trata fluxo de registro/onboarding). O TRUNCATE preserva deliberadamente `usuarios`, `empresas`, `configuracoes_precificacao` e `flyway_schema_history` — só zera dados de domínio (`producoes`, `orcamentos`, `insumos`, `produtos`, `clientes`, `catalogos` etc., lista completa no próprio arquivo). Sem isso, estados terminais sem hard-delete (ex. `NAO_REALIZADA`) se acumulavam indefinidamente entre rodadas e quebravam asserções de contagem/estado limpo (Cenário 199 chegou a ter 2185 produções e 13 badges "Não realizada" de execuções antigas). Rodar a suíte sempre pelo Playwright (`npx playwright test` / `npm run test:e2e`) para o reset disparar — nunca pular direto para os specs sem passar pelo config.

---

## Padrão de commits

Rastreamento de tarefas migrou de ClickUp para OpenProject. Formato real confirmado em `git log --oneline -15` — número da issue como **sufixo**, sempre com a palavra "OpenProject":

```
feat(escopo): nova funcionalidade — OpenProject #N
fix(escopo): correção de bug — OpenProject #N
refactor(escopo): refatoração — OpenProject #N
chore(escopo): configuração/infra — OpenProject #N
test: descrição — OpenProject #N,#M   (múltiplas issues na mesma tarefa)
```

**Nota:** o backend (`pense-precifique-backend/CLAUDE.md`) documenta um padrão diferente (`#N tipo(escopo): descrição`, número como prefixo, sem a palavra "OpenProject") — cada repo segue o próprio `git log`, não o do outro.
