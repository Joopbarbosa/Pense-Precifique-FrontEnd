import { useCallback, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ModalBaixa from '../../components/financeiro/ModalBaixa'
import LinhaVencimento from '../../components/financeiro/LinhaVencimento'
import { financeiroService } from '../../services/financeiroService'
import { extractApiError } from '../../utils/apiError'
import { MENSAGEM_SEM_VENCIMENTOS } from '../../utils/financeiro'
import type { ListaVencimentos, ParcelaFinanceira } from '../../types/financeiro'

/** PP-524 (RN-NOVA-21) — «Ver todas»: vencidas e próximos 7 dias, a pagar e a receber juntos, na mesma ordem do resumo. */
export default function VencimentosFinanceirosPage() {
  const [pagina, setPagina] = useState(0)
  const [lista, setLista] = useState<ListaVencimentos | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [baixando, setBaixando] = useState<ParcelaFinanceira | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setLista(await financeiroService.listarVencimentos(pagina, 50))
      setErro(null)
    } catch (e) {
      setErro(extractApiError(e, 'Não foi possível carregar os vencimentos.'))
    } finally {
      setCarregando(false)
    }
  }, [pagina])

  useEffect(() => { void carregar() }, [carregar])

  const totalPaginas = lista ? Math.max(1, Math.ceil(lista.total / Math.max(1, lista.tamanhoPagina))) : 1

  return (
    <AppLayout active="financeiro">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-dark">Próximos vencimentos</h1>
        <Link to="/financeiro" className="text-[14px] font-semibold text-teal no-underline hover:underline">Voltar ao Financeiro</Link>
      </div>
      {carregando && !lista && <div className="flex justify-center py-12"><Spinner /></div>}
      {erro && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-input border border-danger-line bg-danger-bg px-4 py-3 text-[14px] text-danger-deep">
          {erro}
          <Button variant="secondary" size="sm" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      )}
      {!erro && lista && lista.itens.length === 0 && <EmptyState icon={<Wallet size={28} />} title={MENSAGEM_SEM_VENCIMENTOS} compact />}
      {!erro && lista && lista.itens.length > 0 && (
        <>
          <p className="mb-3 mt-0 text-[13px] text-muted" data-testid="total-vencimentos">{lista.total} {lista.total === 1 ? 'vencimento' : 'vencimentos'}: vencidas e os próximos 7 dias.</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Vencimentos">
            {lista.itens.map(p => <LinhaVencimento key={p.id} parcela={p} onBaixar={setBaixando} />)}
          </ul>
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center gap-3">
              <Button variant="secondary" size="sm" disabled={pagina === 0} onClick={() => setPagina(p => Math.max(0, p - 1))}>Anterior</Button>
              <span className="text-[13px] text-muted">Página {pagina + 1} de {totalPaginas}</span>
              <Button variant="secondary" size="sm" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </>
      )}
      <ModalBaixa parcela={baixando} onClose={() => setBaixando(null)} onBaixada={() => { setBaixando(null); void carregar() }} />
    </AppLayout>
  )
}
