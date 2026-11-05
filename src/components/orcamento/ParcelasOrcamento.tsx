import { Wallet } from "lucide-react";
import Button from "../ui/Button";
import { formatarMoeda2 } from "../../utils/formatacao";
import { formatarData } from "../../utils/data";
import type { ParcelaOrcamento } from "../../types/orcamento";

const PAPEL: Record<ParcelaOrcamento["papel"], string> = { SINAL: "Sinal", SALDO: "Saldo", TOTAL: "Total", MULTA: "Multa" };
const SITUACAO: Record<string, string> = { EM_ABERTO: "Em aberto", BAIXADA: "Recebida", CANCELADA: "Cancelada" };

/** V0.19.0 (#1174) — parcelas geradas pela aprovação (RN-NOVA-10) e a ação "Alterar pagamento" (RN-NOVA-41). */
export default function ParcelasOrcamento({ parcelas, podeAlterar, onAlterar }: {
  parcelas: ParcelaOrcamento[];
  podeAlterar: boolean;
  onAlterar: () => void;
}) {
  const visiveis = parcelas.filter(p => p.situacao !== "CANCELADA");
  if (visiveis.length === 0) return null;
  return (
    <section aria-label="Pagamento do orçamento" className="rounded-card border border-[#F0EEE9] bg-white px-7 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-body"><Wallet size={15} /> Pagamento</span>
        {podeAlterar && <Button variant="secondary" size="sm" onClick={onAlterar}>Alterar pagamento</Button>}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {visiveis.map(p => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-dark">
            <span className="font-semibold">{PAPEL[p.papel] ?? p.papel}{p.metodoPagamentoNome ? ` · ${p.metodoPagamentoNome}` : ""}</span>
            <span className="text-muted">vence em {formatarData(p.vencimento)} · {SITUACAO[p.situacao] ?? p.situacao}</span>
            <b>{formatarMoeda2(p.valor)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
