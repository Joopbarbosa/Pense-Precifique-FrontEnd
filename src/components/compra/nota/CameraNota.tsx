import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button, ModalShell } from '../../ui'

// O jsQR acerta ou erra conforme a escala em que o QR chega (a mesma foto lê em uma e falha em outra). A câmera
// lê um quadro a cada 200 ms, então cada quadro usa uma escala diferente, sem custo extra por quadro (#704).
const LADOS = [1280, 960, 640]

const MSG_PERMISSAO = 'Não foi possível abrir a câmera. Permita o acesso no navegador e tente novamente, ou envie um print do QR code.'
const MSG_LEITURA = 'Não foi possível iniciar a leitura do QR code. Recarregue a página e tente de novo, ou envie um print do QR code.'
const MSG_QR_INVALIDO = 'Esse QR code não é o link de uma nota fiscal. Aponte a câmera para o QR code do cupom.'

type Etapa = 'camera' | 'leitura'

/**
 * Leitura local de QR; câmera e biblioteca só existem enquanto esta modal estiver aberta. `valido` recusa QR que
 * não é o que a tela espera (ex.: link de nota) e a câmera segue lendo (#729).
 */
export default function CameraNota({ onQr, onClose, valido = () => true }: {
  onQr: (texto: string) => void
  onClose: () => void
  valido?: (texto: string) => boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  const aoLer = useRef(onQr)
  const qrValido = useRef(valido)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    aoLer.current = onQr
    qrValido.current = valido
  }, [onQr, valido])

  useEffect(() => {
    let ativa = true
    let stream: MediaStream | undefined
    let frame = 0
    let ultimo = 0
    let tentativa = 0
    let etapa: Etapa = 'camera'
    const liberar = () => {
      stream?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(frame)
    }
    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera indisponível')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        etapa = 'leitura'
        if (!ativa) { liberar(); return }
        const elemento = video.current
        if (!elemento) { liberar(); return }
        elemento.srcObject = stream
        await elemento.play()
        const { default: decodificar } = await import('jsqr')
        if (!ativa) { liberar(); return }
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Canvas indisponível')
        const ler = (agora: number) => {
          if (!ativa) return
          if (agora - ultimo >= 200 && elemento.readyState >= 2 && elemento.videoWidth) {
            ultimo = agora
            const escala = Math.min(1, LADOS[tentativa++ % LADOS.length]! / elemento.videoWidth)
            canvas.width = Math.max(1, Math.round(elemento.videoWidth * escala))
            canvas.height = Math.max(1, Math.round(elemento.videoHeight * escala))
            ctx.drawImage(elemento, 0, 0, canvas.width, canvas.height)
            const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const qr = decodificar(imagem.data, imagem.width, imagem.height, { inversionAttempts: 'attemptBoth' })
            if (qr?.data) {
              if (qrValido.current(qr.data)) {
                ativa = false
                liberar()
                aoLer.current(qr.data)
                return
              }
              setAviso(MSG_QR_INVALIDO)
            }
          }
          frame = requestAnimationFrame(ler)
        }
        frame = requestAnimationFrame(ler)
      } catch {
        liberar()
        if (ativa) setErro(etapa === 'camera' ? MSG_PERMISSAO : MSG_LEITURA)
      }
    }
    void iniciar()
    return () => { ativa = false; liberar() }
  }, [])

  return (
    <ModalShell open title="Ler QR code pela câmera" icon={<Camera size={18} />} onClose={onClose} width={620}
      footer={<Button variant="ghost" onClick={onClose}>Fechar câmera</Button>} closeLabel="Fechar janela da câmera">
      <div className="flex flex-col gap-3 p-5" data-testid="camera-nota">
        {erro
          ? <p role="alert" className="text-sm text-danger">{erro}</p>
          : <p className="text-sm text-muted">Aponte a câmera para o QR code do cupom. A leitura acontece no seu navegador.</p>}
        {aviso && !erro && <p role="status" data-testid="camera-nota-aviso" className="text-sm text-danger">{aviso}</p>}
        <video ref={video} muted playsInline className="max-h-[55vh] w-full rounded-input bg-black" aria-label="Imagem da câmera" />
      </div>
    </ModalShell>
  )
}
