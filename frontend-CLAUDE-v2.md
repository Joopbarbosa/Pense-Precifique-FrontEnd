# Pense & Precifique — Front-End

> Lido automaticamente pelo Claude Code. Atualizar checklist a cada C-XXX concluído.

## Stack
React 18 + TypeScript | Vite | React Router v6 | Zustand | Axios
**Estilo:** CSS inline + classes utilitárias em `src/index.css` (não usar Tailwind)
**Ícones:** sempre em `src/components/ui/Icons.tsx` — nunca redefinir inline
**localhost:** `http://localhost:5173`

## Cores
| Token | Valor |
|-------|-------|
| teal | `#2A9D8F` |
| orange | `#F97316` |
| dark | `#3A372F` |
| line | `#EFEDE8` |
| bg | `#FAFAF8` |

## Regras críticas
- Nunca `overflow: hidden` em containers com dropdowns ou modais filhos
- `Button fullWidth` dentro de flex: `flexShrink: fullWidth ? 1 : 0`
- Drawer lateral: `left: max(0px, calc(100vw - 440px))`
- Dados mockados realistas — sem Lorem ipsum, sem chamadas de API
- Todo prompt tem URL explícita nos testes
- Default export em todos os componentes

## Tipos principais
```ts
type TipoProduto = 'PRODUTO' | 'PRODUTO_BASE' | 'CUSTOMIZACAO'
type StatusOrcamento = 'RASCUNHO'|'ENVIADO'|'APROVADO'|'AGUARDANDO_SINAL'|'SINAL_PAGO'|'EM_PRODUCAO'|'FINALIZADO'|'ENTREGUE'|'PAGO'|'CANCELADO'
type MetodoPagamento = 'PIX'|'DINHEIRO'|'CREDITO'|'DEBITO'|'TRANSFERENCIA'|'BOLETO'|'OUTRO'
```

## Design
Arquivos extraídos em `design/Pense e Precifique/` (HTMLs + screenshots + logo.png)
Backlog: `claude/CONVERSION_BACKLOG.md`

## Componentes concluídos (C-000 a C-022 ✅)
- **ui/:** Brand (Logo+Wordmark), Icons, Button, Input, Badge, ModalShell, Card, EmptyState, Spinner
- **shared/:** SectionTitle, ActionMenu
- **layout/:** Sidebar, TopBar, AppLayout
- **auth/:** LoginPage, CadastroPage, OnboardingPage
- **dashboard/:** DashboardPage
- **clientes/:** ClientesPage
- **orcamentos/:** ListaOrcamentosPage, CriarOrcamentoPage, DetalheOrcamentoPage, PreviewPdfPage

## Pendentes
C-023 ReciboSinalPage → C-024 PreviewMultaPage → C-025 ReciboPagamentoPage
C-026~028 Insumos → C-029~032 Produtos → C-033 Produção → C-034 Configurações
