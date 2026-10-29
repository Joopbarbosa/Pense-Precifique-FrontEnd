import { useEffect, useState } from 'react'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import { Spinner } from '../ui'
import { Layers, AlertTriangle } from 'lucide-react'
import { producaoService } from '../../services/producaoService'
import { extractApiError } from '../../utils/apiError'
import { formatarData } from '../../utils/data'
import type { CandidataJuntar, JuntarProducoesResponse } from '../../types/producao'

// RN-NOVA-42 (V0.18.0, #1169) — "Juntar com outra produção": lista as produções do mesmo produto,
// Aguardando início, de outros pedidos. A data é editável e só AVISA (nunca bloqueia) quando passa do
// prazo de algum pedido; o aviso vem na resposta e aparece depois de juntar.

interface Props {
  producaoId: string
  identificador: string
  onClose: () => void
  onJuntado: (resposta: JuntarProducoesResponse) => void
}

const inputClasse = 'h-11 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-sm text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/12'

export default function JuntarProducaoModal({ producaoId, identificador, onClose, onJuntado }: Props) {
  const [candidatas, setCandidatas] = useState<CandidataJuntar[] | null>(null)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataTerminoPrevista, setDataTerminoPrevista] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resposta, setResposta] = useState<JuntarProducoesResponse | null>(null)

  useEffect(() => {
    producaoService.candidatasJuntar(producaoId)
      .then(setCandidatas)
      .catch(err => { setCandidatas([]); setErro(extractApiError(err, 'Não foi possível carregar as produções.')) })
  }, [producaoId])

  const juntar = async () => {
    if (!escolhida) return
    setSalvando(true)
    setErro(null)
    try {
      const r = await producaoService.juntar(producaoId, {
        producaoOutraId: escolhida,
        ...(dataInicio ? { dataInicio } : {}),
        ...(dataTerminoPrevista ? { dataTerminoPrevista } : {}),
      })
      setResposta(r)
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível juntar as produções.'))
    } finally {
      setSalvando(false)
    }
  }

  if (resposta) {
    return (
      <ModalShell
        open
        onClose={() => onJuntado(resposta)}
        title={`Lote ${resposta.producaoNova.identificador} criado`}
        icon={<Layers size={18} />}
        footer={<Button variant="primary" onClick={() => onJuntado(resposta)}>Entendi</Button>}
      >
        <p className="m-0 text-[13.5px] leading-[1.6] text-body">
          {identificador} foi juntada em um lote. As produções originais ficam como Não realizada.
        </p>
        {resposta.avisos.length > 0 && (
          <div data-testid="avisos-juntar" className="mt-3 flex flex-col gap-2">
            {resposta.avisos.map(a => (
              <div key={a} className="flex items-start gap-2.5 rounded-input border border-orange/40 bg-orange/10 px-3.5 py-3 text-[13px] leading-normal text-body">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    )
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Juntar com outra produção"
      subtitle={`Produção ${identificador}`}
      icon={<Layers size={18} />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!escolhida || salvando} onClick={juntar}>
            {salvando ? 'Juntando...' : 'Juntar produções'}
          </Button>
        </>
      }
    >
      {candidatas === null ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : candidatas.length === 0 ? (
        <p data-testid="sem-candidatas" className="m-0 text-[13.5px] text-muted">
          Nenhuma outra produção do mesmo produto, aguardando início, de outro pedido.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Produções para juntar">
            {candidatas.map(c => (
              <label
                key={c.id}
                data-testid="candidata-juntar"
                className="flex cursor-pointer items-start gap-3 rounded-input border border-line bg-white px-3.5 py-3"
              >
                <input type="radio" name="candidata" checked={escolhida === c.id} onChange={() => setEscolhida(c.id)} className="mt-1" />
                <span className="min-w-0 text-[13px] text-body">
                  <strong className="text-dark">{c.identificador}</strong> · {c.orcamentos.join(', ')}
                  <span className="block text-muted">
                    {c.produtos.map(p => `${p.nomeProduto} × ${Number(p.quantidade)}`).join(', ')} · Término previsto:{' '}
                    {c.dataTerminoPrevista ? formatarData(c.dataTerminoPrevista) : 'a definir'}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="block flex-1">
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Data de início</span>
              <input type="date" aria-label="Data de início do lote" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClasse} />
            </label>
            <label className="block flex-1">
              <span className="mb-[7px] block text-[13px] font-semibold text-body">Término previsto</span>
              <input type="date" aria-label="Término previsto do lote" value={dataTerminoPrevista} onChange={e => setDataTerminoPrevista(e.target.value)} className={inputClasse} />
            </label>
          </div>
          <span className="text-[12px] text-muted">Vazio herda a data da produção mais recente. A data só avisa quando passa do prazo de algum pedido.</span>
        </div>
      )}
      {erro && <div className="mt-3 text-[13px] text-danger">{erro}</div>}
    </ModalShell>
  )
}
