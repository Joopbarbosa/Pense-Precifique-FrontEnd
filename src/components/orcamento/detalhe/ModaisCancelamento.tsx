import { useState } from "react";
import clsx from "clsx";
import ModalShell from "../../ui/ModalShell";
import Button from "../../ui/Button";
import ConfirmacaoModal from "../../shared/ConfirmacaoModal";
import SegmentedControl from "../../ui/SegmentedControl";
import TextArea from "../../ui/TextArea";
import { dataLocalIso } from "../../../utils/data";
import { Ban, AlertCircle, Wallet, Calendar, Receipt, Info } from "lucide-react";
import type { OrcamentoDetalheResponse } from "../../../types/orcamento";
import { validarPercentualMulta } from "../../../utils/limitesCancelamentoTaxa";
import { BRL } from "./statusDetalhe";

// ─── ModalCancelSimples ───────────────────────────────────────────────────────

export function ModalCancelSimples({
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

export function ModalCancelJustificativa({
  onClose,
  onConfirm,
  saving,
}: {
  onClose: () => void;
  onConfirm: (justificativa: string, estornarValorRecebido: boolean, devolverEstoque: boolean) => void;
  saving: boolean;
}) {
  const [texto, setTexto] = useState("");
  // RN-NOVA-51 — depois da justificativa, duas perguntas Sim/Não em sequência. Fechar em qualquer
  // ponto cancela tudo e nada é enviado; o envio só acontece após a segunda resposta.
  const [etapa, setEtapa] = useState<"justificativa" | "estorno" | "estoque">("justificativa");
  const [estornar, setEstornar] = useState(false);
  const len = texto.length;
  const invalido = len > 0 && len < 50;
  const valido = len >= 50 && !saving;

  if (etapa === "estorno") {
    return (
      <ConfirmacaoModal
        open
        onClose={onClose}
        onConfirm={() => { setEstornar(true); setEtapa("estoque"); }}
        onCancel={() => { setEstornar(false); setEtapa("estoque"); }}
        variant="danger"
        icon={<Ban size={16} />}
        title="Estornar o valor recebido?"
        description="O valor já recebido deste pedido será devolvido à cliente (saída no financeiro)."
        cancelLabel="Não"
        confirmLabel="Sim"
      />
    );
  }
  if (etapa === "estoque") {
    return (
      <ConfirmacaoModal
        open
        onClose={onClose}
        onConfirm={() => onConfirm(texto, estornar, true)}
        onCancel={() => onConfirm(texto, estornar, false)}
        variant="danger"
        icon={<Ban size={16} />}
        title="Devolver os insumos ao estoque?"
        description="Os insumos consumidos na produção voltarão ao estoque."
        cancelLabel="Não"
        confirmLabel="Sim"
        confirming={saving}
        confirmingLabel="Cancelando..."
      />
    );
  }

  return (
    <ConfirmacaoModal
      open
      onClose={onClose}
      onConfirm={() => setEtapa("estorno")}
      variant="danger"
      icon={<Ban size={16} />}
      title="Cancelar pedido já entregue?"
      subtitle="Justificativa obrigatória"
      cancelLabel="Voltar"
      confirmLabel="Continuar"
      confirmingLabel="Cancelando..."
      confirming={saving}
      confirmDisabled={!valido}
    >
      <p className="mb-3.5 mt-0 text-[13.5px] leading-[1.55] text-body">
        Cancelar um pedido neste estágio é uma ação excepcional. Descreva o
        motivo com detalhes (mínimo 50 caracteres).
      </p>
      <span className="mb-[7px] flex items-center text-[13px] font-semibold text-body">
        <span>
          Justificativa <span className="text-danger">*</span>
        </span>
      </span>
      <TextArea
        value={texto}
        onChange={setTexto}
        rows={4}
        minimo={50}
        erro={invalido ? `Faltam ${50 - len} caracteres.` : undefined}
        textSize="text-[13.5px]"
        placeholder="Ex: cliente solicitou cancelamento por motivo de força maior..."
      />
    </ConfirmacaoModal>
  );
}

// ─── ModalCancelMulta — EM_PRODUCAO / FINALIZADO ──────────────────────────────

export function ModalCancelMulta({
  orcamento,
  onClose,
  onConfirm,
  saving,
}: {
  orcamento: OrcamentoDetalheResponse;
  onClose: () => void;
  onConfirm: (percentualMulta?: number) => void;
  saving: boolean;
}) {
  const [step, setStep] = useState(1);
  const [multaAtiva, setMultaAtiva] = useState(true);
  const [multaPerc, setMultaPerc] = useState("50");

  const total = orcamento.total || 0;
  const percNum = parseFloat((multaPerc || "0").replace(",", ".")) || 0;
  // RN-NOVA-50 — multa > 0 e até 100% (o total); "sem multa" é uma escolha explícita (não envia nada).
  const erroMulta = multaAtiva ? validarPercentualMulta(multaPerc) : null;
  const sinalPago = orcamento.sinalAtivo && orcamento.valorSinal ? orcamento.valorSinal : 0;
  const multaBruta = (total * percNum) / 100;
  const multaAplicada = multaAtiva ? Math.max(multaBruta - sinalPago, 0) : 0;
  // RN-NOVA-1/ORC-036 (mini-estorno) — o valor exato a devolver só existe depois de confirmar (o
  // servidor recalcula com BigDecimal/arredondamento próprios, ver OrcamentoService.calcularResultadoMulta).
  // Mostrar só um aviso qualitativo aqui evita duplicar a fórmula de negócio no cliente — reaproveita
  // sinalPago/multaBruta só para decidir SE mostra o aviso, nunca para exibir um valor calculado.
  const possivelMiniEstorno = multaAtiva && sinalPago > multaBruta;

  const tituloPasso =
    step === 1 ? "Itens deste pedido"
    : step === 2 ? "Deseja cobrar multa pelo cancelamento?"
    : "Resumo do cancelamento";

  const Dots = () => (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={clsx("h-1 flex-1 rounded-xs", n <= step ? "bg-danger" : "bg-line")}
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
                <Button variant="primary" fullWidth disabled={erroMulta !== null} onClick={() => setStep(3)}>
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
                  onClick={() => onConfirm(multaAtiva ? percNum : undefined)}
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
          <SegmentedControl
            options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
            value={multaAtiva}
            onChange={setMultaAtiva}
            height="h-11"
            optionWidth="w-20"
            textSize="text-sm"
            activeColors={['bg-line-soft text-body', 'bg-orange text-white']}
            className="mb-section w-fit"
          />

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
                  className="h-[46px] min-w-[120px] flex-1 rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[15px] font-semibold text-dark outline-hidden transition-colors duration-150 focus:border-orange focus:ring-4 focus:ring-orange/12"
                />
              </div>
              {erroMulta && (
                <div role="alert" className="mt-2 text-xs font-medium text-danger">
                  {erroMulta}
                </div>
              )}
              <div className="mt-2.5 text-xs text-muted">
                Sugestão padrão: 50% do valor total.
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-orange/focus bg-orange/8 px-4 py-3.5">
                <span className="text-sm font-semibold text-dark">
                  Multa
                </span>
                <span className="text-xl font-bold text-orange [font-variant-numeric:tabular-nums]">
                  {BRL(multaAplicada)}
                </span>
              </div>
              {sinalPago > 0 && (
                <div className="mt-2 text-xs text-muted">
                  Já descontado o sinal de {BRL(sinalPago)} pago pela cliente.
                </div>
              )}
              {possivelMiniEstorno && (
                <div className="mt-2 text-xs font-medium text-teal">
                  O sinal pago é maior que a multa — a cliente vai receber a diferença de volta. O
                  valor exato será calculado ao confirmar.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── PASSO 3 — RESUMO ─── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {multaAtiva ? (
            <div className="flex flex-col gap-1 rounded-xl border border-orange/focus bg-orange/8 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-dark">
                  Multa <span className="font-medium text-muted">({percNum}%)</span>
                </span>
                <span className="text-lg font-bold text-orange [font-variant-numeric:tabular-nums]">
                  {BRL(multaAplicada)}
                </span>
              </div>
              {sinalPago > 0 && (
                <span className="text-xs text-muted">
                  Já descontado o sinal de {BRL(sinalPago)} pago pela cliente.
                </span>
              )}
              {possivelMiniEstorno && (
                <span className="text-xs font-medium text-teal">
                  O sinal pago é maior que a multa — a cliente vai receber a diferença de volta. O
                  valor exato será calculado ao confirmar.
                </span>
              )}
            </div>
          ) : (
            <div className="text-[13.5px] text-muted">
              Nenhuma multa será cobrada.
            </div>
          )}

          <div className="flex gap-2.5 rounded-xl border border-orange/30 bg-orange/8 px-3.5 py-3">
            <AlertCircle size={15} className="mt-px shrink-0 text-orange" />
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

export function ModalCancelEstorno({
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
    dataLocalIso(),
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
          className={clsx("h-1 flex-1 rounded-xs", n <= step ? "bg-danger" : "bg-line")}
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
                    onConfirm({ estornarSinal: true, dataEstornoSinal: `${dataEstorno}T12:00:00` })
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
          <div className="mb-5 flex items-center justify-between rounded-xl border border-orange/focus bg-orange/8 px-4 py-3.5">
            <div>
              <div className="mb-[3px] text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
                Sinal recebido
              </div>
              <div className="text-[22px] font-bold text-orange [font-variant-numeric:tabular-nums]">
                {BRL(valorSinal)}
              </div>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-orange/12 text-orange">
              <Wallet size={18} />
            </span>
          </div>

          {/* Toggle Sim/Não */}
          <div className="mb-3.5">
            <div className="mb-2.5 text-sm font-semibold text-dark">
              Deseja estornar o sinal?
            </div>
            <SegmentedControl
              options={[{ value: false, label: 'Não' }, { value: true, label: 'Sim' }]}
              value={estornar}
              onChange={setEstornar}
              height="h-11"
              optionWidth="w-20"
              textSize="text-sm"
              activeColors={['bg-line-soft text-body', 'bg-orange text-white']}
              className="w-fit"
            />
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
                  className="h-[46px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-hidden transition-colors duration-150 focus:border-orange focus:ring-4 focus:ring-orange/12"
                />
              </label>

              <div className="flex gap-2.5 rounded-xl border border-orange/focus bg-orange/[0.07] px-3.5 py-3">
                <Receipt size={16} className="mt-px shrink-0 text-orange" />
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
              <Info size={15} className="mt-px shrink-0 text-muted" />
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
            <div className="pointer-events-none absolute right-[-30px] -top-10 h-[120px] w-[120px] rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-white/80">
                Recibo de Estorno
              </div>
              <div className="wrap-break-word text-[28px] font-bold tracking-[-0.01em] [font-variant-numeric:tabular-nums]">
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

          <div className="flex gap-2.5 rounded-xl border border-orange/focus bg-orange/[0.07] px-3.5 py-3">
            <Receipt size={16} className="mt-px shrink-0 text-orange" />
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
