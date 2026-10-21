import { Save } from 'lucide-react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import type { AbaEdicao, ItemPendente } from '../../hooks/useEdicaoConfiguracoes'

// V0.17.0 (#983, RN-NOVA-28) — lista, por aba, cada campo alterado com o valor anterior e o novo.
const TITULO_ABA: Record<AbaEdicao, string> = {
  precificacao: 'Precificação',
  perfil: 'Perfil da empresa',
  pagamento: 'Métodos de pagamento',
}

export default function ModalAlteracoesNaoSalvas({ itens, salvando, onSalvarESair, onSairSemSalvar, onContinuar }: {
  itens: Record<AbaEdicao, ItemPendente[]>
  salvando: boolean
  onSalvarESair: () => void
  onSairSemSalvar: () => void
  onContinuar: () => void
}) {
  const abas = (Object.keys(TITULO_ABA) as AbaEdicao[]).filter(a => itens[a].length > 0)
  return (
    <ModalShell
      open
      onClose={salvando ? () => {} : onContinuar}
      width={560}
      title="Alterações não salvas"
      subtitle="Você alterou estes campos e ainda não salvou."
      icon={<Save size={17} />}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onContinuar} disabled={salvando}>Continuar editando</Button>
          <Button variant="ghost" onClick={onSairSemSalvar} disabled={salvando}>Sair sem salvar</Button>
          <Button variant="primary" onClick={onSalvarESair} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e sair'}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4" data-testid="lista-alteracoes">
        {abas.map(aba => (
          <section key={aba}>
            <h3 className="m-0 mb-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">{TITULO_ABA[aba]}</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px] text-body">
              {itens[aba].flatMap(item => item.alteracoes.map(a => (
                <li key={`${item.chave}-${a.campo}`}>
                  <strong className="font-semibold text-dark">{item.sufixo ? `${item.sufixo} — ` : ''}{a.campo}</strong>
                  {': '}{a.antes} → {a.depois}
                </li>
              )))}
            </ul>
          </section>
        ))}
      </div>
    </ModalShell>
  )
}
