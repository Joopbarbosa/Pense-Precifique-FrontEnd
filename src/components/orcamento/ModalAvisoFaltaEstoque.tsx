import { AlertTriangle } from "lucide-react";
import Button from "../ui/Button";
import ModalShell from "../ui/ModalShell";
import type { SimulacaoEstoqueProdutoResponse } from "../../types/orcamento";

// #1156 — aviso mostrado ao abrir o vínculo com a produção: lista os produtos do orçamento com estoque
// insuficiente. Só informa; o OK segue para o vínculo (a produção é o que vai repor o estoque).
export default function ModalAvisoFaltaEstoque({
  itens,
  onClose,
  onOk,
}: {
  itens: SimulacaoEstoqueProdutoResponse[];
  onClose: () => void;
  onOk: () => void;
}) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title="Falta estoque para este orçamento"
      subtitle="Antes de vincular a produção"
      icon={<AlertTriangle size={18} />}
      iconBg="#FFF4E8"
      iconColor="#B5701F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onOk}>
            OK, vincular produção
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm leading-[1.6] text-body">
        Estes produtos não têm estoque suficiente para o orçamento. Vincule (ou crie) uma produção para repor o estoque.
      </p>
      <div className="mt-4 flex max-h-[180px] flex-col gap-1.5 overflow-y-auto rounded-input border border-line bg-app/60 px-3.5 py-3" data-testid="aviso-falta-estoque">
        {itens.map((i) => (
          <div key={i.produtoId} className="flex items-center justify-between gap-3 text-[13.5px] text-body">
            <span className="truncate">{i.nomeProduto}</span>
            <span className="shrink-0 text-muted">
              precisa {i.quantidadeNecessaria} · tem {i.estoqueAtual}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
