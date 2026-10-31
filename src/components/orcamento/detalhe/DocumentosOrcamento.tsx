import type { ReactNode } from "react";
import Button from "../../ui/Button";
import { FileText, Receipt, Download } from "lucide-react";
import type { OrcamentoDetalheResponse } from "../../../types/orcamento";
import type { ApiStatus } from "./statusDetalhe";

// ─── Card de downloads ────────────────────────────────────────────────────────

export type DocumentoKind = "pdf" | "reciboSinal" | "multa" | "estorno" | "pagamento";

export interface DocumentoDisponivel {
  kind: DocumentoKind;
  label: string;
  // #463 (V0.10.0) — descrição curta por documento: usuária relatou que a lista de 2+ opções não
  // ficava intuitiva (botões visualmente idênticos, sem contexto do que cada um representa).
  descricao: string;
  icon: ReactNode;
}

// RN-NOVA-3 (V0.10.0, #317) — lógica condicional de "quais documentos existem" para este
// orçamento, extraída de DownloadsCard para ser reaproveitada também pelo botão "Preview" do
// header (CEN-NOVO-6/7: 2+ documentos → modal de seleção; 1 só → abre direto, sem modal).
export function documentosDisponiveis(orcamento: OrcamentoDetalheResponse): DocumentoDisponivel[] {
  const status = orcamento.status as ApiStatus;
  const links: DocumentoDisponivel[] = [];

  // PDF do orçamento — qualquer status exceto CANCELADO; #464 (V0.10.0) reabre a exceção quando
  // há multa aplicável (percentualMulta > 0) — usuário confirmou querer os dois juntos nesse caso.
  const temMulta = orcamento.percentualMulta != null && orcamento.percentualMulta > 0;
  if (status !== "CANCELADO" || temMulta) {
    links.push({
      label: "PDF do orçamento", kind: "pdf", icon: <FileText size={18} />,
      descricao: "Proposta completa enviada ao cliente",
    });
  }

  // Recibo do sinal — somente se sinalAtivo e dataSinalPago preenchida
  if (orcamento.sinalAtivo && orcamento.dataSinalPago != null) {
    links.push({
      label: "Recibo do sinal", kind: "reciboSinal", icon: <Receipt size={16} />,
      descricao: "Comprovante do sinal já pago",
    });
  }

  // Recibo de pagamento — DT-NOVA-4 (V0.10.0, #466): dataPagamento != null (não status === "PAGO")
  // — RN-NOVA-10 tira PAGO de terminal (agora vem antes de ENTREGUE), então status por igualdade
  // faria o recibo sumir do preview assim que o orçamento avançasse pra ENTREGUE.
  if (orcamento.dataPagamento != null) {
    links.push({
      label: "Recibo de pagamento", kind: "pagamento", icon: <Receipt size={16} />,
      descricao: "Comprovante do pagamento total",
    });
  }

  // PDF de multa — somente se percentualMulta > 0
  if (temMulta) {
    links.push({
      label: "PDF de multa", kind: "multa", icon: <FileText size={20} />,
      descricao: "Detalhamento da multa por cancelamento",
    });
  }

  // Recibo de estorno — somente se houve estorno de fato
  if (orcamento.estornoSinal === true) {
    links.push({
      label: "Recibo de estorno", kind: "estorno", icon: <Receipt size={16} />,
      descricao: "Comprovante da devolução do sinal",
    });
  }

  return links;
}

export default function DownloadsCard({
  orcamento,
  onDownload,
  pdfBloqueado,
  pdfLabel,
}: {
  orcamento: OrcamentoDetalheResponse;
  onDownload: (kind: DocumentoKind) => void;
  pdfBloqueado: boolean;
  pdfLabel: string;
}) {
  // Mesma lista condicional do botão "Preview" do header — só troca o label do PDF pelo estado
  // dinâmico de download (retry/cooldown), que não faz sentido no contexto de preview.
  const links = documentosDisponiveis(orcamento).map((l) =>
    l.kind === "pdf" ? { ...l, label: pdfLabel } : l
  );

  return (
    <section className="mt-section animate-[fadeUp_.6s_ease_both] rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-teal/12 text-teal">
          <Download size={17} />
        </span>
        <h2 className="m-0 text-[15.5px] font-bold text-dark">
          Documentos
        </h2>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {links.map((l) => (
          <Button
            key={l.kind}
            variant="ghost"
            icon={l.icon}
            onClick={() => onDownload(l.kind)}
            disabled={l.kind === "pdf" && pdfBloqueado}
          >
            {l.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
