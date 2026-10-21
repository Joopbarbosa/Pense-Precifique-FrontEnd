import ModalSinal from "./ModalSinal";
import ModalConfirmarAtalho from "./ModalConfirmarAtalho";
import ModalVincularProducao from "./ModalVincularProducao";
import ConfirmarEstoqueNegativoModal from "../producao/ConfirmarEstoqueNegativoModal";
import type { OrcamentoDetalheResponse } from "../../types/orcamento";
import type { FluxoAvancarStatus } from "../../hooks/useAvancarStatusOrcamento";

/** Modais do fluxo de avançar status (sinal, atalho, estoque negativo, vínculo com produção). */
export default function ModaisAvancarStatus({
  orcamento,
  fluxo,
}: {
  orcamento: OrcamentoDetalheResponse;
  fluxo: FluxoAvancarStatus;
}) {
  return (
    <>
      {fluxo.modalAvanco === "sinal" && (
        <ModalSinal
          orcamento={orcamento}
          saving={fluxo.saving}
          onClose={fluxo.fecharModalAvanco}
          onConfirm={(data) => fluxo.handleAvancar(data)}
        />
      )}

      {fluxo.modalAvanco === "confirmarAtalho" && fluxo.simulacaoAtalho && (
        <ModalConfirmarAtalho
          itens={orcamento.itens}
          avisosEstoque={fluxo.simulacaoAtalho.avisosEstoque}
          confirming={fluxo.confirmandoAtalho}
          onClose={fluxo.fecharAtalho}
          onConfirmarAtalho={fluxo.handleConfirmarAtalho}
          onSeguirFluxoNormal={fluxo.handleSeguirFluxoNormal}
        />
      )}

      {fluxo.modalAvanco === "vincularProducao" && (
        <ModalVincularProducao
          onClose={fluxo.fecharVincularProducao}
          onSimular={fluxo.handleSimularVincularProducao}
          onConfirmar={fluxo.handleVincularProducao}
          onCriarNova={fluxo.handleCriarProducaoNova}
          confirmando={fluxo.vinculandoProducao}
          jaVinculadasIds={orcamento.producoesVinculadas.map((v) => v.producaoId)}
          onAvancarSemVincular={fluxo.vinculoViaTransicao ? fluxo.avancarSemVincular : undefined}
        />
      )}

      {fluxo.avisoEstoqueNegativo && (
        <ConfirmarEstoqueNegativoModal
          avisos={fluxo.avisoEstoqueNegativo}
          confirming={fluxo.confirmandoAviso}
          onClose={fluxo.fecharAvisoEstoque}
          onConfirm={fluxo.handleConfirmarAvisoEstoque}
        />
      )}
    </>
  );
}
