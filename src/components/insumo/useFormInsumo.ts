import { useEffect, useState } from 'react'
import { unidadeMedidaService } from '../../services/unidadeMedidaService'
import { tentarConverterFracao } from '../../utils/quantidade'
import type { InsumoRequest, InsumoResponse, NovoInsumoRequest, RegraPrecoReferencia, TipoExibicaoQuantidade } from '../../types/insumo'
import type { UnidadeMedidaResponse } from '../../types/unidadeMedida'

/** Número digitado (aceita fração e vírgula); texto inválido vale 0. */
export const num = (v: string) => {
  const fracao = tentarConverterFracao(v)
  if (fracao !== null) return fracao
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export interface ValoresIniciaisInsumo {
  nome?: string
  /** Custo (preço pago) e quantidade já preenchidos, ex.: vindos do item da nota. */
  precoCompra?: string
  qtdCompra?: string
  /** Sigla da unidade a pré-selecionar quando existir entre as unidades da conta (sem diferenciar maiúscula). */
  siglaUnidade?: string | null
}

/**
 * Estado e regras do formulário de insumo, compartilhados pela página de cadastro/edição e pela modal de
 * cadastro da conciliação da nota (#714, RN-NOVA-21): os mesmos campos, as mesmas validações e o mesmo
 * pedido ao backend. Não há regra de negócio aqui além do que a tela já tinha (custo = preço ÷ quantidade só
 * como prévia; o backend calcula e valida).
 */
export function useFormInsumo({ editando, inicial }: { editando: boolean; inicial?: ValoresIniciaisInsumo }) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [marca, setMarca] = useState('')
  const [qualquerMarca, setQualquerMarca] = useState(false)
  const [confirmarMarca, setConfirmarMarca] = useState(false)
  const [unidades, setUnidades] = useState<UnidadeMedidaResponse[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(true)
  const [erroUnidades, setErroUnidades] = useState('')
  const [unidadeMedidaId, setUnidadeMedidaId] = useState('')
  const [fracao, setFracao] = useState(false)
  const [tipoExibicao, setTipoExibicao] = useState<TipoExibicaoQuantidade>('DECIMAL')
  const [estoque, setEstoque] = useState('')
  const [minimo, setMinimo] = useState('')
  const [precoCompra, setPrecoCompra] = useState(inicial?.precoCompra ?? '')
  const [qtdCompra, setQtdCompra] = useState(inicial?.qtdCompra ?? '')
  const [precoTocado, setPrecoTocado] = useState(false)
  const [qtdTocado, setQtdTocado] = useState(false)
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(true)
  const [regraPreco, setRegraPreco] = useState<RegraPrecoReferencia>('MEDIA')
  const [custoUnitarioExistente, setCustoUnitarioExistente] = useState<number | null>(null)

  useEffect(() => {
    unidadeMedidaService.listar()
      .then(lista => {
        setUnidades(lista)
        if (editando || lista.length === 0) return
        // Cadastro novo: pré-seleciona a unidade da nota quando existe; senão a primeira cadastrada (#298).
        const daNota = inicial?.siglaUnidade
          ? lista.find(u => u.sigla.toLowerCase() === inicial.siglaUnidade!.trim().toLowerCase())
          : undefined
        setUnidadeMedidaId((daNota ?? lista[0]).id)
      })
      .catch(() => setErroUnidades('Não foi possível carregar as unidades de medida.'))
      .finally(() => setLoadingUnidades(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  const unidadeSelecionada = unidades.find(u => u.id === unidadeMedidaId)
  const siglaAtual = unidadeSelecionada?.sigla ?? ''

  const preco = num(precoCompra)
  const qComprada = num(qtdCompra)
  const pedeCompra = !editando
  // Em edição: usa o custo unitário existente da API; em cadastro: prévia pelo preço ÷ quantidade da compra inicial.
  const custoUnit = editando && custoUnitarioExistente !== null
    ? custoUnitarioExistente
    : (qComprada > 0 ? preco / qComprada : null)
  // #458 (V0.10.0) — sempre 2 casas com arredondamento matemático padrão.
  const custoFmt = custoUnit != null
    ? 'R$ ' + custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  // RN-NOVA-1 (V0.10.0, #442) — cadastro só calcula/exibe o custo unitário; não grava movimentação.
  const precoValido = preco > 0
  const qtdValida = qComprada > 0
  const precoErro = pedeCompra && precoTocado && !precoValido ? 'Custo do Insumo é obrigatório' : undefined
  const qtdErro = pedeCompra && qtdTocado && !qtdValida ? 'Quantidade é obrigatória' : undefined
  // Estoque já negativo não pode ter "permitir estoque negativo" desmarcado sem regularizar antes.
  const bloqueioEstoqueNegativo = editando && !permitirEstoqueNegativo && num(estoque) < 0
  const estoqueNegativoErro = bloqueioEstoqueNegativo
    ? 'Não é possível desmarcar "Permitir estoque negativo" pois este insumo está com estoque negativo. Regularize o estoque antes de desmarcar esta opção.'
    : undefined
  const podeSubmeter = !!unidadeMedidaId && !!nome.trim() && (pedeCompra ? (precoValido && qtdValida) : !bloqueioEstoqueNegativo)

  /** "Não validar marca": ligar com marca preenchida pede confirmação para apagá-la (CEN-NOVO-49). */
  const definirQualquerMarca = (ligar: boolean) => {
    if (!ligar) { setQualquerMarca(false); return }
    if (marca.trim()) { setConfirmarMarca(true); return }
    setMarca('')
    setQualquerMarca(true)
  }
  const confirmarApagarMarca = () => { setMarca(''); setQualquerMarca(true); setConfirmarMarca(false) }

  const tocarObrigatorios = () => { setPrecoTocado(true); setQtdTocado(true) }

  const carregar = (data: InsumoResponse) => {
    setNome(data.nome)
    setMarca(data.marca ?? '')
    setQualquerMarca(data.qualquerMarca ?? false)
    setUnidadeMedidaId(data.unidadeMedidaId ?? '')
    setFracao(data.fracionavel ?? true)
    setTipoExibicao(data.tipoExibicaoQuantidade ?? 'DECIMAL')
    setEstoque(data.estoqueAtual.toString())
    setMinimo(data.estoqueMinimo?.toString() ?? '')
    setCustoUnitarioExistente(data.custoUnitario)
    setPermitirEstoqueNegativo(data.permitirEstoqueNegativo)
    setRegraPreco(data.regraPrecoReferencia ?? 'MEDIA')
  }

  /** estoqueAtual não é enviado: o campo é somente leitura — o saldo só muda por baixa manual ou compra (RN-052/RN-056). */
  const pedidoEdicao = (): InsumoRequest => ({
    nome: nome.trim(),
    marca: marca.trim() || undefined,
    qualquerMarca,
    unidadeMedidaId,
    fracionavel: fracao,
    tipoExibicaoQuantidade: fracao ? tipoExibicao : undefined,
    estoqueMinimo: minimo ? num(minimo) : undefined,
    permitirEstoqueNegativo,
    regraPrecoReferencia: regraPreco,
  })

  const pedidoNovo = (): NovoInsumoRequest => ({
    ...pedidoEdicao(),
    precoTotalCompraInicial: preco,
    quantidadeCompradaInicial: qComprada,
  })

  return {
    editando, pedeCompra,
    nome, setNome, marca, setMarca, qualquerMarca, definirQualquerMarca, confirmarMarca, setConfirmarMarca, confirmarApagarMarca,
    unidades, loadingUnidades, erroUnidades, unidadeMedidaId, setUnidadeMedidaId, siglaAtual, unidadeSelecionada,
    fracao, setFracao, tipoExibicao, setTipoExibicao,
    estoque, setEstoque, minimo, setMinimo,
    precoCompra, setPrecoCompra, qtdCompra, setQtdCompra, setPrecoTocado, setQtdTocado,
    permitirEstoqueNegativo, setPermitirEstoqueNegativo, regraPreco, setRegraPreco,
    custoUnit, custoFmt, precoErro, qtdErro, estoqueNegativoErro, podeSubmeter, tocarObrigatorios,
    carregar, pedidoEdicao, pedidoNovo,
  }
}

export type FormInsumo = ReturnType<typeof useFormInsumo>
