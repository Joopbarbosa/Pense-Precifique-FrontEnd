import ModalSinal from "./ModalSinal";
import ModalConfirmarAtalho from "./ModalConfirmarAtalho";
import ModalVincularProducao from "./ModalVincularProducao";
import ModalAvisoFaltaEstoque from "./ModalAvisoFaltaEstoque";
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

      {fluxo.avisoFaltaEstoque && (
        <ModalAvisoFaltaEstoque
          itens={fluxo.avisoFaltaEstoque}
          onClose={fluxo.fecharAvisoFaltaEstoque}
          onOk={fluxo.confirmarAvisoFaltaEstoque}
        />
      )}

      {fluxo.modalAvanco === "vincularProducao" && (
        <ModalVincularProducao
          onClose={fluxo.fecharVincularProducao}
          onSimular={fluxo.handleSimularVincularProducao}
          onConfirmar={fluxo.handleVincularProducao}
          onCriarNova={fluxo.handleCriarProducaoNova}
          orcamentoId={orcamento.id}
          confirmando={fluxo.vinculandoProducao}
          jaVinculadasIds={orcamento.producoesVinculadas.map((v) => v.producaoId)}
          onAvancarSemVincular={fluxo.vinculoViaTransicao ? fluxo.avancarSemVincular : undefined}
        />
      )}

      {fluxo.confirmacaoPendente && (
        <ConfirmarEstoqueNegativoModal
          avisos={fluxo.confirmacaoPendente.avisos}
          vinculosOrfaos={fluxo.confirmacaoPendente.vinculosOrfaos ?? []}
          confirming={fluxo.confirmandoAviso}
          onClose={fluxo.fecharConfirmacaoPendente}
          onConfirm={fluxo.handleConfirmarAvisoEstoque}
        />
      )}
    </>
  );
}
