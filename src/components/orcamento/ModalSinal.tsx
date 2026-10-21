import { useState } from "react";
import clsx from "clsx";
import { Receipt, Wallet } from "lucide-react";
import Button from "../ui/Button";
import ModalShell from "../ui/ModalShell";
import TextArea from "../ui/TextArea";
import { METODOS_PAGAMENTO } from "../../constants";
import type { OrcamentoDetalheResponse, AvancaStatusRequest, MetodoPagamento } from "../../types/orcamento";

const BRL = (n: number) => `R$ ${(n ?? 0).toFixed(2).replace(".", ",")}`;

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
  const [forma, setForma] = useState<MetodoPagamento>("PIX");
  const [formaObs, setFormaObs] = useState("");

  const obsCharCount = formaObs.length;
  const obsInvalida = obsCharCount > 0 && obsCharCount < 50;
  const obsValida = forma !== "OUTRO" || obsCharCount >= 50;
  const podeConfirmar = obsValida && !saving;

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
              onConfirm({
                metodoSinalRecebido: forma,
                metodoSinalRecebidoObs: forma === "OUTRO" ? formaObs : undefined,
              })
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

      {/* Forma de pagamento — chips */}
      <div className="mb-section">
        <div className="mb-[9px] text-[13px] font-semibold text-body">
          Forma de pagamento recebida
        </div>
        <div className="flex flex-wrap gap-2">
          {METODOS_PAGAMENTO.map((m) => {
            const on = forma === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setForma(m.id)}
                className={clsx(
                  "h-[38px] whitespace-nowrap rounded-full border-[1.5px] px-3.5 font-[inherit] text-[13.5px] font-semibold transition-all duration-150",
                  on ? "border-teal bg-teal text-white" : "border-line bg-white text-body"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {forma === "OUTRO" && (
          <div className="mt-3 animate-[fadeUp_.2s_ease_both]">
            <span className="mb-[7px] flex items-center text-[13px] font-semibold text-body">
              <span>
                Descreva a forma de pagamento <span className="text-orange">*</span>
              </span>
            </span>
            <TextArea
              value={formaObs}
              onChange={setFormaObs}
              rows={2}
              minimo={50}
              erro={obsInvalida ? `Mínimo de 50 caracteres. Faltam ${50 - obsCharCount}.` : undefined}
              textSize="text-[13.5px]"
              placeholder="Ex: cheque à vista, app de pagamento..."
            />
          </div>
        )}
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
