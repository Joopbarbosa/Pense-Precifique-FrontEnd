import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { Search, Check } from 'lucide-react'
import { produtoService } from '../../services/produtoService'
import { EstoqueTags } from '../ui/Badge'
import type { CustomizacaoLinha } from './types'
import { BRL } from './formato'

interface CustomizacaoDisponivel {
  id: string
  nome: string
  valor: number
  permitirEstoqueNegativo: boolean
  estoqueAtual: number
  fracionavel: boolean
}

/**
 * Núcleo de "anexar customizações com quantidade" — busca, seleção múltipla e quantidade por
 * customização. **Sem opinião sobre o invólucro**: quem usa decide se coloca dentro de
 * `ModalCustomizacoes` (Orçamento e Caixa) ou embutido direto na página (cadastro de item de
 * Catálogo). Extraído na V0.12.0 depois de o mesmo conceito aparecer implementado três vezes,
 * de três formas diferentes, em três telas.
 *
 * O estado da seleção vive em quem chama — aqui só entram os eventos.
 */
export default function CustomizacaoSeletor({ selecionadas, onToggle, onQtd, mostrarTotal = true }: {
  selecionadas: CustomizacaoLinha[]
  onToggle: (c: { id: string; nome: string; valor: number }) => void
  onQtd: (id: string, qtd: number) => void
  mostrarTotal?: boolean
}) {
  const [busca, setBusca] = useState('')
  const [customizacoes, setCustomizacoes] = useState<CustomizacaoDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    setLoading(true)
    setErro(false)
    // OpenProject #529 — sem o filtro ativo=true, customização inativada por qualquer teardown de
    // teste (padrão: inativar, nunca excluir) continuava aparecendo aqui.
    produtoService.listar(0, 100, 'CUSTOMIZACAO', undefined, undefined, true)
      .then(data => {
        setCustomizacoes(data.content.map(p => ({
          id: p.id,
          nome: p.nome,
          valor: p.precoVenda ?? 0,
          permitirEstoqueNegativo: p.permitirEstoqueNegativo,
          estoqueAtual: p.estoqueAtual,
          // RN-NOVA-7 (V0.10.0, #461) — ProdutoResponse já traz fracionavel real (RN-NOVA-2/#299).
          fracionavel: p.fracionavel ?? true,
        })))
      })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

  const filtradas = customizacoes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )
  const extraTotal = selecionadas.reduce((s, c) => s + c.valor * c.qtd, 0)

  return (
    <>
      {/* Campo de busca */}
      <div className="relative mb-3.5">
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted">
          <Search size={16} />
        </span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar customização..."
          className="h-[42px] w-full rounded-input border-[1.5px] border-line bg-white pl-9 pr-3.5 font-[inherit] text-sm text-dark outline-none transition-colors duration-150 focus:border-teal"
        />
      </div>

      {/* Lista de customizações — RN-NOVA-7: até 8 itens visíveis por vez, resto via rolagem.
          Altura calibrada para a linha de 72px + gap-2 (8px), medida via Playwright: 8*72 + 7*8 = 632px.
          `flex-shrink-0` em cada linha é obrigatório: sem ele, um flex-col com max-height/overflow-y-auto
          encolhe os itens para caber em vez de habilitar rolagem (gotcha clássico de flexbox). */}
      <div className="flex max-h-[632px] flex-col gap-2 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">
            Carregando customizações...
          </div>
        ) : erro ? (
          <div className="p-6 text-center text-sm text-danger">
            Falha ao carregar customizações. Tente novamente.
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            {busca ? 'Nenhuma customização encontrada.' : 'Nenhuma customização cadastrada.'}
          </div>
        ) : filtradas.map(c => {
          const sel = selecionadas.find(x => x.id === c.id)
          const on = !!sel

          return (
            <div key={c.id} className={clsx(
              'flex-shrink-0 overflow-hidden rounded-[11px] border-[1.5px] transition-all duration-150',
              on ? 'border-orange/40 bg-orange/[0.07]' : 'border-line bg-cream'
            )}>
              {/* Linha principal */}
              <button
                onClick={() => onToggle({ id: c.id, nome: c.nome, valor: c.valor })}
                className="flex w-full items-center justify-between border-none bg-transparent px-3.5 py-3 font-[inherit]"
              >
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    'grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md border-2 transition-all duration-150',
                    on ? 'border-orange bg-orange' : 'border-[#D4D0C8] bg-transparent'
                  )}>
                    {on && <Check width={12} height={12} stroke="#fff" strokeWidth={3} />}
                  </span>
                  <div>
                    <span className="text-[14.5px] font-semibold text-dark">{c.nome}</span>
                    <EstoqueTags
                      className="mt-1"
                      fracionavel={c.fracionavel}
                      permitirEstoqueNegativo={c.permitirEstoqueNegativo}
                      estoqueAtual={c.estoqueAtual}
                      variant="busca"
                    />
                  </div>
                </div>
                <span className={clsx('text-sm font-semibold', on ? 'text-orange' : 'text-dim')}>
                  +{BRL(c.valor)}/un
                </span>
              </button>

              {/* Linha de quantidade */}
              {on && (
                <div className="flex animate-[fadeUp_.2s_ease_both] items-center justify-between gap-3 px-3.5 pb-3">
                  <span className="text-[13px] text-muted">Quantidade</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-line">
                    <button onClick={() => onQtd(c.id, (sel?.qtd ?? 1) - 1)} className="grid h-[34px] w-8 place-items-center border-none bg-cream text-base text-body">−</button>
                    <span className="w-9 border-x border-line text-center text-sm font-bold leading-[34px] text-dark">
                      {sel?.qtd ?? 1}
                    </span>
                    <button onClick={() => onQtd(c.id, (sel?.qtd ?? 1) + 1)} className="grid h-[34px] w-8 place-items-center border-none bg-cream text-base text-teal">+</button>
                  </div>
                  <span className="min-w-[72px] text-right text-[13.5px] font-semibold text-orange">
                    = {BRL(c.valor * (sel?.qtd ?? 1))}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rodapé de totais */}
      {mostrarTotal && selecionadas.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-input border border-orange/20 bg-orange/[0.08] px-[15px] py-3">
          <span className="text-[13.5px] font-semibold text-warning-alt">
            {selecionadas.length} customização{selecionadas.length > 1 ? 'ões' : ''} selecionada{selecionadas.length > 1 ? 's' : ''}
          </span>
          <span className="text-[15px] font-bold text-orange">+{BRL(extraTotal)}</span>
        </div>
      )}
    </>
  )
}
