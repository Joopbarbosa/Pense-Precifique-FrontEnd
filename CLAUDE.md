# Pense & Precifique — Front-End

> **v0** — Lido automaticamente pelo Claude Code.
> Caminho: `/home/joaobarbosa/Documentos/Projetos/Pense & Precifique/pense-precifique-frontend`
> Projeto pré-produção. Primeiro deploy estável com usuários reais = v1.

---

## Stack

React 18 + TypeScript | Vite | React Router v6 | Zustand | Axios
**Estilo:** CSS inline + classes utilitárias em `src/index.css` — sem Tailwind
**Ícones:** sempre em `src/components/ui/Icons.tsx` — nunca redefinir inline
**localhost:** `http://localhost:3000` (Docker) / `http://localhost:5173` (dev direto)

---

## Cores

| Token | Valor |
|-------|-------|
| teal | `#2A9D8F` |
| orange | `#F97316` |
| dark | `#3A372F` |
| line | `#EFEDE8` |
| bg | `#FAFAF8` |

---

## Regras críticas

- **NUNCA** `overflow: hidden` em containers com dropdowns, modais ou ActionMenu filhos
- `Button fullWidth` dentro de flex: `flexShrink: fullWidth ? 1 : 0`
- Drawer lateral: `left: max(0px, calc(100vw - 440px))`
- Default export em todos os componentes de página
- Dados da empresa: sempre via `GET /empresa` — nunca hardcoded
- `npm run build` antes de qualquer commit
- Toda correção de bug ou tarefa de tech debt termina com commit + push antes de considerar o chat encerrado — mesmo sem fechamento de épico. Branch sempre `main`: `git push origin main`. Nunca deixar mudança sem commit entre chats.
---

## Tipos principais

```ts
type TipoProduto = 'PRODUTO' | 'PRODUTO_BASE' | 'CUSTOMIZACAO'
type StatusOrcamento = 'RASCUNHO'|'ENVIADO'|'APROVADO'|'AGUARDANDO_SINAL'|'SINAL_PAGO'|'EM_PRODUCAO'|'FINALIZADO'|'ENTREGUE'|'PAGO'|'CANCELADO'
type MetodoPagamento = 'PIX'|'DINHEIRO'|'CREDITO'|'DEBITO'|'TRANSFERENCIA'|'BOLETO'|'OUTRO'
```

---

## Cores de badge por tipo de produto (errata v6)

| Tipo | Cor |
|------|-----|
| PRODUTO | Azul |
| PRODUTO_BASE | Cinza |
| CUSTOMIZACAO | Teal |

Helper: `src/utils/badges.ts` — nunca reimplementar inline.

---

## Telas implementadas ✅ (C-000 a C-034 — MVP FECHADO)

| Tela | Componente | Status |
|------|------------|--------|
| Login | LoginPage | ✅ |
| Cadastro | CadastroPage | ✅ |
| Onboarding | OnboardingPage | ✅ |
| Dashboard | DashboardPage | ✅ |
| Clientes | ClientesPage | ✅ |
| Criar Orçamento | CriarOrcamentoPage | ✅ |
| Preview PDF | PreviewPdfPage | ✅ |
| Detalhe Orçamento | DetalheOrcamentoPage | ✅ |
| Lista Orçamentos | ListaOrcamentosPage | ✅ |
| Preview Multa | PreviewMultaPage | ✅ |
| Recibo Sinal | ReciboSinalPage | ✅ |
| Recibo Pagamento | ReciboPagamentoPage | ✅ |
| Lista Insumos | ListaInsumosPage | ✅ |
| Form Insumo | FormInsumoPage | ✅ |
| Detalhe Insumo | DetalheInsumoPage | ✅ |
| Lista Produtos | ListaProdutosPage | ✅ |
| Cadastrar Produto | CadastrarProdutoPage | ✅ |
| Editar Produto | EditarProdutoPage | ✅ |
| Detalhe Produto | DetalheProdutoPage | ✅ |
| Registro Produção | RegistroProducaoPage | ✅ |
| Configurações | ConfiguracoesPage | ✅ |

---

## Bugs conhecidos (v0)

| ID | Descrição |
|----|-----------|
| C10 | Upload de logo do perfil não funciona nas Configurações |
| 006.1 | Campo de quantidade em ficha técnica exibe "025" ao digitar "0,25" em insumo não-fracionável (exibição cosmética; validação de envio funciona) — adiado, sem data |

---

## Aprendizados críticos

| Regra | Contexto |
|-------|----------|
| `overflow: hidden` corta dropdowns/modais | Recorrente em C-018, C-019, C-033 |
| Empresa: sempre `GET /empresa`, nunca hardcoded | Corrigido em PreviewPdfPage, PreviewMultaPage, ReciboSinalPage, ReciboPagamentoPage |
| `Button fullWidth` dentro de flex precisa `flexShrink` | C-018 |
| ActionMenu apenas na lista, não duplicar no detalhe | C-033 |
| Empty state em filtro deve preservar layout da lista | Épico 7 |
| Botões condicionais por estado do orçamento | DetalheOrcamentoPage: Recibo sinal, PDF multa, Recibo estorno |
| API usa camelCase (nunca snake_case) | P-INVESTIGACAO + BUG-002: backend default Spring/Jackson, camelCase puro. Mapeamento errado causa `undefined` silencioso, sem erro visível |
| Campo condicionando exibição de botão/UI precisa estar presente no response da API | Botão "PDF de multa" não aparecia porque o backend não expunha `percentualMulta` no response de detalhe — o campo existia na entidade e no tipo TypeScript, mas faltava no DTO Java e no mapper. Frontend correto + backend incompleto = falha silenciosa. |
| Campo de quantidade em ficha técnica depende de `fracionavel` do insumo | Insumo não-fracionável: backend rejeita decimal, frontend usa `step="1"` e exibe erro de validação. Fracionável: aceita até 2 casas decimais (`step="0.01"`). Backend é fonte de verdade; frontend só reflete via atributos de input e mensagem de erro. |

