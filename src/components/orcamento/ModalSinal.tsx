import { formatarMoeda2 } from '../../utils/formatacao'
import { useState } from "react";
import { Receipt, Wallet } from "lucide-react";
import Button from "../ui/Button";
import ModalShell from "../ui/ModalShell";
import MetodoPagamentoEscolha from "../compra/MetodoPagamentoEscolha";
import type { OrcamentoDetalheResponse, AvancaStatusRequest } from "../../types/orcamento";

const BRL = (n: number) => formatarMoeda2(n);

// ─── ModalSinal — confirmar recebimento do sinal ──────────────────────────────

export default function ModalSinal({
  orcamento,
  onClose,
  onConfirm,
  saving,
}: {
  orcamento: OrcamentoDetalheResponse;
  onClose: () => void;
  onConfirm: (data: AvancaStatusRequest) => void;
  saving: boolean;
}) {
  const [forma, setForma] = useState<string | null>(null);
  const podeConfirmar = !!forma && !saving;

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Confirmar recebimento do sinal"
      subtitle="Aguardando Sinal"
      icon={<Wallet size={18} />}
      iconBg="#FFF4E8"
      iconColor="#B5701F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!podeConfirmar}
            onClick={() =>
              onConfirm({ metodoSinalRecebidoId: forma ?? undefined })
            }
          >
            {saving ? "Confirmando..." : "Confirmar e gerar recibo →"}
          </Button>
        </>
      }
    >
      {/* Valor esperado */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-teal/20 bg-teal/[0.07] px-4 py-3.5">
        <span className="text-[13.5px] font-semibold text-body">
          Valor esperado
        </span>
        <span className="text-xl font-bold text-teal [font-variant-numeric:tabular-nums]">
          {BRL(orcamento.valorSinal || 0)}
          {orcamento.percentualSinal ? (
            <span className="text-[13px] font-semibold text-muted"> ({orcamento.percentualSinal}%)</span>
          ) : null}
        </span>
      </div>

      {/* Forma de pagamento — métodos ativos do cadastro (RN-NOVA-42) */}
      <div className="mb-section">
        <div className="mb-[9px] text-[13px] font-semibold text-body">
          Forma de pagamento recebida
        </div>
        <MetodoPagamentoEscolha value={forma} onChange={setForma} />
      </div>

      {/* Aviso */}
      <div className="flex gap-2.5 rounded-xl border border-teal/18 bg-teal/6 px-3.5 py-3">
        <Receipt size={16} className="mt-px shrink-0 text-teal" />
        <p className="m-0 text-[12.5px] leading-[1.55] text-body">
          Após confirmar, o sistema avançará o orçamento e gerará o recibo do
          sinal com a forma de pagamento registrada.
        </p>
      </div>
    </ModalShell>
  );
}
