import { AlertCircle, Box, Zap } from "lucide-react";
import Button from "../ui/Button";
import ModalShell from "../ui/ModalShell";
import type { OrcamentoItemResponse } from "../../types/orcamento";
import type { AvisoEstoqueNegativo } from "../../types/producao";

// ─── ModalConfirmarAtalho — RN-NOVA-2 revisada (P-F002.2) ────────────────────
// Uma modal só: quando há avisosEstoque, o aviso aparece embutido aqui (mesmo texto que a API já
// devolve), não abre ConfirmarEstoqueNegativoModal por cima — decisão de UX travada no prompt.

export default function ModalConfirmarAtalho({
  itens,
  avisosEstoque,
  onClose,
  onConfirmarAtalho,
  onSeguirFluxoNormal,
  confirming,
}: {
  itens: OrcamentoItemResponse[];
  avisosEstoque: AvisoEstoqueNegativo[];
  onClose: () => void;
  onConfirmarAtalho: () => void;
  onSeguirFluxoNormal: () => void;
  confirming: boolean;
}) {
  const temAviso = avisosEstoque.length > 0;

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Pular direto para Finalizado?"
      subtitle="Enviado"
      icon={<Zap size={18} />}
      iconBg="#FFF4E8"
      iconColor="#B5701F"
      footer={
        <>
          <Button variant="ghost" onClick={onSeguirFluxoNormal} disabled={confirming}>
            Seguir fluxo normal
          </Button>
          <Button variant="primary" onClick={onConfirmarAtalho} disabled={confirming}>
            {confirming ? "Confirmando..." : "Confirmar atalho"}
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm leading-[1.6] text-body">
        {temAviso ? (
          <>
            Neste orçamento o cliente não vai pagar entrada e você disse que não precisa de prazo
            de produção, então dá pra deixar pronto pra entrega agora. Mas dar baixa no estoque vai
            deixar algum item negativo, como mostrado abaixo — quer confirmar assim mesmo?
          </>
        ) : (
          <>
            Neste orçamento o cliente não vai pagar entrada e você disse que não precisa de prazo
            de produção. Como todos os itens já têm estoque, podemos deixar esse orçamento pronto
            pra entrega agora mesmo?
          </>
        )}
      </p>

      {itens.length > 0 && (
        <div className="mt-4 flex max-h-[180px] flex-col gap-1.5 overflow-y-auto rounded-input border border-line bg-app/60 px-3.5 py-3">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 text-[13.5px] text-body"
            >
              <span className="flex items-center gap-2 truncate">
                <Box size={14} className="shrink-0 text-muted" />
                <span className="truncate">{item.nomeProduto}</span>
              </span>
              <span className="shrink-0 text-muted">
                estoque: {item.estoqueAtual}
              </span>
            </div>
          ))}
        </div>
      )}

      {temAviso && (
        <div className="mt-4 flex flex-col gap-2">
          {avisosEstoque.map((a) => (
            <div
              key={a.componenteId}
              className="flex items-start gap-2.5 rounded-input border border-orange/30 bg-orange/8 px-3.5 py-3 text-[13.5px] text-warning-alt"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{a.mensagem}</span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
