# DESIGN PROMPTS — Pense & Precifique
> Gerado pela Skill 4 — Frontend Design
> Ordem: seguindo o menu do sistema (Login → Configurações)

---

## COMO USAR

1. Abra o Claude Design
2. Para cada tela: cole o prompt completo (ele já inclui o contexto global no início)
3. Itere até aprovar
4. Siga para a próxima tela

> O bloco de contexto global já está embutido em cada prompt — você não precisa copiar nada separado.

---

## MAPA DE TELAS

| # | Tela | Épico |
|---|------|-------|
| 1 | Login | 1 |
| 2 | Cadastro | 1 |
| 3 | Onboarding de Precificação | 2 |
| 4 | Dashboard | 8 |
| 5 | Clientes (lista + cadastro) | 5 |
| 6 | Criar Orçamento | 7 |
| 7 | Preview do Orçamento (PDF) | 7 |
| 8 | Detalhe do Orçamento — Gestão de Status | 7 |
| 9 | Orçamentos (lista) | 7 |
| 10 | Insumos (lista) | 3 |
| 11 | Cadastrar / Editar Insumo | 3 |
| 12 | Detalhe do Insumo + Histórico | 3 |
| 13 | Produtos (lista) | 4 |
| 14 | Cadastrar Produto + Ficha Técnica | 4 |
| 15 | Editar Produto | 4 |
| 16 | Detalhe do Produto + Histórico | 4 |
| 17 | Produção (lista + nova produção) | 6 |
| 18 | Configurações (Precificação + Perfil + Conta) | 2 |
| 19 | Preview PDF de Multa | 7 |
| 20 | Preview Recibo do Sinal | 7 |
| 21 | Recibo de Pagamento Completo | 7 |

---
---

## Prompt 1 — Login

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório — aplique em todas as telas:
- Cores: laranja #F97316 (CTAs e destaques), teal #2A9D8F (ícones, métricas, elementos de marca), branco #FFFFFF (cards e sidebar), cinza claro #F8F8F8 (fundo geral)
- Border-radius: 12–16px em cards, 8–10px em inputs e botões — sempre arredondado
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Logo: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor
- Detalhes decorativos: pontilhados e formas orgânicas sutis inspirados na logo — usar em empty states e cards especiais
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: funcionar em 375px e em 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 1 — Login.

---

Crie o design da tela de Login para o sistema Pense & Precifique.

Tom visual: delicado, artesanal, acolhedor. Deve transmitir confiança e pertencimento para artesãs pequenas empreendedoras.

Layout:
- Tela centralizada, sem sidebar (usuária ainda não está logada)
- Desktop: duas colunas — esquerda com ilustração/brand, direita com formulário
- Mobile: coluna única, logo no topo

Coluna da marca (desktop) / topo (mobile):
- Logo: ícone de lâmpada teal com pontilhados laranjas
- Nome "Pense & Precifique" em tipografia bold bicolor (teal + cinza escuro)
- Subtítulo: "Precifique com confiança. Venda com valor."
- Elemento decorativo sutil: pontilhados laranjas e formas orgânicas teal no background

Formulário:
- Título: "Bem-vinda de volta 👋"
- Campo: E-mail (placeholder: seuemail@email.com)
- Campo: Senha (com botão mostrar/ocultar)
- Link: "Esqueci minha senha"
- Botão primário laranja: "Entrar →"
- Divisor "ou"
- Link: "Não tem conta? Cadastre-se"

Estados que a tela deve mostrar:
- Estado padrão: formulário vazio
- Estado de erro: mensagem inline "E-mail ou senha incorretos. Tente novamente." — sem indicar qual campo está errado, caixa vermelha suave
- IMPORTANTE: a coluna esquerda teal deve ter altura 100% do card, acompanhando exatamente a altura da coluna direita — sem espaço branco abaixo. O fundo teal deve ir do topo ao rodapé do card, independente do tamanho do formulário à direita.

Referência de fluxo: Épico 1 — Login
```

---
---

## Prompt 2 — Cadastro

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 2 — Cadastro.

---

Crie o design da tela de Cadastro para o sistema Pense & Precifique.

Tom visual: acolhedor, deve parecer o início de uma jornada — não um formulário burocrático.

Indicador de etapas: stepper no topo com 2 etapas — "1. Sua conta" (ativa) e "2. Precificação"

Formulário — Etapa 1 (Sua conta):
- Título: "Vamos criar sua conta!"
- Campo: Seu nome (placeholder: Ana Lima)
- Campo: Nome da sua empresa (placeholder: Ateliê da Ana)
- Campo: E-mail (placeholder: ana@atelier.com)
- Campo: Senha (mínimo 8 caracteres, com indicador de força da senha)
- Campo: Confirmar senha
- Upload de logo: área tracejada arredondada com ícone de câmera e texto "Adicione a logo da sua empresa (opcional)" — com preview circular quando imagem selecionada
- Botão primário laranja: "Próximo →"
- Link: "Já tem conta? Faça login"

Estados que a tela deve mostrar:
- Estado padrão: formulário vazio
- Estado de erro: e-mail já cadastrado — mensagem inline "Este e-mail já está em uso. Faça login ou use outro e-mail."
- Estado com logo carregada: preview circular com botão X para remover
- IMPORTANTE: a coluna esquerda teal deve ter altura 100% do card, acompanhando exatamente a altura da coluna direita — sem espaço branco abaixo. O fundo teal deve ir do topo ao rodapé do card, independente do tamanho do formulário à direita.

Referência de fluxo: Épico 1 — Cadastro
```

---
---

## Prompt 3 — Onboarding de Precificação

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 3 — Onboarding de Precificação.

---

Crie o design da tela de Onboarding de Precificação para o sistema Pense & Precifique.

Tom visual: encorajador, leve, educativo. É o primeiro contato da artesã com a lógica de precificação — deve parecer uma conversa, não um formulário técnico.

Layout: DEVE SER IDÊNTICO ao da tela de Cadastro — dois painéis lado a lado, como na imagem de referência anexada:

- Coluna ESQUERDA (fundo teal #2A9D8F, igual ao Cadastro): pontilhados laranjas e formas orgânicas decorativas no background, logo da lâmpada no topo, texto "Quase lá! Só mais um passo." em branco bold, subtítulo branco suave, stepper vertical com "1. Sua conta ✓" (concluído) e "2. Precificação" (ativa) em branco
- Coluna DIREITA (fundo branco): stepper horizontal no topo "1. Sua conta ✓ ── 2. Precificação", título "Configure como você quer precificar 💡", subtítulo "Você pode alterar isso a qualquer momento nas Configurações.", seguido dos dois campos abaixo

Dois campos com explicações:

1. Quanto vale a sua hora de trabalho?
   - Explicação: "Este valor entra no cálculo de custo de mão de obra de cada produto."
   - Input: prefixo R$, placeholder: 25,00
   - Dica: "Exemplo: se você leva 2h para fazer um produto e sua hora vale R$ 25, o custo de mão de obra é R$ 50."

2. Qual é a sua margem de lucro padrão?
   - Explicação: "Percentual adicionado ao custo total para formar seu preço de venda."
   - Input: sufixo %, placeholder: 40
   - Dica: "Você poderá ajustar a margem produto a produto quando necessário."

- Botão primário laranja grande: "Começar a usar o sistema →"

Estado padrão: campos vazios com placeholders e textos explicativos visíveis.
- IMPORTANTE: a coluna esquerda teal deve ter altura 100% do card, acompanhando exatamente a altura da coluna direita — sem espaço branco abaixo. O fundo teal deve ir do topo ao rodapé do card, independente do tamanho do formulário à direita.

Referência de fluxo: Épico 2 — Configurar perfil de precificação
```

---
---

## Prompt 4 — Dashboard

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Logo: lâmpada teal com pontilhados laranjas + "Pense & Precifique" bicolor
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 4 — Dashboard.

---

Crie o design da tela de Dashboard para o sistema Pense & Precifique.

Tom visual: visão geral rápida do negócio — como olhar o resumo de manhã antes de começar o dia.

Layout:
- Sidebar branca à esquerda (desktop) com itens: Dashboard, Clientes, Orçamentos, Insumos, Produtos, Produção, Configurações, Sair
- Item "Dashboard" ativo (fundo laranja claro, texto laranja)
- Logo no topo da sidebar
- Header: "Dashboard" com subtítulo "Bem-vinda de volta, Ana! Aqui está o resumo do seu negócio."
- Botão de ação rápida no canto superior direito: "Novo Orçamento →" laranja

Seção 1 — Cards de métricas (3 cards em linha):
- Card 1: ícone $ teal claro | "Faturamento Mensal" | R$ 1.890,00 (laranja bold) | "+23% este mês" (verde)
- Card 2: ícone cubo teal | "Produtos Cadastrados" | 18 (teal bold) | "+2 este mês"
- Card 3: ícone documento | "Orçamentos Pendentes" | 4

Seção 2 — Alerta de estoque baixo (card com borda esquerda laranja):
- Ícone ⚠️ laranja | "3 insumos com estoque baixo"
- Lista compacta: Fita dupla face 12mm (0,5m), Papel A4 180g (2 folhas), Linha teal 100g (0,8g)
- Link "Ver todos os insumos →"

Seção 3 — Ações Rápidas + Dica do Dia (lado a lado no desktop, empilhados no mobile):
- Card "Ações Rápidas": "Cadastrar novo insumo →", "Criar produto →", "Gerar orçamento →"
- Card "Dica do Dia" (fundo gradiente suave teal+branco com pontilhados decorativos da logo):
  Título: "Dica do Dia" | Subtítulo: "Melhore seus lucros"
  Texto: "Revise o preço dos seus produtos depois de cada compra de insumo — pequenas variações acumulam e corroem sua margem ao longo do mês."

Estados que a tela deve mostrar:
- Estado padrão: com todos os dados acima
- Estado de conta nova/vazia: cards zerados, sem alerta de estoque, boas-vindas com CTA "Comece cadastrando seus insumos →"

Referência de fluxo: Épico 8 — Dashboard
```

---
---

## Prompt 5 — Clientes

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 5 — Clientes.

---

Crie o design da tela de Clientes para o sistema Pense & Precifique.

Tom visual: relacional, como uma agenda cuidada — não um banco de dados frio.

Layout:
- Sidebar com item "Clientes" ativo
- Header: "Minhas Clientes" + botão "+ Nova Cliente" laranja
- Campo de busca por nome ou WhatsApp

Lista de clientes (cards no mobile, tabela no desktop):
Cada linha: avatar com inicial do nome em teal | Nome | WhatsApp | Último orçamento | Menu 3 pontos com 3 ações:
- Editar → abre o drawer com campos pré-preenchidos para edição
- Ver orçamentos → redireciona para a Tela 9 (lista de orçamentos) com filtro de cliente pré-aplicado
- Desativar → confirmação inline

Dados reais:
- Mariana Costa | (11) 99999-0000 | Último: Orçamento #0042 em 04/06/2026
- Camila Rocha | (11) 97777-2233 | Último: Orçamento #0041 em 02/06/2026
- Patrícia Mendes | (21) 98888-5566 | Último: Orçamento #0040 em 28/05/2026
- Juliana Ferreira | (11) 96666-4411 | Nenhum orçamento ainda (texto cinza)

Drawer lateral / Modal "Nova Cliente" (mostrar aberto — desktop: painel lateral direito, mobile: bottom sheet):
- Título: "Nova Cliente"
- Campo: Nome completo* (ex: Beatriz Santos)
- Campo: WhatsApp* com máscara (XX) XXXXX-XXXX
- Campo: E-mail (opcional)
- Campo: Observações (ex: "Prefere entregas às sextas")
- Botões: "Cancelar" | "Salvar cliente" (laranja)

Estado vazio: "Você ainda não cadastrou clientes. Quando criar um orçamento, poderá cadastrar a cliente diretamente de lá!" + botão laranja

Referência de fluxo: Épico 5 — Clientes
```

---
---

## Prompt 6 — Criar Orçamento

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 6 — Criar Orçamento.

---

Crie o design da tela "Criar Orçamento" para o sistema Pense & Precifique.

Contexto: esta é a tela mais importante do sistema — a artesã abre quando recebe um pedido pelo WhatsApp e precisa montar o orçamento rapidamente. Deve ser intuitiva e rápida.

Layout geral:
- Sidebar com item "Orçamentos" ativo
- Header: "Novo Orçamento" + botão "Salvar Rascunho" (secundário)

Seções da tela (de cima para baixo):

1. Seleção de cliente:
   - Campo de busca com autocomplete "Selecionar cliente..."
   - Botão secundário "+ Nova cliente" ao lado
   - Quando selecionado: card compacto com nome (Mariana Costa) e WhatsApp (11) 99999-0000

2. Lista de itens:
   - Cada item: nome do produto, quantidade (contador − e +), preço unitário, subtotal, botão "Customizações" e botão remover
   - Linha expandível de customizações abaixo do item (ex: "Laminação fosca — + R$ 8,00")
   - Botão "+ Adicionar produto" ao final

3. Modal de customizações (estado aberto sobre a tela):
   - Título: "Customizações — Kit Convite Casamento"
   - Seção "Customizações cadastradas": lista com checkbox (Laminação fosca +R$8,00, Envelope kraft +R$3,50)
   - Seção "Adicionar insumo avulso": campo nome + campo custo R$, botão "+ Adicionar"
   - Botões: "Cancelar" | "Confirmar" (laranja)

4. Seção "Condições de pagamento" (card separado, abaixo dos itens):
   - Toggle: "Cobrar entrada (sinal)?" — Sim / Não
   - Quando ativado, aparece:
     - Toggle de tipo: "%" ou "R$"
     - Campo de valor (ex: 50% ou R$ 91,80)
     - Preview automático: "Sinal: R$ 91,80 — Restante: R$ 91,80"

5. Resumo do orçamento (rodapé fixo mobile / coluna lateral desktop):
   - Subtotal: R$ 180,00
   - Desconto: toggle % ou R$ — ex: 10% → − R$ 18,00
   - Sinal solicitado (quando ativo): R$ 91,80 (linha destacada teal)
   - Total: R$ 162,00 (destaque maior, teal)
   - Restante após sinal: R$ 81,00 (quando sinal ativo)
   - Validade: date picker com padrão +7 dias (ex: 11/06/2026)
   - Observações: textarea pequeno
   - Botão primário: "Gerar PDF →" laranja
   - Botão secundário: "Salvar Rascunho"

Dados reais:
- Cliente: Mariana Costa, (11) 99999-0000
- Produto 1: Kit Convite Casamento × 3 — R$ 45,00 — subtotal R$ 135,00 — customização: Laminação fosca +R$8,00/un
- Produto 2: Etiqueta personalizada × 10 — R$ 4,50 — subtotal R$ 45,00
- Total bruto: R$ 180,00 | Desconto 10% | Total final: R$ 162,00 | Sinal 50%: R$ 81,00

Estados que a tela deve mostrar:
- Estado padrão: 2 itens adicionados, cliente selecionada, sinal ativado em 50%, modal fechado
- Estado modal aberto: modal de customizações com overlay suave
- Estado vazio: área com ícone e texto "Nenhum produto adicionado. Comece pelo botão abaixo."

Referência de fluxo: Épico 7 — UC-004; RN-014; UC-003
```

---
---

## Prompt 7 — Preview do Orçamento (PDF)

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 7 — Preview do Orçamento (PDF).

---

Crie o design da tela "Preview do Orçamento" para o sistema Pense & Precifique.

Contexto: após criar o orçamento, a artesã visualiza como ficará o PDF antes de baixar e enviar pelo WhatsApp. A tela tem a barra de ações do sistema e a visualização do documento.

Layout:
- Sidebar com item "Orçamentos" ativo
- Breadcrumb: "Orçamentos > #0042 — Mariana Costa"
- Badge de status: "Rascunho" (cinza)
- Barra de ações: botão "← Editar orçamento", botão "Baixar PDF" (teal, ícone download), botão "Marcar como Enviado →" (laranja)

Área de preview do documento (folha A4 simulada dentro da tela, com sombra suave):

Cabeçalho do documento:
- Logo da empresa à esquerda (lâmpada teal com pontos laranjas)
- Nome "Pense & Crie Studio" e contato "penseecrie@email.com | (11) 98888-1234"
- Título: "ORÇAMENTO #0042"
- Data de emissão: 04/06/2026 | Validade: 11/06/2026
- Dados da cliente: Mariana Costa, (11) 99999-0000

Tabela de itens:
- Kit Convite Casamento | Laminação fosca | 3 | R$ 53,00 | R$ 159,00
- Etiqueta personalizada | — | 10 | R$ 4,50 | R$ 45,00

Seção "Condições de pagamento" (quando sinal ativado — card destacado com borda teal):
- Título: "Entrada solicitada"
- Texto: "Para iniciar a produção, solicitamos o pagamento de 50% do valor total."
- Valor do sinal: R$ 91,80
- Valor restante: R$ 91,80 — a pagar na entrega

Resumo de totais:
- Subtotal: R$ 204,00
- Desconto (10%): − R$ 20,40
- Sinal solicitado (50%): R$ 91,80 (linha destacada teal)
- Total: R$ 183,60 (negrito laranja)
- Restante após sinal: R$ 91,80

Observações: "Prazo de entrega: 10 dias úteis após aprovação e recebimento do sinal"

Rodapé:
- "Este orçamento é válido até 11/06/2026."
- Cláusula de cancelamento (texto menor, discreto): "Em caso de cancelamento após aprovação, será cobrada uma taxa de 50% do valor total (R$ 91,80) referente aos materiais e tempo já investidos na produção."

Estados que a tela deve mostrar:
- Estado padrão: documento completo com sinal ativado
- Estado sem sinal: seção de condições de pagamento não aparece, resumo sem linha de sinal
- Estado após "Marcar como Enviado": badge muda para "Enviado" (azul), aparece "Marcar como Aprovado"

Referência de fluxo: Épico 7 — UC-005
```

---
---

## Prompt 8 — Detalhe do Orçamento — Gestão de Status

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 8 — Detalhe do Orçamento — Gestão de Status.

---

Crie o design da tela "Detalhe do Orçamento — Gestão de Status" para o sistema Pense & Precifique.

Contexto: a artesã acompanha o andamento do pedido e avança o status conforme a produção progride. O cancelamento tem regras diferentes dependendo do status atual.

Layout:
- Header: "Orçamento #0042 — Mariana Costa" + badge status atual + botão "Duplicar orçamento" (secundário)

Seção 1 — Timeline de status (horizontal desktop, vertical mobile):
Rascunho → Enviado → Aprovado → Aguardando Sinal* → Sinal Pago* → Em Produção → Finalizado → Entregue → Pago
*"Aguardando Sinal" só aparece quando a artesã ativou cobrança de entrada no orçamento
- Etapa atual "Em Produção": teal preenchido
- Etapas anteriores: cinza com check ✓
- Etapas futuras: cinza claro
- Botão: "Avançar para: Finalizado →" laranja
- Link discreto vermelho suave: "Cancelar orçamento"

Seção 2 — Resumo do orçamento (card):
- Cliente: Mariana Costa
- Itens: Kit Convite Casamento × 3 (com laminação fosca), Etiqueta personalizada × 10
- Total: R$ 183,60 | Sinal recebido: R$ 91,80 | Restante: R$ 91,80
- Validade: 11/06/2026

Modal "Confirmar Finalização" (mostrar como estado em destaque):
- Título: "Confirmar baixa no estoque"
- Tabela editável de insumos com campos de quantidade:
  - Papel couchê 180g | 6 folhas | [editável]
  - Fita dupla face 12mm | 45 cm | [editável]
  - Envelope kraft C6 | 3 unidades | [editável]
  - Linha de crochê teal | 1,2g | ⚠️ vermelho "Saldo insuficiente (0,5g disponível)"
- Checkbox: "Confirmar mesmo com saldo insuficiente"
- Botões: "Cancelar" | "Confirmar baixa" (laranja)

Modal "Aguardando Sinal — Confirmar recebimento" (estado quando status é Aguardando Sinal):
- Título: "Confirmar recebimento do sinal"
- Dados: Valor esperado: R$ 91,80 (50%)
- Campo: Forma de pagamento (PIX, Dinheiro, Cartão, Outro)
- Campo: Data do recebimento (date picker, padrão hoje)
- Aviso: "Após confirmar, o sistema avançará para Em Produção e gerará o recibo do sinal."
- Botões: "Cancelar" | "Confirmar e gerar recibo →" (laranja)

─── FLUXOS DE CANCELAMENTO (mostrar como estados separados) ───

Modal "Cancelar — Rascunho / Enviado / Aprovado":
- Título: "Cancelar orçamento?"
- Texto: "Esta ação não pode ser desfeita."
- Botões: "Voltar" | "Confirmar cancelamento" (vermelho suave)

Modal "Cancelar — Em Produção ou Finalizado" (fluxo em 3 passos):
- Passo 1 — Consumo:
  Título: "Houve consumo de insumos ou produtos?"
  Buscador de insumo/produto + campo quantidade + botão "+ Adicionar"
  Lista dos itens adicionados com botão remover
  Botões: "Pular" | "Próximo →"

- Passo 2 — Multa:
  Título: "Deseja cobrar multa pelo cancelamento?"
  Toggle: Sim / Não
  Quando Sim: toggle tipo "%" ou "R$" + campo valor (sugestão padrão: 50%)
  Preview: "Multa: R$ 91,80"
  Botões: "← Voltar" | "Próximo →"

- Passo 3 — Confirmação:
  Título: "Resumo do cancelamento"
  Insumos consumidos: lista
  Multa: R$ 91,80 (50%)
  Aviso laranja: "Um PDF de multa será gerado para enviar à cliente."
  Botões: "← Voltar" | "Confirmar e gerar PDF de multa" (vermelho suave)

Modal "Cancelar — Entregue ou Pago":
- Título: "Cancelar orçamento?"
- Aviso: "A baixa no estoque já foi realizada e não será revertida."
- Campo obrigatório: Justificativa (mínimo 50 caracteres, contador visível ex: "12/50")
- Botões: "Voltar" | "Confirmar cancelamento" (vermelho suave, só habilitado com 50+ caracteres)

Estados que a tela deve mostrar:
- Estado padrão: status "Em Produção", timeline com Aguardando Sinal já concluído, modal fechado
- Estado modal de finalização: com item em saldo insuficiente destacado
- Estado modal de cancelamento Em Produção: passo 1 do fluxo de 3 passos

Referência de fluxo: Épico 7 — UC-005; UC-006
```

---
---

## Prompt 9 — Orçamentos (lista)

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 9 — Orçamentos (lista).

---

Crie o design da tela de listagem de Orçamentos para o sistema Pense & Precifique.

Layout:
- Sidebar com item "Orçamentos" ativo
- Header: "Orçamentos" + botão "+ Novo Orçamento" laranja

Filtros (linha horizontal):
- Chips de status: Todos | Rascunho | Enviado | Aprovado | Em Produção | Finalizado | Entregue | Pago | Cancelado
- Busca por cliente
- Date range picker

Lista (cards no mobile, tabela no desktop):
Cada item: número | cliente | total | data criação | validade | badge de status | menu 3 pontos (Duplicar, Cancelar)

Cores dos badges de status:
- Rascunho: cinza | Enviado: azul | Aprovado: verde claro | Em Produção: laranja | Finalizado: teal | Entregue: verde | Pago: verde escuro | Cancelado: vermelho suave

Dados reais:
- #0042 | Mariana Costa | R$ 183,60 | 04/06/2026 | válido até 11/06/2026 | Em Produção
- #0041 | Camila Rocha | R$ 320,00 | 02/06/2026 | válido até 06/06/2026 | Enviado ← VENCIDO (fundo vermelho suave ou badge "Vencido")
- #0040 | Patrícia Mendes | R$ 89,00 | 28/05/2026 | — | Pago
- #0039 | Juliana Ferreira | R$ 240,00 | 20/05/2026 | — | Cancelado (visual esmaecido)

Estados:
- Estado padrão: lista com os 4 orçamentos acima, filtro "Todos" ativo
- Estado vazio: pontilhados decorativos da logo + "Você ainda não tem orçamentos. Que tal criar o primeiro?" + botão laranja
Estado com filtro de cliente pré-aplicado (vindo da Tela 5 — Clientes): banner compacto no topo da lista "Exibindo orçamentos de: Camila Rocha" com badge teal e botão X para limpar o filtro e voltar à lista completa

Referência de fluxo: Épico 7 — RN-013
```

---
---

## Prompt 10 — Insumos (lista)

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 10 — Insumos (lista).

---

Crie o design da tela de listagem de Insumos para o sistema Pense & Precifique.

Layout:
- Sidebar com item "Insumos" ativo
- Header: "Meus Insumos" + botão "+ Novo Insumo" laranja

Filtros:
- Busca por nome ou marca
- Chips: Todos | Ativos | Inativos | Estoque baixo

Lista (cards no mobile, tabela no desktop):
Colunas: Nome + Marca | Unidade | Estoque atual | Estoque mínimo | Custo unitário | Status | Ações

Dados reais:
- Papel couchê 180g | Suzano | folha | 24 folhas | mín: 10 | R$ 0,45/folha | Ativo
- Fita dupla face 12mm | 3M | cm | 45 cm | mín: 200 | R$ 0,08/cm | ⚠️ Estoque baixo
- Linha de crochê teal 100g | Pingouin | g | 12g | mín: 50 | R$ 0,089/g | ⚠️ Estoque baixo
- Envelope kraft C6 | s/ marca | unidade | 48 un | mín: 20 | R$ 1,20/un | Ativo
- Tinta acrílica azul | Acrilex | ml | 0 ml | — | R$ 0,15/ml | Inativo (visual esmaecido)

Indicador de estoque baixo: badge laranja/vermelho na linha, ícone ⚠️

Estado vazio: "Nenhum insumo cadastrado ainda. Cadastre o primeiro para começar a montar suas fichas técnicas." + botão laranja

Referência de fluxo: Épico 3 — Insumos
```

---
---

## Prompt 11 — Cadastrar / Editar Insumo

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 11 — Cadastrar / Editar Insumo.

---

Crie o design da tela "Cadastrar Insumo" para o sistema Pense & Precifique.

Tom visual: formulário organizado em seções lógicas. O cálculo automático de custo unitário deve parecer inteligente e instantâneo.

Layout:
- Sidebar com item "Insumos" ativo
- Header: "Novo Insumo" + breadcrumb "Insumos > Novo Insumo"

Formulário em card branco, dividido em seções:

Seção 1 — Identificação:
- Campo: Nome do insumo* (ex: Papel couchê 180g)
- Campo: Marca (ex: Suzano) — "(opcional)"
- Aviso pequeno: "O par nome + marca deve ser único. Mesmo insumo de marcas diferentes pode ser cadastrado separadamente."

Seção 2 — Medida e fracionamento:
- Select: Unidade de medida* — Unidade, cm, g, ml, Folha
- Toggle: "Pode ser usado em frações?" (Sim/Não) — com explicação "Se sim, permite consumo de 0,5g por exemplo. Se não, sempre será consumido em quantidades inteiras."

Seção 3 — Estoque e custo:
- Campo: Quantidade em estoque* (ex: 100) com unidade dinâmica ao lado
- Campo: Estoque mínimo para alerta (ex: 10) — "(opcional)"
- Campo: Preço total da compra* (R$) (ex: 45,00)
- Campo: Quantidade comprada* (ex: 100)
- Card de resultado automático (fundo teal claro, arredondado): ícone calculadora + "Custo unitário calculado: R$ 0,45 / folha" — atualiza em tempo real

Botões: "Cancelar" (secundário) | "Salvar insumo" (laranja)

Modal de alerta ao desativar insumo vinculado (mostrar como estado separado):
- Título: "Atenção — este insumo está em uso"
- Lista de fichas afetadas: Kit Convite Casamento, Etiqueta personalizada, Customização: Laminação fosca
- Botões: "Cancelar" | "Ver fichas" (teal) | "Desativar mesmo assim" (vermelho suave)

Referência de fluxo: Épico 3 — UC-001; RN-011
```

---
---

## Prompt 12 — Detalhe do Insumo + Histórico

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 12 — Detalhe do Insumo + Histórico.

---

Crie o design da tela "Detalhe do Insumo" para o sistema Pense & Precifique.

Layout:
- Breadcrumb: Insumos > Papel couchê 180g
- Header: "Papel couchê 180g — Suzano" + badge "Ativo" (verde) + botão "Editar"

Card de resumo:
- Unidade: Folha | Fracionável: Não
- Saldo atual: 24 folhas (grande, teal) | Estoque mínimo: 10 folhas
- Custo unitário atual: R$ 0,45 / folha
- Botões: "Registrar compra" (laranja) e "Baixa manual" (cinza)

Abas:
- "Histórico de movimentações" (ativa) | "Fichas técnicas que usam este insumo"

Tabela de histórico:
- 04/06/2026 | 🔴 Saída — Produção | − 6 folhas | R$ 0,45 | Produção #18
- 01/06/2026 | 🟢 Entrada — Compra | + 100 folhas | R$ 0,45 | Compra: R$ 45,00/100un
- 15/05/2026 | 🔴 Saída — Orçamento | − 9 folhas | R$ 0,48 | Orçamento #0038
- 10/05/2026 | 🔴 Saída — Baixa manual | − 3 folhas | R$ 0,48 | folhas danificadas

Modal "Registrar Compra" (mostrar como overlay):
- Campos: Quantidade comprada (200 folhas) + Preço total pago (R$ 85,00)
- Preview: "Novo custo unitário: R$ 0,425 / folha" (antes: R$ 0,45)
- Aviso teal: "Esta compra afeta 2 produtos. Você verá o impacto no próximo passo."
- Botões: "Cancelar" | "Confirmar e ver impacto →" laranja

Modal "Impacto nos produtos" (segundo passo):
- Tabela: Kit Convite Casamento | R$ 45,00 → R$ 43,80 (verde ↓) | Etiqueta personalizada | R$ 4,50 → R$ 4,38 (verde ↓)
- Aviso: "Os preços de venda não foram alterados. Acesse cada ficha para atualizar manualmente."
- Botão: "Fechar"

Modal "Baixa Manual":
- Campos: Quantidade + Select Motivo (Perda, Uso extra, Correção, Outro) + Observação
- Botões: "Cancelar" | "Registrar baixa"

Referência de fluxo: Épico 3 — UC-010; RN-016
```

---
---

## Prompt 13 — Produtos (lista)

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 13 — Produtos (lista).

---

Crie o design da tela de listagem de Produtos para o sistema Pense & Precifique.

Tom visual: os produtos são o coração do negócio — devem parecer valorizados, não apenas linhas de tabela.

Layout:
- Sidebar com item "Produtos" ativo
- Header: "Meus Produtos" + botão "+ Novo Produto" laranja

Filtros:
- Busca por nome
- Chips de categoria: Todos | Papelaria | Amigurumi | Embalagem | Acabamento
- Toggle: Ativos | Inativos

Grid de cards (2 colunas mobile, 3–4 colunas desktop):
Cada card: foto do produto (quadrada arredondada, cinza claro + ícone de câmera se sem foto) | nome | categoria | preço de venda | estoque em mão | menu 3 pontos (Editar, Duplicar, Desativar)

Dados reais:
- Kit Convite Casamento | Papelaria | R$ 53,00 | 0 em estoque
- Etiqueta personalizada (10×5cm) | Papelaria | R$ 4,50 | 25 em estoque (teal)
- Amigurumi Coelhinha Rosa | Amigurumi | R$ 89,00 | 2 em estoque (teal)
- Caixa kraft com laço | Embalagem | R$ 18,00 | 0 em estoque

Estado vazio: elementos artesanais decorativos sutis + "Você ainda não cadastrou produtos. Comece criando seu primeiro!" + botão laranja

Referência de fluxo: Épico 4 — Produtos
```

---
---

## Prompt 14 — Cadastrar Produto + Ficha Técnica

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 14 — Cadastrar Produto + Ficha Técnica.

---

Crie o design da tela "Cadastrar Produto — Ficha Técnica" para o sistema Pense & Precifique.

Tom visual: organizado em abas. A calculadora ao vivo de preço é o elemento mais importante — deve parecer inteligente e gratificante de usar.

Layout:
- Header: "Novo Produto" + breadcrumb "Produtos > Novo Produto"
- Abas: Dados básicos | Ficha Técnica (ativa) | Customizações

Aba 1 — Dados básicos:
- Nome do produto* (ex: Kit Convite Casamento)
- Select: Categoria (Papelaria, Amigurumi, Embalagem, Acabamento, Outra)
- Descrição (textarea, opcional)
- Tempo de produção estimado* (ex: 45) com label "minutos"
- Upload de foto: área tracejada com preview
- Botão "Próximo: Ficha Técnica →" laranja

Aba 2 — Ficha Técnica (mostrar como estado ativo principal):
- Buscador de componentes: "Buscar insumo ou produto..." com autocomplete
- Ao digitar, o autocomplete exibe dois grupos separados:
  - Grupo "Insumos": Papel couchê 180g, Fita dupla face 12mm...
  - Grupo "Produtos": Miolo de Agenda, Capa Kraft...
- Tabela de componentes adicionados (cada linha com badge de tipo):
  - Miolo de Agenda | badge "Produto" (teal) | 1 un | R$ 12,00
  - Papel couchê 180g (Suzano) | badge "Insumo" (cinza) | 2 folhas | R$ 0,90
  - Fita dupla face 12mm (3M) | badge "Insumo" (cinza) | 15 cm | R$ 1,20
  - + Adicionar componente

- Card "Calculadora de Preço" (fixo à direita desktop / rodapé mobile — borda teal, destaque visual):
  - Custo dos insumos: R$ 3,30
  - Mão de obra: 45 min × R$ 25/h = R$ 18,75
  - Subtotal de custo: R$ 22,05
  - Margem de lucro: [campo editável, padrão: 40%] → + R$ 8,82
  - Preço sugerido: R$ 30,87 (grande, teal bold)
  - Campo: Preço final de venda (editável): R$ 45,00
  - Nota: "Você ajustou o preço manualmente (+R$ 14,13 acima do sugerido)"
  - Toggle: "Usar margem padrão (40%)" | "Personalizar"

Aba 3 — Customizações:
- Lista: Laminação fosca | +R$8,00 | [Editar] [Remover]
- Lista: Envelope personalizado | +R$5,00 | [Editar] [Remover]
- Botão: "+ Adicionar customização"

Referência de fluxo: Épico 4 — UC-002; RN-004; RN-009
```

---
---

## Prompt 15 — Produção

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 15 — Produção.

---

Crie o design da tela de Produção Antecipada para o sistema Pense & Precifique.

Tom visual: controle e planejamento — para artesãs organizadas que produzem para datas comemorativas.

Layout:
- Sidebar com item "Produção" ativo
- Header: "Produção Antecipada" + botão "+ Nova Produção" laranja

Filtros: busca por produto + date range

Histórico de produções (tabela/cards):
- 04/06/2026 | Amigurumi Coelhinha Rosa | 3 unidades | Linha teal: 45g, Olhinhos: 6 un | Ver detalhe
- 28/05/2026 | Kit Convite Casamento | 5 kits | Papel couchê: 10 folhas, Fita: 75cm | Ver detalhe

Modal "Nova Produção" (mostrar aberto como estado principal):
- Título: "Nova Produção"
- Busca e seleção: "Amigurumi Coelhinha Rosa" selecionado
- Quantidade: contador [−] 3 [+]
- Card teal claro "Insumos que serão consumidos para 3 unidades":
  - Linha de crochê teal 100g: 45g (disponível: 12g) ← ⚠️ vermelho "Saldo insuficiente"
  - Olhinhos de segurança 6mm: 6 un (disponível: 24 un) ← ✓ verde
  - Arame para estrutura: 15 cm (disponível: 200 cm) ← ✓ verde
- Aviso laranja: "Um ou mais insumos estão com saldo insuficiente. Você pode confirmar mesmo assim — o saldo ficará negativo."
- Checkbox: "Confirmar mesmo com saldo insuficiente"
- Botões: "Cancelar" | "Confirmar produção" (laranja)

Referência de fluxo: Épico 6 — UC-008; RN-007
```

---
---

## Prompt 16 — Configurações

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 16 — Configurações.

---

Crie o design da tela de Configurações para o sistema Pense & Precifique.

Tom visual: clean, institucional mas acolhedor — onde a artesã define as regras do seu negócio.

Layout:
- Sidebar com item "Configurações" ativo
- Header: "Configurações"
- Sub-navegação: Precificação (ativa) | Perfil da empresa | Conta

Aba "Precificação":

Card 1 — Parâmetros de cálculo:
- Título: "Como você quer precificar?"
- Campo: Valor da sua hora de trabalho — prefixo R$/h | valor atual: 25,00
- Campo: Margem de lucro padrão — sufixo % | valor atual: 40
- Banner informativo (borda esquerda teal, fundo teal clarinho, ícone ℹ️):
  "Alterar estes valores não recalcula orçamentos já criados. Somente novos orçamentos usarão os parâmetros atualizados."
- Botão: "Salvar alterações" (laranja)
- Feedback de sucesso: toast verde "Configurações salvas com sucesso!"

Card 2 — Perfil da empresa (preview):
- Logo circular atual
- Nome: Ateliê da Ana
- E-mail: ana@atelier.com
- Link: "Editar perfil →"

Estados:
- Estado padrão: campos preenchidos com valores atuais
- Estado com alteração pendente: botão "Salvar alterações" com destaque visual indicando mudança não salva

Referência de fluxo: Épico 2 — RN-003
```

---

---


---
---

## Prompt 17 — Preview do PDF de Multa

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações | 17. Preview PDF de Multa | 18. Preview Recibo do Sinal

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 17 — Preview do PDF de Multa.

---

Crie o design da tela "Preview do PDF de Multa" para o sistema Pense & Precifique.

Contexto: após confirmar o cancelamento de um orçamento Em Produção ou Finalizado com multa definida, o sistema gera este PDF para a artesã enviar à cliente. A tela segue o mesmo padrão da Tela 7 (Preview do Orçamento) — barra de ações do sistema + documento simulado.

Layout:
- Sidebar com item "Orçamentos" ativo
- Breadcrumb: "Orçamentos > #0042 — Mariana Costa > PDF de Multa"
- Barra de ações: botão "← Voltar ao orçamento", botão "Baixar PDF de Multa" (vermelho suave, ícone download)
- Badge de status do orçamento: "Cancelado" (vermelho suave)

Área de preview do documento (folha A4 simulada, com sombra suave):

Cabeçalho do documento:
- Logo da empresa à esquerda (lâmpada teal com pontos laranjas)
- Nome "Pense & Crie Studio" e contato "penseecrie@email.com | (11) 98888-1234"
- Título: "NOTIFICAÇÃO DE MULTA POR CANCELAMENTO" — destaque, texto vermelho suave
- Referência: "Orçamento #0042"
- Data de emissão: 05/06/2026

Dados da cliente:
- Nome: Mariana Costa | WhatsApp: (11) 99999-0000

Seção "Detalhes do cancelamento":
- Data do cancelamento: 05/06/2026
- Valor total do orçamento original: R$ 183,60
- Percentual de multa aplicado: 50%
- **Valor da multa: R$ 91,80** (destaque, vermelho suave bold)

Seção "Insumos e materiais já consumidos":
- Tabela: Item | Quantidade consumida
  - Papel couchê 180g | 4 folhas
  - Fita dupla face 12mm | 30 cm

Seção "Instrução de pagamento":
- Texto: "O valor de R$ 91,80 referente à multa por cancelamento deve ser pago até [data]. Entre em contato para combinar a forma de pagamento."

Rodapé:
- "Este documento foi gerado pelo sistema Pense & Precifique em 05/06/2026."

Estados que a tela deve mostrar:
- Estado padrão: documento completo como descrito acima

Referência de fluxo: RN-019 — PDF de multa; UC-007 — Cancelar orçamento Em Produção/Finalizado
```

---
---

## Prompt 18 — Preview do Recibo do Sinal

```
CONTEXTO DO SISTEMA — leia antes de criar esta tela

Você está criando uma tela para o sistema Pense & Precifique — plataforma web responsiva de gestão e precificação para artesãs pequenas empreendedoras. O sistema é usado principalmente no celular (60%) e no computador (40%).

Telas que compõem o sistema (para referência de consistência):
1. Login | 2. Cadastro | 3. Onboarding de Precificação | 4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview do Orçamento (PDF) | 8. Detalhe do Orçamento — Gestão de Status | 9. Orçamentos (lista) | 10. Insumos (lista) | 11. Cadastrar / Editar Insumo | 12. Detalhe do Insumo + Histórico | 13. Produtos (lista) | 14. Cadastrar Produto + Ficha Técnica | 15. Produção | 16. Configurações | 17. Preview PDF de Multa | 18. Preview Recibo do Sinal

Design system obrigatório:
- Cores: laranja #F97316, teal #2A9D8F, branco #FFFFFF, cinza claro #F8F8F8
- Border-radius: 12–16px em cards, 8–10px em inputs e botões
- Sombras: suaves (0 2px 8px rgba(0,0,0,0.07))
- Tipografia: sans-serif limpa (Inter ou similar), pesos 400/500/600
- Sidebar: branca, item ativo com fundo laranja claro e texto laranja, logo no topo
- Tom: delicado, artesanal, clean e minimalista
- Mobile-first: 375px e 1280px

Referências visuais anexadas nesta conversa:
- Prints do sistema de referência (Lovable): use como inspiração de estilo, espaçamento e componentes — não copie fielmente
- Logo da empresa: lâmpada teal com pontilhados laranjas + texto "Pense & Precifique" bicolor — incorpore os elementos da logo como detalhes decorativos sutis na tela

A tela que você vai criar agora é a Tela 18 — Preview do Recibo do Sinal.

---

Crie o design da tela "Preview do Recibo do Sinal" para o sistema Pense & Precifique.

Contexto: após a artesã confirmar o recebimento do sinal (entrada), o sistema gera este recibo automaticamente para ela enviar à cliente como comprovante. A tela segue o mesmo padrão da Tela 7 (Preview do Orçamento) — barra de ações + documento simulado. O tom é positivo e acolhedor — é um momento bom, a produção vai começar!

Layout:
- Sidebar com item "Orçamentos" ativo
- Breadcrumb: "Orçamentos > #0042 — Mariana Costa > Recibo do Sinal"
- Barra de ações: botão "← Voltar ao orçamento", botão "Baixar Recibo" (teal, ícone download)
- Badge de status do orçamento: "Em Produção" (laranja)

Área de preview do documento (folha A4 simulada, com sombra suave):

Cabeçalho do documento:
- Logo da empresa à esquerda (lâmpada teal com pontos laranjas)
- Nome "Pense & Crie Studio" e contato "penseecrie@email.com | (11) 98888-1234"
- Título: "RECIBO DE PAGAMENTO — ENTRADA" — destaque em teal
- Referência: "Orçamento #0042"
- Data de emissão: 05/06/2026

Dados da cliente:
- Nome: Mariana Costa | WhatsApp: (11) 99999-0000

Seção "Confirmação do recebimento" (card destacado com borda teal, fundo teal clarinho):
- ✓ "Entrada recebida com sucesso"
- Valor recebido: **R$ 91,80** (grande, teal bold)
- Data do recebimento: 05/06/2026
- Forma de pagamento: PIX

Seção "Detalhes do pedido":
- Referência: Orçamento #0042
- Itens: Kit Convite Casamento × 3 (Laminação fosca), Etiqueta personalizada × 10
- Valor total do pedido: R$ 183,60
- Entrada paga (50%): R$ 91,80
- **Restante a pagar na entrega: R$ 91,80** (destaque laranja)

Seção "Próximos passos":
- Texto: "Sua produção foi iniciada! O restante de R$ 91,80 será cobrado na entrega do pedido. Prazo estimado: 10 dias úteis."

Rodapé:
- "Este recibo foi gerado pelo sistema Pense & Precifique em 05/06/2026."

Estados que a tela deve mostrar:
- Estado padrão: documento completo como descrito acima

Referência de fluxo: RN-018 — Recibo do sinal; UC-011 — Confirmar recebimento do sinal
```

---
---
## TELAS FINAIS — RESUMO COMPLETO

### Fluxo de autenticação
1. Login | 2. Cadastro | 3. Onboarding

### Área logada
4. Dashboard | 5. Clientes | 6. Criar Orçamento | 7. Preview PDF | 8. Detalhe/Status Orçamento | 9. Lista Orçamentos

### Insumos
10. Lista | 11. Cadastrar/Editar | 12. Detalhe + Histórico

### Produtos *(sem aba Customizações vinculadas — apenas Dados básicos + Ficha Técnica)*
13. Lista (tipos: Produto / Produto Base / Customização) | 14. Cadastrar | 15. Editar | 16. Detalhe + Histórico

### Produção *(título: Registro de Produção — toggle: Produto / Produto Base / Customização)*
17. Lista + Nova Produção

### Configurações *(3 abas: Precificação + Perfil da empresa + Conta)*
18. Configurações

### PDFs
19. Preview PDF de Multa | 20. Preview Recibo do Sinal | 21. Recibo de Pagamento Completo

---

## REGRAS VISUAIS CONSOLIDADAS

- **Menu lateral:** Dashboard, Clientes, Orçamentos, Insumos, Produtos, Produção, Configurações, Sair — **sem "Minhas Customizações"**
- **Itens inativos:** esmaecidos + badge "Inativo" vermelho suave + opção "Reativar" no menu
- **Orçamentos cancelados:** esmaecidos + valor riscado + menu só com "Ver detalhes"
- **Motivos de baixa manual:** Perda, Avaria, Uso extra, Correção de estoque, Outro
- **Tipos de produto:** Produto (venda direta), Produto Base (componente, sem preço de venda), Customização (extra no orçamento, com preço de venda)
- **Coluna teal das telas de auth:** altura 100% do card, sem espaço branco embaixo

---

## INSTRUÇÕES DE EXPORTAÇÃO

Após aprovar todas as telas no Claude Design:
1. Clique em **Export → Project Archive**
2. Salve como: `design_Pense_Precifique.zip`
3. Guarde na pasta `claude/` do projeto
4. Leve o zip para a **Skill 6 — Frontend Conversion**

---

*Gerado pela Skill 4 — Frontend Design | Pense & Precifique v2 | 2026-06-04*
