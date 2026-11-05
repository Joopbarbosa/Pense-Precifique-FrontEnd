import clsx from "clsx";
import { AlertCircle, Calendar, Factory, StickyNote } from "lucide-react";
import Button from "../../ui/Button";
import ModalShell from "../../ui/ModalShell";
import TextArea from "../../ui/TextArea";
import QuantidadesProducaoNaoFracionavel from "../QuantidadesProducaoNaoFracionavel";
import type { QuantidadeProducao } from "../../../types/orcamento";

interface Props {
  orcamentoId?: string;
  selecionados: Set<string>;
  criando: boolean;
  erro: string | null;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataTermino: string;
  setDataTermino: (v: string) => void;
  observacoes: string;
  setObservacoes: (v: string) => void;
  onQuantidades: (q: QuantidadeProducao[], valido: boolean) => void;
  onCriar: () => void;
  onClose: () => void;
}

/* RN-NOVA-25 (#319+376, P-F001f) — mini-formulário próprio de "Criar produção (N)" do card
          "Estoque insuficiente", mesmo padrão visual do modoCriarNova de ModalVincularProducao e do
          checkpoint de CriarOrcamentoPage (RN-NOVA-12/13) — mas cobre só os produtoIds marcados no
          checkbox, não todos os itens do orçamento. */
export default function ModalCriarProducaoDetalhe({
  orcamentoId, selecionados, criando, erro, dataInicio, setDataInicio, dataTermino, setDataTermino,
  observacoes, setObservacoes, onQuantidades, onCriar, onClose,
}: Props) {
  return (

    <ModalShell
      open
      onClose={onClose}
      title="Criar produção"
      subtitle={`Cobre só ${selecionados.size === 1 ? "o item selecionado" : `os ${selecionados.size} itens selecionados`}`}
      icon={<Factory size={18} />}
      iconBg="#EAF1FB"
      iconColor="#2A6FB0"
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose()} disabled={criando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onCriar} disabled={criando}>
            {criando ? "Criando..." : "Criar produção"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[13.5px] text-muted">
          Fica vinculada a este orçamento automaticamente, cobrindo só os produtos marcados —
          nasce em "Aguardando início".
        </p>

        <div className="flex flex-wrap gap-3">
          <label className="block flex-1 basis-[160px]">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <Calendar size={15} className="text-teal" /> Início
            </span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={criando}
              className="h-[44px] w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-hidden transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12"
            />
          </label>
          <label className="block flex-1 basis-[160px]">
            <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
              <Calendar size={15} className="text-teal" /> Término previsto <span className="text-orange">*</span>
            </span>
            <input
              type="date"
              value={dataTermino}
              min={dataInicio || undefined}
              onChange={(e) => setDataTermino(e.target.value)}
              disabled={criando}
              className={clsx(
                "h-[44px] w-full rounded-input border-[1.5px] bg-white px-3.5 font-[inherit] text-[14px] text-dark outline-hidden transition-colors duration-150 focus:border-teal focus:ring-4 focus:ring-teal/12",
                erro && !dataTermino ? "border-danger" : "border-line"
              )}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-[7px] flex items-center gap-[7px] text-[13px] font-semibold text-body">
            <StickyNote size={15} className="text-teal" /> Observações <span className="text-[11.5px] font-medium text-muted">(opcional)</span>
          </span>
          <TextArea
            value={observacoes}
            onChange={setObservacoes}
            rows={3}
            disabled={criando}
            textSize="text-sm"
            placeholder="Ex: separar embalagem especial para este pedido"
          />
        </label>

        {orcamentoId && (
          <QuantidadesProducaoNaoFracionavel
            orcamentoId={orcamentoId}
            produtoIds={Array.from(selecionados)}
            disabled={criando}
            onChange={(q, valido) => {
              onQuantidades(q, valido);
            }}
          />
        )}

        {erro && (
          <div className="flex items-start gap-2.5 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
