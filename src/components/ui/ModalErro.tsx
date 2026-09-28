import { AlertTriangle } from 'lucide-react'
import ModalShell from './ModalShell'
import Button from './Button'
import type { ErroExplicado } from '../../utils/apiError'

// V0.15.0 (#602, RN-NOVA-32) — modal de erro padrão: o que aconteceu, por quê e como resolver, com um
// único botão OK. O campo com erro continua vermelho na tela; ao clicar OK, o foco volta para ele.

export default function ModalErro({ erro, onOk }: { erro: ErroExplicado; onOk: () => void }) {
  const itens = erro.itens?.length ? erro.itens : null
  return (
    <ModalShell open onClose={onOk} width={520} title={erro.titulo ?? 'Não foi possível continuar'}
      icon={<AlertTriangle size={17} />} iconBg="rgba(192,73,43,0.10)" iconColor="#C0492B"
      footer={<Button variant="primary" onClick={onOk} autoFocus>OK</Button>}>
      <div className="flex flex-col gap-3.5 text-[13.5px] leading-[1.55] text-body" data-testid="modal-erro">
        <section>
          <h3 className="m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">O que aconteceu</h3>
          {itens ? (
            <>
              <p className="m-0 mb-1.5">{itens.length > 1 ? 'Encontramos estes problemas:' : erro.mensagem}</p>
              {itens.length > 1 && (
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                  {itens.map(i => <li key={i}>{i}</li>)}
                </ul>
              )}
              {itens.length === 1 && erro.mensagem.indexOf(itens[0]) < 0 && <p className="m-0">{itens[0]}</p>}
            </>
          ) : <p className="m-0">{erro.mensagem}</p>}
        </section>
        {erro.motivo && (
          <section>
            <h3 className="m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">Por quê</h3>
            <p className="m-0">{erro.motivo}</p>
          </section>
        )}
        {erro.comoResolver && (
          <section className="rounded-input border border-teal/20 bg-teal/5 px-3.5 py-3">
            <h3 className="m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-teal">Como resolver</h3>
            <p className="m-0 text-dark">{erro.comoResolver}</p>
          </section>
        )}
      </div>
    </ModalShell>
  )
}
