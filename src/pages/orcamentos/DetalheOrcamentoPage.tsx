import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/ui/Button";
import ModalShell from "../../components/ui/ModalShell";
import { Icons } from "../../components/ui/Icons";
import { orcamentoService } from "../../services/orcamentoService";
import { clienteService } from "../../services/clienteService";
import { useAuthStore } from "../../store/authStore";
import type {
  OrcamentoDetalheResponse,
  AvancaStatusRequest,
  MetodoPagamento,
} from "../../types/orcamento";
import type { ClienteResponse } from "../../types/cliente";

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

const STATUS_LABEL: Record<ApiStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  AGUARDANDO_SINAL: "Aguardando Sinal",
  SINAL_PAGO: "Sinal Pago",
  EM_PRODUCAO: "Em Produção",
  FINALIZADO: "Finalizado",
  ENTREGUE: "Entregue",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

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

const METODOS_PAGAMENTO: { id: MetodoPagamento; label: string }[] = [
  { id: "PIX", label: "Pix" },
  { id: "DINHEIRO", label: "Dinheiro" },
  { id: "CREDITO", label: "Crédito" },
  { id: "DEBITO", label: "Débito" },
  { id: "TRANSFERENCIA", label: "Transferência" },
  { id: "BOLETO", label: "Boleto Bancário" },
  { id: "OUTRO", label: "Outro" },
];

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
    <div className="timeline">
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
          <div className="tl-step" key={s}>
            {i > 0 && (
              <span className="tl-connector" style={{ background: connColor }} />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: circleBg,
                color: circleColor,
                border: active ? "2px solid #2A9D8F" : "2px solid transparent",
                boxShadow: active ? "0 0 0 5px rgba(42,157,143,0.14)" : "none",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {done ? (
                <Icons.check />
              ) : active ? (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#fff",
                  }}
                />
              ) : (
                i + 1
              )}
            </span>
            <span className="tl-label-wrap" style={{ marginTop: 10 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#3A372F" : done ? "#6B6860" : "#B7B4AD",
                  whiteSpace: "nowrap",
                }}
              >
                {STATUS_LABEL[s]}
              </span>
              {active && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 5,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "#2A9D8F",
                    background: "rgba(42,157,143,0.12)",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
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
  const [focus, setFocus] = useState<string | null>(null);

  const obsCharCount = formaObs.length;
  const obsValida = forma !== "OUTRO" || obsCharCount >= 50;
  const podeConfirmar = obsValida && !saving;

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Confirmar recebimento do sinal"
      subtitle="Aguardando Sinal"
      icon={<Icons.wallet />}
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          borderRadius: 12,
          background: "rgba(42,157,143,0.07)",
          border: "1px solid rgba(42,157,143,0.2)",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#5C594F" }}>
          Valor esperado
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#2A9D8F",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {BRL(orcamento.valorSinal || 0)}
          {orcamento.percentualSinal ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: "#A29E96" }}>
              {" "}
              ({orcamento.percentualSinal}%)
            </span>
          ) : null}
        </span>
      </div>

      {/* Forma de pagamento — chips */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#5C594F",
            marginBottom: 9,
          }}
        >
          Forma de pagamento recebida
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {METODOS_PAGAMENTO.map((m) => {
            const on = forma === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setForma(m.id)}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  border: `1.5px solid ${on ? "#2A9D8F" : "#EFEDE8"}`,
                  background: on ? "#2A9D8F" : "#fff",
                  color: on ? "#fff" : "#5C594F",
                  transition: "all .14s",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {forma === "OUTRO" && (
          <div style={{ marginTop: 12, animation: "fadeUp .2s ease both" }}>
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "#5C594F",
                marginBottom: 7,
              }}
            >
              <span>
                Descreva a forma de pagamento{" "}
                <span style={{ color: "#F97316" }}>*</span>
              </span>
              <span
                style={{
                  fontWeight: 400,
                  color: obsCharCount >= 50 ? "#3E9D5A" : "#A29E96",
                }}
              >
                {obsCharCount}/50 mín.
              </span>
            </span>
            <textarea
              value={formaObs}
              onChange={(e) => setFormaObs(e.target.value)}
              onFocus={() => setFocus("obs")}
              onBlur={() => setFocus(null)}
              placeholder="Ex: cheque à vista, app de pagamento..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1.5px solid ${focus === "obs" ? "#2A9D8F" : obsCharCount > 0 && obsCharCount < 50 ? "#F2B8A6" : "#EFEDE8"}`,
                borderRadius: 10,
                fontSize: 13.5,
                color: "#3A372F",
                background: "#fff",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                lineHeight: 1.5,
                boxSizing: "border-box",
              }}
            />
            {obsCharCount > 0 && obsCharCount < 50 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 5,
                  fontSize: 12.5,
                  color: "#C0492B",
                }}
              >
                <Icons.alertCircle width={13} height={13} /> Mínimo de 50
                caracteres. Faltam {50 - obsCharCount}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aviso */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(42,157,143,0.06)",
          border: "1px solid rgba(42,157,143,0.18)",
        }}
      >
        <Icons.receipt style={{ flexShrink: 0, color: "#2A9D8F", marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: "#5C594F", lineHeight: 1.55 }}>
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
    <ModalShell
      open
      onClose={onClose}
      title="Cancelar orçamento?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="danger" disabled={saving} onClick={onConfirm}>
            {saving ? "Cancelando..." : "Sim, cancelar"}
          </Button>
        </>
      }
    >
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 54,
            height: 54,
            borderRadius: 15,
            background: "#FCF3F0",
            color: "#C0492B",
            marginBottom: 16,
          }}
        >
          <Icons.ban width={24} height={24} />
        </span>
        <p style={{ margin: 0, fontSize: 14, color: "#5C594F", lineHeight: 1.6 }}>
          Esta ação não pode ser desfeita. O orçamento será marcado como{" "}
          <strong>Cancelado</strong>.
        </p>
      </div>
    </ModalShell>
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
  const [focus, setFocus] = useState(false);
  const len = texto.length;
  const valido = len >= 50 && !saving;

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Cancelar pedido já entregue?"
      subtitle="Justificativa obrigatória"
      icon={<Icons.ban />}
      iconBg="#FCF3F0"
      iconColor="#C0492B"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="danger" disabled={!valido} onClick={() => onConfirm(texto)}>
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </>
      }
    >
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#5C594F", lineHeight: 1.55 }}>
        Cancelar um pedido neste estágio é uma ação excepcional. Descreva o
        motivo com detalhes (mínimo 50 caracteres).
      </p>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "#5C594F",
          marginBottom: 7,
        }}
      >
        <span>
          Justificativa <span style={{ color: "#C0492B" }}>*</span>
        </span>
        <span style={{ fontWeight: 400, color: len >= 50 ? "#3E9D5A" : "#A29E96" }}>
          {len}/50 mín.
        </span>
      </span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="Ex: cliente solicitou cancelamento por motivo de força maior..."
        rows={4}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1.5px solid ${focus ? "#C0492B" : len > 0 && len < 50 ? "#F2B8A6" : "#EFEDE8"}`,
          borderRadius: 10,
          fontSize: 13.5,
          color: "#3A372F",
          background: "#fff",
          outline: "none",
          fontFamily: "inherit",
          resize: "vertical",
          lineHeight: 1.5,
          boxSizing: "border-box",
        }}
      />
      {len > 0 && len < 50 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 6,
            fontSize: 12.5,
            color: "#C0492B",
          }}
        >
          <Icons.alertCircle width={13} height={13} /> Faltam {50 - len} caracteres.
        </div>
      )}
    </ModalShell>
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
  const [focusField, setFocusField] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const total = orcamento.total || 0;
  const percNum = parseFloat((multaPerc || "0").replace(",", ".")) || 0;
  const multaAplicada = multaAtiva ? (total * percNum) / 100 : 0;

  const Dots = () => (
    <div style={{ display: "flex", gap: 6, padding: "0 24px 16px" }}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: n <= step ? "#C0492B" : "#EFEDE8",
          }}
        />
      ))}
    </div>
  );

  const Header = ({ title }: { title: string }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "18px 24px",
        borderBottom: "1px solid #EFEDE8",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "#FCF3F0",
            color: "#C0492B",
            flexShrink: 0,
          }}
        >
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "#A29E96",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Cancelar · Passo {step} de 3
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#3A372F",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          border: "none",
          background: "#F1F0EC",
          color: "#7C786F",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icons.x />
      </button>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(20,18,16,0.4)",
        backdropFilter: "blur(1.5px)",
        animation: "fadeIn .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(540px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.4)",
          overflow: "hidden",
          animation: "scaleIn .22s cubic-bezier(.34,1.3,.5,1) both",
        }}
      >
        {/* ─── PASSO 1 — ITENS CONSUMIDOS ─── */}
        {step === 1 && (
          <>
            <Header title="Itens deste pedido" />
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 8px" }}>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 13.5,
                  color: "#5C594F",
                  lineHeight: 1.55,
                }}
              >
                Estes são os itens do pedido. O cancelamento dará baixa conforme
                as regras de negócio do servidor.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orcamento.itens.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontSize: 13,
                      color: "#A29E96",
                      border: "1.5px dashed #EFEDE8",
                      borderRadius: 12,
                    }}
                  >
                    Nenhum item neste pedido.
                  </div>
                ) : (
                  orcamento.itens.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 14px",
                        borderRadius: 10,
                        background: "#FCFBF9",
                        border: "1px solid #EFEDE8",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#3A372F",
                        }}
                      >
                        {it.nomeProduto}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6860" }}>
                        ×{it.quantidade}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Dots />
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 12 }}>
              <Button variant="ghost" onClick={onClose}>
                Voltar
              </Button>
              <Button variant="primary" fullWidth onClick={() => setStep(2)}>
                Próximo →
              </Button>
            </div>
          </>
        )}

        {/* ─── PASSO 2 — MULTA ─── */}
        {step === 2 && (
          <>
            <Header title="Deseja cobrar multa pelo cancelamento?" />
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 8px" }}>
              <div
                style={{
                  display: "flex",
                  borderRadius: 10,
                  border: "1px solid #EFEDE8",
                  overflow: "hidden",
                  width: "fit-content",
                  marginBottom: 18,
                }}
              >
                {(["Não", "Sim"] as const).map((lbl) => {
                  const val = lbl === "Sim";
                  return (
                    <button
                      key={lbl}
                      onClick={() => setMultaAtiva(val)}
                      style={{
                        width: 80,
                        height: 44,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        background:
                          multaAtiva === val ? (val ? "#F97316" : "#F1F0EC") : "#fff",
                        color:
                          multaAtiva === val ? (val ? "#fff" : "#5C594F") : "#A8A49C",
                      }}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>

              {multaAtiva && (
                <div style={{ animation: "fadeUp .25s ease both" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#5C594F",
                      marginBottom: 8,
                    }}
                  >
                    Percentual da multa (%)
                  </span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={multaPerc}
                      onChange={(e) =>
                        setMultaPerc(e.target.value.replace(/[^\d.,]/g, ""))
                      }
                      onFocus={() => setFocusField(true)}
                      onBlur={() => setFocusField(false)}
                      inputMode="decimal"
                      placeholder="50"
                      style={{
                        flex: 1,
                        minWidth: 120,
                        height: 46,
                        padding: "0 14px",
                        border: `1.5px solid ${focusField ? "#F97316" : "#EFEDE8"}`,
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#3A372F",
                        background: "#fff",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#A29E96" }}>
                    Sugestão padrão: 50% do valor total.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 16,
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.08)",
                      border: "1px solid rgba(249,115,22,0.25)",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#3A372F" }}>
                      Multa
                    </span>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#F97316",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {BRL(multaAplicada)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
              <Button variant="primary" fullWidth onClick={() => setStep(3)}>
                Próximo →
              </Button>
            </div>
          </>
        )}

        {/* ─── PASSO 3 — RESUMO ─── */}
        {step === 3 && (
          <>
            <Header title="Resumo do cancelamento" />
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px 24px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {multaAtiva ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 16px",
                    borderRadius: 12,
                    background: "rgba(249,115,22,0.08)",
                    border: "1px solid rgba(249,115,22,0.25)",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#3A372F" }}>
                    Multa{" "}
                    <span style={{ fontWeight: 500, color: "#A29E96" }}>
                      ({percNum}%)
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#F97316",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {BRL(multaAplicada)}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: "#A29E96" }}>
                  Nenhuma multa será cobrada.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.3)",
                }}
              >
                <Icons.alertCircle style={{ flexShrink: 0, color: "#F97316", marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.8, color: "#8A5A33", lineHeight: 1.55 }}>
                  {multaAtiva ? (
                    <>
                      Um <strong style={{ fontWeight: 700 }}>PDF de multa</strong> será
                      gerado para enviar à cliente.
                    </>
                  ) : (
                    "O orçamento será marcado como Cancelado."
                  )}
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 12 }}>
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
            </div>
          </>
        )}
      </div>
    </div>
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
  const [focusField, setFocusField] = useState(false);
  const [dataEstorno, setDataEstorno] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const valorSinal = orcamento.valorSinal || 0;
  const nomeCliente = orcamento.nomeCliente;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const Dots = () => (
    <div style={{ display: "flex", gap: 6, padding: "0 24px 16px" }}>
      {[1, 2].map((n) => (
        <span
          key={n}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: n <= step ? "#C0492B" : "#EFEDE8",
          }}
        />
      ))}
    </div>
  );

  const Header = ({ title }: { title: string }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "18px 24px",
        borderBottom: "1px solid #EFEDE8",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "#FCF3F0",
            color: "#C0492B",
            flexShrink: 0,
          }}
        >
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "#A29E96",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Cancelar · Passo {step} de 2
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#3A372F",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          border: "none",
          background: "#F1F0EC",
          color: "#7C786F",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icons.x />
      </button>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(20,18,16,0.4)",
        backdropFilter: "blur(1.5px)",
        animation: "fadeIn .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(500px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.4)",
          overflow: "hidden",
          animation: "scaleIn .22s cubic-bezier(.34,1.3,.5,1) both",
        }}
      >
        {/* ─── PASSO 1 — ESTORNO ─── */}
        {step === 1 && (
          <>
            <Header title={`Estornar sinal para ${nomeCliente}?`} />
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 8px" }}>
              {/* Valor do sinal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#A29E96",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 3,
                    }}
                  >
                    Sinal recebido
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#F97316",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {BRL(valorSinal)}
                  </div>
                </div>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    background: "rgba(249,115,22,0.12)",
                    color: "#F97316",
                  }}
                >
                  <Icons.wallet />
                </span>
              </div>

              {/* Toggle Sim/Não */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#3A372F",
                    marginBottom: 10,
                  }}
                >
                  Deseja estornar o sinal?
                </div>
                <div
                  style={{
                    display: "flex",
                    borderRadius: 10,
                    border: "1px solid #EFEDE8",
                    overflow: "hidden",
                    width: "fit-content",
                  }}
                >
                  {(["Não", "Sim"] as const).map((lbl) => {
                    const val = lbl === "Sim";
                    return (
                      <button
                        key={lbl}
                        onClick={() => setEstornar(val)}
                        style={{
                          width: 80,
                          height: 44,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          background:
                            estornar === val ? (val ? "#F97316" : "#F1F0EC") : "#fff",
                          color:
                            estornar === val ? (val ? "#fff" : "#5C594F") : "#A8A49C",
                          transition: "all .14s",
                        }}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data do estorno (só quando Sim) */}
              {estornar && (
                <div style={{ animation: "fadeUp .2s ease both" }}>
                  <label style={{ display: "block", marginBottom: 16 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#5C594F",
                        marginBottom: 7,
                      }}
                    >
                      <Icons.calendar style={{ color: "#F97316" }} /> Data do estorno
                    </span>
                    <input
                      type="date"
                      value={dataEstorno}
                      onChange={(e) => setDataEstorno(e.target.value)}
                      onFocus={() => setFocusField(true)}
                      onBlur={() => setFocusField(false)}
                      style={{
                        width: "100%",
                        height: 46,
                        padding: "0 14px",
                        border: `1.5px solid ${focusField ? "#F97316" : "#EFEDE8"}`,
                        borderRadius: 10,
                        fontSize: 14.5,
                        color: "#3A372F",
                        background: "#fff",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </label>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.07)",
                      border: "1px solid rgba(249,115,22,0.25)",
                    }}
                  >
                    <Icons.receipt style={{ flexShrink: 0, color: "#F97316", marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: "#8A5A33", lineHeight: 1.55 }}>
                      Um <strong style={{ fontWeight: 700 }}>recibo de estorno</strong>{" "}
                      será gerado para enviar à cliente como comprovante da devolução.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso sem estorno */}
              {!estornar && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#F7F5F1",
                    border: "1px solid #EFEDE8",
                    animation: "fadeUp .2s ease both",
                  }}
                >
                  <Icons.info style={{ flexShrink: 0, color: "#A29E96", marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: "#6B6860", lineHeight: 1.55 }}>
                    O orçamento será cancelado sem devolução do sinal. Nenhum
                    documento será gerado.
                  </p>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 12 }}>
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
            </div>
          </>
        )}

        {/* ─── PASSO 2 — CONFIRMAR ESTORNO ─── */}
        {step === 2 && estornar && (
          <>
            <Header title="Confirmar estorno do sinal" />
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #F97316 0%, #F4853A 100%)",
                  padding: "20px 22px",
                  color: "#fff",
                  position: "relative",
                  minHeight: 110,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.10)",
                    top: -40,
                    right: -30,
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "rgba(255,255,255,0.8)",
                      marginBottom: 6,
                    }}
                  >
                    Recibo de Estorno
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
                      wordBreak: "break-word",
                    }}
                  >
                    {BRL(valorSinal)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  ["Cliente", nomeCliente],
                  ["Valor do estorno", BRL(valorSinal)],
                  ["Data do estorno", dataEstorno.split("-").reverse().join("/")],
                  ["Orçamento", `#${String(orcamento.numero).padStart(4, "0")}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13.5,
                      padding: "9px 0",
                      borderBottom: "1px solid #EFEDE8",
                    }}
                  >
                    <span style={{ color: "#A29E96", fontWeight: 500 }}>{label}</span>
                    <span style={{ color: "#3A372F", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(249,115,22,0.07)",
                  border: "1px solid rgba(249,115,22,0.25)",
                }}
              >
                <Icons.receipt style={{ flexShrink: 0, color: "#F97316", marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: "#8A5A33", lineHeight: 1.55 }}>
                  O recibo de estorno ficará disponível para download na tela de
                  detalhe do orçamento cancelado.
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: "0 24px 22px", display: "flex", gap: 12 }}>
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
            </div>
          </>
        )}
      </div>
    </div>
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
  const order = STEPS.indexOf(status);
  const sinalPagoIdx = STEPS.indexOf("SINAL_PAGO");

  const links: { label: string; kind: Parameters<typeof onDownload>[0]; icon: React.ReactNode }[] = [];

  // PDF do orçamento — qualquer status exceto CANCELADO
  if (status !== "CANCELADO") {
    links.push({ label: "Baixar PDF do orçamento", kind: "pdf", icon: <Icons.pdf /> });
  }

  // Recibo do sinal — de SINAL_PAGO em diante, ou CANCELADO se havia sinal pago
  if ((order >= sinalPagoIdx && order >= 0) || (status === "CANCELADO" && !!orcamento.dataSinalPago)) {
    links.push({ label: "Recibo do sinal", kind: "reciboSinal", icon: <Icons.receipt /> });
  }

  // Recibo de pagamento — apenas PAGO
  if (status === "PAGO") {
    links.push({ label: "Recibo de pagamento", kind: "pagamento", icon: <Icons.receipt /> });
  }

  if (status === "CANCELADO") {
    links.push({ label: "PDF de multa", kind: "multa", icon: <Icons.fileText /> });
    // Recibo de estorno — apenas se houve sinal pago antes do cancelamento
    if (orcamento.dataSinalPago) {
      links.push({ label: "Recibo de estorno", kind: "estorno", icon: <Icons.receipt /> });
    }
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #F0EEE9",
        borderRadius: "var(--r-card)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: "22px 24px",
        marginTop: 18,
        animation: "fadeUp .6s ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(42,157,143,0.12)",
            color: "#2A9D8F",
          }}
        >
          <Icons.download />
        </span>
        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "#3A372F" }}>
          Documentos
        </h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleAvancar = async (data?: AvancaStatusRequest) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await orcamentoService.avancarStatus(id, data);
      setOrcamento(updated);
      setModal(null);
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      alert("Erro ao avançar status do orçamento");
    } finally {
      setSaving(false);
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
      <AppLayout active="orcamentos">
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#A29E96" }}>
          Carregando orçamento...
        </div>
      </AppLayout>
    );
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos">
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#C0492B" }}>
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
    <AppLayout active="orcamentos">
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <button
            onClick={() => navigate("/orcamentos")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: 12.5,
              fontWeight: 600,
              color: "#2A9D8F",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 5,
              fontFamily: "inherit",
            }}
          >
            <Icons.back width={13} height={13} /> Orçamentos
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 25,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "#3A372F",
              }}
            >
              #{String(orcamento.numero).padStart(4, "0")} — {orcamento.nomeCliente}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 30,
                padding: "0 13px",
                borderRadius: 999,
                background: meta.bg,
                color: meta.fg,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot }} />
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          icon={<Icons.pdf />}
          onClick={() => navigate(`/orcamentos/${orcamento.id}/preview`)}
        >
          Ver preview do PDF
        </Button>
      </div>

      {/* SEÇÃO 1 — TIMELINE */}
      {status !== "CANCELADO" && (
        <section
          style={{
            background: "#fff",
            border: "1px solid #F0EEE9",
            borderRadius: "var(--r-card)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: "26px 28px",
            animation: "fadeUp .4s ease both",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5C594F", marginBottom: 24 }}>
            Andamento do pedido
          </div>
          <Timeline current={status} />

          {!finalizado && (
            <div
              style={{
                marginTop: 30,
                paddingTop: 22,
                borderTop: "1px solid #EFEDE8",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              {cancelavel ? (
                <button
                  onClick={() => setModal("cancel")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: "transparent",
                    border: "none",
                    color: "rgba(192,73,43,0.85)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C0492B")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(192,73,43,0.85)")}
                >
                  <Icons.ban width={15} height={15} /> Cancelar orçamento
                </button>
              ) : (
                <span />
              )}

              {actionLabel && (
                <Button
                  variant="primary"
                  size="lg"
                  iconRight={<Icons.arrowRight />}
                  disabled={saving}
                  onClick={onPrimaryAction}
                >
                  {saving ? "Processando..." : actionLabel}
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Banner cancelado */}
      {status === "CANCELADO" && (
        <section
          style={{
            background: "#FCF0EC",
            border: "1px solid rgba(192,73,43,0.3)",
            borderRadius: "var(--r-card)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            animation: "fadeUp .4s ease both",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fff",
              color: "#C0492B",
              flexShrink: 0,
            }}
          >
            <Icons.ban />
          </span>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "#3A372F" }}>
              Orçamento cancelado
            </div>
            <div style={{ fontSize: 13, color: "#8A5A4E", marginTop: 2 }}>
              Este orçamento foi cancelado e não pode mais avançar de status.
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 2 — RESUMO + PRÓXIMO PASSO */}
      <div className="lower-grid" style={{ marginTop: 18 }}>
        {/* Resumo do orçamento */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #F0EEE9",
            borderRadius: "var(--r-card)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: "22px 24px",
            animation: "fadeUp .5s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(42,157,143,0.12)",
                color: "#2A9D8F",
              }}
            >
              <Icons.doc />
            </span>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "#3A372F" }}>
              Resumo do orçamento
            </h2>
          </div>

          {/* Cliente */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingBottom: 16,
              borderBottom: "1px solid #EFEDE8",
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "rgba(42,157,143,0.14)",
                color: "#2A9D8F",
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {orcamento.nomeCliente.charAt(0)}
            </span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: "#3A372F" }}>
                {orcamento.nomeCliente}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  color: "#A29E96",
                  marginTop: 2,
                }}
              >
                <Icons.phone style={{ color: "#2A9D8F" }} /> {cliente?.whatsapp || "—"}
              </div>
            </div>
          </div>

          {/* Itens */}
          <div
            style={{
              padding: "16px 0",
              borderBottom: "1px solid #EFEDE8",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {orcamento.itens.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(249,115,22,0.10)",
                    color: "#F97316",
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ×{it.quantidade}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#3A372F" }}>
                    {it.nomeProduto}
                  </div>
                  {it.customizacoes.map((c, k) => (
                    <span
                      key={k}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 4,
                        marginRight: 5,
                        fontSize: 11.5,
                        color: "#A35A26",
                        background: "rgba(249,115,22,0.08)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      <Icons.tag /> {c.nomeProduto}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#3A372F",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {BRL(it.subtotal)}
                </div>
              </div>
            ))}
          </div>

          {/* Total + sinal + validade */}
          <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#A29E96" }}>Total</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#F97316",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {BRL(orcamento.total)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#A29E96" }}>Validade</div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#5C594F",
                    marginTop: 2,
                  }}
                >
                  <Icons.calendar style={{ color: "#2A9D8F" }} /> {fmtDate(orcamento.dataValidade)}
                </div>
              </div>
            </div>

            {orcamento.sinalAtivo && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "10px 13px",
                    borderRadius: 10,
                    background: sinalRecebido
                      ? "rgba(42,157,143,0.07)"
                      : "rgba(249,115,22,0.07)",
                    border: `1px solid ${sinalRecebido ? "rgba(42,157,143,0.2)" : "rgba(249,115,22,0.2)"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: sinalRecebido ? "#2A9D8F" : "#B5701F",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sinalRecebido ? <Icons.check /> : <Icons.clock width={12} height={12} />}
                    {sinalRecebido ? "Sinal recebido" : "Aguardando Sinal"}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: sinalRecebido ? "#2A9D8F" : "#B5701F",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 4,
                    }}
                  >
                    {BRL(orcamento.valorSinal || 0)}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "10px 13px",
                    borderRadius: 10,
                    background: "#FCFBF9",
                    border: "1px solid #EFEDE8",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      color: "#A8A49C",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Restante
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#3A372F",
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 4,
                    }}
                  >
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
            style={{
              background:
                "linear-gradient(150deg, rgba(42,157,143,0.08) 0%, #fff 55%, rgba(249,115,22,0.05) 100%)",
              border: "1px solid rgba(42,157,143,0.18)",
              borderRadius: "var(--r-card)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              padding: "22px 24px",
              animation: "fadeUp .55s ease both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "#fff",
                  color: "#2A9D8F",
                  border: "1px solid rgba(42,157,143,0.2)",
                }}
              >
                <Icons.layers />
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#3A372F" }}>
                  Próximo passo
                </div>
                <div style={{ fontSize: 12.5, color: "#2A9D8F", fontWeight: 600, marginTop: 1 }}>
                  {actionLabel}
                </div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#5C594F" }}>
              {nextHint}
            </p>
          </section>
        )}
      </div>

      {/* SEÇÃO 3 — DOCUMENTOS */}
      <DownloadsCard orcamento={orcamento} onDownload={handleDownload} />

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
    </AppLayout>
  );
}
