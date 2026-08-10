# Pense & Precifique — Front-End

> **V0.6** — Lido automaticamente pelo Claude Code.
> Caminho: `/home/joaobarbosa/Documentos/Projetos/Pense & Precifique/pense-precifique-frontend`
> Projeto pré-produção. Primeiro deploy estável com usuários reais = v1.
> Atualizado em: 2026-07-28 — Módulo de Produção V0.6 (Kanban, cancelar Fluxo A/B, agrupar, dividir) confirmado **em `main`, mergeado e estável** — a nota de 2026-07-20 sobre a branch `feat/producao-criar-editar` ainda não mergeada estava desatualizada (confirmado via `git log`: `main` já tinha o módulo completo, 130+ commits à frente de `origin/master`, antes mesmo do início da Onda 1 de correções abaixo). Onda 1 de correções pontuais (P-FE-CORRIGE-001 a 011) aplicada nesta mesma retomada: declaração de perda ao finalizar produção (RN-NOVA-4), botão "Criar produção" para item de orçamento sem estoque (RN-NOVA-5), preview de preço de item de catálogo sem persistência prematura (RN-NOVA-8), drag-and-drop do Kanban via teclado (`KeyboardSensor`), coluna própria `NÃO_REALIZADA` no Kanban (oculta por padrão), identificador `ORC-N` corrigido na Listagem de Orçamentos, `@dnd-kit/sortable` removido (dependência não usada). Itens bloqueados por backend (numeração por `numero` real vez de nome, contagem de badges por categoria em Produtos, filtro de intervalo de data em `GET /orcamentos`) documentados nos relatórios de sessão, não implementados no frontend.
> Atualizado em: 2026-07-31 — Retomada de fechamento V0.6.1.1 (pocket de limpeza): itens bloqueados por backend da nota acima todos resolvidos e implementados. Componente `Field` unificado, `ModalShell` confirmado como padrão oficial de modal, `CancelarProducaoPage` migrada para modal (`CancelarProducaoConsumoModal`), `RetormarProducaoModal` renomeado (typo corrigido), `KeyboardSensor` no Kanban implementado e testado. Decisão de fluxo sem branch por tarefa.
> Atualizado em: 2026-08-09 — #238 (V0.7): tag global fracionável/estoque negativo/estoque atual (RN-NOVA-10, registrada em `DECISOES_GLOBAIS.md`) estendida a todas as telas de listagem/busca de Produto/Insumo por componente individual, não só o agregado do produto já existente. Componente novo `EstoqueTags` em `components/ui/Badge.tsx` (agrupa `FracionavelBadge`+`EstoqueNegativoBadge`+`EstoqueAtualBadge`, cor verde/laranja em vez de teal/cinza — mudança visual retroativa nos 4 consumidores antigos também). Passo 0 (curl + leitura de DTO Java) encontrou 4 respostas de API sem os 3 campos — `ItemCatalogoBuscaResponse`, `ItemCatalogoResponse`, `OrcamentoItemResponse`, `ProducaoProdutoResponse` — usuário optou por eu também alterar o backend nesta mesma sessão (mappers passaram a receber `List<FichaTecnicaItem>`/`Map<UUID,List<FichaTecnicaItem>>` do Service, mesmo padrão N+1 já usado em `ProdutoService`); commit backend separado, próprio repo/branch `feature/V0.7`. `ListaProducaoPage.tsx` ganhou `ProdutosLista` — produtos de uma produção agora renderizam em linhas próprias (nome + tag) em vez do `nomesProdutos.join(', ')` antigo, nas 3 visões (tabela, card mobile, card Kanban); nenhum teste E2E dependia do formato de string antigo (confirmado via grep antes da mudança).
> Atualizado em: 2026-08-09 — `BUG-RESOLVER-VINCULOS-INSUMO` corrigido (#228, V0.7). Causa raiz real: não era bug de toast/frontend wiring — a chamada `POST /insumos/{id}/resolver-vinculos` sempre falhava com 400 (`"Valor inválido para o campo 'acao'."`) porque o frontend de Insumo enviava `acao: 'INATIVAR_VINCULADOS'`, um literal que nunca existiu no enum compartilhado do backend `AcaoResolucaoVinculo` (`REMOVER_VINCULOS` | `SUBSTITUIR`). Confirmado via curl direto na API antes de qualquer alteração (Passo 0), e por comparação com o fluxo análogo de Produto (`ListaProdutosPage.tsx`), que já usava `'REMOVER_VINCULOS'` corretamente desde o início — só o lado de Insumo divergiu. Corrigido trocando o literal em `src/types/insumo.ts` e `ListaInsumosPage.tsx` (2 usos), sem tocar no backend. `resolver-vinculos-insumo.spec.ts` passou 6x seguidas após a correção (mais suíte completa de Insumo, 11/11); validação visual manual via script Playwright avulso confirmou toast + status "Inativo" na listagem.

---

## Stack

React 18 + TypeScript | Vite | React Router v6 | Zustand | Axios
**Estilo:** Tailwind CSS — classes utilitárias. Nunca CSS inline com valores hardcoded. Nunca classes CSS customizadas. Valores verdadeiramente dinâmicos (calculados em JS, vindos de prop ou da API) podem usar `style={{}}`.
**Ícones:** sempre via Lucide React (`import { X } from 'lucide-react'`). Nunca criar SVG manual inline.
**Design system:** tokens em `tailwind.config.ts`. Cores: `text-teal`, `bg-orange`, `text-dark`, `border-line`, `bg-app`, `text-muted`, `text-body`, `text-danger`, etc. Nunca usar valores hex hardcoded — sempre o token correspondente.
- **Espaçamento: `spacing.section` = `18px`** (`tailwind.config.ts`, V0.7/#204) — token para o ritmo vertical entre blocos/seções (`mt-section`, `mb-section`, `gap-section`), mesmo padrão de `borderRadius.card`/`boxShadow.card`. Aplicado em `DashboardPage.tsx` (Header, Métricas, Alerta de estoque, Grid inferior, Ações Rápidas), substituindo os 6 usos de `mt-[18px]`/`gap-[18px]`/`mb-[18px]` arbitrários. `18px` também aparece como valor arbitrário em dezenas de outras telas (ex. `ListaOrcamentosPage`, `DetalheOrcamentoPage`, `ConfiguracoesPage`) — não migradas nesta tarefa, candidatas a reaproveitar o token quando forem tocadas por outro motivo. Padding interno de `Card` (20/22/24px, inconsistente entre `MetricCard` e os demais cards do Dashboard) permanece sem token — decisão de design não coberta por esta tarefa.
**Componentes base:** `Button`, `Input`, `Badge`, `Card`, `ModalShell`, `Field`, `ConfirmacaoModal`, `EmptyState`, `Spinner`, `ActionMenu` em `components/ui/` e `components/shared/`.
- **`ModalShell` é o padrão oficial de todo modal do sistema** (V0.6.1.1) — nunca reimplementar overlay/painel/botão-fechar inline. Renderiza `title` acima de `subtitle` (ordem corrigida em `434034c`, era invertida) e fecha via Escape. Último débito migrado: wizard de cancelamento com multa/estorno em `DetalheOrcamentoPage.tsx` (`ModalCancelMulta`/`ModalCancelEstorno`) e `CompraLoteModal`/`ImpactoLoteModal` em `ListaInsumosPage.tsx` — nenhum consumidor conhecido reimplementa modal inline hoje. Wizards de múltiplos passos usam o slot `footer` do `ModalShell` para empilhar a barra de progresso (Dots) acima da linha de botões (`<div className="flex w-full flex-col gap-3">`), já que o `ModalShell` só expõe uma única região de rodapé — título/subtitle mudam por passo (`title` = rótulo do passo atual, `subtitle` = "Cancelar · Passo N de M").
- **`Field` é o wrapper oficial de label+input** (`components/ui/Field.tsx`, prop `size?: 'sm'|'md'`, V0.6.1.1) — substituiu as 4 implementações locais divergentes (`FormInsumoPage`, `CadastrarProdutoPage`, `NovoCatalogoPage`, `NovoItemCatalogoPage`). Nunca recriar wrapper de label local — usar este.
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
- **Decisão de fluxo (2026-07-29):** esta leva (V0.6.1.1) não usa branch por tarefa — todo trabalho vai direto em `main`, sem staging separado.
- **Nota de backlog "decisão registrada"/"concluído" não é o mesmo que confirmado no código** — sempre conferir o código-fonte (ou curl na API) antes de escrever prompt/implementação em cima de uma anotação assim. Recorrente nesta leva: vários itens do backlog vivo ficaram marcados como pendentes (checkbox `[ ]` de Frontend/Teste) mesmo depois de implementados — a fonte de verdade é sempre o código e o `git log`, não o checkbox.
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
| Cancelar Produção (Fluxo B) | CancelarProducaoConsumoModal | ✅ (V0.6.1.1 — `EM_ANDAMENTO`/`TRAVADA`, com `ConsumoRealSection`; migrado de página cheia (`CancelarProducaoPage`) para modal sobre `ModalShell`, #160) |
| Configurações | ConfiguracoesPage | ✅ (aba Conta conectada a `PUT /usuarios/me/senha` desde #111/V0.5 — validação client-side mínima antes da chamada, ver Padrões de UI) |
| **Novo Catálogo** | **NovoCatalogoPage** | ✅ (V0.2D0) |
| **Lista de Catálogos** | **ListaCatalogosPage** | ✅ (V0.2D0 — ActionMenu Editar/Duplicar/Ativar-Desativar vive aqui, não no Detalhe) |
| **Detalhe do Catálogo** | **DetalheCatalogoPage** | ✅ (V0.2D0 — só visualização + lista de itens, sem ActionMenu) |
| **Novo Item de Catálogo** | **NovoItemCatalogoPage** | ✅ (V0.2D0 — também usada para adicionar Produto avulso quando vem do modo "Tudo" do orçamento, RN-054) |

---

## Módulo de Produção (V0.6)

Ciclo de vida completo (6 estados, ver backend `CLAUDE.md`) com lista + Kanban, cancelamento em dois fluxos, agrupamento e divisão. `producaoService.ts` cobre todos os endpoints (`listar`, `buscarPorId`, `criar`, `editar`, `iniciar`, `travar`, `retomar`, `finalizar`, `cancelar`, `agrupar`) — sem resíduo do endpoint antigo `/producoes/lote`.

- **`<KanbanBoard>`** (`components/kanban/KanbanBoard.tsx`) é genérico, usado só por Produção hoje. Sensor de arraste é `PointerSensor` (`activationConstraint: { distance: 6 }`) **+ `KeyboardSensor`** desde V0.6.1.1 (#177) — `coordinateGetter` customizado move por coluna inteira, com anúncios de leitor de tela e foco visível; testado 100% via teclado (Tab, Space/Enter, setas, Escape) em `kanban-producao.spec.ts`. Em teste E2E via mouse, `page.dragTo()`/`click`+`force` não disparam os eventos de `dnd-kit` de forma confiável — usar sempre a sequência manual de mouse do helper `arrastarCard` (`e2e/helpers/producao.ts`), não recriar inline.
- **`ConsumoRealSection`** (`components/producao/ConsumoRealSection.tsx`) é compartilhado entre `CancelarProducaoPage` (Fluxo B) e `AgruparProducoesModal` — mesma UI de declarar consumo real por item. Os inputs não têm `data-testid` (débito, seletores em teste usam label/placeholder).
- **`CancelarProducaoModal` (Fluxo A, `AGUARDANDO_INICIO`) vs. `CancelarProducaoPage` (Fluxo B, `EM_ANDAMENTO`/`TRAVADA`)** não duplicam a montagem do payload — são fluxos genuinamente diferentes por design: o Modal só envia `{ justificativa }` (produção nunca baixou insumo), a Page monta `consumoReal` via `ConsumoRealSection`. A única repetição é o padrão trivial de validação `MIN_CHARS = 30`/`len`/`valido`, comum a todo formulário de justificativa do sistema — não é o mesmo débito.
- **`reporEstoque` em E2E é sempre via `POST /lotes-compra`** (`e2e/helpers/insumo.ts`) — é o caminho real de entrada de estoque usado pelo `loteCompraService`; `PUT /insumos/{id}` ignora `estoqueAtual` no backend, então repor estoque com `PUT` silenciosamente não faz nada.
- **Criação de produções em massa em teste E2E é sempre sequencial** (`for...of` com `await`), nunca `Promise.all` — o backend gera `numero` via `MAX+1` sem lock (`uq_producao_usuario_numero`); criação concorrente real do mesmo usuário pode colidir na constraint (ver backend `CLAUDE.md`, Race condition conhecida).
- **`ListaProducaoPage.tsx` não usa `useDebounceSearch` — exceção justificada, não débito.** É a única das 6 listagens do sistema com dois modos de exibição (lista paginada por scroll infinito + Kanban, board completo em página única de tamanho 100) alimentados pelo **mesmo** filtro/busca compartilhado (`filtro`, `query`, `sortParam`, `dataInicioDe`, `dataInicioAte`). `useDebounceSearch` (`src/hooks/useDebounceSearch.ts`) possui internamente seu próprio `query`/`setQuery` e envolve **uma** instância de `usePaginatedList` por chamada do hook — não dá pra chamá-lo duas vezes (uma para a lista, uma para o Kanban) sem duplicar o estado de busca em duas fontes de verdade independentes, e não há como compartilhar um `query` externo com o hook hoje. O padrão de filtros extra não-debounçados (status/período) usado em `ListaOrcamentosPage.tsx` — `useDebounceSearch` só pro texto + `useEffect` próprio chamando `reset()` sem debounce quando o filtro muda — **não resolve** esse caso, porque o problema não é ter filtro extra, é ter dois fetchers (`carregar`/`carregarKanban`) reagindo ao mesmo `query`. `ListaProducaoPage.tsx` mantém dois `useEffect` de debounce manual quase idênticos (`carregar()`/`carregarKanban()`, ambos com `delay = query.trim() ? 300 : 0`) — duplicação real, mas menor risco que estender a API pública do hook (usada por outras 5 telas) para um caso de uso único no sistema.
- **Bug de UI (z-index) do botão "Agrupar" — CORRIGIDO em #165 (commit `5007ad83`, 2026-07-25), nota abaixo estava desatualizada:** esta entrada descrevia `ModalShell` (rodapé em `z-[110]`) coberto pela barra fixa de seleção "N selecionada(s) / Agrupar selecionadas" de `ListaProducaoPage.tsx` (`z-[150]`), que continuava renderizada por baixo do `AgruparProducoesModal` até o sucesso (`encerrarSelecao()`). Corrigido: `ListaProducaoPage.tsx` ganhou o estado `barraSelecaoOculta`, setado por `abrirModalAgrupar()` antes de abrir o modal; a barra passou a renderizar condicionada a `modoAgrupamento && !barraSelecaoOculta`, então some assim que o modal abre. `e2e/producao/agrupar-producoes.spec.ts` já reflete isso — `confirmarAgrupamento()` usa `.click()` real (sem `force`/`dispatchEvent`) desde a re-homologação P-TESTE-001. Reconfirmado em 2026-07-31 (retomada desta OP): suíte E2E do arquivo roda com clique real sem falha de sobreposição, e `document.elementFromPoint()` no centro do botão do modal aponta para o próprio rodapé do modal, não para a barra externa. Esta nota do `CLAUDE.md` não foi atualizada quando #165 corrigiu o bug — ficou descrevendo um bug já resolvido por duas retomadas seguintes (2026-07-28, 2026-07-31); fonte de verdade é sempre código + `git log`, não esta nota (ver regra "decisão registrada" acima).

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

Cenários renumerados na retomada V0.5 (146–154 → 159–167, colisão com a v0.3 — ver `legado/SCENARIOS.md`, seção "Cenários 155–167 — Pocket V0.5"). Numeração mais alta confirmada nos specs de fora de Produção: **167**.

**Numeração V0.6 (Produção) — offset conhecido:** os specs em `e2e/producao/` usam **150–195** (numeração do momento em que foram escritos). O doc oficial de cenários (`legado/SCENARIOS.md`, seção "Cenários 168–213 — Módulo de Produção V0.6") foi renumerado depois para **168–213** (offset **+18**) — confirmado por grep direto no doc (`Cenário 168 — Criar produção...`, `Cenário 213 — Datas da nova produção agrupada...`). Os specs **não foram renumerados** para acompanhar (débito, ver OP). **Ao criar um spec novo para Produção, seguir a numeração do doc oficial (168–213), não a dos specs existentes (150–195)** — e não presumir que o offset é constante em cenários intermediários sem conferir os dois lados. Cenários vigentes de Produção hoje moraram para `modulos/PRODUCAO/cenarios-producao.md` (`PDC-CEN-XXX`) na migração modular — `legado/SCENARIOS.md` fica só como registro histórico da renumeração, não consultar para cenário novo.

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
