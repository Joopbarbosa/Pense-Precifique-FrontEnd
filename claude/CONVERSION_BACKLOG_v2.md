# Conversion Backlog — Pense & Precifique

> Atualizado em: 2026-06-13 | Total: 34 itens + validações + fixes | Concluídos: 22/34

---

## Setup

| ID | Componente | Status |
|----|------------|--------|
| C-000 | Setup do projeto React + Vite + TypeScript | ✅ concluído |

---

## Componentes Base

| ID | Componente | Status |
|----|------------|--------|
| C-001 | **Logo + Wordmark** | ✅ concluído |
| C-002 | **Sidebar** (desktop + mobile drawer) | ✅ concluído |
| C-003 | **TopBar** (header mobile com hamburger + título) | ✅ concluído |
| C-004 | **Button** (primary, secondary, ghost, danger) | ✅ concluído |
| C-005 | **Input** (text, email, password com toggle, erro, ícone) | ✅ concluído |
| C-006 | **Badge** (StatusBadge, TipoProdutoBadge, VencidoBadge) | ✅ concluído |
| C-007 | **ModalShell** (overlay genérico com fechar e animação) | ✅ concluído |
| C-008 | **Card** (container com sombra leve, borda radius) | ✅ concluído |
| C-009 | **EmptyState** (modo padrão e compact) | ✅ concluído |
| C-010 | **Spinner** (loading inline) | ✅ concluído |
| C-011 | **SectionTitle** (badge numerado + ícone de seção) | ✅ concluído |
| C-012 | **ActionMenu** (dropdown de 3 pontos com opções) | ✅ concluído |

---

## Layout Principal

| ID | Componente | Status |
|----|------------|--------|
| C-013 | **AppLayout** (Sidebar + TopBar + slot de conteúdo) | ✅ concluído |

---

| V-001 | Validação visual — C-001 a C-010 | ✅ concluído |

---

## Telas — Autenticação e Onboarding

| ID | Tela | Status |
|----|------|--------|
| C-014 | **LoginPage** | ✅ concluído |
| C-015 | **CadastroPage** | ✅ concluído |
| C-016 | **OnboardingPage** (valor/hora + margem) | ✅ concluído |

---

## Telas — Dashboard

| ID | Tela | Status |
|----|------|--------|
| C-017 | **DashboardPage** | ✅ concluído |

---

## Telas — Clientes

| ID | Tela | Status |
|----|------|--------|
| C-018 | **ClientesPage** (lista + drawer nova/editar) | ✅ concluído |

---

## Telas — Orçamentos

| ID | Tela | Status |
|----|------|--------|
| C-019 | **ListaOrcamentosPage** (filtros, busca, período) | ✅ concluído |
| C-020 | **CriarOrcamentoPage** (itens, desconto, sinal, modal customizações) | ✅ concluído |
| C-020-fix | **CriarOrcamento — método de pagamento** (RN-027) | ✅ concluído |
| C-021 | **DetalheOrcamentoPage** (timeline, resumo, modais de transição) | ✅ concluído |
| C-021-fix-1 | **DetalheOrçamento — wizard cancelamento Em Produção** (3 passos) | ✅ concluído |
| C-021-fix-2 | **DetalheOrçamento — wizard cancelamento Sinal Pago + estorno** (RN-029) | ✅ concluído |
| C-021-fix-3 | **DetalheOrçamento — método pagamento no modal de sinal** (RN-028) | ✅ concluído |
| C-022 | **PreviewPdfPage** (orçamento em formato PDF) | ⬜ pendente |
| C-023 | **ReciboSinalPage** (PDF do recibo de sinal) | ⬜ pendente |
| C-024 | **PreviewMultaPage** (PDF de multa por cancelamento) | ⬜ pendente |
| C-025 | **ReciboPagamentoPage** (PDF de quitação total) | ⬜ pendente |

---

## Telas — Insumos

| ID | Tela | Status |
|----|------|--------|
| C-026 | **ListaInsumosPage** | ⬜ pendente |
| C-027 | **FormInsumoPage** (cadastrar/editar) | ⬜ pendente |
| C-028 | **DetalheInsumoPage** | ⬜ pendente |

---

## Telas — Produtos

| ID | Tela | Status |
|----|------|--------|
| C-029 | **ListaProdutosPage** | ⬜ pendente |
| C-030 | **CadastrarProdutoPage** | ⬜ pendente |
| C-031 | **EditarProdutoPage** | ⬜ pendente |
| C-032 | **DetalheProdutoPage** | ⬜ pendente |

---

## Telas — Registro de Produção

| ID | Tela | Status |
|----|------|--------|
| C-033 | **RegistroProducaoPage** (lista + modal Nova Produção) | ⬜ pendente |

---

## Telas — Configurações

| ID | Tela | Status |
|----|------|--------|
| C-034 | **ConfiguracoesPage** (3 abas: Precificação, Perfil, Conta) | ⬜ pendente |

---

| V-002 | Validação visual — C-011 a C-021 | ⬜ pendente |

---

## Resumo de progresso

| Bloco | IDs | Concluídos |
|-------|-----|------------|
| Setup | C-000 | 1/1 ✅ |
| Componentes base | C-001 a C-012 | 12/12 ✅ |
| Layout | C-013 | 1/1 ✅ |
| Validação V-001 | V-001 | 1/1 ✅ |
| Auth / Onboarding | C-014 a C-016 | 3/3 ✅ |
| Dashboard | C-017 | 1/1 ✅ |
| Clientes | C-018 | 1/1 ✅ |
| Orçamentos | C-019 a C-025 + fixes | 7/11 🔄 |
| Insumos | C-026 a C-028 | 0/3 ⬜ |
| Produtos | C-029 a C-032 | 0/4 ⬜ |
| Registro de Produção | C-033 | 0/1 ⬜ |
| Configurações | C-034 | 0/1 ⬜ |
| **Total base** | | **22/34** |

---

## Aprendizados registrados

| Prompt | Aprendizado crítico |
|--------|---------------------|
| C-002 | CSS `.sidebar`, `.scrim` deve estar em `src/index.css` |
| C-002 | NavLink deve checar `window.innerWidth < 768` antes de chamar `onClose` |
| C-003 | Botão hamburger só no mobile via `.mobile-topbar { display: none }` no desktop |
| C-018 | `Button fullWidth` dentro de flex: `flexShrink: fullWidth ? 1 : 0` no `Button.tsx` |
| C-018 | Drawer: usar `left: max(0px, calc(100vw - 440px))` em vez de `width: min(440px, 100%)` |
| C-018/019 | `overflow: hidden` em container corta dropdown do último item — nunca usar |
| C-020 | `QuoteCard` sem `overflow: hidden` — dropdowns de autocomplete e catálogo seriam cortados |
| C-021 | Dados mockados devem ser consistentes com o `statusAtual` — sinal recebido só após "Sinal Pago" |
| Geral | Todo prompt deve ter URL explícita em cada passo de teste |
| Geral | Ícones sempre em `src/components/ui/Icons.tsx` — nunca redefnir inline |

---

## Convenções do projeto

- **Stack:** React + TypeScript
- **Estilo:** CSS inline + classes utilitárias em `src/index.css`
- **Cores:** teal `#2A9D8F` | orange `#F97316` | dark `#3A372F`
- **localhost:** sempre `http://localhost:5173`
- **Ícones:** todos em `src/components/ui/Icons.tsx` — nunca inline
- **Dados:** mockados e realistas — sem Lorem ipsum, sem chamadas de API
- **Sem lógica de negócio** nos componentes desta skill — apenas visual e estados
- **Fidelidade:** reproduzir exatamente o visual aprovado no design
- **Overflow:** nunca usar `overflow: hidden` em containers que têm dropdowns ou modais filhos

---

*Atualizar status a cada prompt concluído.*
