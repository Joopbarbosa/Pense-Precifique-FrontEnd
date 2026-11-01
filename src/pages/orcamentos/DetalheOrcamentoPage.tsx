import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import Timeline from "../../components/orcamento/detalhe/TimelineOrcamento";
import DownloadsCard, { documentosDisponiveis, type DocumentoKind } from "../../components/orcamento/detalhe/DocumentosOrcamento";
import { ModalCancelSimples, ModalCancelJustificativa, ModalCancelMulta, ModalCancelEstorno } from "../../components/orcamento/detalhe/ModaisCancelamento";
import SecaoProducao from "../../components/orcamento/detalhe/SecaoProducao";
import ModalCriarProducaoDetalhe from "../../components/orcamento/detalhe/ModalCriarProducaoDetalhe";
import { NEXT_HINT, STATUS_META, BRL, cancelKind, CANCEL_KIND_HINT, fmtDate, datasDosPassos, type ApiStatus } from "../../components/orcamento/detalhe/statusDetalhe";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/ui/Button";
import ModalShell from "../../components/ui/ModalShell";
import SegmentedControl from "../../components/ui/SegmentedControl";
import ConfirmacaoModal from "../../components/shared/ConfirmacaoModal";
import RetryCooldownModal from "../../components/shared/RetryCooldownModal";
import {
  Check, Wallet, AlertCircle, Ban, Calendar, FileText,
  ArrowLeft, ArrowRight, Phone, Layers, Box, SlidersHorizontal, Tag, Clock, Factory,
  AlertTriangle, Pencil, Copy, Unlink,
} from "lucide-react";
import { orcamentoService } from "../../services/orcamentoService";
import { clienteService } from "../../services/clienteService";
import type {
  OrcamentoDetalheResponse,
  AvancaStatusRequest,
  ItemSemEstoque,
  OrcamentoProducaoResponse,
  QuantidadeProducao,
} from "../../types/orcamento";
import type { ClienteResponse } from "../../types/cliente";
import { podeAlterarPagamento } from "../../utils/pagamentoOrcamento";
import ParcelasOrcamento from "../../components/orcamento/ParcelasOrcamento";
import ModaisAvancarStatus from "../../components/orcamento/ModaisAvancarStatus";
import ComentariosOrcamento from "../../components/orcamento/ComentariosOrcamento";
import { rotuloAcaoAvancar } from "../../components/orcamento/acaoAvancarStatus";
import { useAvancarStatusOrcamento } from "../../hooks/useAvancarStatusOrcamento";
import SelecaoProducaoEstoque from "../../components/orcamento/SelecaoProducaoEstoque";
import { VinculoAtivoBadge, Toast } from "../../components/shared";
import ModalCancelarProducaoJunto from "../../components/shared/ModalCancelarProducaoJunto";
import JuntarProducaoModal from "../../components/producao/JuntarProducaoModal";
import { producaoService } from "../../services/producaoService";
import type { ExcedenteLote, ProducoesPeriodo } from "../../types/producao";
import { construirFilaVinculosOrcamento, type VinculoPendente } from "../../utils/vinculoCancelamento";
import { STATUS_LABEL } from "../../constants";
import { useToast } from "../../hooks/useToast";
import { useRetryCooldown } from "../../hooks/useRetryCooldown";
import { extractApiError } from "../../utils/apiError";
import { dispararDownloadBlob } from "../../utils/download";
import { EstoqueTags } from "../../components/ui/Badge";
import { formatarData, formatarDataHora } from "../../utils/data";

// ─── Status / fluxo ────────────────────────────────────────────────────────

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetalheOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orcamento, setOrcamento] = useState<OrcamentoDetalheResponse | null>(null);
  const [cliente, setCliente] = useState<ClienteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [modal, setModal] = useState<null | "cancel" | "preview">(null);
  // RN-NOVA-22 (V0.18.0, #1038) — a conversa de comentários é uma aba do Detalhe; a outra é o próprio andamento do pedido
  const [aba, setAba] = useState<"detalhes" | "comentarios">("detalhes");
  const [itensSemEstoque, setItensSemEstoque] = useState<ItemSemEstoque[]>([]);
  // RN-NOVA-25 (V0.8.3, #319+376, P-F001f) — checkbox unificado do card "Estoque insuficiente":
  // seleção por produtoId (mesmo padrão de CriarOrcamentoPage/RN-NOVA-11) + mini-formulário próprio
  // de "Criar produção (N)", que cria vínculo formal via criarProducaoVinculada com subconjunto de
  // itens — nunca mais o botão individual sem vínculo de ORC-028.
  const [selecionadosProducaoDetalhe, setSelecionadosProducaoDetalhe] = useState<Set<string>>(new Set());
  const [modalCriarProducaoDetalhe, setModalCriarProducaoDetalhe] = useState(false);
  const [formDataInicioProducaoDetalhe, setFormDataInicioProducaoDetalhe] = useState("");
  const [formDataTerminoProducaoDetalhe, setFormDataTerminoProducaoDetalhe] = useState("");
  const [formObsProducaoDetalhe, setFormObsProducaoDetalhe] = useState("");
  const [formErroProducaoDetalhe, setFormErroProducaoDetalhe] = useState<string | null>(null);
  const [criandoProducaoDetalhe, setCriandoProducaoDetalhe] = useState(false);
  const [quantidadesProducaoDetalhe, setQuantidadesProducaoDetalhe] = useState<QuantidadeProducao[]>([]);
  const [quantidadesValidasDetalhe, setQuantidadesValidasDetalhe] = useState(true);
  // RN-NOVA-17 (V0.8.3, #375+308, P-F003) — fila de vínculos (produções) pendentes de confirmação
  // "desfazer vínculo?" exibida logo após o cancelamento ser confirmado com sucesso, um por vez.
  const [filaVinculos, setFilaVinculos] = useState<VinculoPendente[] | null>(null);
  // RN-NOVA-40 (#1167) — respostas "Cancelar também a produção?", enviadas junto com o cancelamento.
  const [decisoesCancelamento, setDecisoesCancelamento] = useState<Record<string, boolean>>({});
  // #401 (DT-NOVA-3) — confirmação antes de desvincular uma produção específica (reaproveita
  // ConfirmacaoModal genérico, mesmo componente já usado por outras ações destrutivas do sistema).
  const [confirmandoDesvincular, setConfirmandoDesvincular] = useState<OrcamentoProducaoResponse | null>(null);
  // RN-NOVA-42 (#1169) — juntar com outra produção e aviso de quantidade acima do lote.
  const [juntando, setJuntando] = useState<OrcamentoProducaoResponse | null>(null);
  const [excedentes, setExcedentes] = useState<Record<string, ExcedenteLote[]>>({});
  // RN-NOVA-49 (#1184) — produções entre a aprovação e a entrega estimada, com "Juntar com esta".
  const [periodo, setPeriodo] = useState<ProducoesPeriodo | null>(null);
  const [juntandoPeriodo, setJuntandoPeriodo] = useState<string | null>(null);
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null);
  const [avisosPeriodo, setAvisosPeriodo] = useState<string[]>([]);
  const [desvinculando, setDesvinculando] = useState(false);
  const { toast, setToast } = useToast();
  const pdfRetry = useRetryCooldown();

  // RN-NOVA-5/RN-NOVA-26 (#194, #387) — auxiliar para o card "Estoque insuficiente"; não bloqueia o
  // Detalhe se falhar. Extraído de `carregar` para poder ser rechamado sozinho (sem o flash de
  // "Carregando orçamento...") depois que uma produção nova é criada e vinculada (RN-NOVA-25), já
  // que só esta chamada sabe, por item, qual produção específica cobre aquele produto.
  const refetchItensSemEstoque = useCallback(() => {
    if (!id) return;
    orcamentoService
      .buscarItensSemEstoque(id)
      .then(setItensSemEstoque)
      .catch(() => setToast("Não foi possível verificar o estoque dos itens deste orçamento."));
  }, [id, setToast]);

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

    refetchItensSemEstoque();
  }, [id, refetchItensSemEstoque]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarExcedentes = useCallback(async (vinculos: OrcamentoProducaoResponse[]) => {
    const lotes = vinculos.filter((v) => (v.outrosOrcamentos?.length ?? 0) > 0 && v.estado === "AGUARDANDO_INICIO");
    const pares = await Promise.all(
      lotes.map((v) => producaoService.excedentes(v.producaoId).then((e) => [v.producaoId, e] as const).catch(() => [v.producaoId, []] as const)),
    );
    setExcedentes(Object.fromEntries(pares));
  }, []);

  useEffect(() => {
    if (orcamento) void carregarExcedentes(orcamento.producoesVinculadas);
  }, [orcamento, carregarExcedentes]);

  useEffect(() => {
    if (!orcamento) return;
    producaoService.producoesDoPeriodo(orcamento.id).then(setPeriodo).catch(() => setPeriodo(null));
  }, [orcamento]);

  const juntarComDoPeriodo = async (origemId: string, outraId: string) => {
    setJuntandoPeriodo(outraId);
    setErroPeriodo(null);
    try {
      const r = await producaoService.juntar(origemId, { producaoOutraIds: [outraId] });
      setAvisosPeriodo(r.avisos);
      await carregar();
    } catch (err) {
      setErroPeriodo(extractApiError(err, "Não foi possível juntar as produções."));
    } finally {
      setJuntandoPeriodo(null);
    }
  };

  const resolverExcedente = async (producaoId: string, cancelarLote: boolean) => {
    try {
      await producaoService.resolverExcedente(producaoId, cancelarLote);
      setToast(cancelarLote ? "Lote cancelado." : "Lote mantido; as unidades sem cobertura ficam no histórico.");
      await carregar();
    } catch (err) {
      setToast(extractApiError(err, "Não foi possível resolver o aviso do lote."));
    }
  };

  const fluxo = useAvancarStatusOrcamento({ id, orcamento, setOrcamento, setToast });

  // #401 (DT-NOVA-3) — endpoint já existia (RN-ORC-VINC-03), consumido até aqui só pelo fluxo de
  // cancelamento sequencial; este é o 1º consumidor de UI fora desse fluxo.
  const handleConfirmarDesvincular = async () => {
    if (!id || !confirmandoDesvincular) return;
    setDesvinculando(true);
    try {
      await orcamentoService.desvincularProducao(id, confirmandoDesvincular.producaoId);
      setOrcamento((prev) => prev
        ? { ...prev, producoesVinculadas: prev.producoesVinculadas.filter((v) => v.id !== confirmandoDesvincular.id) }
        : prev);
      setToast("Produção desvinculada.");
      setConfirmandoDesvincular(null);
    } catch (err) {
      setToast(extractApiError(err, "Erro ao desvincular produção. Tente novamente."));
    } finally {
      setDesvinculando(false);
    }
  };

  // RN-NOVA-25 (#319+376, P-F001f) — "Criar produção (N)" do card "Estoque insuficiente": mesmo
  // endpoint de `handleCriarProducaoNova` acima, mas com `produtoIds` restrito aos itens marcados no
  // checkbox (nunca todos os itens do orçamento) — mini-formulário próprio, mesmo padrão do
  // checkpoint de `CriarOrcamentoPage.tsx` (RN-NOVA-12/13). Diferente de `finalizarVinculo`
  // (`producoesVinculadas` já vem pronto na resposta), também precisa rechamar
  // `itens-sem-estoque` — só esse endpoint sabe, por produtoId, qual vínculo específico cobre cada
  // item (RN-NOVA-26).
  const handleCriarProducaoCheckpointDetalhe = async () => {
    if (!id) return;
    if (!formDataTerminoProducaoDetalhe) {
      setFormErroProducaoDetalhe("Informe o prazo de término previsto.");
      return;
    }
    if (!quantidadesValidasDetalhe) {
      setFormErroProducaoDetalhe("Corrija a quantidade a produzir dos produtos indicados.");
      return;
    }
    setCriandoProducaoDetalhe(true);
    setFormErroProducaoDetalhe(null);
    try {
      const vinculos = await orcamentoService.criarProducaoVinculada(id, {
        dataInicio: formDataInicioProducaoDetalhe || undefined,
        dataTerminoPrevista: formDataTerminoProducaoDetalhe,
        observacoes: formObsProducaoDetalhe || undefined,
        produtoIds: Array.from(selecionadosProducaoDetalhe),
        quantidadesProducao: quantidadesProducaoDetalhe.length ? quantidadesProducaoDetalhe : undefined,
      });
      setOrcamento((prev) => (prev ? { ...prev, producoesVinculadas: vinculos } : prev));
      setSelecionadosProducaoDetalhe(new Set());
      setModalCriarProducaoDetalhe(false);
      setToast("Produção criada e vinculada a este orçamento.");
      refetchItensSemEstoque();
    } catch (err) {
      setFormErroProducaoDetalhe(extractApiError(err, "Não foi possível criar a produção. Tente novamente."));
    } finally {
      setCriandoProducaoDetalhe(false);
    }
  };

  // Achado do teste manual (V0.10.0, #465) — quando o orçamento já tem produção vinculada
  // (RN-PROD-VINC-01/02: vincular sincroniza os itens pendentes pra dentro da produção
  // existente), "Criar produção (N)" sempre criava uma produção NOVA, mesmo quando o item
  // pendente podia simplesmente ser sincronizado pra produção que já existe — risco real de
  // duplicar produção pro mesmo pedido. Reaproveita o mesmo `vincularProducao` (sincronização já
  // implementada) em vez de sempre passar por `criarProducaoVinculada`.
  const handleSincronizarProducaoExistente = async () => {
    if (!id || !orcamento || orcamento.producoesVinculadas.length === 0) return;
    setCriandoProducaoDetalhe(true);
    setFormErroProducaoDetalhe(null);
    try {
      const vinculos = await orcamentoService.vincularProducao(id, orcamento.producoesVinculadas[0].producaoId);
      setOrcamento((prev) => (prev ? { ...prev, producoesVinculadas: vinculos } : prev));
      setSelecionadosProducaoDetalhe(new Set());
      setToast("Item(ns) vinculados à produção já existente.");
      refetchItensSemEstoque();
    } catch (err) {
      setToast(extractApiError(err, "Não foi possível vincular à produção existente."));
    } finally {
      setCriandoProducaoDetalhe(false);
    }
  };

  // Achado do teste manual (V0.10.0) — Customização também é produzível (o Backend agora inclui
  // as customizações em itensSemEstoque), mas o card só renderizava esse status pro produto
  // principal do item. Extraído pra ser reaproveitado nos dois casos (item principal + cada
  // customização anexada), sem duplicar o JSX de "Visualizar produção" vs. checkbox.
  const renderStatusEstoque = (produtoId: string, mostrarNome: boolean) => {
    const semEstoque = itensSemEstoque.find((s) => s.produtoId === produtoId);
    if (!semEstoque) return null;
    return (
      <div className="mt-2">
        {semEstoque.producaoVinculadaId ? (
          // RN-NOVA-26 (#387) — já existe produção não-terminal cobrindo este produto
          // especificamente: mostra a produção certa, não uma navegação genérica pra criar outra.
          <VinculoAtivoBadge
            label="Visualizar produção"
            onClick={() => navigate(`/producao/${semEstoque.producaoVinculadaId}`)}
          />
        ) : (
          // RN-NOVA-25 (#319+376) — checkbox no lugar do botão individual sem vínculo (ORC-028,
          // comportamento substituído nesta versão): a ação real fica no "Criar produção (N)"
          // agregado, logo acima da lista de itens.
          <SelecaoProducaoEstoque
            itens={[{
              produtoId: semEstoque.produtoId,
              nomeProduto: semEstoque.nomeProduto,
              estoqueAtual: semEstoque.estoqueAtual,
              quantidadeNecessaria: semEstoque.quantidadeSolicitada,
              quantidadeFaltante: semEstoque.quantidadeFaltante,
            }]}
            selecionados={selecionadosProducaoDetalhe}
            onToggle={handleToggleSelecaoProducaoDetalhe}
            ocultarNome={!mostrarNome}
          />
        )}
      </div>
    );
  };

  const handleToggleSelecaoProducaoDetalhe = (produtoId: string) => {
    setSelecionadosProducaoDetalhe((prev) => {
      const next = new Set(prev);
      if (next.has(produtoId)) next.delete(produtoId);
      else next.add(produtoId);
      return next;
    });
  };

  const handleCancelar = async (data?: AvancaStatusRequest) => {
    if (!id) return;
    setSaving(true);
    try {
      const decisoesProducao = Object.entries(decisoesCancelamento).map(([producaoId, cancelar]) => ({ producaoId, cancelar }));
      const updated = await orcamentoService.cancelar(id, { ...data, ...(decisoesProducao.length > 0 ? { decisoesProducao } : {}) });
      setOrcamento(updated);
      setModal(null);
    } catch (err) {
      console.error("Erro ao cancelar orçamento:", err);
      alert("Erro ao cancelar orçamento");
    } finally {
      setSaving(false);
    }
  };

  // RN-NOVA-17 (V0.8.3, #375+308, P-F003) — a fila de vínculos roda ANTES da modal real de
  // cancelamento (ModalCancelSimples/Justificativa/Multa/Estorno), não depois: embora o
  // cancelamento do Orçamento em si não valide o estado das produções vinculadas, rodar antes
  // mantém a mesma ordem nos dois lados (Orçamento/Produção) — necessária no lado espelhado
  // porque lá os endpoints de desfazer vínculo validam o estado ATUAL da produção no servidor, que
  // deixa de ser AGUARDANDO_INICIO assim que ela mesma é cancelada (ver DetalheProducaoPage.tsx).
  const [verificandoVinculos, setVerificandoVinculos] = useState(false);
  const handleCliqueCancelar = async () => {
    if (!orcamento) return;
    setVerificandoVinculos(true);
    try {
      const fila = await construirFilaVinculosOrcamento(orcamento);
      setDecisoesCancelamento({});
      if (fila.length > 0) setFilaVinculos(fila);
      else setModal("cancel");
    } finally {
      setVerificandoVinculos(false);
    }
  };

  const handleConcluirFilaVinculos = (decisoes: Record<string, boolean>) => {
    setDecisoesCancelamento(decisoes);
    setFilaVinculos(null);
    setModal("cancel");
  };

  // P-F008 (#314) — RN-NOVA-5/ORC-039: disponível em qualquer status (sem restrição, diferente do
  // botão "Editar"), sem modal de confirmação prévia (ação não-destrutiva) — mesmo padrão de
  // navegação direta usado por criar()/editar() nesta mesma página: sucesso navega direto para o
  // recurso novo, sem toast intermediário; erro (herdado de criar(), ex. cliente excluído) mostra
  // toast com a mensagem real do backend.
  const handleDuplicar = async () => {
    if (!id) return;
    setDuplicando(true);
    try {
      const novo = await orcamentoService.duplicar(id);
      navigate(`/orcamentos/${novo.id}`);
    } catch (err) {
      console.error("Erro ao duplicar orçamento:", err);
      setToast(extractApiError(err, "Erro ao duplicar orçamento. Tente novamente."));
    } finally {
      setDuplicando(false);
    }
  };

  // "pdf" (orçamento) usa o serviço centralizado + retry com cooldown (RN-NOVA-3) — único
  // documento migrado ao microsserviço neste MVP (épico #89). Tem também botão de preview próprio
  // no header ("Ver preview do PDF" → /orcamentos/{id}/preview), por isso o card mantém o download
  // direto para este item.
  const handleDownloadPdf = () => {
    if (!id || pdfRetry.executando || pdfRetry.cooldownRestante > 0) return;
    pdfRetry.executar(async () => {
      const blob = await orcamentoService.baixarPdf(id);
      dispararDownloadBlob(blob, `orcamento-${orcamento?.numero || id}.pdf`);
    }, "Erro ao baixar PDF do orçamento.");
  };

  // P-F013 — os outros 4 documentos (épico #248) navegam para a própria tela de preview em vez de
  // baixar via fetch cru: essas telas já tratam gate de preview, retry/cooldown e erro sozinhas.
  const PREVIEW_ROUTE: Record<"reciboSinal" | "multa" | "estorno" | "pagamento", string> = {
    reciboSinal: "recibo-sinal",
    multa: "multa",
    estorno: "recibo-estorno",
    pagamento: "recibo-pagamento",
  };

  const handleDownloadAny = (kind: DocumentoKind) => {
    if (!id) return;
    if (kind === "pdf") {
      handleDownloadPdf();
      return;
    }
    navigate(`/orcamentos/${id}/${PREVIEW_ROUTE[kind]}`);
  };

  // RN-NOVA-3 (#317) — rota de preview do "Preview" unificado do header, distinta de
  // handleDownloadAny (que baixa o PDF direto via blob) — aqui o PDF também abre em tela de
  // preview própria, igual aos outros 4 documentos.
  const PREVIEW_ROUTE_ALL: Record<DocumentoKind, string> = {
    pdf: "preview",
    ...PREVIEW_ROUTE,
  };

  const handlePreviewKind = (kind: DocumentoKind) => {
    if (!id) return;
    setModal(null);
    navigate(`/orcamentos/${id}/${PREVIEW_ROUTE_ALL[kind]}`);
  };

  if (loading) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-muted">
          Carregando orçamento...
        </div>
      </AppLayout>
    );
  }

  if (!orcamento) {
    return (
      <AppLayout active="orcamentos" compact>
        <div className="px-5 py-10 text-center text-danger">
          Orçamento não encontrado
        </div>
      </AppLayout>
    );
  }

  const status = orcamento.status as ApiStatus;
  const meta = STATUS_META[status] || STATUS_META.RASCUNHO;
  const actionLabel = rotuloAcaoAvancar(status, fluxo.precisaVincularProducao, fluxo.temVinculo);
  const nextHint = NEXT_HINT[status];
  // RN-NOVA-10 (V0.10.0, #466) — terminal da timeline passou de PAGO para ENTREGUE; mesmo achado
  // do ACTION_LABEL/NEXT_HINT acima, corrigido junto.
  const finalizado = status === "ENTREGUE" || status === "CANCELADO";
  // Achado da suíte QA (V0.10.0): a correção acima do #466 replicou o find-replace PAGO→ENTREGUE
  // também aqui, mas `cancelavel` não segue o mesmo conceito de "status terminal" de `finalizado`
  // — `cancelKind()` (abaixo) sempre tratou ENTREGUE e PAGO como igualmente canceláveis (ambos
  // caem no fluxo "justificativa", CANCEL_KIND_HINT inclusive, nenhum dos dois nunca mudou), o
  // recurso de cancelar um pedido já entregue com justificativa é anterior a este pocket e não
  // fazia parte do escopo de RN-NOVA-10 (que só reordena a timeline). Bloquear cancelamento só
  // quando já CANCELADO — não há status realmente "sem volta" antes disso.
  const cancelavel = status !== "CANCELADO";

  const sinalRecebido = ["SINAL_PAGO", "EM_PRODUCAO", "FINALIZADO", "ENTREGUE", "PAGO"].includes(status);
  const restante = (orcamento.total || 0) - (orcamento.valorSinal || 0);

  // RN-ORC-VINC-02 ponto 2 (revisão #320) — vínculo é opcional em qualquer status (RN-ORC-VINC-01
  // removeu o bloqueio antigo), mas o convite proativo ("Vincular produção", card abaixo quando
  // ainda não há vínculo) só faz sentido nesses 2 caminhos, às vésperas de EM_PRODUCAO. O card de
  // "já vinculado" (abaixo) não usa mais essa condição — mostra sempre que houver vínculo, mesmo em
  // RASCUNHO/ENVIADO, já que o ponto 1 (P-F004, CriarOrcamentoPage) pode vincular bem antes disso.
  const precisaVincularProducao = fluxo.precisaVincularProducao;
  const producoesVinculadas = orcamento.producoesVinculadas;
  // RN-NOVA-25 (#319+376) — itens com estoque insuficiente e sem nenhuma produção não-terminal
  // cobrindo o produto ainda: são os únicos elegíveis para o checkbox/ação agregada "Criar produção
  // (N)". Itens com producaoVinculadaId preenchido (RN-NOVA-26) mostram "Visualizar produção" no
  // próprio card, não entram aqui.
  const itensPendentesSemVinculo = itensSemEstoque.filter((i) => !i.producaoVinculadaId);

  // RN-NOVA-3 (#317) — mesma lista que alimenta DownloadsCard, reaproveitada pelo "Preview" do header.
  // Achado do teste manual (V0.10.0) — reverte a regra original de #317 ("pula direto com 1
  // documento disponível"): a modal agora sempre abre, mesmo com 1 documento só, a pedido
  // explícito do usuário.
  const documentosParaPreview = documentosDisponiveis(orcamento);
  const handleClickPreview = () => {
    if (documentosParaPreview.length === 0) return;
    setModal("preview");
  };

  const salvando = saving || fluxo.saving;

  const kind = cancelKind(status);

  return (
    <AppLayout active="orcamentos" compact>
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-section">
        <div>
          <button
            onClick={() => navigate("/orcamentos")}
            className="mb-[5px] inline-flex items-center gap-1.5 border-none bg-none p-0 font-[inherit] text-[12.5px] font-semibold uppercase tracking-wider text-teal"
          >
            <ArrowLeft size={13} /> Orçamentos
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[25px] font-bold tracking-tight text-dark">
              #{orcamento.numero} — {orcamento.nomeCliente}
            </h1>
            <span
              className="inline-flex h-[30px] items-center gap-[7px] rounded-full px-[13px] text-[13px] font-semibold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: meta.dot }} />
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* P-F007 (#312+318) — RN-NOVA-4/ORC-038: PUT /orcamentos/{id} só aceita RASCUNHO, então o
              botão só aparece nesse status (defesa em profundidade — o backend também bloqueia). */}
          {status === "RASCUNHO" && (
            <Button
              variant="ghost"
              icon={<Pencil size={18} />}
              onClick={() => navigate(`/orcamentos/${orcamento.id}/editar`)}
            >
              Editar
            </Button>
          )}
          {/* P-F008 (#314) — RN-NOVA-5/ORC-039: disponível em qualquer status, diferente de Editar. */}
          <Button
            variant="ghost"
            icon={<Copy size={18} />}
            onClick={handleDuplicar}
            disabled={duplicando || salvando}
          >
            {duplicando ? "Duplicando..." : "Duplicar"}
          </Button>
          {documentosParaPreview.length > 0 && (
            <Button
              variant="ghost"
              icon={<FileText size={18} />}
              onClick={handleClickPreview}
            >
              Preview
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <SegmentedControl
          options={[{ value: "detalhes" as const, label: "Pedido" }, { value: "comentarios" as const, label: "Comentários" }]}
          value={aba} onChange={setAba} height="h-10" display="inline-flex" optionWidth="whitespace-nowrap px-5" textSize="text-sm"
          activeColors={["bg-teal text-white", "bg-teal text-white"]}
        />
      </div>

      {aba === "comentarios" && (
        <section className="animate-fade-up rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <ComentariosOrcamento orcamentoId={orcamento.id} />
        </section>
      )}

      {aba === "detalhes" && (
        <>
      <ParcelasOrcamento
        parcelas={orcamento.parcelas ?? []}
        podeAlterar={podeAlterarPagamento(status, orcamento.parcelas)}
        onAlterar={fluxo.abrirAlterarPagamento}
      />
      {/* SEÇÃO 1 — TIMELINE */}
      {status !== "CANCELADO" && (
        <section className="animate-fade-up rounded-card border border-[#F0EEE9] bg-white px-7 py-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-6 text-[13px] font-semibold text-body">
            Andamento do pedido
          </div>
          <Timeline current={status} datas={datasDosPassos(orcamento)} />

          {/* Achado da suíte QA (V0.10.0): esta linha misturava 2 ações independentes (cancelar /
              avançar status) sob um único gate `!finalizado` — fazia sentido enquanto os dois
              ficavam indisponíveis juntos no status terminal antigo (PAGO), mas com `cancelavel`
              corrigido acima (só bloqueia CANCELADO, cancelKind() sempre tratou ENTREGUE como
              cancelável com justificativa) o gate por `finalizado` escondia "Cancelar orçamento"
              de novo mesmo quando `cancelavel` já dizia que devia aparecer. `actionLabel` já é
              undefined em status finalizado (sem entrada em ACTION_LABEL), então não precisa de
              proteção própria aqui. */}
          {(cancelavel || actionLabel) && (
            <div className="mt-[30px] flex flex-wrap items-center justify-between gap-section border-t border-line pt-[22px]">
              {cancelavel ? (
                <div className="flex flex-col items-start gap-1.5">
                  <button
                    onClick={handleCliqueCancelar}
                    disabled={verificandoVinculos}
                    className="inline-flex items-center gap-[7px] border-none bg-transparent p-0 font-[inherit] text-[13px] font-semibold text-danger/85 transition-colors duration-150 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Ban size={15} /> {verificandoVinculos ? "Verificando vínculos..." : "Cancelar orçamento"}
                  </button>
                  {CANCEL_KIND_HINT[kind] && (
                    <span className="text-xs text-muted">{CANCEL_KIND_HINT[kind]}</span>
                  )}
                </div>
              ) : (
                <span />
              )}

              {actionLabel && (
                <Button
                  variant="primary"
                  size="lg"
                  iconRight={<ArrowRight size={17} />}
                  disabled={salvando}
                  onClick={fluxo.onPrimaryAction}
                >
                  {salvando ? "Processando..." : actionLabel}
                </Button>
              )}
            </div>
          )}

          {fluxo.erroAvanco && (
            <div className="mt-section flex gap-2 rounded-input border border-[#F2D8CF] bg-danger-bg px-3.5 py-3">
              <span className="mt-px flex shrink-0 text-danger">
                <AlertCircle size={16} />
              </span>
              <p className="m-0 text-[13px] leading-normal text-danger">
                {fluxo.erroAvanco}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Banner cancelado */}
      {status === "CANCELADO" && (
        <section className="flex flex-col gap-3.5 animate-fade-up rounded-card border border-danger/30 bg-[#FCF0EC] px-6 py-5">
          <div className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-danger">
              <Ban size={16} />
            </span>
            <div>
              <div className="text-[15.5px] font-bold text-dark">
                Orçamento cancelado
              </div>
              <div className="mt-0.5 text-[13px] text-[#8A5A4E]">
                Este orçamento foi cancelado e não pode mais avançar de status.
              </div>
              {orcamento.dataCancelamento && (
                <div data-testid="data-passo-CANCELADO" className="mt-0.5 text-[12px] text-[#8A5A4E]">
                  Cancelado em {formatarDataHora(orcamento.dataCancelamento)}
                </div>
              )}
            </div>
          </div>
          {/* RN-NOVA-1/ORC-036 (mini-estorno, V0.8.2) — sinal pago excedeu o valor bruto da multa,
              a diferença é devolvida à cliente em vez de simplesmente zerar a multa sem explicação. */}
          {orcamento.valorDevolvidoMulta != null && orcamento.valorDevolvidoMulta > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-danger/focus bg-white px-4 py-3.5">
              <Wallet size={16} className="shrink-0 text-danger" />
              <p className="m-0 text-[13px] leading-normal text-[#8A5A4E]">
                Você recebeu de volta{" "}
                <strong className="font-bold text-dark">{BRL(orcamento.valorDevolvidoMulta)}</strong>{" "}
                — o sinal pago era maior que a multa.
              </p>
            </div>
          )}
        </section>
      )}

      {/* SEÇÃO 2 — RESUMO + PRÓXIMO PASSO */}
      <div className="mt-section grid grid-cols-[1.05fr_1fr] gap-section max-[980px]:grid-cols-1">
        {/* Resumo do orçamento */}
        <section className="animate-[fadeUp_.5s_ease_both] rounded-card border border-[#F0EEE9] bg-white px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-section flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-teal/12 text-teal">
              <FileText size={20} />
            </span>
            <h2 className="m-0 text-[15.5px] font-bold text-dark">
              Resumo do orçamento
            </h2>
          </div>

          {/* Cliente */}
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-teal/[0.14] text-base font-bold text-teal">
              {orcamento.nomeCliente.charAt(0)}
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-dark">
                {orcamento.nomeCliente}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                <Phone size={16} className="text-teal" /> {cliente?.whatsapp || "—"}
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="flex flex-col gap-3 border-b border-line py-4">
            {/* RN-NOVA-25 (#319+376) — ação agregada acima da lista, some sozinha quando não há
                mais nenhum item pendente (todos já cobertos por produção, ou nenhum problema de
                estoque) — nunca aparece "Visualizar produção" aqui: itens em produções diferentes
                (RN-NOVA-13) tornariam um botão único ambíguo, cada item já mostra a produção certa
                no próprio card. */}
            {itensPendentesSemVinculo.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-input border border-orange/30 bg-orange/5 px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warning-alt">
                  <AlertTriangle size={14} className="shrink-0 text-orange" />
                  {itensPendentesSemVinculo.length === 1
                    ? "1 item com estoque insuficiente"
                    : `${itensPendentesSemVinculo.length} itens com estoque insuficiente`}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* #465 — quando já existe produção vinculada (não-terminal), sincronizar é
                      preferível a criar outra: evita duplicar produção pro mesmo pedido. */}
                  {orcamento.producoesVinculadas.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={selecionadosProducaoDetalhe.size === 0 || criandoProducaoDetalhe}
                      onClick={handleSincronizarProducaoExistente}
                    >
                      <Factory size={14} />
                      Vincular à {orcamento.producoesVinculadas[0].identificadorProducao}
                      {selecionadosProducaoDetalhe.size > 0 ? ` (${selecionadosProducaoDetalhe.size})` : ""}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selecionadosProducaoDetalhe.size === 0}
                    onClick={() => {
                      setFormDataInicioProducaoDetalhe("");
                      setFormDataTerminoProducaoDetalhe("");
                      setFormObsProducaoDetalhe("");
                      setFormErroProducaoDetalhe(null);
                      setModalCriarProducaoDetalhe(true);
                    }}
                  >
                    <Factory size={14} />
                    Criar produção{selecionadosProducaoDetalhe.size > 0 ? ` (${selecionadosProducaoDetalhe.size})` : ""}
                  </Button>
                </div>
              </div>
            )}
            {orcamento.itens.map((it, i) => {
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-orange/10 text-xs font-bold text-orange">
                    ×{it.quantidade}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-dark">
                        {it.nomeProduto}
                      </div>
                      <span className={clsx(
                        "inline-flex h-[22px] items-center gap-[5px] rounded-full px-[9px] text-[11.5px] font-semibold",
                        it.itemCatalogoId ? "bg-teal/10 text-teal" : "bg-line-soft text-dim"
                      )}>
                        {it.itemCatalogoId ? (
                          <Layers size={11} />
                        ) : (
                          <Box size={11} />
                        )}
                        {it.itemCatalogoId
                          ? it.catalogoNome ?? it.catalogoIdentificador
                          : "Venda sem catálogo"}
                      </span>
                    </div>
                    {/* V0.13.0 — item de origem Catálogo tem N componentes, cada um com seu
                        próprio estoque: `estoqueAtual` vem null (achado, ver decisoes-catalogo.md/
                        decisoes-orcamento.md) e não há mais um único valor agregado pra exibir. */}
                    {it.estoqueAtual != null && (
                      <EstoqueTags
                        className="mt-1.5"
                        // RN-NOVA-7 (V0.10.0, #461, reversão de RN-NOVA-6) — antes usava
                        // !algumInsumoNaoFracionavel (proxy indireto, campo de gate de negócio, não
                        // o fracionável de verdade do Produto); agora lê o campo correto, ao vivo.
                        fracionavel={it.fracionavel ?? true}
                        permitirEstoqueNegativo={it.permitirEstoqueNegativo}
                        estoqueAtual={it.estoqueAtual}
                        variant="busca"
                      />
                    )}
                    {it.customizacoes.length > 0 && (
                      <div className="mt-1.5 inline-flex h-[22px] items-center gap-[5px] rounded-full bg-line-soft px-[9px] text-[11.5px] font-semibold text-body">
                        <SlidersHorizontal size={11} />
                        Customizações ({it.customizacoes.length})
                      </div>
                    )}
                    <div>
                      {it.customizacoes.map((c, k) => (
                        <span
                          key={k}
                          className="mr-[5px] mt-1 inline-flex items-center gap-[5px] rounded-full bg-orange/8 px-2 py-0.5 text-[11.5px] text-warning-alt"
                        >
                          <Tag size={17} /> {c.nomeProduto}
                        </span>
                      ))}
                    </div>
                    {renderStatusEstoque(it.produtoId, false)}
                    {/* Achado do teste manual (V0.10.0) — Customização também é produzível; cada
                        uma pode ter seu próprio status de estoque/vínculo, independente do produto
                        principal do item. */}
                    {it.customizacoes.map((c, k) => (
                      <div key={`custom-estoque-${k}`}>{renderStatusEstoque(c.produtoId, true)}</div>
                    ))}
                  </div>
                  <div className="text-[13.5px] font-semibold text-dark [font-variant-numeric:tabular-nums]">
                    {BRL(it.subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total + sinal + validade */}
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Total</div>
                <div className="text-[22px] font-bold tracking-[-0.01em] text-orange [font-variant-numeric:tabular-nums]">
                  {BRL(orcamento.total)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Validade</div>
                <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-body">
                  <Calendar size={16} className="text-teal" /> {fmtDate(orcamento.dataValidade)}
                </div>
              </div>
            </div>

            {orcamento.sinalAtivo && (
              <div className="flex flex-wrap gap-2.5">
                <div className={clsx(
                  "min-w-[140px] flex-1 rounded-[10px] border px-3.5 py-2.5",
                  sinalRecebido ? "border-teal/20 bg-teal/[0.07]" : "border-orange/20 bg-orange/[0.07]"
                )}>
                  <div className={clsx(
                    "flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.03em]",
                    sinalRecebido ? "text-teal" : "text-[#B5701F]"
                  )}>
                    {sinalRecebido ? <Check size={14} /> : <Clock size={12} />}
                    {sinalRecebido ? "Sinal recebido" : "Aguardando Sinal"}
                  </div>
                  <div className={clsx(
                    "mt-1 text-base font-bold [font-variant-numeric:tabular-nums]",
                    sinalRecebido ? "text-teal" : "text-[#B5701F]"
                  )}>
                    {BRL(orcamento.valorSinal || 0)}
                  </div>
                  {orcamento.sinalAte && (
                    <div data-testid="detalhe-sinal-ate" className="mt-0.5 text-xs text-muted">
                      Sinal até {formatarData(orcamento.sinalAte)}
                    </div>
                  )}
                </div>
                <div className="min-w-[140px] flex-1 rounded-[10px] border border-line bg-cream px-3.5 py-2.5">
                  <div className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.03em] text-dim">
                    Restante
                  </div>
                  <div className="mt-1 text-base font-bold text-dark [font-variant-numeric:tabular-nums]">
                    {BRL(restante)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <SecaoProducao
          producoesVinculadas={producoesVinculadas}
          status={status}
          finalizado={finalizado}
          nextHint={nextHint}
          precisaVincularProducao={precisaVincularProducao}
          onAbrirVincularProducao={fluxo.abrirVincularProducao}
          onJuntar={setJuntando}
          onDesvincular={setConfirmandoDesvincular}
          excedentes={excedentes}
          onResolverExcedente={resolverExcedente}
          periodo={periodo}
          juntandoPeriodo={juntandoPeriodo}
          onJuntarComDoPeriodo={juntarComDoPeriodo}
          avisosPeriodo={avisosPeriodo}
          erroPeriodo={erroPeriodo}
        />
      </div>

      {juntando && (
        <JuntarProducaoModal
          producaoId={juntando.producaoId}
          identificador={juntando.identificadorProducao}
          onClose={() => setJuntando(null)}
          onJuntado={() => { setJuntando(null); void carregar(); }}
        />
      )}

      {/* SEÇÃO 3 — DOCUMENTOS */}
      <DownloadsCard
        orcamento={orcamento}
        onDownload={handleDownloadAny}
        pdfBloqueado={pdfRetry.executando || pdfRetry.cooldownRestante > 0}
        pdfLabel={
          pdfRetry.executando
            ? "Baixando..."
            : pdfRetry.cooldownRestante > 0
              ? `Aguarde ${pdfRetry.cooldownRestante}s`
              : "Baixar PDF do orçamento"
        }
      />
        </>
      )}

      <RetryCooldownModal
        open={!!pdfRetry.erro}
        mensagem={pdfRetry.erro ?? ""}
        cooldownRestante={pdfRetry.cooldownRestante}
        executando={pdfRetry.executando}
        onTentarNovamente={pdfRetry.tentarNovamente}
        onClose={pdfRetry.dispensarErro}
      />

      <Toast message={toast} />

      {/* Modais */}
      {modal === "preview" && (
        <ModalShell
          open
          onClose={() => setModal(null)}
          title="Qual documento você quer ver?"
          subtitle={`${documentosParaPreview.length} documentos disponíveis para este orçamento.`}
          icon={<FileText size={15} />}
        >
          <div className="flex flex-col gap-[9px]">
            {documentosParaPreview.map((doc) => (
              <button
                key={doc.kind}
                type="button"
                onClick={() => handlePreviewKind(doc.kind)}
                className="flex items-center gap-3 rounded-[11px] border border-line bg-cream px-3.5 py-3 text-left transition-colors duration-150 hover:border-teal hover:bg-teal/5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-teal/10 text-teal">
                  {doc.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-dark">{doc.label}</span>
                  <span className="block text-xs text-muted">{doc.descricao}</span>
                </span>
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      <ModaisAvancarStatus orcamento={orcamento} fluxo={fluxo} />

      {modalCriarProducaoDetalhe && (
        <ModalCriarProducaoDetalhe
          orcamentoId={id}
          selecionados={selecionadosProducaoDetalhe}
          criando={criandoProducaoDetalhe}
          erro={formErroProducaoDetalhe}
          dataInicio={formDataInicioProducaoDetalhe}
          setDataInicio={setFormDataInicioProducaoDetalhe}
          dataTermino={formDataTerminoProducaoDetalhe}
          setDataTermino={setFormDataTerminoProducaoDetalhe}
          observacoes={formObsProducaoDetalhe}
          setObservacoes={setFormObsProducaoDetalhe}
          onQuantidades={(q, valido) => {
            setQuantidadesProducaoDetalhe(q);
            setQuantidadesValidasDetalhe(valido);
          }}
          onCriar={handleCriarProducaoCheckpointDetalhe}
          onClose={() => setModalCriarProducaoDetalhe(false)}
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

      {filaVinculos && filaVinculos.length > 0 && (
        <ModalCancelarProducaoJunto fila={filaVinculos} onConcluir={handleConcluirFilaVinculos} />
      )}

      <ConfirmacaoModal
        open={confirmandoDesvincular != null}
        onClose={() => setConfirmandoDesvincular(null)}
        onConfirm={handleConfirmarDesvincular}
        variant="danger"
        title={`Desvincular ${confirmandoDesvincular?.identificadorProducao}?`}
        icon={<Unlink size={16} />}
        width={440}
        confirmLabel="Desvincular"
        confirmingLabel="Desvinculando…"
        confirming={desvinculando}
        description="O orçamento deixa de estar vinculado a esta produção e as quantidades que ele adicionou são retiradas da produção."
      />
    </AppLayout>
  );
}
