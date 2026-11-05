import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Toast from '../../components/shared/Toast'
import { useToast } from '../../hooks/useToast'
import { financeiroService } from '../../services/financeiroService'
import { extractApiError } from '../../utils/apiError'
import { mensagemNomeCategoria } from '../../utils/financeiro'
import type { CategoriaFinanceira } from '../../types/financeiro'

const CAMPO = 'h-[42px] rounded-input border-[1.5px] border-line bg-white px-3 font-[inherit] text-[15px] text-dark outline-hidden focus:border-teal'

/**
 * V0.19.0 (PP-525, F6, RN-NOVA-23) — categorias de despesa. As padrão (semeadas) são fixas; as criadas pela usuária podem
 * ser renomeadas e inativadas (nunca excluídas). A unicidade do nome e as demais regras são decididas pela API.
 */
export default function CategoriasFinanceirasPage() {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [inativas, setInativas] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [erroNovo, setErroNovo] = useState<string | null>(null)
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const { toast, setToast } = useToast()

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setCategorias(await financeiroService.listarCategorias(inativas))
      setErro(null)
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível carregar as categorias.'))
    } finally {
      setCarregando(false)
    }
  }, [inativas])

  useEffect(() => { void carregar() }, [carregar])

  async function criar() {
    const msg = mensagemNomeCategoria(novoNome)
    if (msg) { setErroNovo(msg); return }
    setSalvando(true); setErroNovo(null)
    try {
      await financeiroService.criarCategoria(novoNome.trim())
      setNovoNome(''); setToast('Categoria criada.')
      await carregar()
    } catch (e) {
      setErroNovo(extractApiError(e, 'Não foi possível criar a categoria.'))
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao() {
    if (!editando) return
    const msg = mensagemNomeCategoria(editando.nome)
    if (msg) { setErroEdicao(msg); return }
    setSalvando(true); setErroEdicao(null)
    try {
      await financeiroService.renomearCategoria(editando.id, editando.nome.trim())
      setEditando(null); setToast('Categoria renomeada.')
      await carregar()
    } catch (e) {
      setErroEdicao(extractApiError(e, 'Não foi possível renomear a categoria.'))
    } finally {
      setSalvando(false)
    }
  }

  async function alternar(c: CategoriaFinanceira) {
    setSalvando(true)
    try {
      if (c.ativa) await financeiroService.inativarCategoria(c.id)
      else await financeiroService.reativarCategoria(c.id)
      setToast(c.ativa ? 'Categoria inativada.' : 'Categoria reativada.')
      await carregar()
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível alterar a categoria.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppLayout active="financeiro">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-dark">Categorias de despesa</h1>
        <Link to="/financeiro" className="text-[14px] font-semibold text-teal no-underline hover:underline">Voltar ao financeiro</Link>
      </div>
      <p className="mb-4 mt-0 max-w-[640px] text-[13.5px] text-muted">
        Toda despesa tem uma categoria. As categorias padrão não podem ser renomeadas nem excluídas; as que você criar podem ser renomeadas ou inativadas.
      </p>

      <form className="mb-4 flex flex-wrap items-start gap-2" onSubmit={e => { e.preventDefault(); void criar() }}>
        <div className="flex flex-col gap-1">
          <input aria-label="Nome da nova categoria" placeholder="Nova categoria" value={novoNome} maxLength={40}
            onChange={e => { setNovoNome(e.target.value); setErroNovo(null) }} className={clsx(CAMPO, 'w-[260px]')} data-testid="nome-nova-categoria" />
          {erroNovo && <span role="alert" className="text-[13px] font-medium text-danger" data-testid="erro-nova-categoria">{erroNovo}</span>}
        </div>
        <Button type="submit" disabled={salvando} data-testid="criar-categoria">Adicionar</Button>
      </form>

      <label className="mb-4 flex items-center gap-2 text-[13.5px] text-body">
        <input type="checkbox" checked={inativas} onChange={e => setInativas(e.target.checked)} data-testid="mostrar-inativas" />
        Mostrar categorias inativas
      </label>

      {carregando && categorias.length === 0 && <div className="flex justify-center py-12"><Spinner /></div>}
      {erro && (
        <div role="alert" className="mb-3 flex flex-col items-start gap-3 rounded-input border border-danger-line bg-danger-bg px-4 py-3 text-[14px] text-danger-deep">
          {erro}
          <Button variant="secondary" size="sm" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Categorias de despesa">
        {categorias.map(c => (
          <li key={c.id} data-testid="categoria-financeira" data-ativa={c.ativa} data-semeada={c.semeada}
            className={clsx('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-input border border-line px-4 py-3', c.ativa ? 'bg-white' : 'bg-gray-50')}>
            {editando?.id === c.id ? (
              <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                <input aria-label="Novo nome da categoria" value={editando.nome} maxLength={40} autoFocus
                  onChange={e => { setEditando({ id: c.id, nome: e.target.value }); setErroEdicao(null) }} className={CAMPO} data-testid="nome-edicao" />
                {erroEdicao && <span role="alert" className="text-[13px] font-medium text-danger" data-testid="erro-edicao">{erroEdicao}</span>}
              </div>
            ) : (
              <div className="min-w-[200px] flex-1 text-[15px] font-semibold text-dark">
                {c.nome}
                {c.semeada && <span className="ml-2 text-[12.5px] font-medium text-muted">padrão</span>}
                {!c.ativa && <span className="ml-2 text-[12.5px] font-medium text-muted">inativa</span>}
              </div>
            )}
            {!c.semeada && (editando?.id === c.id ? (
              <>
                <Button size="sm" onClick={() => void salvarEdicao()} disabled={salvando} data-testid="salvar-edicao">Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditando(null); setErroEdicao(null) }}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditando({ id: c.id, nome: c.nome }); setErroEdicao(null) }}>Renomear</Button>
                <Button size="sm" variant="ghost" onClick={() => void alternar(c)} disabled={salvando}>{c.ativa ? 'Inativar' : 'Reativar'}</Button>
              </>
            ))}
          </li>
        ))}
      </ul>
      <Toast message={toast} />
    </AppLayout>
  )
}
