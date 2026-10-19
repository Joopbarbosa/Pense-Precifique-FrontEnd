/**
 * V0.17.0 #998 (RN-NOVA-34) — catálogo único dos textos do botão "?" dos dashboards (Início, Vendas, Cadastros e
 * Compras). Cada item explica, em linguagem simples: o que mostra, de onde vem o número, a conta por extenso com um
 * exemplo (quando há conta) e o que acontece ao clicar. Cartão com mais de um número explica cada um em `partes`.
 * Texto novo entra aqui; nenhum cálculo é feito neste arquivo.
 */

export interface ParteAjuda {
  /** Nome do número dentro do cartão (só quando o cartão mostra mais de um). */
  nome?: string
  mostra: string
  origem?: string
  /** A conta escrita por extenso. */
  conta?: string
  /** Exemplo com números. */
  exemplo?: string
}

export interface TextoAjuda {
  titulo: string
  partes: ParteAjuda[]
  clique?: string
}

const venda = 'Só entram vendas que contam: as do Caixa concluídas e os orçamentos já entregues (cancelada ou em andamento não conta).'

const CATALOGO = {
  // ── Início ──────────────────────────────────────────────────────────────
  'inicio-faturamento': {
    titulo: 'Faturamento do mês',
    partes: [{
      mostra: 'Quanto você recebeu em orçamentos neste mês.',
      origem: 'Soma do total dos orçamentos cujo pagamento foi registrado dentro do mês atual.',
      conta: 'Total do orçamento 1 + total do orçamento 2 + … (só os pagos neste mês).',
      exemplo: 'Dois orçamentos pagos, de R$ 300,00 e R$ 150,00, dão R$ 450,00.',
    }],
  },
  'inicio-produtos': {
    titulo: 'Produtos cadastrados',
    partes: [{
      mostra: 'Quantos produtos você tem cadastrados.',
      origem: 'Contagem dos produtos da sua conta, na lista de Produtos.',
      exemplo: 'Se você cadastrou o Laço pequeno, o Laço grande e o Caderno, o número é 3.',
    }],
  },
  'inicio-orcamentos-pendentes': {
    titulo: 'Orçamentos pendentes',
    partes: [{
      mostra: 'Quantos orçamentos ainda estão andando e não foram concluídos.',
      origem: 'Contagem dos orçamentos nos status Enviado, Aprovado, Aguardando sinal, Sinal pago e Em produção.',
      exemplo: 'Dois orçamentos enviados e um em produção dão 3 pendentes.',
    }],
  },
  'inicio-orcamentos-recentes': {
    titulo: 'Orçamentos recentes',
    partes: [{
      mostra: 'Os últimos orçamentos que você mexeu, do mais novo para o mais antigo.',
      origem: 'Lista dos orçamentos mais recentes da sua conta, com cliente, valor e status.',
    }],
    clique: 'Clicar em um orçamento abre o orçamento.',
  },
  'inicio-mais-vendidos': {
    titulo: 'Mais vendidos',
    partes: [{
      mostra: 'Os 5 produtos que mais aparecem nos seus orçamentos.',
      origem: 'Soma das quantidades de cada produto em todos os orçamentos da conta (não só os pagos).',
      conta: 'Quantidade do produto no orçamento 1 + no orçamento 2 + …; o produto com a maior soma fica no topo.',
      exemplo: 'O Laço pequeno aparece 4 vezes em um orçamento e 3 em outro: 7 unidades.',
    }],
  },
  'inicio-estoque-baixo': {
    titulo: 'Insumos com estoque baixo',
    partes: [{
      mostra: 'Os insumos que estão acabando e merecem compra.',
      origem: 'Insumos cujo estoque está abaixo do mínimo que você cadastrou. O aviso só aparece quando existe algum.',
      exemplo: 'Fita de cetim com mínimo de 5 metros e estoque de 2 metros aparece aqui.',
    }],
    clique: 'Clicar abre a lista de Insumos.',
  },

  // ── Dashboard de Vendas ─────────────────────────────────────────────────
  'vendas-faturamento': {
    titulo: 'Faturamento',
    partes: [{
      mostra: 'Quanto você vendeu no período escolhido.',
      origem: venda,
      conta: 'Total de cada venda somado.',
      exemplo: 'Três vendas, de R$ 100,00, R$ 50,00 e R$ 50,00, dão R$ 200,00.',
    }],
    clique: 'A lupa do cartão abre as vendas que formam o número.',
  },
  'vendas-numero': {
    titulo: 'Nº de vendas',
    partes: [{
      mostra: 'Quantas vendas aconteceram no período.',
      origem: venda,
      conta: 'Contagem das vendas, uma para cada venda do Caixa ou orçamento entregue.',
      exemplo: 'Duas vendas do Caixa e um orçamento entregue dão 3 vendas.',
    }],
    clique: 'A lupa do cartão abre a lista dessas vendas.',
  },
  'vendas-ticket': {
    titulo: 'Ticket médio',
    partes: [{
      mostra: 'Quanto, em média, cada venda rendeu.',
      origem: 'Vem do faturamento e do número de vendas do período.',
      conta: 'Faturamento dividido pelo número de vendas.',
      exemplo: 'Faturamento de R$ 200,00 em 4 vendas dá ticket médio de R$ 50,00.',
    }],
    clique: 'A lupa do cartão abre as vendas que formam o ticket médio.',
  },
  'vendas-fat-mes': {
    titulo: 'Faturamento por mês',
    partes: [{
      mostra: 'Quanto você vendeu em cada mês do período.',
      origem: venda + ' Cada barra soma as vendas do mês.',
      exemplo: 'Em outubro, vendas de R$ 800,00 e R$ 200,00 formam uma barra de R$ 1.000,00.',
    }],
    clique: 'Clicar numa barra abre as vendas daquele mês.',
  },
  'vendas-origem': {
    titulo: 'Vendas por origem',
    partes: [{
      mostra: 'De onde vieram as vendas: Caixa ou Orçamento.',
      origem: venda + ' Cada fatia soma o valor vendido por aquele caminho.',
      conta: 'Valor das vendas do Caixa de um lado e dos orçamentos entregues do outro; a fatia é a parte de cada um no total.',
      exemplo: 'R$ 600,00 no Caixa e R$ 400,00 em orçamentos: o Caixa é 60% e o Orçamento 40%.',
    }],
    clique: 'Clicar numa fatia ou na legenda abre as vendas daquela origem.',
  },
  'vendas-produtos': {
    titulo: 'Produtos mais vendidos',
    partes: [{
      mostra: 'Os produtos que mais saíram, em unidades vendidas.',
      origem: venda + ' Mostra os 10 primeiros.',
      conta: 'Soma das unidades do produto em todas as vendas do período.',
      exemplo: 'O Caderno vendeu 3 unidades em uma venda e 2 em outra: 5 unidades.',
    }],
    clique: 'Clicar numa barra abre as vendas daquele produto; a lupa abre a lista completa.',
  },
  'vendas-pagamento': {
    titulo: 'Formas de pagamento',
    partes: [{
      mostra: 'Por qual forma de pagamento entrou o dinheiro.',
      origem: venda + ' Cada parte soma o valor recebido naquela forma (Pix, Dinheiro, Cartão…).',
      exemplo: 'R$ 300,00 em Pix e R$ 100,00 em Dinheiro: o Pix lidera com R$ 300,00.',
    }],
    clique: 'Clicar numa parte abre as vendas pagas daquela forma.',
  },

  // ── Dashboard de Cadastros ──────────────────────────────────────────────
  'cad-estoque-valor': {
    titulo: 'Valor do estoque a custo',
    partes: [{
      mostra: 'Quanto vale, pelo que custou, tudo que você tem guardado: material e produtos prontos.',
      origem: 'Estoque atual de cada insumo e de cada produto pronto, multiplicado pelo custo de cada um.',
      conta: 'Para cada item: quantidade em estoque vezes o custo da unidade; depois soma tudo.',
      exemplo: '10 metros de fita a R$ 2,00 e 4 laços prontos a R$ 5,00 de custo: R$ 20,00 + R$ 20,00 = R$ 40,00.',
    }],
    clique: 'A lupa abre a lista de itens, com estoque, custo e valor.',
  },
  'cad-potencial': {
    titulo: 'Potencial de venda do estoque',
    partes: [{
      mostra: 'Quanto você receberia se vendesse todos os produtos prontos que tem em estoque.',
      origem: 'Estoque de cada produto pronto, multiplicado pelo preço de venda.',
      conta: 'Para cada produto pronto: quantidade em estoque vezes o preço de venda; depois soma tudo.',
      exemplo: '4 laços prontos a R$ 15,00 cada: 4 × R$ 15,00 = R$ 60,00.',
    }],
    clique: 'A lupa abre a lista de produtos prontos, com estoque e preço.',
  },
  'cad-cmv': {
    titulo: '% de CMV',
    partes: [{
      mostra: 'Quanto da venda foi gasto só com material. CMV quer dizer "custo do material vendido".',
      origem: venda + ' O custo do material é o que ficou registrado em cada venda.',
      conta: 'O custo do material do que foi vendido, dividido pelo faturamento, vezes cem.',
      exemplo: 'Custo de material de R$ 30,00 para um faturamento de R$ 100,00 dá 30%.',
    }],
    clique: 'A lupa abre as vendas do período, com faturamento, custo e CMV de cada uma.',
  },
  'cad-margem-material': {
    titulo: 'Margem após custo de material',
    partes: [{
      mostra: 'Quanto sobra de cada venda depois de descontar o material, antes das outras despesas.',
      origem: venda,
      conta: 'O faturamento menos o custo do material, dividido pelo faturamento, vezes cem. É o que falta para o % de CMV chegar a 100%.',
      exemplo: 'Faturamento de R$ 100,00 e material de R$ 30,00: (100 − 30) ÷ 100 = 70%.',
    }],
    clique: 'A lupa abre as vendas do período, com o custo de material de cada uma.',
  },
  'cad-abaixo-minimo': {
    titulo: 'Insumos abaixo do mínimo',
    partes: [{
      mostra: 'Quantos insumos estão com menos estoque do que o mínimo que você definiu.',
      origem: 'Contagem dos insumos cujo estoque é menor que o estoque mínimo do cadastro.',
      exemplo: 'Mínimo de 5 e estoque de 2 conta como abaixo; mínimo de 5 e estoque de 8 não conta.',
    }],
    clique: 'A lupa abre a lista dos insumos abaixo do mínimo e quanto falta em cada um.',
  },
  'cad-evolucao': {
    titulo: 'Evolução de preço dos insumos',
    partes: [{
      mostra: 'Como o preço de cada insumo escolhido mudou ao longo dos meses. Escolha até 5 insumos.',
      origem: 'Compras confirmadas. Cada ponto é o preço médio pago por unidade naquele mês.',
      conta: 'Soma do que foi pago no mês dividida pela soma das quantidades compradas no mês.',
      exemplo: 'Em outubro, 10 m por R$ 20,00 e 5 m por R$ 20,00: R$ 40,00 ÷ 15 m = R$ 2,67 por metro.',
    }],
    clique: 'Clicar num ponto abre as compras daquele insumo naquele mês.',
  },
  'cad-em-quantos': {
    titulo: 'Em quantos produtos cada insumo está',
    partes: [{
      mostra: 'Quais insumos estão em mais produtos seus.',
      origem: 'Contagem, para cada insumo, dos produtos ativos que o usam na ficha técnica.',
      exemplo: 'A Fita de cetim está na ficha do Laço pequeno e do Laço grande: aparece com 2.',
    }],
    clique: 'Clicar abre os produtos que usam o insumo, com a quantidade na ficha; a lupa abre a lista completa.',
  },
  'cad-mais-comprado': {
    titulo: 'Insumo mais comprado',
    partes: [{
      mostra: 'Os insumos que você mais comprou, pelo número de compras.',
      origem: 'Compras confirmadas no período. Conta quantas compras tiveram o insumo, não a quantidade.',
      exemplo: 'Se você comprou fita em 5 compras diferentes, ela aparece com 5.',
    }],
    clique: 'Clicar abre as compras daquele insumo; a lupa abre a lista completa.',
  },
  'cad-mais-gasto': {
    titulo: 'Insumo em que mais gastamos',
    partes: [{
      mostra: 'Os insumos em que você mais gastou dinheiro.',
      origem: 'Compras confirmadas no período, pelo valor realmente pago (já com os descontos).',
      conta: 'Soma do que foi pago em todas as compras do insumo no período.',
      exemplo: 'Duas compras de fita, de R$ 120,00 e R$ 180,00, dão R$ 300,00.',
    }],
    clique: 'Clicar numa barra abre as compras daquele insumo; a lupa abre a lista completa.',
  },
  'cad-mais-vendido': {
    titulo: 'Produto mais vendido',
    partes: [{
      mostra: 'Os produtos que mais saíram, em quantidade.',
      origem: venda,
      conta: 'Soma das unidades do produto em todas as vendas do período.',
      exemplo: 'O Laço pequeno vendeu 6 unidades em uma venda e 4 em outra: 10.',
    }],
    clique: 'Clicar abre o produto; a lupa abre a lista completa.',
  },
  'cad-mais-lucro': {
    titulo: 'Produto que dá mais lucro',
    partes: [{
      mostra: 'Os produtos que mais deixaram dinheiro no período, só descontando o material.',
      origem: venda + ' Usa o valor vendido e o custo do material gravado em cada venda.',
      conta: 'O valor vendido do produto menos o custo do material dele.',
      exemplo: 'Vendeu R$ 90,00 de Caderno com R$ 30,00 de material: lucro de R$ 60,00.',
    }],
    clique: 'Clicar abre as vendas do produto; a lupa abre a lista completa.',
  },
  'cad-variaram': {
    titulo: 'Insumos que mais variaram de preço',
    partes: [{
      mostra: 'Os insumos cujo preço mais subiu ou desceu dentro do período.',
      origem: 'Compras confirmadas. Só entra insumo com 2 ou mais compras no período.',
      conta: 'O último preço pago menos o primeiro, dividido pelo primeiro, vezes cem.',
      exemplo: 'Fita comprada a R$ 2,00 e depois a R$ 3,00: (3 − 2) ÷ 2 = 50% de aumento.',
    }],
    clique: 'Clicar abre as compras do insumo; a lupa abre a lista completa.',
  },
  'cad-abaixo-sugerido': {
    titulo: 'Produtos com preço de venda menor que o sugerido',
    partes: [{
      mostra: 'Produtos que você está vendendo por menos do que o sistema calcula como preço ideal.',
      origem: 'É uma foto de hoje, não depende do período. O preço sugerido sai do custo e da margem configurada.',
      conta: 'Compara o preço de venda com o preço sugerido de cada produto.',
      exemplo: 'Sugerido R$ 18,00 e preço de venda R$ 15,00: o produto aparece aqui, com R$ 3,00 de diferença.',
    }],
    clique: 'O preço de venda continua sendo decisão sua; o sistema só avisa.',
  },
  'cad-margem': {
    titulo: 'Margem por produto',
    partes: [{
      mostra: 'Quanto de cada preço de venda sobra depois do custo, produto a produto. Os menores aparecem primeiro.',
      origem: 'Preço de venda e custo atual de cada produto.',
      conta: 'O preço de venda menos o custo, dividido pelo preço de venda, vezes cem.',
      exemplo: 'Preço de R$ 20,00 e custo de R$ 12,00: (20 − 12) ÷ 20 = 40%.',
    }],
  },
  'cad-abc': {
    titulo: 'Curva ABC de produtos por lucro',
    partes: [{
      mostra: 'Quais produtos dão a maior parte do seu lucro. Os produtos ficam em três classes: A (os mais importantes), B e C.',
      origem: venda + ' Só produtos com lucro maior que zero entram na curva. Os de lucro zero ou negativo ficam fora, sem porcentagem, acumulado nem classe.',
      conta: '% do lucro: o lucro do produto dividido pelo lucro total, vezes cem. Acumulado: a soma das porcentagens dos produtos até aquela linha, do maior lucro para o menor.',
      exemplo: 'Laço grande R$ 70,00, Caderno R$ 20,00 e Laço pequeno R$ 10,00 (total R$ 100,00): 70% e acumulado 70%; 20% e acumulado 90%; 10% e acumulado 100%.',
    }, {
      nome: 'Classes',
      mostra: 'A classe vem do acumulado.',
      conta: 'A: acumulado até 80%. B: acima de 80% até 95%. C: acima de 95%. O primeiro produto é sempre A.',
    }],
    clique: 'Clicar numa barra abre as vendas daquele produto.',
  },

  // ── Dashboard de Compras ────────────────────────────────────────────────
  'comp-gasto': {
    titulo: 'Gasto no período',
    partes: [{
      mostra: 'Quanto você gastou comprando insumos no período.',
      origem: 'Compras confirmadas, pelo valor realmente pago (já com os descontos).',
      conta: 'Soma do valor pago em cada compra.',
      exemplo: 'Compras de R$ 120,00, R$ 80,00 e R$ 50,00 dão R$ 250,00.',
    }],
    clique: 'A lupa abre as compras do período.',
  },
  'comp-compras-ticket': {
    titulo: 'Compras e ticket médio',
    partes: [{
      nome: 'Compras',
      mostra: 'Quantas compras você fez no período.',
      origem: 'Contagem das compras confirmadas.',
      exemplo: 'Três compras confirmadas dão 3.',
    }, {
      nome: 'Ticket médio',
      mostra: 'Quanto, em média, cada compra custou.',
      conta: 'O gasto do período dividido pelo número de compras.',
      exemplo: 'Gasto de R$ 250,00 em 5 compras: ticket de R$ 50,00.',
    }],
    clique: 'A lupa abre as compras do período.',
  },
  'comp-economia': {
    titulo: 'Economia com desconto',
    partes: [{
      nome: 'Valor economizado',
      mostra: 'Quanto você deixou de pagar por causa de descontos.',
      origem: 'Compras confirmadas com desconto.',
      conta: 'O total a preço cheio menos o total realmente pago.',
      exemplo: 'Compras que custariam R$ 500,00 e custaram R$ 450,00: economia de R$ 50,00.',
    }, {
      nome: 'Porcentagem',
      mostra: 'Quanto isso representa do preço cheio.',
      conta: 'A economia dividida pelo total a preço cheio, vezes cem.',
      exemplo: 'R$ 50,00 ÷ R$ 500,00 = 10%.',
    }],
    clique: 'A lupa abre as compras que tiveram desconto.',
  },
  'comp-cmv': {
    titulo: 'CMV',
    partes: [{
      nome: 'Valor do CMV',
      mostra: 'Quanto custou o material do que você vendeu. CMV quer dizer "custo do material vendido".',
      origem: 'Vendas do período que contam (Caixa concluídas e orçamentos entregues), com o custo gravado em cada uma.',
      conta: 'Soma do custo do material de cada venda.',
      exemplo: 'Vendas com material de R$ 20,00 e R$ 10,00: CMV de R$ 30,00.',
    }, {
      nome: 'Porcentagem',
      mostra: 'Quanto o material pesou no faturamento.',
      conta: 'O custo do material do que foi vendido, dividido pelo faturamento, vezes cem.',
      exemplo: 'Custo de R$ 30,00 para um faturamento de R$ 100,00 dá 30%.',
    }],
    clique: 'A lupa abre as vendas do período, com o custo de cada uma.',
  },
  'comp-nao-pagas': {
    titulo: 'Compras não pagas',
    partes: [{
      mostra: 'Quanto você ainda deve de compras confirmadas.',
      origem: 'Compras confirmadas marcadas como "Não pago". É a situação de hoje e não depende do período.',
      conta: 'Soma do valor das compras não pagas.',
      exemplo: 'Duas compras não pagas, de R$ 70,00 e R$ 30,00, dão R$ 100,00.',
    }],
    clique: 'A lupa abre as compras não pagas.',
  },
  'comp-maior-aumento': {
    titulo: 'Maior aumento no período',
    partes: [{
      mostra: 'O insumo cujo preço mais subiu dentro do período.',
      origem: 'Compras confirmadas. Só entra insumo com 2 ou mais compras no período.',
      conta: 'O último preço pago menos o primeiro, dividido pelo primeiro, vezes cem.',
      exemplo: 'Fita de R$ 2,00 para R$ 3,00 por metro: +50%.',
    }],
    clique: 'A lupa abre as compras desse insumo.',
  },
  'comp-gasto-mes': {
    titulo: 'Gasto por mês',
    partes: [{
      mostra: 'Quanto você gastou em compras em cada mês.',
      origem: 'Compras confirmadas, pelo valor pago. Cada barra soma o mês.',
      exemplo: 'Em setembro, compras de R$ 200,00 e R$ 100,00 formam uma barra de R$ 300,00.',
    }],
    clique: 'Clicar numa barra abre as compras daquele mês.',
  },
  'comp-cmv-mes': {
    titulo: 'CMV por mês',
    partes: [{
      mostra: 'Quanto custou, em cada mês, o material do que você vendeu.',
      origem: 'Vendas que contam no mês, com o custo de material gravado em cada uma.',
      conta: 'Soma do custo do material das vendas do mês.',
      exemplo: 'Em outubro, vendas com material de R$ 40,00 e R$ 25,00: R$ 65,00.',
    }],
  },
  'comp-cmv-pct-mes': {
    titulo: 'CMV % por mês',
    partes: [{
      mostra: 'Quanto o material pesou no faturamento de cada mês.',
      origem: 'Vendas que contam no mês.',
      conta: 'O CMV do mês dividido pelo faturamento do mês, vezes cem.',
      exemplo: 'CMV de R$ 65,00 e faturamento de R$ 260,00 no mês: 25%.',
    }],
  },
  'comp-subiram': {
    titulo: 'Insumos que mais subiram',
    partes: [{
      mostra: 'Os insumos que mais encareceram no período.',
      origem: 'Compras confirmadas. Só entram insumos com 2 ou mais compras.',
      conta: 'O último preço pago menos o primeiro, dividido pelo primeiro, vezes cem.',
      exemplo: 'Papel de R$ 0,30 para R$ 0,40: (0,40 − 0,30) ÷ 0,30 = 33%.',
    }],
    clique: 'Clicar numa barra abre as compras do insumo.',
  },
  'comp-forn-gasto': {
    titulo: 'Fornecedores de quem mais compramos',
    partes: [{
      mostra: 'Os fornecedores para quem você mais pagou.',
      origem: 'Compras confirmadas no período, pelo valor pago.',
      conta: 'Soma do valor pago em todas as compras do fornecedor.',
      exemplo: 'Duas compras da Papelaria Sol, de R$ 150,00 e R$ 100,00, dão R$ 250,00.',
    }],
    clique: 'Clicar numa barra abre as compras do fornecedor.',
  },
  'comp-forn-desconto': {
    titulo: 'Fornecedores que mais deram desconto',
    partes: [{
      mostra: 'Os fornecedores que mais baixaram o preço para você.',
      origem: 'Compras confirmadas no período que tiveram desconto.',
      conta: 'Para cada fornecedor: o total a preço cheio menos o total pago.',
      exemplo: 'Compras que custariam R$ 300,00 e custaram R$ 270,00: R$ 30,00 de desconto.',
    }],
    clique: 'Clicar numa barra abre as compras do fornecedor.',
  },
  'comp-evolucao-pago': {
    titulo: 'Evolução do preço pago',
    partes: [{
      mostra: 'Como o preço pago por unidade de cada insumo mudou a cada compra. Escolha até 5 insumos.',
      origem: 'Compras confirmadas. Cada ponto é uma compra.',
      conta: 'O valor pago na compra dividido pela quantidade comprada.',
      exemplo: 'Pagou R$ 20,00 por 10 metros de fita: R$ 2,00 por metro.',
    }],
    clique: 'Clicar numa linha abre o gráfico maior daquele insumo.',
  },
} satisfies Record<string, TextoAjuda>

export type IdAjuda = keyof typeof CATALOGO
export const AJUDA: Record<IdAjuda, TextoAjuda> = CATALOGO
