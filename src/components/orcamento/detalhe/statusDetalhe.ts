import { ORDEM_CICLO_VIDA_ORCAMENTO } from "../../../constants";
import type { OrcamentoDetalheResponse } from "../../../types/orcamento";

export type ApiStatus =
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
// RN-NOVA-10 (V0.10.0, #466) — achado do teste manual: a reordenação FINALIZADO→PAGO→ENTREGUE
// mudou o STEPS/timeline, mas este mapa (e o NEXT_HINT/finalizado/cancelavel abaixo) tinham
// ficado com o rótulo da ordem antiga — FINALIZADO apontava pra "Marcar como entregue" (deveria
// ser "Confirmar pagamento", já que o próximo passo agora é PAGO) e não existia entrada pra PAGO
// (deveria ser "Marcar como entregue"), então o botão de avançar sumia por completo nesse status.
// Consequência direta de #466, corrigida inline (não é tarefa nova).

// Descrição do próximo passo
export const NEXT_HINT: Partial<Record<ApiStatus, string>> = {
  RASCUNHO: "Envie o orçamento para a cliente avaliar.",
  ENVIADO: "Quando a cliente aprovar, marque como aprovado.",
  APROVADO: "Confirme o início para seguir para a cobrança do sinal ou produção.",
  AGUARDANDO_SINAL: "Confirme o recebimento do sinal para liberar a produção.",
  SINAL_PAGO: "Inicie a produção dos itens do pedido.",
  EM_PRODUCAO: "Quando concluir, marque a produção como finalizada.",
  FINALIZADO: "Confirme o pagamento para seguir para a entrega.",
  PAGO: "Marque como entregue após a entrega ao cliente.",
};

// Ordem da timeline (exclui Cancelado)
// RN-NOVA-10 (V0.10.0, #466, altera ORC-005) — troca FINALIZADO->ENTREGUE->PAGO por
// FINALIZADO->PAGO->ENTREGUE; única mudança na sequência.
export const STEPS: readonly ApiStatus[] = ORDEM_CICLO_VIDA_ORCAMENTO;

export const STATUS_META: Record<string, { bg: string; fg: string; dot: string }> = {
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

export const BRL = (n: number) => `R$ ${(n ?? 0).toFixed(2).replace(".", ",")}`;

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
};

// Tipo de wizard de cancelamento por status
export function cancelKind(status: ApiStatus): "simples" | "estorno" | "multa" | "justificativa" {
  if (status === "SINAL_PAGO") return "estorno";
  if (status === "EM_PRODUCAO" || status === "FINALIZADO") return "multa";
  if (status === "ENTREGUE" || status === "PAGO") return "justificativa";
  return "simples";
}

// Antecipa qual wizard o botão "Cancelar orçamento" vai abrir, por status
export const CANCEL_KIND_HINT: Record<ReturnType<typeof cancelKind>, string | null> = {
  simples: null,
  estorno: "Este orçamento tem sinal pago — o cancelamento vai gerar recibo de estorno.",
  multa: "Este orçamento já entrou em produção — o cancelamento vai calcular multa.",
  justificativa: "Este orçamento já foi entregue — o cancelamento exige justificativa.",
};


/** RN-NOVA-14 (V0.18.0) — data e hora de cada passo já ocorrido; o passo sem data (orçamento anterior à V0.18.0) fica sem ela. */
export function datasDosPassos(o: OrcamentoDetalheResponse): Partial<Record<ApiStatus, string | null | undefined>> {
  return {
    RASCUNHO: o.createdAt, ENVIADO: o.dataEnvio, APROVADO: o.dataAprovacao, SINAL_PAGO: o.dataSinalPago,
    FINALIZADO: o.dataFinalizacao, PAGO: o.dataPagamento, ENTREGUE: o.dataEntrega,
  };
}
