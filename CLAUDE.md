# Pense & Precifique — Front-End

> React 18 + TypeScript · Vite · React Router v7 (migrado de v6 na V0.9.0/#420,#431 —
> achado seguranca-resiliencia, GHSA-337j-9hxr-rhxg/GHSA-wrjc-x8rr-h8h6 só corrigiam
> em v7+) · Zustand · Axios · Tailwind CSS
> Projeto pré-produção. Primeiro deploy estável com usuários reais = v1.
> Última atualização: 24/09/2026 (Retomada V0.14.0) · Branch padrão atual: `feature/V0.14.0`
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

**Unidade de medida em E2E** (V0.14.0/#298): `POST/PUT /insumos` exige `unidadeMedidaId` (FK), não
mais texto livre. `global-setup.ts` semeia 1 unidade padrão ("unidade") logo após o `TRUNCATE` —
sem ela, specs que dirigem `/insumos/novo` pela UI travam ("Salvar insumo" nunca habilita). Todo
helper que cria insumo resolve o id via `resolverUnidadeMedidaId` (`e2e/helpers/unidadeMedida.ts`)
— nunca montar payload de insumo com a sigla em texto.

---

## 2. Onde cada coisa vai

| Categoria | Local |
|---|---|
| Componentes base (`Button`, `Input`, `Badge`, `Card`, `ModalShell`, `Field`, `ConfirmacaoModal`, `EmptyState`, `Spinner`, `ActionMenu`, `SortableHeader`, `Toast`, `Toggle`, `SegmentedControl`, `Tag`) | `components/ui/`, `components/shared/` |
| Domínio compartilhado de venda (`ItemSearch`, `ItemLinha`, `ModalCustomizacoes`, `ModalCalculadoraItem`, `CustomizacaoSeletor`, `DescontoBlock`, `ClienteSelect`, `SectionCard`, `ModoToggle`) — consumido por Orçamento, Caixa e Catálogo | `components/venda/` (novo, V0.12.0) |
| Hooks (`usePaginatedList`, `useDebounceSearch`, `useDebouncedValue`, `useAuth`, `useToast`) | `src/hooks/` |
| Constants (`METODOS_PAGAMENTO`, `MOTIVOS_BAIXA_INSUMO`, `MOTIVOS_BAIXA_PRODUTO`, `STATUS_LABEL`) | `src/constants/` |
| Testes E2E — specs por feature + helpers compartilhados (`auth.ts`, `api.ts`, `list.ts`) | `e2e/`, `e2e/helpers/` |
| Testes E2E de segurança (modelo de atacante — IDOR, etc., skill `seguranca-resiliencia`) | `e2e/seguranca/` (novo, V0.8.4) |
| Documentação funcional (regras, cenários, contrato, decisões) | **não vive aqui** — `../docs-pense-precifique/modulos/[MODULO]/` |

---

## 3. Verificar antes de criar

- **Service novo?** Conferir `src/services/` primeiro — todo módulo já tem o seu (`authService`,
  `caixaService` (V0.12.0), `catalogoService`, `clienteService`, `dashboardService`,
  `empresaService`, `insumoService`, `itemCatalogoService`, `loteCompraService`, `orcamentoService`,
  `producaoService`, `produtoService`, `unidadeMedidaService` (V0.14.0), `usuarioService`).
- **Upload de imagem novo?** Já existem 3 cópias inline do mesmo bloco (foto de item de catálogo,
  foto de produto, logo da empresa) — o 4º ponto dispara a extração do componente compartilhado
  (OpenProject #556), não uma 4ª cópia. Validação de formato/tamanho é só do backend; o frontend
  usa `accept="image/jpeg,image/png"` como dica e exibe a mensagem que vier da API.
- **Componente de UI novo?** Conferir `components/ui/`/`components/shared/`/`components/venda/`
  (este último para qualquer coisa de busca/carrinho/customização/cliente que sirva Orçamento **e**
  Caixa) — wrapper de label+input é sempre `Field` (`components/ui/Field.tsx`, prop
  `size?: 'sm'|'md'`), modal é sempre `ModalShell`, controle binário com 2 opções é sempre
  `SegmentedControl` (`components/ui/SegmentedControl.tsx`, V0.12.0). Nunca reimplementar local.
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
  hardcoded, sempre o token correspondente. **Anel de foco:** token `ring-teal/focus` (25%,
  V0.12.0, mesmo peso do `Toggle`) — substituiu `ring-teal/[0.12]` (12%, quase imperceptível)
  duplicado em 5 arquivos junto de `inputBase`. `Tag` (`components/ui/Badge.tsx`, V0.12.0) é a
  pílula genérica com tons `green`/`orange` — canônica para qualquer par de estado curto (ex.:
  cabeçalho de turno do Caixa), não reimplementar como `<span>` solto.
- **Toast:** sempre via `useToast` (estado) + `<Toast>` (`components/shared/Toast.tsx`, prop
  `variant?: 'success'|'error'`) pra renderizar — proibido estado boolean local e proibido copiar
  o `<div>` de renderização inline (V0.11.0/#352, 19 pontos consolidados).
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
  servidor, não snapshot — rodar a fila depois quebra sistematicamente). **Mecânica ≠
  componente:** `ModalCustomizacoes` (`CriarOrcamentoPage.tsx`, V0.8.4/#399) é o 3º consumidor
  da mesma mecânica de fila (uma calculadora de preço por customização selecionada, avançando
  até esgotar), mas **não importa** `ModalConfirmacaoVinculoSequencial` — o conteúdo por passo é
  uma calculadora inteira, não uma pergunta Sim/Não, então o componente compartilhado não serve;
  só o padrão de estado (`fila`/avançar/`key` por item para forçar remount) se repete. Extrair um
  hook genérico só valeria se um 4º consumidor aparecer com o mesmo formato de passo.
- **`<SortableHeader>`** (canônico: `components/shared/SortableHeader.tsx`, genérico sobre
  `<F extends string>` — props `label`/`field`/`activeField`/`dir`/`onSort`) — cabeçalho de coluna
  ordenável (ícone `ArrowUp`/`ArrowDown` trocado conforme direção ativa). Usado por
  `ListaOrcamentosPage.tsx`/`ListaProducaoPage.tsx`/`ListaCatalogosPage.tsx` (V0.11.0/#351) — nunca
  reimplementar local, nem como `<div onClick>` com ícone único rotacionando.
- **`useDebouncedValue<T>(value, delay = 300)`** (`src/hooks/useDebouncedValue.ts`, V0.11.0/#357) —
  debounce de valor puro, sem acoplamento a paginação (diferente de `useDebounceSearch`, que já
  embute uma instância de `usePaginatedList`). Canônico para autocomplete/busca inline
  (`ClienteSelect`/`ItemSearch` em `CriarOrcamentoPage.tsx`, `InsumoSearch` em
  `CadastrarProdutoPage.tsx`, `ProdutoSearch` em `NovaProducaoPage.tsx`/`EditarProducaoPage.tsx`).
  Efeito colateral aceito: painel sem termo digitado ainda dispara fetch imediato ao abrir (sem os
  300ms artificiais que o `setTimeout` antigo tinha) — não é regressão, é a 1ª carga ficando mais
  rápida. Todo consumidor precisa de guard `debouncedQ !== q` no efeito de fetch (reabrir o painel
  antes do debounce assentar não pode disparar busca com valor desatualizado — achado do gate
  `teste`, V0.11.0, corrigido nos 5 pontos).
- **Seleção rápida + validação assíncrona antes de confirmar, sobre uma lista mutável**: nunca ler
  o `state` React como base do próximo candidato quando há uma chamada assíncrona em voo — corrida
  documentada em `NovaProducaoPage.tsx` (`modulos/PRODUCAO/decisoes-producao.md`, achado #357,
  V0.11.0). Padrão de correção: ref sempre fresca sincronizada em toda mutação (inclusive nos
  caminhos de reversão) + número de sequência (só a chamada mais recente aplica resultado).
  Reaproveitar se um 2º fluxo parecido aparecer, em vez de reinventar.
- **`CalculadoraPreco`/`LinhaCalculadora`** (canônico: `components/shared/CalculadoraPreco.tsx`,
  usado por Produto, Catálogo e, desde V0.8.4/#399, Orçamento) — esquema de cor de 3 estados
  sobre o valor final de venda vs. o preço sugerido: **preto** = igual (comparação **exata**,
  sem tolerância de arredondamento — `Math.round((pf - sugerido) * 100) / 100 === 0`), **azul**
  (token `azul`) = acima, **laranja** = abaixo. Produto/Catálogo mantêm suas próprias tolerâncias
  de override (`0.005`/`0.001`, respectivamente, não documentadas como regra — só existem no
  código) para decidir se o preço é considerado "editado" (`overrideAtivo`); **só o Orçamento usa
  comparação exata**, por decisão explícita de produto (V0.8.4) — não unificar as tolerâncias
  entre módulos sem decisão de negócio própria, é inconsistência conhecida, não bug.
- **`<SegmentedControl>`** (canônico: `components/ui/SegmentedControl.tsx`, V0.12.0, migrou 7+
  cópias inline) — controle binário sempre no par **esquerda laranja / direita verde** (ex.:
  Não/Sim, %/R$, Fechado/Aberto). **Exceção deliberada, não regredida**: telas com paleta própria
  já aprovada antes da convenção existir (Multa/Estorno no Detalhe do Orçamento — laranja quando
  ativo, cinza quando não, nos dois lados) mantêm a cor original — migrar essas exigiria decisão de
  design nova, não confundir com esquecimento. A convenção laranja/direita-verde só se aplica a
  exatamente 2 opções — 3+ opções (ex.: filtro Tudo/Catálogo/Produto) ficam sempre verde na opção
  ativa, sem o par de cores.
- **`ModalShell` via `createPortal`** (`components/ui/ModalShell.tsx`, V0.12.0) — renderiza fora da
  árvore DOM da página, corrigindo o fundo cinza contido dentro de um card em vez de cobrir a tela
  inteira (causa raiz: `animate-[fadeUp]`/qualquer `transform` num ancestral vira containing block
  de um `position: fixed`). Nenhuma mudança de API para quem já consome `ModalShell` — Esc/X/clique
  fora/z-index de Toast por cima continuam iguais.
- **`components/venda/`** (novo, V0.12.0) — biblioteca compartilhada por Orçamento e Caixa (e,
  parcialmente, Catálogo): `ItemSearch` (busca de Produto/ItemCatalogo paginada), `ItemLinha`
  (linha do carrinho), `ModalCustomizacoes`/`ModalCalculadoraItem` (Orçamento, com fila de
  calculadora) e `CustomizacaoSeletor` (núcleo sem calculadora nem opinião de invólucro — usado
  embutido direto na página em Catálogo, em dropdown no Caixa, dentro de `ModalCustomizacoes` no
  Orçamento), `DescontoBlock`, `ClienteSelect`, `SectionCard`, `ModoToggle`. Extraído de funções
  locais não-exportadas de `CriarOrcamentoPage.tsx` — mover primeiro (commit puro de import),
  parametrizar depois, nunca no mesmo commit (Orçamento é tela aprovada em uso, maior risco de
  regressão do pocket #486). Identidade de linha do carrinho não é parte do componente — cada
  página decide (Orçamento cria linha nova por `Date.now()`, Caixa mescla duplicadas por `key`).
- **Sidebar: grupo de navegação recolhível** (canônico: `GRUPO_VENDAS` em
  `components/layout/Sidebar.tsx`, V0.12.0) — cabeçalho do grupo segue o mesmo estilo visual de um
  item de navegação comum (ícone à esquerda, mesma fonte, sem caixa alta) — só a seta de
  expandir/recolher o diferencia; itens do grupo ganham recuo (`ml-5`) quando expandido. Preferência
  persistida em `localStorage` (não `useState` puro — `AppLayout` remonta a cada navegação, sem
  layout de rota compartilhado). No modo ícone (`collapsed` do `AppLayout`), os itens do grupo
  sempre aparecem, ignorando o estado de expandido/recolhido — não há onde mostrar cabeçalho/seta
  nesse modo.

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
- **Nginx do container escuta 8080, não 80** (V0.9.0/#429) — o Dockerfile passou a rodar como
  usuário não-root (`USER nginx`), que não pode bindar porta <1024. Porta externa continua 3000
  (`docker-compose.yml` mapeia `3000:8080`) — não afeta `localhost:3000`, só o `EXPOSE`/`listen`
  interno do container.
- **Modal de Edição manual duplicado entre Insumo e Produto — débito conhecido, não padrão**
  (`EdicaoManualModal` em `DetalheInsumoPage.tsx`, `EdicaoManualProdutoModal` em
  `DetalheProdutoPage.tsx`, V0.14.0/#514,#534). A divergência entre as cópias já gerou o bug #551.
  Qualquer mudança de comportamento em um dos dois dispara a extração (OpenProject #555) — nunca
  alterar só uma cópia.
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
| Find-replace mecânico entre 2 variáveis que soam parecidas mas têm semântica diferente | V0.10.0/#466: reordenar `PAGO`/`ENTREGUE` exigiu trocar `PAGO`→`ENTREGUE` em `finalizado` (correto — segue status terminal) **e** em `cancelavel` (errado — `cancelKind()` nunca tratou os dois como equivalentes; regressão real, só achada pela suíte E2E completa no fechamento do pocket). Ao editar 2+ variáveis juntas num mesmo commit "por analogia", conferir se cada uma reflete o mesmo conceito de negócio antes de aplicar a mesma mudança às duas |
| `SegmentedControl` (ou qualquer grupo de botões) dentro de `<label>` | O navegador associa o label ao 1º botão e o nome acessível vira "Rótulo Opção2" — leitor de tela anuncia errado e `getByRole('button', { name })` falha no E2E (V0.14.0). Usar `<div>` + rótulo separado; usos existentes em OpenProject #557 |
| Helper de teste E2E fica desatualizado quando o efeito colateral de um endpoint muda | V0.10.0/#442: `criarInsumoComEstoque` assumia que `POST /insumos` populava `estoqueAtual` — parou de ser verdade quando RN-NOVA-1 tirou a movimentação automática, e ~40 specs passaram a testar silenciosamente contra estoque 0. Ao mudar o efeito colateral de um endpoint (não só o payload), rodar varredura pelos helpers de teste que dependem desse efeito, não só pelos specs que chamam o endpoint diretamente |
