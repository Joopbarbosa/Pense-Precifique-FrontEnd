import { AlertTriangle, Factory, Unlink } from "lucide-react";
import Button from "../../ui/Button";
import { ROTULO_ESTADO_PRODUCAO } from "../../producao/JuntarProducaoModal";
import type { ExcedenteLote, ProducoesPeriodo } from "../../../types/producao";
import type { OrcamentoProducaoResponse } from "../../../types/orcamento";
import { formatarData } from "../../../utils/data";

interface SecaoProducaoProps {
  producoesVinculadas: OrcamentoProducaoResponse[];
  status: string;
  finalizado: boolean;
  nextHint?: string;
  precisaVincularProducao: boolean;
  onAbrirVincularProducao: () => void;
  onJuntar: (v: OrcamentoProducaoResponse) => void;
  onDesvincular: (v: OrcamentoProducaoResponse) => void;
  excedentes: Record<string, ExcedenteLote[]>;
  onResolverExcedente: (producaoId: string, cancelarLote: boolean) => void;
  periodo: ProducoesPeriodo | null;
  juntandoPeriodo: string | null;
  onJuntarComDoPeriodo: (origemId: string, outraId: string) => void;
  avisosPeriodo: string[];
  erroPeriodo: string | null;
}

export default function SecaoProducao({
  producoesVinculadas, status, finalizado, nextHint, precisaVincularProducao, onAbrirVincularProducao,
  onJuntar, onDesvincular, excedentes, onResolverExcedente, periodo, juntandoPeriodo,
  onJuntarComDoPeriodo, avisosPeriodo, erroPeriodo,
}: SecaoProducaoProps) {
  // RN-NOVA-41 (V0.18.0, #1168) — seção Produção no lugar do card "Próximo passo".
  // Continua visível com o orçamento finalizado, só leitura.
  return (
  <section
    data-testid="secao-producao"
    className="animate-[fadeUp_.55s_ease_both] rounded-card border border-teal/18 px-6 py-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
    style={{ background: "linear-gradient(150deg, rgba(42,157,143,0.08) 0%, #fff 55%, rgba(249,115,22,0.05) 100%)" }}
  >
    <div className="mb-3 flex items-center gap-[11px]">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-teal/20 bg-white text-teal">
        <Factory size={18} />
      </span>
      <div className="text-[15px] font-bold text-dark">Produção</div>
    </div>
    {!finalizado && nextHint && (
      <p className="m-0 mb-3 text-[13px] leading-[1.5] text-body">
        <strong className="text-teal">Próximo passo:</strong> {nextHint}
      </p>
    )}

    {producoesVinculadas.length === 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-muted">Nenhuma produção vinculada</p>
        {/* #1110 — no APROVADO o botão principal já é "Vincular produção"; o da seção só vale nos demais passos */}
        {!finalizado && precisaVincularProducao && status !== "APROVADO" && (
          <Button variant="secondary" size="sm" onClick={onAbrirVincularProducao}>
            Vincular produção
          </Button>
        )}
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        {producoesVinculadas.map((v) => (
          <div key={v.id} data-testid="producao-vinculada" className="flex flex-col gap-2 rounded-input border border-line bg-white px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <strong className="text-[13px] text-body">{v.identificadorProducao}</strong>
                <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11.5px] font-semibold text-teal">
                  {ROTULO_ESTADO_PRODUCAO[v.estado] ?? v.estado}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {!finalizado && v.estado === "AGUARDANDO_INICIO" && (
                  <a
                    href={`/producao/${v.producaoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] font-semibold text-teal no-underline hover:text-teal/80"
                  >
                    Iniciar produção
                  </a>
                )}
                {!finalizado && v.estado === "AGUARDANDO_INICIO" && (
                  <button
                    onClick={() => onJuntar(v)}
                    className="border-none bg-transparent p-0 font-[inherit] text-[12.5px] font-semibold text-teal transition-colors duration-150 hover:text-teal/80"
                  >
                    Juntar com outra produção
                  </button>
                )}
                <a
                  href={`/producao/${v.producaoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12.5px] font-semibold text-teal no-underline hover:text-teal/80"
                >
                  Abrir produção
                </a>
                {!finalizado && (
                  <button
                    onClick={() => onDesvincular(v)}
                    className="inline-flex items-center gap-1 border-none bg-transparent p-0 font-[inherit] text-[12px] font-semibold text-danger/80 transition-colors duration-150 hover:text-danger"
                  >
                    <Unlink size={12} /> Desvincular
                  </button>
                )}
              </div>
            </div>
            <div className="text-[12.5px] text-muted">
              Início: {v.dataInicio ? formatarData(v.dataInicio) : "não iniciada"} · Término previsto:{" "}
              {v.dataTerminoPrevista ? formatarData(v.dataTerminoPrevista) : "a definir"}
            </div>
            {v.produtos.length > 0 && (
              <div className="text-[12.5px] text-body">
                {v.produtos.map((p) => `${p.nomeProduto} × ${Number(p.quantidade)}`).join(", ")}
              </div>
            )}
            {(v.outrosOrcamentos?.length ?? 0) > 0 && (
              <div data-testid="linha-lote" className="text-[12.5px] text-body">
                Lote {v.identificadorProducao}:{" "}
                {v.produtos
                  .map((p) => `${Number(p.quantidadePedido ?? p.quantidade)} de ${Number(p.quantidade)} ${p.nomeProduto}`)
                  .join(", ")}
                , junto com {v.outrosOrcamentos!.join(", ")}
              </div>
            )}
            {(excedentes[v.producaoId] ?? []).map((e) => (
              <div key={e.produtoId} data-testid="aviso-excedente-lote" className="flex flex-col gap-2 rounded-input border border-orange/40 bg-orange/10 px-3 py-2.5 text-[12.5px] text-body">
                <span className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange" />
                  <span>
                    Os pedidos do lote {e.identificadorProducao} somam {Number(e.quantidadePedidos)} de {e.nomeProduto}, mais que as {Number(e.quantidadeLote)} do lote
                    ({Number(e.naoCobertas)} sem cobertura). Manter o lote ou cancelá-lo?
                  </span>
                </span>
                <span className="flex gap-3">
                  <Button size="sm" variant="secondary" onClick={() => onResolverExcedente(v.producaoId, false)}>Manter o lote</Button>
                  <Button size="sm" variant="danger" onClick={() => onResolverExcedente(v.producaoId, true)}>Cancelar o lote</Button>
                </span>
              </div>
            ))}
            {v.estouroPrazo && (
              <div className="flex items-start gap-2 text-[12.5px] text-warning-alt">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange" />
                <span>
                  <strong>{v.identificadorProducao}</strong> deve terminar depois do prazo
                  prometido ao cliente — vale avisar ou ajustar a data combinada.
                </span>
              </div>
            )}
          </div>
        ))}
        {!finalizado && (
          <div>
            <button
              onClick={onAbrirVincularProducao}
              className="border-none bg-transparent p-0 font-[inherit] text-[12.5px] font-semibold text-teal transition-colors duration-150 hover:text-teal/80"
            >
              Vincular outra
            </button>
          </div>
        )}
      </div>
    )}

    {/* RN-NOVA-49 (#1184) — produções do período do orçamento */}
    <div data-testid="producoes-periodo" className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
      <div className="text-[13px] font-bold text-dark">
        Produções no período
        {periodo?.periodoDisponivel && periodo.dataInicio && periodo.dataFim && (
          <span className="ml-2 font-normal text-muted">
            {formatarData(periodo.dataInicio)} a {formatarData(periodo.dataFim)}
          </span>
        )}
      </div>
      {!periodo || !periodo.periodoDisponivel ? (
        <p data-testid="periodo-indisponivel" className="m-0 text-[12.5px] text-muted">
          O período aparece depois que o orçamento for aprovado e tiver entrega estimada.
        </p>
      ) : periodo.producoes.length === 0 ? (
        <p data-testid="periodo-vazio" className="m-0 text-[12.5px] text-muted">Nenhuma outra produção no período.</p>
      ) : (
        periodo.producoes.map((p) => {
          const origem = producoesVinculadas.find((v) => v.estado === "AGUARDANDO_INICIO" || v.estado === "EM_ANDAMENTO");
          return (
            <div key={p.id} data-testid="producao-periodo" className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-line bg-white px-3.5 py-2.5">
              <div className="min-w-0 text-[12.5px] text-body">
                <strong className="text-dark">{p.identificador}</strong>
                <span className="ml-2 rounded-full bg-teal/10 px-2 py-0.5 text-[11.5px] font-semibold text-teal">
                  {ROTULO_ESTADO_PRODUCAO[p.situacao] ?? p.situacao}
                </span>
                <span className="block text-muted">
                  {p.produtos.map((x) => `${x.nomeProduto} × ${Number(x.quantidade)}`).join(", ")} · {p.orcamentos.join(", ")}
                </span>
              </div>
              {!finalizado && p.selecionavel && origem && (
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="juntar-com-esta"
                  disabled={juntandoPeriodo !== null}
                  onClick={() => void onJuntarComDoPeriodo(origem.producaoId, p.id)}
                >
                  {juntandoPeriodo === p.id ? "Juntando..." : "Juntar com esta"}
                </Button>
              )}
            </div>
          );
        })
      )}
      {avisosPeriodo.map((a) => (
        <div key={a} data-testid="aviso-periodo" className="flex items-start gap-2 text-[12.5px] text-warning-alt">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange" />
          <span>{a}</span>
        </div>
      ))}
      {erroPeriodo && <div className="text-[12.5px] text-danger">{erroPeriodo}</div>}
    </div>
  </section>
  );
}
