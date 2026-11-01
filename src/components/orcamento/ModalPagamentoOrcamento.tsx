import { useState } from "react";
import { AlertCircle, Wallet } from "lucide-react";
import Button from "../ui/Button";
import ModalShell from "../ui/ModalShell";
import PassoPagamento from "./PassoPagamento";
import type { ResultadoPagamento } from "../../utils/pagamentoOrcamento";

/**
 * V0.19.0 (#1174, RN-NOVA-38/41) — passo Pagamento dentro da aprovação ("Aprovar") e da ação "Alterar pagamento".
 * Só envia o corpo montado pelo PassoPagamento; as regras e a gravação são do servidor.
 */
export default function ModalPagamentoOrcamento({
  titulo, subtitulo, total, saving, erro, rotuloConfirmar, onClose, onConfirm,
}: {
  titulo: string;
  subtitulo?: string;
  total: number;
  saving: boolean;
  erro?: string | null;
  rotuloConfirmar: string;
  onClose: () => void;
  onConfirm: (corpo: Record<string, unknown>) => void;
}) {
  const [resultado, setResultado] = useState<ResultadoPagamento | null>(null);
  const [corpo, setCorpo] = useState<Record<string, unknown>>({});
  const valido = !!resultado && Object.keys(resultado.erros).length === 0;
  return (
    <ModalShell
      open
      onClose={onClose}
      title={titulo}
      subtitle={subtitulo}
      icon={<Wallet size={18} />}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button variant="primary" disabled={!valido || saving} onClick={() => onConfirm(corpo)}>
            {saving ? "Confirmando..." : rotuloConfirmar}
          </Button>
        </>
      }
    >
      <PassoPagamento total={total} onChange={(r, c) => { setResultado(r); setCorpo(c); }} />
      {erro && (
        <div className="mt-4 flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
          <AlertCircle size={16} className="mt-px shrink-0 text-danger" />
          <p className="m-0 text-[13px] leading-normal text-danger">{erro}</p>
        </div>
      )}
    </ModalShell>
  );
}
