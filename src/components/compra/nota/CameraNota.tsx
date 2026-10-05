import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button, ModalShell } from '../../ui'

/** Leitura local de QR; câmera e biblioteca só existem enquanto esta modal estiver aberta. */
export default function CameraNota({ onQr, onClose }: { onQr: (texto: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const aoLer = useRef(onQr); aoLer.current = onQr
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let ativa = true; let stream: MediaStream | undefined; let frame = 0; let ultimo = 0
    const liberar = () => { stream?.getTracks().forEach(t => t.stop()); cancelAnimationFrame(frame) }
    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera indisponível')
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
        if (!ativa) { liberar(); return }
        const elemento = video.current; if (!elemento) { liberar(); return }
        elemento.srcObject = stream; await elemento.play()
        const { default: decodificar } = await import('jsqr')
        if (!ativa) { liberar(); return }
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Câmera indisponível')
        const ler = (agora: number) => {
          if (!ativa) return
          if (agora - ultimo >= 200 && elemento.readyState >= 2 && elemento.videoWidth) {
            ultimo = agora; const escala = Math.min(1, 1280 / elemento.videoWidth)
            canvas.width = Math.max(1, Math.round(elemento.videoWidth * escala)); canvas.height = Math.max(1, Math.round(elemento.videoHeight * escala))
            ctx.drawImage(elemento, 0, 0, canvas.width, canvas.height)
            const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const qr = decodificar(imagem.data, imagem.width, imagem.height, { inversionAttempts: 'attemptBoth' })
            if (qr?.data) { ativa = false; liberar(); aoLer.current(qr.data); return }
          }
          frame = requestAnimationFrame(ler)
        }
        frame = requestAnimationFrame(ler)
      } catch {
        liberar(); if (ativa) setErro('Não foi possível abrir a câmera. Permita o acesso no navegador e tente novamente, ou envie um print do QR code.')
      }
    }
    void iniciar()
    return () => { ativa = false; liberar() }
  }, [])
  return <ModalShell open title="Ler QR code pela câmera" icon={<Camera size={18} />} onClose={onClose} width={620}
    footer={<Button variant="ghost" onClick={onClose}>Fechar câmera</Button>} closeLabel="Fechar janela da câmera">
    <div className="flex flex-col gap-3 p-5" data-testid="camera-nota">
      {erro ? <p role="alert" className="text-sm text-danger">{erro}</p> : <p className="text-sm text-muted">Aponte a câmera para o QR code do cupom. A leitura acontece no seu navegador.</p>}
      <video ref={video} muted playsInline className="max-h-[55vh] w-full rounded-input bg-black" aria-label="Imagem da câmera" />
    </div>
  </ModalShell>
}
