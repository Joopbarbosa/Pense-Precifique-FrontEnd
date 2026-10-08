import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, Check, FileSearch, PackagePlus, RotateCcw, Sparkles, UserPlus, X } from 'lucide-react'
import { Button, ModalShell } from '../../ui'
import ConfirmacaoModal from '../../shared/ConfirmacaoModal'
import { InsumoPicker } from '../Pickers'
import { moeda, paraCampo, parseDecimal, qtd } from '../formato'
import DecisaoFornecedorNota from './DecisaoFornecedorNota'
import ModalCadastrarInsumoNota from './ModalCadastrarInsumoNota'
import ModalCadastrarFornecedorNota from './ModalCadastrarFornecedorNota'
import { notaCompraService } from '../../../services/notaCompraService'
import { useModalErro } from '../../../hooks/useModalErro'
import { extrairErroExplicado } from '../../../utils/apiError'
import type { ClienteResponse } from '../../../types/cliente'
import type { CompraResponse } from '../../../types/compra'
import type { InsumoResponse } from '../../../types/insumo'
import type {
  AcaoFornecedor, EscolhaItemNota, InsumoProposto, ItemConciliacao, NotaLeituraResponse, NotaRascunhoRequest,
  NotaRascunhoResponse, OrigemLigacao,
} from '../../../types/compraNota'

/**
 * #681 (V0.16.0, RN-NOVA-14, UC-NOVO-3, DT-NOVA-14) — modal de conciliação: todos os itens da nota com a
 * ligação proposta e de onde veio. A artesã troca o insumo, ajusta o fator, ignora ou cadastra o insumo; a
 * sugestão da IA só vale depois de aceita. Sem regra de negócio aqui: a prévia (junções, desconto da nota,
 * avisos e erros de fator) vem do backend com `simular`. Textos são rascunho até a validação do Gestor.
 */

interface EstadoItem {
  insumo: InsumoProposto | null
  fator: string
  ignorar: boolean
  /** Origem da proposta ainda em vigor; nula quando a artesã trocou à mão. */
  origem: OrigemLigacao | null
  /** Sugestão da IA ainda não aceita. */
  pendenteIa: boolean
}

const ROTULO_ORIGEM: Record<OrigemLigacao, string> = {
  VINCULO_SALVO: 'Vínculo salvo',
  VINCULO_OUTRO_FORNECEDOR: 'Vínculo de outro fornecedor',
  CASAMENTO_NOME: 'Casamento por nome',
  SUGESTAO_IA: 'Sugestão da IA',
  SEM_LIGACAO: 'Sem ligação',
}

const inicial = (item: ItemConciliacao): EstadoItem => ({
  insumo: item.insumo,
  fator: item.fator != null ? paraCampo(item.fator) : item.insumo ? '1' : '',
  ignorar: item.ignorar,
  origem: item.origemLigacao === 'SEM_LIGACAO' ? null : item.origemLigacao,
  pendenteIa: item.origemLigacao === 'SUGESTAO_IA',
})

const resolvido = (e: EstadoItem) => e.ignorar || (!!e.insumo && !e.pendenteIa)

const deInsumo = (i: InsumoResponse): InsumoProposto => ({
  id: i.id, identificador: i.identificador ?? '', nome: i.nome, marca: i.marca ?? null, unidade: i.unidadeMedida,
})

export default function ModalConciliacaoNota({ leitura, arquivo, comprovanteLink, onTentarNovamente, onCriado, onClose }: {
  leitura: NotaLeituraResponse
  arquivo?: File
  comprovanteLink: string | null
  onTentarNovamente: () => void
  onCriado: (compra: CompraResponse) => void
  onClose: () => void
}) {
  const nota = leitura.nota!
  const [estados, setEstados] = useState<EstadoItem[]>(() => leitura.itens.map(inicial))
  const [mexeu, setMexeu] = useState(false)
  // #713 (RN-NOVA-23) — fornecedor cadastrado pela modal nesta conferência, ou papel a adicionar ao cadastro existente.
  const [fornecedorCriado, setFornecedorCriado] = useState<ClienteResponse | null>(null)
  const [papelAdicionado, setPapelAdicionado] = useState(false)
  const [modalFornecedor, setModalFornecedor] = useState<'cadastrar' | 'papel' | null>(null)
  const [cadastrando, setCadastrando] = useState<ItemConciliacao | null>(null)
  const [trocando, setTrocando] = useState<number | null>(null)
  const [previa, setPrevia] = useState<NotaRascunhoResponse | null>(null)
  const [erroPrevia, setErroPrevia] = useState('')
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { modalErro, mostrarErro } = useModalErro()
  const sequencia = useRef(0)

  const todosResolvidos = estados.every(resolvido)
  // Fornecedor cadastrado ou criado agora: o backend o encontra pelo CNPJ. Sem clique no botão, segue sem fornecedor.
  const semFornecedorCadastrado = leitura.fornecedor != null && leitura.fornecedor.situacao !== 'FORNECEDOR_CADASTRADO' && !fornecedorCriado
  const acaoFornecedor: AcaoFornecedor | null = !semFornecedorCadastrado ? null : papelAdicionado ? 'ADICIONAR_PAPEL' : 'SEM_FORNECEDOR'
  const podeGerar = todosResolvidos && !salvando

  const alterar = (posicao: number, patch: Partial<EstadoItem>, manual = true) => {
    setEstados(prev => prev.map((e, i) => i === posicao ? { ...e, ...patch, ...(manual ? { origem: null, pendenteIa: false } : {}) } : e))
    if (manual) setMexeu(true)
  }

  const escolhas = useMemo<EscolhaItemNota[]>(() => estados.map((e, posicao) => e.ignorar
    ? { posicao, insumoId: null, fator: null, ignorar: true, origem: e.origem }
    : { posicao, insumoId: e.insumo?.id ?? null, fator: parseDecimal(e.fator), ignorar: false, origem: e.origem }), [estados])

  const pedido = (): NotaRascunhoRequest => ({
    notaLida: nota,
    assinatura: leitura.assinatura!,
    escolhas,
    fornecedor: acaoFornecedor,
    comprovanteLink,
  })

  // Prévia pelo backend a cada mudança (pequena espera de digitação); só a resposta mais recente vale.
  useEffect(() => {
    if (!todosResolvidos) { setPrevia(null); setErroPrevia(''); return }
    const minha = ++sequencia.current
    const timer = setTimeout(() => {
      notaCompraService.criarRascunho(pedido(), arquivo, true)
        .then(r => { if (minha === sequencia.current) { setPrevia(r); setErroPrevia('') } })
        .catch(err => { if (minha === sequencia.current) { setPrevia(null); setErroPrevia(extrairErroExplicado(err, 'Não foi possível calcular a prévia.').mensagem) } })
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolhas, todosResolvidos])

  const gerar = async () => {
    setSalvando(true)
    try {
      const r = await notaCompraService.criarRascunho(pedido(), arquivo, false)
      onCriado(r.compra!)
    } catch (err) {
      mostrarErro(err, 'Não foi possível gerar o rascunho da compra.')
      setSalvando(false)
    }
  }

  const tentarNovamente = () => mexeu ? setConfirmarDescarte(true) : onTentarNovamente()

  const pendentes = estados.filter(e => !resolvido(e)).length

  return (
    <>
      <ModalShell open onClose={onClose} width={880} title="Conferir itens da nota"
        subtitle={`${nota.emitente?.nome ?? 'Emitente'} · ${leitura.itens.length} ${leitura.itens.length === 1 ? 'item' : 'itens'} · total ${moeda(nota.totalPago)}`}
        icon={<FileSearch size={17} />}
        footer={<>
          <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={tentarNovamente}>Tentar novamente</Button>
          <Button variant="primary" icon={<Check size={16} />} onClick={gerar} disabled={!podeGerar}>
            {salvando ? 'Gerando…' : 'Gerar rascunho da compra'}
          </Button>
        </>}>
        <div className="flex flex-col gap-4" data-testid="modal-conciliacao-nota">
          {leitura.avisos.map(a => (
            <p key={a} className="m-0 rounded-input border border-line bg-cream px-3.5 py-2.5 text-[13px] text-body">{a}</p>
          ))}
          {leitura.fornecedor && (
            <DecisaoFornecedorNota proposta={leitura.fornecedor} cadastradoAgora={fornecedorCriado?.nome ?? null} papelAdicionado={papelAdicionado}
              onCadastrar={() => setModalFornecedor('cadastrar')} onAdicionarPapel={() => setModalFornecedor('papel')} />
          )}

          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {leitura.itens.map(item => {
              const e = estados[item.posicao]
              const ok = resolvido(e)
              return (
                <li key={item.posicao} data-testid={`item-nota-${item.posicao}`}
                  className={clsx('rounded-input border-[1.5px] px-4 py-3', ok ? 'border-line' : 'border-orange/60 bg-orange/5')}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-semibold text-dark">{item.nome}</span>
                    <span className="text-[13px] text-muted [font-variant-numeric:tabular-nums]">
                      {qtd(item.quantidade)} {item.unidade ?? ''} · {moeda(item.valorFinal)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <span data-testid="origem-ligacao" className={clsx('rounded-full px-2 py-0.5 font-semibold',
                      e.ignorar ? 'bg-line-soft text-subtle' : e.origem ? 'bg-teal/10 text-teal' : e.insumo ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange')}>
                      {e.ignorar ? 'Ignorado' : e.origem ? ROTULO_ORIGEM[e.origem] : e.insumo ? 'Escolhido por você' : 'Sem ligação'}
                    </span>
                    {item.aviso && <span className="inline-flex items-center gap-1 text-orange"><AlertTriangle size={13} /> {item.aviso}</span>}
                  </div>

                  {!e.ignorar && (
                    <div className="mt-2.5 flex flex-col gap-2">
                      {e.pendenteIa && e.insumo && (
                        <div className="flex flex-wrap items-center gap-2 rounded-input border border-dashed border-teal/50 px-3 py-2 text-[13px]">
                          <Sparkles size={14} className="text-teal" />
                          <span>Sugestão da IA: <strong>{e.insumo.nome}</strong>, fator {e.fator}</span>
                          <Button variant="secondary" size="sm" onClick={() => alterar(item.posicao, { pendenteIa: false }, false)}>Aceitar sugestão</Button>
                        </div>
                      )}
                      {e.insumo && !e.pendenteIa && trocando !== item.posicao && (
                        <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
                          <span className="text-muted">Insumo:</span>
                          <strong className="text-dark" data-testid="insumo-ligado">{e.insumo.nome}</strong>
                          <Button variant="ghost" size="sm" onClick={() => setTrocando(item.posicao)}>Trocar</Button>
                        </div>
                      )}
                      {(!e.insumo || trocando === item.posicao) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-[260px] flex-1">
                            <InsumoPicker size="sm" placeholder="Escolher insumo…" autoFocus={trocando === item.posicao}
                              onSelect={i => { alterar(item.posicao, { insumo: deInsumo(i), fator: e.fator || '1' }); setTrocando(null) }} />
                          </div>
                          {trocando === item.posicao && <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setTrocando(null)}>Cancelar</Button>}
                        </div>
                      )}
                      {item.candidatos.length > 0 && !e.insumo && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]" data-testid="candidatos">
                          <span className="text-muted">Candidatos:</span>
                          {item.candidatos.map(c => (
                            <button key={c.id} type="button" onClick={() => alterar(item.posicao, { insumo: c, fator: e.fator || '1' })}
                              className="cursor-pointer rounded-full border border-line bg-white px-2.5 py-1 font-semibold text-dark hover:border-teal">
                              {c.nome}
                            </button>
                          ))}
                        </div>
                      )}
                      {e.insumo && !e.pendenteIa && (
                        <label className="flex flex-wrap items-center gap-2 text-[13px] text-body">
                          Fator de conversão
                          <input value={e.fator} inputMode="decimal" aria-label={`Fator de conversão do item ${item.posicao + 1}`}
                            onChange={ev => alterar(item.posicao, { fator: ev.target.value.replace(/[^\d.,]/g, '') })}
                            className="h-9 w-24 rounded-input border-[1.5px] border-line px-2.5 text-[13.5px] outline-hidden focus:border-teal" />
                          <span className="text-muted">unidades do insumo em 1 {item.unidade ?? 'unidade'} da nota</span>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => alterar(item.posicao, { ignorar: !e.ignorar })}>
                      {e.ignorar ? 'Não ignorar' : 'Ignorar item'}
                    </Button>
                    {/* #715 (RN-NOVA-22) — com o item já ligado a um insumo (cadastrado agora ou escolhido), o botão some. */}
                    {!e.ignorar && !e.insumo && (
                      <Button variant="ghost" size="sm" icon={<PackagePlus size={14} />} onClick={() => setCadastrando(item)}>Cadastrar insumo</Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {pendentes > 0 && (
            <p className="m-0 text-[13px] text-orange" data-testid="pendentes-conciliacao">
              {pendentes === 1 ? '1 item ainda precisa de um insumo ou ser ignorado.' : `${pendentes} itens ainda precisam de um insumo ou ser ignorados.`}
            </p>
          )}
          {erroPrevia && <p className="m-0 text-[13px] text-danger-deep" role="alert" data-testid="erro-previa">{erroPrevia}</p>}
          {previa && (
            <section className="rounded-input border border-teal/20 bg-teal/5 px-4 py-3 text-[13px]" data-testid="previa-rascunho">
              <h3 className="m-0 mb-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-teal">Rascunho que será criado</h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {previa.linhas.map(l => (
                  <li key={l.insumoId} className="flex justify-between gap-3">
                    <span>{l.insumoNome} · {qtd(l.quantidade)}</span>
                    <span className="[font-variant-numeric:tabular-nums]">{moeda(l.precoCheio - l.descontoLinha)}</span>
                  </li>
                ))}
              </ul>
              {previa.descontoNota > 0 && <p className="m-0 mt-1.5">Desconto da nota: {moeda(previa.descontoNota)}</p>}
              {previa.avisos.map(a => <p key={a.codigo + a.mensagem} className="m-0 mt-1.5 text-orange">{a.mensagem}</p>)}
            </section>
          )}
        </div>
      </ModalShell>

      {cadastrando && (
        <ModalCadastrarInsumoNota item={cadastrando} onClose={() => setCadastrando(null)}
          onCriado={i => { alterar(cadastrando.posicao, { insumo: deInsumo(i), fator: estados[cadastrando.posicao].fator || '1' }); setCadastrando(null) }} />
      )}

      {modalFornecedor === 'cadastrar' && leitura.fornecedor && (
        <ModalCadastrarFornecedorNota proposta={leitura.fornecedor} onClose={() => setModalFornecedor(null)}
          onCriado={f => { setFornecedorCriado(f); setModalFornecedor(null) }} />
      )}
      <ConfirmacaoModal open={modalFornecedor === 'papel'} onClose={() => setModalFornecedor(null)}
        onConfirm={() => { setPapelAdicionado(true); setModalFornecedor(null) }}
        title="Adicionar como fornecedor?" icon={<UserPlus size={17} />}
        description={`${leitura.fornecedor?.nome ?? 'O emitente'} já é seu cliente. Ele passa a ser também fornecedor quando você gerar o rascunho da compra.`}
        confirmLabel="Adicionar como fornecedor" />

      <ConfirmacaoModal open={confirmarDescarte} onClose={() => setConfirmarDescarte(false)}
        onConfirm={() => { setConfirmarDescarte(false); onTentarNovamente() }}
        title="Descartar a conferência?" icon={<RotateCcw size={17} />}
        description="Você já ajustou ligações nesta nota. Ler de novo descarta toda a conferência atual."
        confirmLabel="Descartar e ler de novo" />

      {modalErro}
    </>
  )
}
