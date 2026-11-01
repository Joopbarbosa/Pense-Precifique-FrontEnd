import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, AlertTriangle } from 'lucide-react'
import { Button, Spinner } from '../ui'
import ConfirmacaoModal from '../shared/ConfirmacaoModal'
import { whatsappService } from '../../services/whatsappService'
import { extractApiError } from '../../utils/apiError'
import type { EstadoWhatsapp, WhatsappStatus } from '../../types/whatsapp'

const ROTULO: Record<EstadoWhatsapp, string> = {
  NAO_CONECTADO: 'Não conectado',
  AGUARDANDO_QR: 'Aguardando leitura do QR',
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
}

/**
 * #1170 (V0.19.0, RN-NOVA-27/31/32) — aba "WhatsApp" de Configurações. Fica FORA do "salvar único":
 * conectar/desconectar são ações próprias. O aviso de risco exige confirmação ativa a cada conexão;
 * o QR vive só em memória (nunca persistido nem registrado).
 */
export default function AbaWhatsapp() {
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [entendi, setEntendi] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [conectando, setConectando] = useState(false)
  const [confirmaDesconectar, setConfirmaDesconectar] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const parar = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }

  const carregar = useCallback(async () => {
    try {
      setStatus(await whatsappService.status())
      setErro(null)
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível carregar o WhatsApp. Tente novamente.'))
    }
  }, [])

  useEffect(() => { carregar(); return parar }, [carregar])

  const aguardarLeitura = () => {
    parar()
    timer.current = setInterval(async () => {
      try {
        const r = await whatsappService.qr()
        if (r.estado === 'CONECTADO') { parar(); setQr(null); carregar() }
        else if (r.qrBase64) setQr(r.qrBase64)
      } catch { /* mantém o último QR; o usuário pode tentar de novo */ }
    }, 4000)
  }

  const conectar = async () => {
    setConectando(true); setErro(null)
    try {
      const r = await whatsappService.conectar(entendi)
      setQr(r.qrBase64)
      setEntendi(false)
      await carregar()
      if (r.estado !== 'CONECTADO') aguardarLeitura()
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível iniciar a conexão. Tente novamente.'))
    } finally { setConectando(false) }
  }

  const desconectar = async () => {
    setDesconectando(true)
    try {
      parar(); setQr(null)
      await whatsappService.desconectar()
      setConfirmaDesconectar(false)
      await carregar()
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível desconectar. Tente novamente.'))
    } finally { setDesconectando(false) }
  }

  if (!status && !erro) return <div className="flex justify-center py-10"><Spinner /></div>

  const conectado = status?.estado === 'CONECTADO'

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4" data-testid="aba-whatsapp">
      <div className="flex items-center gap-2.5">
        <MessageCircle size={20} className="text-teal" />
        <h2 className="m-0 text-[17px] font-bold text-dark">WhatsApp</h2>
        {status?.habilitado && (
          <span className="rounded-full bg-[#EDECEA] px-3 py-1 text-[12.5px] font-semibold text-body" data-testid="estado-whatsapp">
            {ROTULO[status.estado]}
          </span>
        )}
      </div>

      {erro && <div role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-[13.5px] text-[#B3261E]">{erro}</div>}

      {status && !status.habilitado && (
        <p className="m-0 rounded-lg bg-[#F5F4F1] px-4 py-3 text-[14px] text-body" data-testid="whatsapp-indisponivel">
          O envio por WhatsApp ainda não está disponível neste ambiente.
        </p>
      )}

      {status?.habilitado && (
        <>
          {status.estado === 'DESCONECTADO' && (
            <p className="m-0 text-[13.5px] text-muted">A conexão caiu. Conecte de novo para voltar a enviar.</p>
          )}

          {!conectado && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#F0C36D] bg-[#FFF8E7] p-4" data-testid="aviso-risco">
              <div className="flex items-center gap-2 font-bold text-dark"><AlertTriangle size={17} /> Antes de conectar seu WhatsApp</div>
              <p className="m-0 text-[13.5px] text-body">
                O Pense &amp; Precifique envia seus PDFs usando uma conexão <strong>não oficial</strong> com o WhatsApp (Evolution API).
                Ela serve para enviar orçamentos e recibos a clientes que pediram, um de cada vez, mas{' '}
                <strong>o WhatsApp não autoriza esse tipo de conexão</strong>. O número pode ser <strong>limitado ou bloqueado</strong>,
                e não se sabe com que frequência isso acontece.
              </p>
              <p className="m-0 text-[13.5px] text-body">
                Para reduzir o risco: envie só para quem aceitou receber pelo WhatsApp, respeite quem pedir para parar,
                não faça envios em massa e evite mensagens com cara de propaganda.
              </p>
              <p className="m-0 text-[13.5px] text-body">
                Recomendamos usar um número que você possa ficar sem por um tempo, ou ter outro número de reserva.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-dark">
                <input type="checkbox" checked={entendi} onChange={e => setEntendi(e.target.checked)} data-testid="entendi-riscos" />
                Entendi os riscos e quero continuar.
              </label>
              <div>
                <Button variant="primary" onClick={conectar} disabled={!entendi || conectando}>
                  {conectando ? 'Conectando…' : 'Conectar WhatsApp'}
                </Button>
              </div>
            </div>
          )}

          {qr && !conectado && (
            <div className="flex flex-col items-center gap-2" data-testid="qr-whatsapp">
              <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR para conectar o WhatsApp" className="h-56 w-56" />
              <p className="m-0 text-center text-[13.5px] text-muted">
                No celular: WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho, e leia este código.
              </p>
            </div>
          )}

          {conectado && (
            <div>
              <Button variant="danger" onClick={() => setConfirmaDesconectar(true)}>Desconectar</Button>
            </div>
          )}
        </>
      )}

      <ConfirmacaoModal
        open={confirmaDesconectar}
        onClose={() => setConfirmaDesconectar(false)}
        onConfirm={desconectar}
        title="Desconectar o WhatsApp?"
        description="Você não poderá enviar PDFs até conectar de novo."
        confirmLabel="Desconectar"
        confirmingLabel="Desconectando…"
        confirming={desconectando}
        variant="danger"
      />
    </div>
  )
}
