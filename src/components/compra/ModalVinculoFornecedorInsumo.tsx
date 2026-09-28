import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, ExternalLink, Link2 } from 'lucide-react'
import { Button, ModalShell, MoneyInput } from '../ui'
import Spinner from '../ui/Spinner'
import ConfirmacaoModal from '../shared/ConfirmacaoModal'
import { formatarData, hojeIso, moeda, paraCampo, parseDecimal, qtd, REGRA_PRECO_LABEL } from './formato'
import { compraService, fornecedorInsumoService } from '../../services/compraService'
import { useModalErro } from '../../hooks/useModalErro'
import { extractApiError } from '../../utils/apiError'
import type { FornecedorInsumoResponse, PontoEvolucaoPreco } from '../../types/compra'

/**
 * #590 (RN-NOVA-39) — modal do vínculo fornecedor↔insumo: insumo, fornecedor, regra e preço de referência
 * atual; compras confirmadas do par (mais recente primeiro); campo "Preço de referência" com Salvar.
 * Com regra Média ou Menor valor, salvar à mão pede confirmação (AVISO): o valor vale até a próxima compra
 * do fornecedor ser confirmada ou cancelada. O recálculo é do backend.
 */
export default function ModalVinculoFornecedorInsumo({ vinculo, onClose, onSalvo }: {
  vinculo: FornecedorInsumoResponse
  onClose: () => void
  onSalvo: (v: FornecedorInsumoResponse) => void
}) {
  const [compras, setCompras] = useState<PontoEvolucaoPreco[] | null>(null)
  const [erroCompras, setErroCompras] = useState<string | null>(null)
  const [preco, setPreco] = useState(paraCampo(vinculo.precoReferencia, 2))
  const [aviso, setAviso] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { modalErro, mostrarErro } = useModalErro()
  const regra = vinculo.regraPrecoReferencia
  const unidade = vinculo.insumo.unidade

  useEffect(() => {
    // Todas as compras confirmadas do insumo (desde o início) e só as deste fornecedor.
    compraService.evolucaoPreco([vinculo.insumo.id], '2000-01-01', hojeIso())
      .then(r => setCompras((r.series[0]?.pontos ?? []).filter(p => p.fornecedorId === vinculo.fornecedor.id).reverse()))
      .catch(err => setErroCompras(extractApiError(err, 'Não foi possível carregar as compras.')))
  }, [vinculo.insumo.id, vinculo.fornecedor.id])

  const salvar = async () => {
    setAviso(false)
    setSalvando(true)
    try {
      onSalvo(await fornecedorInsumoService.atualizarPreco(vinculo.id, parseDecimal(preco)))
    } catch (err) {
      mostrarErro(err, 'Não foi possível salvar o preço de referência.')
    } finally {
      setSalvando(false)
    }
  }

  const pedirSalvar = () => regra === 'MANUAL' ? salvar() : setAviso(true)
  const regraTexto = REGRA_PRECO_LABEL[regra].toLowerCase()

  return (
    <>
      <ModalShell open onClose={onClose} width={760} icon={<Link2 size={16} />} title={`${vinculo.insumo.nome} · ${vinculo.fornecedor.nome}`}
        subtitle="Preço de referência" footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
        <div className="flex flex-col gap-4" data-testid="modal-vinculo">
          <dl className="m-0 grid grid-cols-2 gap-3 rounded-input border border-line bg-cream px-4 py-3 md:grid-cols-4">
            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">Insumo</dt>
              <dd className="m-0 mt-0.5 text-[13.5px] font-semibold"><Link to={`/insumos/${vinculo.insumo.id}`} className="text-dark no-underline hover:text-teal">{vinculo.insumo.nome}</Link></dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">Fornecedor</dt>
              <dd className="m-0 mt-0.5 text-[13.5px] font-semibold"><Link to={`/clientes/${vinculo.fornecedor.id}`} className="text-dark no-underline hover:text-teal">{vinculo.fornecedor.nome}</Link></dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">Regra do preço</dt>
              <dd data-testid="regra-vinculo" className="m-0 mt-0.5 text-[13.5px] font-semibold text-dark">{REGRA_PRECO_LABEL[regra]}</dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">Preço de referência</dt>
              <dd data-testid="preco-vinculo" className="m-0 mt-0.5 text-[15px] font-bold text-teal [font-variant-numeric:tabular-nums]">
                {vinculo.precoReferencia != null ? `${moeda(vinculo.precoReferencia)} / ${unidade}` : '—'}</dd></div>
          </dl>
          <p className="m-0 text-[12.5px] text-muted">
            {regra === 'MEDIA' && 'Média do preço unitário pago (ponderada pela quantidade) nas compras confirmadas deste fornecedor nos últimos 12 meses.'}
            {regra === 'MENOR_VALOR' && 'Menor preço unitário pago nas compras confirmadas deste fornecedor nos últimos 12 meses.'}
            {regra === 'MANUAL' && 'Valor digitado: as compras não mudam o preço de referência.'}
            {' '}A regra fica no cadastro do insumo e vale para todos os fornecedores dele.
          </p>

          <div className="rounded-input border border-line">
            <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr_20px] gap-3 bg-cream px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
              <span>Data</span><span>Compra</span><span>Quantidade</span><span>Preço un. pago</span><span />
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {erroCompras ? <div className="px-4 py-6 text-center text-sm text-danger">{erroCompras}</div>
                : compras === null ? <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted"><Spinner size={16} color="#2A9D8F" trackColor="#EFEDE8" /> Carregando…</div>
                : compras.length === 0 ? <div className="px-4 py-6 text-center text-sm text-muted">Nenhuma compra confirmada deste insumo com este fornecedor.</div>
                : compras.map((c, k) => (
                  <button key={`${c.compraId}-${k}`} type="button" data-testid="compra-vinculo" onClick={() => window.open(`/compras/${c.compraId}`, '_blank', 'noopener')}
                    className={clsx('grid w-full cursor-pointer grid-cols-[1fr_1fr_1fr_1.2fr_20px] gap-3 border-0 border-t border-solid border-line bg-white px-4 py-2.5 text-left font-[inherit] text-[13.5px] first:border-t-0 hover:bg-cream')}>
                    <span className="text-body [font-variant-numeric:tabular-nums]">{formatarData(c.data)}</span>
                    <span className="font-semibold text-dark">{c.identificador}</span>
                    <span className="text-body [font-variant-numeric:tabular-nums]">{qtd(c.quantidade)} {unidade}</span>
                    <span className="font-semibold text-dark [font-variant-numeric:tabular-nums]">{moeda(c.precoUnitarioPago)} / {unidade}</span>
                    <span className="text-muted"><ExternalLink size={14} /></span>
                  </button>
                ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block w-[220px]">
              <span className="mb-1.5 block text-[13px] font-semibold text-body">Preço de referência (por {unidade})</span>
              <MoneyInput size="sm" value={preco} onChange={setPreco} ariaLabel="Preço de referência" placeholder="0,00" />
            </label>
            <Button variant="primary" size="sm" onClick={pedirSalvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </div>
      </ModalShell>

      <ConfirmacaoModal
        open={aviso}
        onClose={() => setAviso(false)}
        onConfirm={salvar}
        title="Salvar o preço à mão?"
        icon={<AlertTriangle size={16} />}
        width={460}
        confirmLabel="Salvar mesmo assim"
        description={`Este insumo usa a regra ${regraTexto}. O valor digitado vale até a próxima compra deste fornecedor ser confirmada ou cancelada. Para fixar o valor, troque a regra do insumo para Manual.`}
      />
      {modalErro}
    </>
  )
}
