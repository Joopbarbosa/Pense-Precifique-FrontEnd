import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import Toggle from '../../components/ui/Toggle'
import { financeiroService } from '../../services/financeiroService'
import { empresaService } from '../../services/empresaService'
import { rotuloMetodoPagamento } from '../../constants/metodoPagamentoConfiguravel'
import { extractApiError } from '../../utils/apiError'
import { dataLocalIso } from '../../utils/data'
import type { CategoriaFinanceira, ParcelaFinanceira, TipoLancamento } from '../../types/financeiro'
import type { MetodoPagamentoConfiguravelResponse } from '../../types/empresa'

export default function NovaContaAvulsaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inicial: TipoLancamento = params.get('tipo') === 'A_RECEBER' ? 'A_RECEBER' : 'A_PAGAR'
  const [tipo, setTipo] = useState<TipoLancamento>(inicial)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState(dataLocalIso())
  const [meses, setMeses] = useState('')
  const [foraProjecao, setForaProjecao] = useState(false)
  const [jaPaga, setJaPaga] = useState(false)
  const [dataBaixa, setDataBaixa] = useState(dataLocalIso())
  const [metodoId, setMetodoId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const parcelaId = params.get('parcela')
  const [parcelaOriginal, setParcelaOriginal] = useState<ParcelaFinanceira | null>(null)
  const [seguintes, setSeguintes] = useState(false)
  const [carregandoEdicao, setCarregandoEdicao] = useState(Boolean(parcelaId))
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [metodos, setMetodos] = useState<MetodoPagamentoConfiguravelResponse[]>([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    financeiroService.listarCategorias().then(setCategorias).catch(() => setCategorias([]))
    empresaService.listarMetodosPagamento().then(lista => setMetodos(lista.filter(m => m.ativo))).catch(() => setMetodos([]))
  }, [])

  useEffect(() => {
    if (!parcelaId) return
    financeiroService.buscarParcela(parcelaId).then(p => {
      setParcelaOriginal(p); setTipo(p.tipo); setDescricao(p.descricao); setValor(String(p.valor));
      setVencimento(p.vencimento); setCategoriaId(p.categoriaId ?? ''); setForaProjecao(p.foraProjecao)
    }).catch(e => setErro(extractApiError(e, 'Não foi possível carregar a conta.')))
      .finally(() => setCarregandoEdicao(false))
  }, [parcelaId])

  async function salvar(event: FormEvent) {
    event.preventDefault(); setErro('')
    const quant = meses ? Number(meses) : undefined
    if (!/^\d+(\.\d{1,2})?$/.test(valor.trim())) { setErro('Informe um valor válido com até duas casas decimais.'); return }
    setSalvando(true)
    try {
      if (parcelaId) {
        await financeiroService.editarOcorrencia(parcelaId, { descricao, valor: Number(valor), vencimento,
          categoriaId: tipo === 'A_PAGAR' ? categoriaId || undefined : undefined, atualizarCategoria: true }, seguintes)
        if (parcelaOriginal && parcelaOriginal.foraProjecao !== foraProjecao)
          await financeiroService.marcarForaProjecao(parcelaOriginal.lancamentoId, foraProjecao)
      } else await financeiroService.criarContaAvulsa({ tipo, descricao, valor: Number(valor), vencimento,
        categoriaId: tipo === 'A_PAGAR' ? categoriaId || undefined : undefined,
        meses: quant, foraProjecao, jaPaga, dataBaixa: jaPaga ? dataBaixa : undefined,
        metodoPagamentoId: jaPaga ? metodoId : undefined })
      navigate('/financeiro', { replace: true })
    } catch (e) { setErro(extractApiError(e, 'Não foi possível salvar a conta.')) }
    finally { setSalvando(false) }
  }

  return <AppLayout active="financeiro">
    <div className="mx-auto max-w-2xl">
      <Link to="/financeiro" className="text-[14px] font-semibold text-teal no-underline hover:underline">Voltar ao financeiro</Link>
      <h1 className="mb-5 mt-3 text-[25px] font-bold text-dark">{parcelaId ? 'Editar conta avulsa' : `Nova ${tipo === 'A_PAGAR' ? 'despesa' : 'receita'} avulsa`}</h1>
      {carregandoEdicao ? <p>Carregando conta...</p> : <>
      <form onSubmit={salvar} className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
        {!parcelaId && <Field label="Tipo" required>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoLancamento)} className="h-11 rounded-input border border-line px-3">
            <option value="A_PAGAR">Despesa</option><option value="A_RECEBER">Receita</option>
          </select>
        </Field>}
        <Field label="Descrição" required hint="De 2 a 80 caracteres.">
          <input value={descricao} maxLength={80} onChange={e => setDescricao(e.target.value)} className="h-11 rounded-input border border-line px-3" />
        </Field>
        <Field label="Valor por ocorrência (R$)" required>
          <input inputMode="decimal" value={valor} onChange={e => setValor(e.target.value.replace(',', '.'))} className="h-11 rounded-input border border-line px-3" />
        </Field>
        <Field label="Primeiro vencimento" required>
          <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="h-11 rounded-input border border-line px-3" />
        </Field>
        {tipo === 'A_PAGAR' && <Field label="Categoria" required>
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="h-11 rounded-input border border-line px-3">
            <option value="">Outros (padrão)</option>{categorias.filter(c => c.ativa).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>}
        {!parcelaId && <Field label="Repete todo mês" opt>
          <select aria-label="Quantidade de meses" value={meses} onChange={e => setMeses(e.target.value)} className="h-11 rounded-input border border-line px-3">
            <option value="">Não repetir</option>{Array.from({ length: 23 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} meses</option>)}
          </select>
        </Field>}
        {parcelaId && parcelaOriginal && parcelaOriginal.totalParcelas > 1 && <Field label="Aplicar alteração" required>
          <select value={seguintes ? 'seguintes' : 'esta'} onChange={e => setSeguintes(e.target.value === 'seguintes')} className="h-11 rounded-input border border-line px-3">
            <option value="esta">Só esta</option><option value="seguintes">Esta e as seguintes Em aberto</option>
          </select>
        </Field>}
        <div className="flex items-center gap-3"><Toggle checked={foraProjecao} onChange={() => setForaProjecao(v => !v)} label="Fora da projeção" /><span>Fora da projeção</span></div>
        {!parcelaId && <div className="flex items-center gap-3"><Toggle checked={jaPaga} onChange={() => setJaPaga(v => !v)} label={tipo === 'A_PAGAR' ? 'Já paga' : 'Já recebida'} /><span>{tipo === 'A_PAGAR' ? 'Já paga' : 'Já recebida'}</span></div>}
        {jaPaga && <>
          <Field label="Data da baixa" required><input type="date" value={dataBaixa} max={dataLocalIso()} onChange={e => setDataBaixa(e.target.value)} className="h-11 rounded-input border border-line px-3" /></Field>
          <Field label="Forma de pagamento" required><select value={metodoId} onChange={e => setMetodoId(e.target.value)} className="h-11 rounded-input border border-line px-3">
            <option value="">Selecione</option>{metodos.map(m => <option key={m.id} value={m.id}>{rotuloMetodoPagamento(m.tipo, m.nome)}</option>)}
          </select></Field>
          {meses && <p className="m-0 text-[13px] text-muted">A baixa será aplicada somente à primeira ocorrência.</p>}
        </>}
        {erro && <p role="alert" className="m-0 text-[13px] text-danger-deep">{erro}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => navigate('/financeiro')}>Cancelar</Button><Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar conta'}</Button></div>
      </form>
      </>}
    </div>
  </AppLayout>
}
