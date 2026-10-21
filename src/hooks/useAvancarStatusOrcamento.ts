import { useState, type Dispatch, type SetStateAction } from "react";
import { orcamentoService } from "../services/orcamentoService";
import { extractApiError } from "../utils/apiError";
import { isConfirmacaoEstoqueNegativoResponse } from "../types/producao";
import type { ConfirmacaoEstoqueNegativoResponse } from "../types/producao";
import type {
  OrcamentoDetalheResponse,
  OrcamentoProducaoResponse,
  AvancaStatusRequest,
  SimulacaoAvancoStatusResponse,
  CriarProducaoVinculadaRequest,
} from "../types/orcamento";

export type ModalAvanco = null | "sinal" | "confirmarAtalho" | "vincularProducao";

interface Params {
  id: string | undefined;
  orcamento: OrcamentoDetalheResponse | null;
  setOrcamento: Dispatch<SetStateAction<OrcamentoDetalheResponse | null>>;
  setToast: (mensagem: string) => void;
}

/**
 * Fluxo de avançar o status do orçamento (sinal, atalho de aprovação, estoque negativo e vínculo
 * com produção), extraído do Detalhe do Orçamento para ser usado também pela Agenda (#1050).
 * Sem mudança de comportamento: as regras (ORC-005, ORC-047, RN-NOVA-2, RN-ORC-VINC-02) continuam
 * as mesmas e a decisão é sempre do backend.
 */
export function useAvancarStatusOrcamento({ id, orcamento, setOrcamento, setToast }: Params) {
  const status = orcamento?.status;

  const [saving, setSaving] = useState(false);
  const [modalAvanco, setModalAvanco] = useState<ModalAvanco>(null);
  const [erroAvanco, setErroAvanco] = useState<string | null>(null);
  // Confirmação pendente do backend: estoque negativo (RN-052) e/ou produção vinculada cancelada (ORC-047).
  const [confirmacaoPendente, setConfirmacaoPendente] = useState<ConfirmacaoEstoqueNegativoResponse | null>(null);
  const [ultimoAvancoData, setUltimoAvancoData] = useState<AvancaStatusRequest | undefined>(undefined);
  const [confirmandoAviso, setConfirmandoAviso] = useState(false);
  const [simulacaoAtalho, setSimulacaoAtalho] = useState<SimulacaoAvancoStatusResponse | null>(null);
  const [confirmandoAtalho, setConfirmandoAtalho] = useState(false);
  const [vinculandoProducao, setVinculandoProducao] = useState(false);
  // RN-ORC-VINC-02 ponto 2 (P-F005) — true quando a modal de vínculo foi aberta por interceptar o
  // clique em "avançar para Em produção" (não pelo card/atalho "Vincular produção"), para os
  // handlers de sucesso/fechamento saberem que devem completar a transição em seguida. Nunca
  // bloqueia (RN-ORC-VINC-01).
  const [vinculoViaTransicao, setVinculoViaTransicao] = useState(false);

  // RN-ORC-VINC-02 ponto 2 (P-F005) — a interceptação só vale na transição real para EM_PRODUCAO
  // (APROVADO sem sinal ou SINAL_PAGO) e só quando ainda não há vínculo algum.
  const precisaVincularProducao = !!orcamento && ((status === "APROVADO" && !orcamento.sinalAtivo) || status === "SINAL_PAGO");
  const producoesVinculadas = orcamento?.producoesVinculadas ?? [];

  const handleAvancar = async (data?: AvancaStatusRequest) => {
    if (!id) return;
    setSaving(true);
    setErroAvanco(null);
    try {
      const result = await orcamentoService.avancarStatus(id, data);
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setConfirmacaoPendente(result);
        setUltimoAvancoData(data);
      } else {
        setOrcamento(() => result);
        setModalAvanco(null);
      }
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      setErroAvanco(extractApiError(err, "Erro ao avançar status do orçamento."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarAvisoEstoque = async () => {
    if (!id || !confirmacaoPendente) return;
    setConfirmandoAviso(true);
    setErroAvanco(null);
    try {
      // Confirma tudo o que a modal mostrou: os ids de estoque negativo e, se houver, a ciência do vínculo
      // órfão (sem ela o backend devolveria a mesma confirmação e a usuária ficaria presa — #398).
      const result = await orcamentoService.avancarStatus(id, {
        ...ultimoAvancoData,
        confirmarEstoqueNegativoProdutoIds: confirmacaoPendente.avisos.map((a) => a.componenteId),
        confirmarVinculosOrfaos: (confirmacaoPendente.vinculosOrfaos?.length ?? 0) > 0 ? true : undefined,
      });
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        setConfirmacaoPendente(result);
      } else {
        setConfirmacaoPendente(null);
        setOrcamento(() => result);
        setModalAvanco(null);
      }
    } catch (err) {
      console.error("Erro ao avançar status:", err);
      setErroAvanco(extractApiError(err, "Erro ao avançar status do orçamento."));
    } finally {
      setConfirmandoAviso(false);
    }
  };

  // RN-NOVA-2 (revisada, P-F002.2) — clique em "Aprovar" com status ENVIADO: simula antes de
  // aplicar, para o usuário poder recusar o atalho. Erro na simulação NUNCA cai no fluxo normal
  // automaticamente — evita aplicar o atalho de verdade sem o usuário ter visto a modal.
  const handleClicarAprovar = async () => {
    if (!id) return;
    setSaving(true);
    setErroAvanco(null);
    let resultado: SimulacaoAvancoStatusResponse;
    try {
      resultado = await orcamentoService.simularAvancarStatus(id);
    } catch (err) {
      console.error("Erro ao simular avanço de status:", err);
      setErroAvanco(extractApiError(err, "Não foi possível verificar o atalho de aprovação. Tente novamente."));
      setSaving(false);
      return;
    }
    if (resultado.atalhoAplicavel) {
      setSimulacaoAtalho(resultado);
      setModalAvanco("confirmarAtalho");
      setSaving(false);
      return;
    }
    await handleAvancar();
  };

  const handleConfirmarAtalho = async () => {
    if (!id) return;
    setConfirmandoAtalho(true);
    setErroAvanco(null);
    try {
      const avisos = simulacaoAtalho?.avisosEstoque ?? [];
      const result = await orcamentoService.avancarStatus(id, {
        confirmarEstoqueNegativoProdutoIds: avisos.length > 0 ? avisos.map((a) => a.componenteId) : undefined,
      });
      if (isConfirmacaoEstoqueNegativoResponse(result)) {
        // estoque mudou entre a simulação e a confirmação — atualiza a mesma modal com os avisos novos
        setSimulacaoAtalho((prev) => (prev ? { ...prev, avisosEstoque: result.avisos } : prev));
      } else {
        setOrcamento(() => result);
        setModalAvanco(null);
        setSimulacaoAtalho(null);
      }
    } catch (err) {
      console.error("Erro ao confirmar atalho:", err);
      setErroAvanco(extractApiError(err, "Erro ao avançar status do orçamento."));
      setModalAvanco(null);
      setSimulacaoAtalho(null);
    } finally {
      setConfirmandoAtalho(false);
    }
  };

  const handleSeguirFluxoNormal = async () => {
    if (!id) return;
    setConfirmandoAtalho(true);
    setErroAvanco(null);
    try {
      const result = await orcamentoService.avancarStatus(id, { ignorarAtalhoAprovacaoDireta: true });
      if (!isConfirmacaoEstoqueNegativoResponse(result)) {
        setOrcamento(() => result);
      }
      setModalAvanco(null);
      setSimulacaoAtalho(null);
    } catch (err) {
      console.error("Erro ao seguir fluxo normal:", err);
      setErroAvanco(extractApiError(err, "Erro ao avançar status do orçamento."));
      setModalAvanco(null);
      setSimulacaoAtalho(null);
    } finally {
      setConfirmandoAtalho(false);
    }
  };

  // RN-PROD-VINC-03 (P-B016) — alerta combinado antes de confirmar, chamado pelo ModalVincularProducao
  // ao selecionar uma produção da lista, nunca pulado.
  const handleSimularVincularProducao = (producaoId: string) => {
    if (!id) return Promise.reject(new Error("Orçamento sem id"));
    return orcamentoService.simularVincularProducao(id, producaoId);
  };

  // Único ponto de "sucesso de vínculo" para os dois caminhos (existente/nova) e os dois pontos de
  // entrada (card/atalho vs. interceptação da transição) — via `vinculoViaTransicao`, capturado
  // antes de resetar o estado, decide se completa a transição para EM_PRODUCAO em seguida.
  const finalizarVinculo = (vinculos: OrcamentoProducaoResponse[]) => {
    const viaTransicao = vinculoViaTransicao;
    setOrcamento((prev) => (prev ? { ...prev, producoesVinculadas: vinculos } : prev));
    setModalAvanco(null);
    setVinculoViaTransicao(false);
    if (viaTransicao) {
      handleAvancar();
    } else {
      setToast("Produção vinculada a este orçamento.");
    }
  };

  const handleVincularProducao = async (producaoId: string) => {
    if (!id) return;
    setVinculandoProducao(true);
    try {
      const vinculos = await orcamentoService.vincularProducao(id, producaoId);
      finalizarVinculo(vinculos);
    } catch (err) {
      console.error("Erro ao vincular produção:", err);
      setToast(extractApiError(err, "Não foi possível vincular a produção."));
    } finally {
      setVinculandoProducao(false);
    }
  };

  // RN-ORC-VINC-02 ponto 1/2 (P-F005) — "criar produção nova" embutida na modal de vínculo.
  const handleCriarProducaoNova = async (dados: CriarProducaoVinculadaRequest) => {
    if (!id) return;
    const vinculos = await orcamentoService.criarProducaoVinculada(id, dados);
    finalizarVinculo(vinculos);
  };

  const fecharVincularProducao = () => {
    // Achado do teste manual (V0.10.0): fechar/cancelar a modal (X, clique fora, "Fechar") não
    // avança o status sozinho. Avançar sem vincular é uma ação explícita ("Avançar sem vincular").
    setModalAvanco(null);
    setVinculoViaTransicao(false);
  };

  const avancarSemVincular = () => {
    setModalAvanco(null);
    setVinculoViaTransicao(false);
    handleAvancar();
  };

  // Abre a modal de vínculo pelo card/atalho "Vincular produção" (sem completar a transição depois).
  const abrirVincularProducao = () => {
    setVinculoViaTransicao(false);
    setModalAvanco("vincularProducao");
  };

  // RN-ORC-VINC-02 ponto 2 — intercepta só a transição real para EM_PRODUCAO e só quando ainda não
  // há vínculo; com vínculo já feito, avança direto. A modal sempre tem como fechar/ignorar.
  const onPrimaryAction = () => {
    if (status === "AGUARDANDO_SINAL") {
      setModalAvanco("sinal");
    } else if (status === "ENVIADO") {
      handleClicarAprovar();
    } else if (precisaVincularProducao && producoesVinculadas.length === 0) {
      setVinculoViaTransicao(true);
      setModalAvanco("vincularProducao");
    } else {
      handleAvancar();
    }
  };

  return {
    saving,
    erroAvanco,
    modalAvanco,
    precisaVincularProducao,
    onPrimaryAction,
    abrirVincularProducao,
    fecharModalAvanco: () => setModalAvanco(null),
    // dados e ações das modais (consumidos por ModaisAvancarStatus)
    confirmacaoPendente,
    fecharConfirmacaoPendente: () => setConfirmacaoPendente(null),
    confirmandoAviso,
    handleConfirmarAvisoEstoque,
    simulacaoAtalho,
    confirmandoAtalho,
    handleConfirmarAtalho,
    handleSeguirFluxoNormal,
    fecharAtalho: () => {
      setModalAvanco(null);
      setSimulacaoAtalho(null);
    },
    handleAvancar,
    vinculandoProducao,
    vinculoViaTransicao,
    handleSimularVincularProducao,
    handleVincularProducao,
    handleCriarProducaoNova,
    fecharVincularProducao,
    avancarSemVincular,
  };
}

export type FluxoAvancarStatus = ReturnType<typeof useAvancarStatusOrcamento>;
