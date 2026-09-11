import { AlertTriangle } from 'lucide-react'

// RN-NOVA-25 (V0.8.3, #319+376, P-F001f) — checkbox de "item com estoque insuficiente", extraído do
// checkpoint pré-persistência de CriarOrcamentoPage.tsx (RN-NOVA-11/13, antes inline no próprio
// componente) para ser reaproveitado também pelo card "Estoque insuficiente" do Detalhe do
// Orçamento (RN-NOVA-25). Componente puro de UI: não sabe qual endpoint a seleção aciona (o
// checkpoint de Novo Orçamento e o Detalhe chamam `criarProducaoVinculada` com `produtoIds` de
// formas diferentes — persistindo o orçamento antes ou não) — só lista os itens e reporta seleção.
//
// Estado de seleção CONTROLADO, não interno: os 2 contextos de uso têm layout de "ação agregada"
// bem diferentes — footer fixo de `ModalShell` (CriarOrcamentoPage) vs. barra inline entre os cards
// da lista de itens (DetalheOrcamentoPage) — um botão de confirmação embutido aqui forçaria um único
// layout. Cada página lê `selecionados.size` para o próprio botão "Criar produção (N)".
export interface SelecaoProducaoEstoqueItem {
  produtoId: string
  nomeProduto: string
  estoqueAtual: number
  quantidadeNecessaria: number
  quantidadeFaltante: number
}

interface SelecaoProducaoEstoqueProps {
  itens: SelecaoProducaoEstoqueItem[]
  selecionados: Set<string>
  onToggle: (produtoId: string) => void
  // DetalheOrcamentoPage embute 1 item por vez dentro do próprio card do item (o nome já aparece no
  // título do card, acima) — repetir o nome ali dentro seria redundante (e quebra locator
  // `exact: true` de nome único em specs pré-existentes, que não esperavam 2 ocorrências do mesmo
  // texto). CriarOrcamentoPage lista vários itens juntos num modal sem nenhum outro rótulo — nome
  // obrigatório nesse caso. Default false preserva o comportamento original (nome sempre visível).
  ocultarNome?: boolean
}

export default function SelecaoProducaoEstoque({ itens, selecionados, onToggle, ocultarNome }: SelecaoProducaoEstoqueProps) {
  return (
    <div className="flex flex-col gap-2">
      {itens.map(p => {
        const selecionado = selecionados.has(p.produtoId)
        return (
          <label
            key={p.produtoId}
            className="flex flex-wrap items-center gap-2.5 rounded-input border border-orange/30 bg-orange/[0.06] px-3.5 py-3 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selecionado}
              onChange={() => onToggle(p.produtoId)}
              className="h-4 w-4 flex-shrink-0 accent-orange"
            />
            <AlertTriangle size={16} className="flex-shrink-0 text-orange" />
            <span className="flex-1 text-[13px] leading-[1.4] text-warning-alt">
              {!ocultarNome && <strong className="font-semibold">{p.nomeProduto} — </strong>}
              disponível {p.estoqueAtual}, necessário {p.quantidadeNecessaria} (faltam {p.quantidadeFaltante} un.)
            </span>
          </label>
        )
      })}
    </div>
  )
}
