import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/ui/Button";
import ModalShell from "../../components/ui/ModalShell";
import ConfirmacaoModal from "../../components/shared/ConfirmacaoModal";
import {
  Check, Wallet, AlertCircle, Receipt, Ban, Calendar, Info, FileText,
  Download, ArrowLeft, ArrowRight, Phone, Layers, Box, SlidersHorizontal, Tag, Clock, Factory,
} from "lucide-react";
import { orcamentoService } from "../../services/orcamentoService";
import { clienteService } from "../../services/clienteService";
import { useAuthStore } from "../../store/authStore";
import type {
  OrcamentoDetalheResponse,
  AvancaStatusRequest,
  MetodoPagamento,
  ItemSemEstoque,
} from "../../types/orcamento";
import type { ClienteResponse } from "../../types/cliente";
import { isConfirmacaoEstoqueNegativoResponse } from "../../types/producao";
import type { AvisoEstoqueNegativo } from "../../types/producao";
import ConfirmarEstoqueNegativoModal from "../../components/producao/ConfirmarEstoqueNegativoModal";
import { METODOS_PAGAMENTO, STATUS_LABEL } from "../../constants";
import { useToast } from "../../hooks/useToast";
import { extractApiError } from "../../utils/apiError";

// ─── Status / fluxo ────────────────────────────────────────────────────────

type ApiStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "APROVADO"
  | "AGUARDANDO_SINAL"
  | "SINAL_PAGO"
  | "EM_PRODUCAO"
  | "FINALIZADO"
  | "ENTREGUE"
  | "PAGO"
  | "CANCELADO";


// Botão principal por status
const ACTION_LABEL: Partial<Record<ApiStatus, string>> = {
  RASCUNHO: "Enviar orçamento",
  ENVIADO: "Marcar como aprovado",
  APROVADO: "Confirmar início",
  AGUARDANDO_SINAL: "Confirmar recebimento do sinal",
  SINAL_PAGO: "Iniciar produção",
  EM_PRODUCAO: "Marcar como finalizado",
  FINALIZADO: "Marcar como entregue",
  ENTREGUE: "Confirmar pagamento",
};

// Descrição do próximo passo
const NEXT_HINT: Partial<Record<ApiStatus, string>> = {
  RASCUNHO: "Envie o orçamento para a cliente avaliar.",
  ENVIADO: "Quando a cliente aprovar, marque como aprovado.",
  APROVADO: "Confirme o início para seguir para a cobrança do sinal ou produção.",
  AGUARDANDO_SINAL: "Confirme o recebimento do sinal para liberar a produção.",
  SINAL_PAGO: "Inicie a produção dos itens do pedido.",
  EM_PRODUCAO: "Quando concluir, marque a produção como finalizada.",
  FINALIZADO: "Marque como entregue após a entrega ao cliente.",
  ENTREGUE: "Confirme o pagamento final para encerrar o pedido.",
};

// Ordem da timeline (exclui Cancelado)
const STEPS: ApiStatus[] = [
  "RASCUNHO",
  "ENVIADO",
  "APROVADO",
  "AGUARDANDO_SINAL",
  "SINAL_PAGO",
  "EM_PRODUCAO",
  "FINALIZADO",
  "ENTREGUE",
  "PAGO",
];

const STATUS_META: Record<string, { bg: string; fg: string; dot: string }> = {
  RASCUNHO: { bg: "#F1F0EC", fg: "#7C786F", dot: "#A8A49C" },
  ENVIADO: { bg: "#EAF1FB", fg: "#2A6FB0", dot: "#3A86CE" },
  APROVADO: { bg: "#E8F5EE", fg: "#1F8A5B", dot: "#34A56F" },
  AGUARDANDO_SINAL: { bg: "#FFF4E8", fg: "#B5701F", dot: "#E8973A" },
  SINAL_PAGO: { bg: "#E8F5EE", fg: "#1F8A5B", dot: "#34A56F" },
  EM_PRODUCAO: { bg: "#E7F4F1", fg: "#1F7A6F", dot: "#2A9D8F" },
  FINALIZADO: { bg: "#E7F4F1", fg: "#1F7A6F", dot: "#2A9D8F" },
  ENTREGUE: { bg: "#EAF1FB", fg: "#2A6FB0", dot: "#3A86CE" },
  PAGO: { bg: "#E8F5EE", fg: "#1F8A5B", dot: "#34A56F" },
  CANCELADO: { bg: "#FCF0EC", fg: "#C0492B", dot: "#D06A4E" },
};

const BRL = (n: number) => `R$ ${(n ?? 0).toFixed(2).replace(".", ",")}`;

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
};

// Tipo de wizard de cancelamento por status
function cancelKind(status: ApiStatus): "simples" | "estorno" | "multa" | "justificativa" {
  if (status === "SINAL_PAGO") return "estorno";
  if (status === "EM_PRODUCAO" || status === "FINALIZADO") return "multa";
  if (status === "ENTREGUE" || status === "PAGO") return "justificativa";
  return "simples";
}

// ─── Timeline ────────────────────────────────────────────────────────────────

function Timeline({ current }: { current: ApiStatus }) {
  const ci = STEPS.indexOf(current);
  return (
    <div className="flex items-start max-[680px]:flex-col max-[680px]:items-stretch">
      {STEPS.map((s, i) => {
        const done = ci >= 0 && i < ci;
        const active = i === ci;
        const circleBg = active
          ? "#2A9D8F"
          : done
            ? "rgba(42,157,143,0.16)"
            : "#F1F0EC";
        const circleColor = active ? "#fff" : done ? "#2A9D8F" : "#B7B4AD";
        const connColor = ci >= 0 && i <= ci ? "rgba(42,157,143,0.5)" : "#EFEDE8";

        return (
          <div
            className="relative flex flex-1 flex-col items-center text-center max-[680px]:flex-row max-[680px]:items-start max-[680px]:gap-3.5 max-[680px]:pb-2 max-[680px]:text-left"
            key={s}
          >
            {i > 0 && (
              <span
                className="absolute left-[-50%] right-[50%] top-[17px] z-0 h-[2.5px] max-[680px]:left-[17px] max-[680px]:right-auto max-[680px]:top-[-50%] max-[680px]:h-auto max-[680px]:w-[2.5px] max-[680px]:bottom-1/2"
                style={{ background: connColor }}
              />
            )}
            <span
              className="relative z-[1] grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold"
              style={{
                background: circleBg,
                color: circleColor,
                border: active ? "2px solid #2A9D8F" : "2px solid transparent",
                boxShadow: active ? "0 0 0 5px rgba(42,157,143,0.14)" : "none",
              }}
            >
              {done ? (
                <Check size={14} />
              ) : active ? (
                <span className="h-[9px] w-[9px] rounded-full bg-white" />
              ) : (
                i + 1
              )}
            </span>
            <span className="mt-2.5 max-[680px]:pb-3.5 max-[680px]:pt-1.5">
              <span
                className={clsx(
                  "block whitespace-nowrap text-[12.5px]",
                  active ? "font-bold text-dark" : done ? "font-medium text-dim" : "font-medium text-faint"
                )}
              >
                {STATUS_LABEL[s]}
              </span>
              {active && (
                <span className="mt-[5px] inline-block rounded-full bg-teal/[0.12] px-2 py-0.5 text-[10.5px] font-semibold text-teal">
                  Atual
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── ModalSinal — confirmar recebimento do sinal ──────────────────────────────

function ModalSinal({
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
      <div className="mb-[18px]">
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
            <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
              <span>
                Descreva a forma de pagamento <span className="text-orange">*</span>
              </span>
              <span className={clsx("font-normal", obsCharCount >= 50 ? "text-success" : "text-muted")}>
                {obsCharCount}/50 mín.
              </span>
            </span>
            <textarea
              value={formaObs}
              onChange={(e) => setFormaObs(e.target.value)}
              placeholder="Ex: cheque à vista, app de pagamento..."
              rows={2}
              className={clsx(
                "w-full resize-none rounded-input border-[1.5px] bg-white px-3.5 py-2.5 font-[inherit] text-[13.5px] leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/[0.12]",
                obsInvalida ? "border-[#F2B8A6]" : "border-line"
              )}
            />
            {obsInvalida && (
              <div className="mt-1.5 flex items-center gap-[5px] text-[12.5px] text-danger">
                <AlertCircle size={13} /> Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aviso */}
      <div className="flex gap-2.5 rounded-xl border border-teal/[0.18] bg-teal/[0.06] px-3.5 py-3">
        <Receipt size={16} className="mt-px flex-shrink-0 text-teal" />
        <p className="m-0 text-[12.5px] leading-[1.55] text-body">
          Após confirmar, o sistema avançará o orçamento e gerará o recibo do
          sinal com a forma de pagamento registrada.
        </p>
      </div>
    </ModalShell>
  );
}

// ─── ModalCancelSimples ───────────────────────────────────────────────────────

function ModalCancelSimples({
  onClose,
  onConfirm,
  saving,
}: {
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      variant="danger"
      icon={<Ban size={16} />}
      title="Cancelar orçamento?"
      description={
        <>
          Esta ação não pode ser desfeita. O orçamento será marcado como{" "}
          <strong>Cancelado</strong>.
        </>
      }
      cancelLabel="Voltar"
      confirmLabel="Sim, cancelar"
      confirmingLabel="Cancelando..."
      confirming={saving}
    />
  );
}

// ─── ModalCancelJustificativa — ENTREGUE / PAGO ───────────────────────────────

function ModalCancelJustificativa({
  onClose,
  onConfirm,
  saving,
}: {
  onClose: () => void;
  onConfirm: (justificativa: string) => void;
  saving: boolean;
}) {
  const [texto, setTexto] = useState("");
  const len = texto.length;
  const invalido = len > 0 && len < 50;
  const valido = len >= 50 && !saving;

  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={() => onConfirm(texto)}
      variant="danger"
      icon={<Ban size={16} />}
      title="Cancelar pedido já entregue?"
      subtitle="Justificativa obrigatória"
      cancelLabel="Voltar"
      confirmLabel="Confirmar cancelamento"
      confirmingLabel="Cancelando..."
      confirming={saving}
      confirmDisabled={!valido}
    >
      <p className="mb-3.5 mt-0 text-[13.5px] leading-[1.55] text-body">
        Cancelar um pedido neste estágio é uma ação excepcional. Descreva o
        motivo com detalhes (mínimo 50 caracteres).
      </p>
      <span className="mb-[7px] flex items-center justify-between text-[13px] font-semibold text-body">
        <span>
          Justificativa <span className="text-danger">*</span>
        </span>
        <span className={clsx("font-normal", len >= 50 ? "text-success" : "text-muted")}>
          {len}/50 mín.
        </span>
      </span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex: cliente solicitou cancelamento por motivo de força maior..."
        rows={4}
        className={clsx(
          "w-full resize-y rounded-input border-[1.5px] bg-white px-3.5 py-2.5 font-[inherit] text-[13.5px] leading-[1.5] text-dark outline-none transition-colors duration-150 focus:border-danger focus:ring-4 focus:ring-danger/[0.12]",
          invalido ? "border-[#F2B8A6]" : "border-line"
        )}
      />
      {invalido && (
        <div className="mt-1.5 flex items-center gap-[5px] text-[12.5px] text-danger">
          <AlertCircle size={13} /> Faltam {50 - len} caracteres.
        </div>
      )}
    </ConfirmacaoModal>
  );
}

// ─── ModalCancelMulta — EM_PRODUCAO / FINALIZADO ──────────────────────────────

function ModalCancelMulta({
  orcamento,
  onClose,
  onConfirm,
  saving,
}: {
  orcamento: OrcamentoDetalheResponse;
  onClose: () => void;
  onConfirm: (percentualMulta: number) => void;
  saving: boolean;
}) {
  const [step, setStep] = useState(1);
  const [multaAtiva, setMultaAtiva] = useState(true);
  const [multaPerc, setMultaPerc] = useState("50");

  const total = orcamento.total || 0;
  const percNum = parseFloat((multaPerc || "0").replace(",", ".")) || 0;
  const multaAplicada = multaAtiva ? (total * percNum) / 100 : 0;

  const tituloPasso =
    step === 1 ? "Itens deste pedido"
    : step === 2 ? "Deseja cobrar multa pelo cancelamento?"
    : "Resumo do cancelamento";

  const Dots = () => (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={clsx("h-1 flex-1 rounded-sm", n <= step ? "bg-danger" : "bg-line")}
        />
      ))}
    </div>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      title={tituloPasso}
      subtitle={`Cancelar · Passo ${step} de 3`}
      icon={<Ban size={16} />}
      iconBg="#FCF0EC"
      iconColor="#C0492B"
      width={540}
      footer={
        <div className="flex w-full flex-col gap-3">
          <Dots />
          <div className="flex gap-3">
            {step === 1 && (
              <>
                <Button variant="ghost" onClick={onClose}>
                  Voltar
                </Button>
                <Button variant="primary" fullWidth onClick={() => setStep(2)}>
                  Próximo →
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Voltar
                </Button>
                <Button variant="primary" fullWidth onClick={() => setStep(3)}>
                  Próximo →
                </Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  ← Voltar
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  disabled={saving}
                  onClick={() => onConfirm(multaAtiva ? percNum : 0)}
                >
                  {saving ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* ─── PASSO 1 — ITENS CONSUMIDOS ─── */}
      {step === 1 && (
        <>
          <p className="mb-3.5 mt-0 text-[13.5px] leading-[1.55] text-body">
            Estes são os itens do pedido. O cancelamento dará baixa conforme
            as regras de negócio do servidor.
          </p>
          <div className="flex flex-col gap-2">
            {orcamento.itens.length === 0 ? (
              <div className="rounded-xl border-[1.5px] border-dashed border-line p-5 text-center text-[13px] text-muted">
                Nenhum item neste pedido.
              </div>
            ) : (
              orcamento.itens.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[10px] border border-line bg-cream px-3.5 py-[11px]"
                >
                  <span className="flex-1 text-sm font-medium text-dark">
                    {it.nomeProduto}
                  </span>
                  <span className="text-[13px] font-semibold text-dim">
                    ×{it.quantidade}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ─── PASSO 2 — MULTA ─── */}
      {step === 2 && (
        <>
          <div className="mb-[18px] flex w-fit overflow-hidden rounded-input border border-line">
            {(["Não", "Sim"] as const).map((lbl) => {
              const val = lbl === "Sim";
              const on = multaAtiva === val;
              return (
                <button
                  key={lbl}
                  onClick={() => setMultaAtiva(val)}
                  className={clsx(
                    "h-11 w-20 border-none font-[inherit] text-sm font-semibold",
                    on ? (val ? "bg-orange text-white" : "bg-line-soft text-body") : "bg-white text-dim"
                  )}
                >
                  {lbl}
                </button>
              );
            })}
          </div>

          {multaAtiva && (
            <div className="animate-[fadeUp_.25s_ease_both]">
              <span className="mb-2 block text-[13px] font-semibold text-body">
                Percentual da multa (%)
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  value={multaPerc}
                  onChange={(e) =>
                    setMultaPerc(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                  inputMode="decimal"
                  placeholder="50"
                  className="h-[46px] min-w-[120px] flex-1 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-none transition-colors duration-150 focus:border-orange focus:ring-4 focus:ring-orange/[0.12]"
                />
              </div>
              <div className="mt-2.5 text-xs text-muted">
                Sugestão padrão: 50% do valor total.
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-orange/25 bg-orange/[0.08] px-4 py-3.5">
                <span className="text-sm font-semibold text-dark">
                  Multa
                </span>
                <span className="text-xl font-bold text-orange [font-variant-numeric:tabular-nums]">
                  {BRL(multaAplicada)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── PASSO 3 — RESUMO ─── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {multaAtiva ? (
            <div className="flex items-center justify-between rounded-xl border border-orange/25 bg-orange/[0.08] px-4 py-3.5">
              <span className="text-sm font-semibold text-dark">
                Multa <span className="font-medium text-muted">({percNum}%)</span>
              </span>
              <span className="text-lg font-bold text-orange [font-variant-numeric:tabular-nums]">
                {BRL(multaAplicada)}
              </span>
            </div>
          ) : (
            <div className="text-[13.5px] text-muted">
              Nenhuma multa será cobrada.
            </div>
          )}

          <div className="flex gap-2.5 rounded-xl border border-orange/30 bg-orange/[0.08] px-3.5 py-3">
            <AlertCircle size={15} className="mt-px flex-shrink-0 text-orange" />
            <p className="m-0 text-[12.8px] leading-[1.55] text-[#8A5A33]">
              {multaAtiva ? (
                <>
                  Um <strong className="font-bold">PDF de multa</strong> será
                  gerado para enviar à cliente.
                </>
              ) : (
                "O orçamento será marcado como Cancelado."
              )}
            </p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── ModalCancelEstorno — SINAL_PAGO ──────────────────────────────────────────

function ModalCancelEstorno({
  orcamento,
  onClose,
  onConfirm,
  saving,
}: {
  orcamento: OrcamentoDetalheResponse;
  onClose: () => void;
  onConfirm: (data: { estornarSinal: boolean; dataEstornoSinal?: string }) => void;
  saving: boolean;
}) {
  const [step, setStep] = useState(1);
  const [estornar, setEstornar] = useState(true);
  const [dataEstorno, setDataEstorno] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const valorSinal = orcamento.valorSinal || 0;
  const nomeCliente = orcamento.nomeCliente;

  const tituloPasso =
    step === 1 ? `Estornar sinal para ${nomeCliente}?` : "Confirmar estorno do sinal";

  const Dots = () => (
    <div className="flex gap-1.5">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={clsx("h-1 flex-1 rounded-sm", n <= step ? "bg-danger" : "bg-line")}
        />
      ))}
    </div>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      title={tituloPasso}
      subtitle={`Cancelar · Passo ${step} de 2`}
      icon={<Ban size={16} />}
      iconBg="#FCF0EC"
      iconColor="#C0492B"
      width={500}
      footer={
        <div className="flex w-full flex-col gap-3">
          <Dots />
          <div className="flex gap-3">
            {step === 1 && (
              <>
                <Button variant="ghost" onClick={onClose}>
                  Voltar
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={saving}
                  onClick={() =>
                    estornar
                      ? setStep(2)
                      : onConfirm({ estornarSinal: false })
                  }
                >
                  {estornar ? "Próximo →" : saving ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </>
            )}
            {step === 2 && estornar && (
              <>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Voltar
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={saving}
                  onClick={() =>
                    onConfirm({ estornarSinal: true, dataEstornoSinal: dataEstorno })
                  }
                >
                  {saving ? "Processando..." : "Confirmar e gerar recibo de estorno"}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* ─── PASSO 1 — ESTORNO ─── */}
      {step === 1 && (
        <>
          {/* Valor do sinal */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-orange/25 bg-orange/[0.08] px-4 py-3.5">
            <div>
              <div className="mb-[3px] text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
                Sinal recebido
              </div>
              <div className="text-[22px] font-bold text-orange [font-variant-numeric:tabular-nums]">
                {BRL(valorSinal)}
              </div>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-orange/[0.12] text-orange">
              <Wallet size={18} />
            </span>
          </div>

          {/* Toggle Sim/Não */}
          <div className="mb-3.5">
            <div className="mb-2.5 text-sm font-semibold text-dark">
              Deseja estornar o sinal?
            </div>
            <div className="flex w-fit overflow-hidden rounded-input border border-line">
              {(["Não", "Sim"] as const).map((lbl) => {
                const val = lbl === "Sim";
                const on = estornar === val;
                return (
                  <button
                    key={lbl}
                    onClick={() => setEstornar(val)}
                    className={clsx(
                      "h-11 w-20 border-none font-[inherit] text-sm font-semibold transition-all duration-150",
                      on ? (val ? "bg-orange text-white" : "bg-line-soft text-body") : "bg-white text-dim"
                    )}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data do estorno (só quando Sim) */}
          {estornar && (
            <div className="animate-[fadeUp_.2s_ease_both]">
              <label className="mb-4 block">
                <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
                  <Calendar size={16} className="text-orange" /> Data do estorno
                </span>
                <input
                  type="date"
                  value={dataEstorno}
                  onChange={(e) => setDataEstorno(e.target.value)}
                  className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none transition-colors duration-150 focus:border-orange focus:ring-4 focus:ring-orange/[0.12]"
                />
              </label>

              <div className="flex gap-2.5 rounded-xl border border-orange/25 bg-orange/[0.07] px-3.5 py-3">
                <Receipt size={16} className="mt-px flex-shrink-0 text-orange" />
                <p className="m-0 text-[12.5px] leading-[1.55] text-[#8A5A33]">
                  Um <strong className="font-bold">recibo de estorno</strong>{" "}
                  será gerado para enviar à cliente como comprovante da devolução.
                </p>
              </div>
            </div>
          )}

          {/* Aviso sem estorno */}
          {!estornar && (
            <div className="flex animate-[fadeUp_.2s_ease_both] gap-2.5 rounded-xl border border-line bg-cream px-3.5 py-3">
              <Info size={15} className="mt-px flex-shrink-0 text-muted" />
              <p className="m-0 text-[12.5px] leading-[1.55] text-dim">
                O orçamento será cancelado sem devolução do sinal. Nenhum
                documento será gerado.
              </p>
            </div>
          )}
        </>
      )}

      {/* ─── PASSO 2 — CONFIRMAR ESTORNO ─── */}
      {step === 2 && estornar && (
        <div className="flex flex-col gap-4">
          <div
            className="relative min-h-[110px] rounded-2xl px-[22px] py-5 text-white"
            style={{ background: "linear-gradient(135deg, #F97316 0%, #F4853A 100%)" }}
          >
            <div className="pointer-events-none absolute -right-[30px] -top-10 h-[120px] w-[120px] rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-white/80">
                Recibo de Estorno
              </div>
              <div className="break-words text-[28px] font-bold tracking-[-0.01em] [font-variant-numeric:tabular-nums]">
                {BRL(valorSinal)}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            {[
              ["Cliente", nomeCliente],
              ["Valor do estorno", BRL(valorSinal)],
              ["Data do estorno", dataEstorno.split("-").reverse().join("/")],
              ["Orçamento", `#${orcamento.numero}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between border-b border-line py-[9px] text-[13.5px]"
              >
                <span className="font-medium text-muted">{label}</span>
                <span className="font-semibold text-dark">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 rounded-xl border border-orange/25 bg-orange/[0.07] px-3.5 py-3">
            <Receipt size={16} className="mt-px flex-shrink-0 text-orange" />
            <p className="m-0 text-[12.5px] leading-[1.55] text-[#8A5A33]">
              O recibo de estorno ficará disponível para download na tela de
              detalhe do orçamento cancelado.
            </p>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Card de downloads ────────────────────────────────────────────────────────

function DownloadsCard({
  orcamento,
  onDownload,
}: {
  orcamento: OrcamentoDetalheResponse;
  onDownload: (kind: "pdf" | "reciboSinal" | "multa" | "estorno" | "pagamento") => void;
}) {
  const status = orcamento.status as ApiStatus;

  const links: { label: string; kind: Parameters<typeof onDownload>[0]; icon: React.ReactNode }[] = [];

  // PDF do orçamento — qualquer status exceto CANCELADO
  if (status !== "CANCELADO") {
    links.push({ label: "Baixar PDF do orçamento", kind: "pdf", icon: <FileText size={18} /> });
  }

  // Recibo do sinal — somente se sinalAtivo e dataSinalPago preenchida
  if (orcamento.sinalAtivo && orcamento.dataSinalPago != null) {
    links.push({ label: "Recibo do sinal", kind: "reciboSinal", icon: <Receipt size={16} /> });
  }

  // Recibo de pagamento — apenas PAGO
  if (status === "PAGO") {
    links.push({ label: "Recibo de pagamento", kind: "pagamento", icon: <Receipt size={16} /> });
  }

  // PDF de multa — somente se percentualMulta > 0
  if (orcamento.percentualMulta != null && orcamento.percentualMulta > 0) {
    links.push({ label: "PDF de multa", kind: "multa", icon: <FileText size={20} /> });
  }

  // Recibo de estorno — somente se houve estorno de fato
  if (orcamento.estornoSinal === true) {
    links.push({ label: "Recibo de estorno", kind: "estorno", icon: <Receipt size={16} /> });
  }

  return (
    <section className="mt-[18px] animate-[fadeUp_.6s_ease_both] rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
          <Download size={17} />
        </span>
        <h2 className="m-0 text-[15.5px] font-bold text-dark">
          Documentos
        </h2>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {links.map((l) => (
          <Button key={l.kind} variant="ghost" icon={l.icon} onClick={() => onDownload(l.kind)}>
            {l.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetalheOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null);
  const [cliente, setCliente] = useState<ClienteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | "sinal" | "cancel">(null);
  const [erroAvanco, setErroAvanco] = useState<string | null>(null);
  const [avisoEstoqueNegativo, setAvisoEstoqueNegativo] = useState<AvisoEstoqueNegativo[] | null>(null);
  const [ultimoAvancoData, setUltimoAvancoData] = useState<AvancaStatusRequest | undefined>(undefined);
  const [confirmandoAviso, setConfirmandoAviso] = useState(false);
  const [itensSemEstoque, setItensSemEstoque] = useState<ItemSemEstoque[]>([]);
  const { toast, setToast } = useToast();

  const carregar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await orcamentoService.buscarPorId(id);
      setOrcamento(data);
      if (data.clienteId) {
        clienteService
          .buscarPorId(data.clienteId)
          .then(setCliente)
          .catch(() => setCliente(null));
      }
    } catch (err) {
      console.error("Erro ao carregar orçamento:", err);
      alert("Erro ao carregar orçamento");
    } finally {
      setLoading(false);
    }

    // RN-NOVA-5 (#194) — auxiliar para o botão "Criar produção"; não bloqueia o Detalhe se falhar.
    orcamentoService
      .buscarItensSemEstoque(id)
      .then(setItensSemEstoque)
      .catch(() => setToast("Não foi possível verificar o estoque dos itens deste orçamento."));
  }, [id, setToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleAvancar = async (data?: AvancaStatusRequest) => {
    if (!id) return;
    setSaving(true);
    setErroAvanco(null);
    try {
      const result = await orcamentoService.avancarStatus(id, data);
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setAvisoEstoqueNegativo(result.avisos);
        setUltimoAvancoData(data);
      } else {
        setOrcamento(result);
        setModal(null);
      }
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      const msg = extractApiError(err, "Erro ao avançar status do orçamento.");
      setErroAvanco(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarAvisoEstoque = async () => {
    if (!id || !avisoEstoqueNegativo) return;
    setConfirmandoAviso(true);
    setErroAvanco(null);
    try {
      const result = await orcamentoService.avancarStatus(id, {
        ...ultimoAvancoData,
        confirmarEstoqueNegativoProdutoIds: avisoEstoqueNegativo.map((a) => a.componenteId),
      });
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setAvisoEstoqueNegativo(result.avisos);
      } else {
        setAvisoEstoqueNegativo(null);
        setOrcamento(result);
        setModal(null);
      }
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      const msg = extractApiError(err, "Erro ao avançar status do orçamento.");
      setErroAvanco(msg);
    } finally {
      setConfirmandoAviso(false);
    }
  };

  const handleCancelar = async (data?: AvancaStatusRequest) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await orcamentoService.cancelar(id, data);
      setOrcamento(updated);
      setModal(null);
    } catch (err) {
      console.error("Erro ao cancelar orçamento:", err);
      alert("Erro ao cancelar orçamento");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (
    kind: "pdf" | "reciboSinal" | "multa" | "estorno" | "pagamento",
  ) => {
    if (!id) return;
    const urlMap = {
      pdf: orcamentoService.downloadPdf(id),
      reciboSinal: orcamentoService.downloadReciboSinal(id),
      multa: orcamentoService.downloadPdfMulta(id),
      estorno: orcamentoService.downloadReciboEstorno(id),
      pagamento: orcamentoService.downloadReciboPagamento(id),
    };
    const fileNames = {
      pdf: `orcamento-${orcamento?.numero || id}.pdf`,
      reciboSinal: `recibo-sinal-${orcamento?.numero || id}.pdf`,
      multa: `multa-${orcamento?.numero || id}.pdf`,
      estorno: `recibo-estorno-${orcamento?.numero || id}.pdf`,
      pagamento: `recibo-pagamento-${orcamento?.numero || id}.pdf`,
    };
    try {
      const response = await fetch(urlMap[kind], {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNames[kind];
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar documento:", err);
      alert("Erro ao baixar documento");
    }
  };

  if (loading) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-muted">
          Carregando orçamento...
        </div>
      </AppLayout>
    );
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-danger">
          Orçamento não encontrado
        </div>
      </AppLayout>
    );
  }

  const status = orcamento.status as ApiStatus;
  const meta = STATUS_META[status] || STATUS_META.RASCUNHO;
  const actionLabel = ACTION_LABEL[status];
  const nextHint = NEXT_HINT[status];
  const finalizado = status === "PAGO" || status === "CANCELADO";
  const cancelavel = status !== "PAGO" && status !== "CANCELADO";

  const sinalRecebido = ["SINAL_PAGO", "EM_PRODUCAO", "FINALIZADO", "ENTREGUE", "PAGO"].includes(status);
  const restante = (orcamento.total || 0) - (orcamento.valorSinal || 0);

  const onPrimaryAction = () => {
    if (status === "AGUARDANDO_SINAL") {
      setModal("sinal");
    } else {
      handleAvancar();
    }
  };

  const kind = cancelKind(status);

  return (
    <AppLayout active="orcamentos" compact>
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <button
            onClick={() => navigate("/orcamentos")}
            className="mb-[5px] inline-flex items-center gap-1.5 border-none bg-none p-0 font-[inherit] text-[12.5px] font-semibold uppercase tracking-[0.05em] text-teal"
          >
            <ArrowLeft size={13} /> Orçamentos
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[25px] font-bold tracking-[-0.025em] text-dark">
              #{orcamento.numero} — {orcamento.nomeCliente}
            </h1>
            <span
              className="inline-flex h-[30px] items-center gap-[7px] rounded-full px-[13px] text-[13px] font-semibold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: meta.dot }} />
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          icon={<FileText size={18} />}
          onClick={() => navigate(`/orcamentos/${orcamento.id}/preview`)}
        >
          Ver preview do PDF
        </Button>
      </div>

      {/* SEÇÃO 1 — TIMELINE */}
      {status !== "CANCELADO" && (
        <section className="animate-fade-up rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-6 text-[13px] font-semibold text-body">
            Andamento do pedido
          </div>
          <Timeline current={status} />

          {!finalizado && (
            <div className="mt-[30px] flex flex-wrap items-center justify-between gap-[18px] border-t border-line pt-[22px]">
              {cancelavel ? (
                <button
                  onClick={() => setModal("cancel")}
                  className="inline-flex items-center gap-[7px] border-none bg-transparent p-0 font-[inherit] text-[13px] font-semibold text-danger/[0.85] transition-colors duration-150 hover:text-danger"
                >
                  <Ban size={15} /> Cancelar orçamento
                </button>
              ) : (
                <span />
              )}

              {actionLabel && (
                <Button
                  variant="primary"
                  size="lg"
                  iconRight={<ArrowRight size={17} />}
                  disabled={saving}
                  onClick={onPrimaryAction}
                >
                  {saving ? "Processando..." : actionLabel}
                </Button>
              )}
            </div>
          )}

          {erroAvanco && (
            <div className="mt-[18px] flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
              <span className="mt-px flex flex-shrink-0 text-danger">
                <AlertCircle size={16} />
              </span>
              <p className="m-0 text-[13px] leading-[1.5] text-danger">
                {erroAvanco}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Banner cancelado */}
      {status === "CANCELADO" && (
        <section className="flex animate-fade-up items-center gap-3.5 rounded-card border border-danger/30 bg-[#FCF0EC] px-6 py-5">
          <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-white text-danger">
            <Ban size={16} />
          </span>
          <div>
            <div className="text-[15.5px] font-bold text-dark">
              Orçamento cancelado
            </div>
            <div className="mt-0.5 text-[13px] text-[#8A5A4E]">
              Este orçamento foi cancelado e não pode mais avançar de status.
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 2 — RESUMO + PRÓXIMO PASSO */}
      <div className="mt-[18px] grid grid-cols-[1.05fr_1fr] gap-[18px] max-[980px]:grid-cols-1">
        {/* Resumo do orçamento */}
        <section className="animate-[fadeUp_.5s_ease_both] rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-teal/[0.12] text-teal">
              <FileText size={20} />
            </span>
            <h2 className="m-0 text-[15.5px] font-bold text-dark">
              Resumo do orçamento
            </h2>
          </div>

          {/* Cliente */}
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-full bg-teal/[0.14] text-base font-bold text-teal">
              {orcamento.nomeCliente.charAt(0)}
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-dark">
                {orcamento.nomeCliente}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                <Phone size={16} className="text-teal" /> {cliente?.whatsapp || "—"}
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="flex flex-col gap-3 border-b border-line py-4">
            {orcamento.itens.map((it, i) => {
              const semEstoque = itensSemEstoque.find((s) => s.produtoId === it.produtoId);
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg bg-orange/10 text-xs font-bold text-orange">
                    ×{it.quantidade}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-dark">
                        {it.nomeProduto}
                      </div>
                      <span className={clsx(
                        "inline-flex h-[22px] items-center gap-[5px] rounded-full px-[9px] text-[11.5px] font-semibold",
                        it.itemCatalogoId ? "bg-teal/10 text-teal" : "bg-line-soft text-dim"
                      )}>
                        {it.itemCatalogoId ? (
                          <Layers size={11} />
                        ) : (
                          <Box size={11} />
                        )}
                        {it.itemCatalogoId
                          ? it.catalogoNome ?? it.catalogoIdentificador
                          : "Venda sem catálogo"}
                      </span>
                    </div>
                    {it.customizacoes.length > 0 && (
                      <div className="mt-1.5 inline-flex h-[22px] items-center gap-[5px] rounded-full bg-line-soft px-[9px] text-[11.5px] font-semibold text-body">
                        <SlidersHorizontal size={11} />
                        Customizações ({it.customizacoes.length})
                      </div>
                    )}
                    <div>
                      {it.customizacoes.map((c, k) => (
                        <span
                          key={k}
                          className="mr-[5px] mt-1 inline-flex items-center gap-[5px] rounded-full bg-orange/[0.08] px-2 py-0.5 text-[11.5px] text-warning-alt"
                        >
                          <Tag size={17} /> {c.nomeProduto}
                        </span>
                      ))}
                    </div>
                    {semEstoque && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-input border border-orange/30 bg-orange/[0.08] px-3 py-2">
                        <AlertCircle size={14} className="flex-shrink-0 text-orange" />
                        <span className="flex-1 text-[12px] leading-[1.4] text-warning-alt">
                          Estoque insuficiente: faltam {semEstoque.quantidadeFaltante} un. (disponível {semEstoque.estoqueAtual} de {semEstoque.quantidadeSolicitada} solicitadas)
                        </span>
                        <button
                          onClick={() =>
                            navigate(
                              `/producao/nova?produtoId=${semEstoque.produtoId}&quantidade=${Math.ceil(semEstoque.quantidadeFaltante)}`
                            )
                          }
                          className="inline-flex h-7 flex-shrink-0 items-center gap-1.5 rounded-full border-none bg-orange px-3 font-[inherit] text-[11.5px] font-semibold text-white transition-colors duration-150 hover:bg-orange/90"
                        >
                          <Factory size={12} /> Criar produção
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">
                    {BRL(it.subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total + sinal + validade */}
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Total</div>
                <div className="text-[22px] font-bold tracking-[-0.01em] text-orange [font-variant-numeric:tabular-nums]">
                  {BRL(orcamento.total)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Validade</div>
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-body">
                  <Calendar size={16} className="text-teal" /> {fmtDate(orcamento.dataValidade)}
                </div>
              </div>
            </div>

            {orcamento.sinalAtivo && (
              <div className="flex flex-wrap gap-2.5">
                <div className={clsx(
                  "min-w-[140px] flex-1 rounded-[10px] border px-3.5 py-2.5",
                  sinalRecebido ? "border-teal/20 bg-teal/[0.07]" : "border-orange/20 bg-orange/[0.07]"
                )}>
                  <div className={clsx(
                    "flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.03em]",
                    sinalRecebido ? "text-teal" : "text-[#B5701F]"
                  )}>
                    {sinalRecebido ? <Check size={14} /> : <Clock size={12} />}
                    {sinalRecebido ? "Sinal recebido" : "Aguardando Sinal"}
                  </div>
                  <div className={clsx(
                    "mt-1 text-base font-bold [font-variant-numeric:tabular-nums]",
                    sinalRecebido ? "text-teal" : "text-[#B5701F]"
                  )}>
                    {BRL(orcamento.valorSinal || 0)}
                  </div>
                </div>
                <div className="min-w-[140px] flex-1 rounded-[10px] border border-line bg-cream px-3.5 py-2.5">
                  <div className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.03em] text-dim">
                    Restante
                  </div>
                  <div className="mt-1 text-base font-bold text-dark [font-variant-numeric:tabular-nums]">
                    {BRL(restante)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Card próximo passo */}
        {!finalizado && nextHint && (
          <section
            className="animate-[fadeUp_.55s_ease_both] rounded-card border border-teal/[0.18] px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            style={{ background: "linear-gradient(150deg, rgba(42,157,143,0.08) 0%, #fff 55%, rgba(249,115,22,0.05) 100%)" }}
          >
            <div className="mb-3 flex items-center gap-[11px]">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-teal/20 bg-white text-teal">
                <Layers size={18} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-dark">
                  Próximo passo
                </div>
                <div className="mt-px text-[12.5px] font-semibold text-teal">
                  {actionLabel}
                </div>
              </div>
            </div>
            <p className="m-0 text-[13.5px] leading-[1.6] text-body">
              {nextHint}
            </p>
          </section>
        )}
      </div>

      {/* SEÇÃO 3 — DOCUMENTOS */}
      <DownloadsCard orcamento={orcamento} onDownload={handleDownload} />

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(42,157,143,0.6)]">
          {toast}
        </div>
      )}

      {/* Modais */}
      {modal === "sinal" && (
        <ModalSinal
          orcamento={orcamento}
          saving={saving}
          onClose={() => setModal(null)}
          onConfirm={(data) => handleAvancar(data)}
        />
      )}

      {modal === "cancel" && kind === "simples" && (
        <ModalCancelSimples
          saving={saving}
          onClose={() => setModal(null)}
          onConfirm={() => handleCancelar()}
        />
      )}
      {modal === "cancel" && kind === "estorno" && (
        <ModalCancelEstorno
          orcamento={orcamento}
          saving={saving}
          onClose={() => setModal(null)}
          onConfirm={(data) => handleCancelar(data)}
        />
      )}
      {modal === "cancel" && kind === "multa" && (
        <ModalCancelMulta
          orcamento={orcamento}
          saving={saving}
          onClose={() => setModal(null)}
          onConfirm={(percentualMulta) => handleCancelar({ percentualMulta })}
        />
      )}
      {modal === "cancel" && kind === "justificativa" && (
        <ModalCancelJustificativa
          saving={saving}
          onClose={() => setModal(null)}
          onConfirm={(justificativa) => handleCancelar({ justificativa })}
        />
      )}

      {avisoEstoqueNegativo && (
        <ConfirmarEstoqueNegativoModal
          avisos={avisoEstoqueNegativo}
          confirming={confirmandoAviso}
          onClose={() => setAvisoEstoqueNegativo(null)}
          onConfirm={handleConfirmarAvisoEstoque}
        />
      )}
    </AppLayout>
  );
}
