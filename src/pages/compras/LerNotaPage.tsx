import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, FileSearch } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, SegmentedControl, Spinner } from '../../components/ui'
import ModalConciliacaoNota from '../../components/compra/nota/ModalConciliacaoNota'
import ModalNotaJaRegistrada from '../../components/compra/nota/ModalNotaJaRegistrada'
import ConfirmacaoModal from '../../components/shared/ConfirmacaoModal'
import { prepararArquivoNota } from '../../components/compra/nota/prepararArquivoNota'
const CameraNota = lazy(() => import('../../components/compra/nota/CameraNota'))
import { notaCompraService, type EntradaLeituraNota } from '../../services/notaCompraService'
import { useModalErro } from '../../hooks/useModalErro'
import { extrairErroExplicado } from '../../utils/apiError'
import type { ModeloNota, NotaLeituraResponse } from '../../types/compraNota'

/**
 * #681 (V0.16.0, UC-NOVO-1, RN-NOVA-14) — entrada da compra por nota: link do QR code ou chave de acesso
 * (NFC-e) e arquivo XML (NF-e), que não passam por IA e não pedem aviso. Câmera, foto, print e PDF entram
 * aqui pela #682. A leitura abre a modal de conciliação; nota em rascunho abre o rascunho existente e nota
 * já confirmada ou cancelada mostra o aviso com o link da compra (RN-NOVA-5). Textos são rascunho.
 */
const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-hidden focus:border-teal focus:ring-4 focus:ring-teal/focus'

const MODELOS = [
  { value: 'NFCE' as ModeloNota, label: 'Cupom (NFC-e)' },
  { value: 'NFE' as ModeloNota, label: 'Nota (NF-e)' },
]

const ehLink = (texto: string) => /^https?:\/\//i.test(texto.trim())

export default function LerNotaPage() {
  const navigate = useNavigate()
  const [modelo, setModelo] = useState<ModeloNota>('NFCE')
  const [texto, setTexto] = useState('')
  const [xml, setXml] = useState<File | null>(null)
  const [camera, setCamera] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [avisoEnvio, setAvisoEnvio] = useState<EntradaLeituraNota | null>(null)
  const preparoAtual = useRef(0)
  useEffect(() => () => { preparoAtual.current++ }, [])
  const [lendo, setLendo] = useState(false)
  const [leitura, setLeitura] = useState<NotaLeituraResponse | null>(null)
  const [entrada, setEntrada] = useState<EntradaLeituraNota | null>(null)
  const [jaRegistrada, setJaRegistrada] = useState<{ identificador: string; mensagem: string } | null>(null)
  const { modalErro, mostrarErro } = useModalErro()

  const montarEntrada = (): EntradaLeituraNota => {
    if (xml) return { modelo, arquivo: xml }
    const valor = texto.trim()
    return ehLink(valor) ? { modelo, qrUrl: valor } : { modelo, chaveAcesso: valor.replace(/\s/g, '') }
  }

  const escolherArquivo = async (arquivo: File | null) => {
    const id = ++preparoAtual.current
    setXml(null)
    setPreparando(Boolean(arquivo))
    if (!arquivo) return
    try {
      const pronto = await prepararArquivoNota(arquivo)
      if (id === preparoAtual.current) setXml(pronto)
    } catch (e) {
      if (id === preparoAtual.current) {
        mostrarErro({
          titulo: 'Arquivo não pode ser enviado',
          mensagem: e instanceof Error ? e.message : 'Não foi possível preparar o arquivo.',
          motivo: 'O arquivo precisa ter um formato aceito e caber no limite de upload.',
          comoResolver: 'Escolha XML, PDF, JPG ou PNG; tente uma foto mais nítida ou um arquivo menor.',
        })
      }
    } finally {
      if (id === preparoAtual.current) setPreparando(false)
    }
  }

  const selecionarArquivo = (campo: HTMLInputElement) => {
    const arquivo = campo.files?.[0] ?? null
    campo.value = ''
    void escolherArquivo(arquivo)
  }

  const removerArquivo = () => {
    preparoAtual.current++
    setXml(null)
  }

  const ler = async (pedido: EntradaLeituraNota = montarEntrada()) => {
    if (pedido.arquivo && !['application/xml', 'text/xml'].includes(pedido.arquivo.type) && !pedido.confirmouEnvioIa) {
      setAvisoEnvio(pedido); return
    }
    setLendo(true)
    try {
      const r = await notaCompraService.ler(pedido)
      if (r.rascunhoExistente) {
        navigate(`/compras/${r.rascunhoExistente.id}`, { state: { toast: `Esta nota já está no rascunho ${r.rascunhoExistente.identificador}.` } })
        return
      }
      setEntrada(pedido)
      setLeitura(r)
    } catch (err) {
      const erro = extrairErroExplicado(err, 'Não foi possível ler a nota.')
      if (erro.titulo === 'Nota já registrada' && erro.itens?.length) {
        setJaRegistrada({ identificador: erro.itens[0], mensagem: erro.mensagem })
      } else {
        mostrarErro(erro)
      }
    } finally {
      setLendo(false)
    }
  }

  const lerQrDaCamera = (qrUrl: string) => {
    setCamera(false)
    setXml(null)
    setTexto(qrUrl)
    void ler({ modelo: 'NFCE', qrUrl })
  }

  const recomecar = () => {
    setLeitura(null)
    setEntrada(null)
  }

  const podeLer = !lendo && !preparando && (xml != null || texto.trim().length > 0)

  return (
    <AppLayout active="compras" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-tight text-dark">Ler nota fiscal</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Registre a compra a partir do cupom ou da nota: o sistema lê os itens e você confere.</p>
        </div>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras')}>Voltar</Button>
      </div>

      <div className="flex max-w-[640px] flex-col gap-4 rounded-card border border-[#F0EEE9] bg-white px-[26px] py-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <Field label="Tipo de documento">
          <SegmentedControl options={MODELOS} value={modelo} onChange={valor => { if (!lendo && !preparando) setModelo(valor) }} height="h-11" />
        </Field>
        <Field label="Link do QR code ou chave de acesso" hint="Cole o link lido do QR code do cupom, ou os 44 caracteres da chave de acesso.">
          <input data-testid="campo-link-chave" className={inputBase} value={texto} disabled={xml != null || lendo || preparando}
            placeholder="https://… ou 3526 1011 2223 …" onChange={e => setTexto(e.target.value)} />
        </Field>
        {modelo === 'NFCE' && <Button variant="ghost" icon={<Camera size={16} />} onClick={() => setCamera(true)} disabled={lendo || preparando}>Ler QR pela câmera</Button>}
        <Field label="Ou envie XML, foto, print ou PDF" hint="Fotos são reduzidas antes do envio. Limite de 5MB. XML é lido sem IA.">
          <input
            data-testid="campo-xml"
            type="file"
            accept=".xml,.pdf,.jpg,.jpeg,.png,application/xml,text/xml,application/pdf,image/jpeg,image/png"
            disabled={lendo || preparando}
            onChange={e => selecionarArquivo(e.target)}
            className="text-[13.5px]"
          />
          {preparando && <span className="text-sm text-muted">Preparando a foto…</span>}
          {xml && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
              <span data-testid="arquivo-nota-preparado">{xml.name} · {(xml.size / 1024).toFixed(0)} KB</span>
              <Button variant="ghost" onClick={removerArquivo} disabled={lendo}>Remover arquivo</Button>
            </div>
          )}
        </Field>
        <div>
          <Button variant="primary" icon={lendo ? <Spinner size={15} /> : <FileSearch size={16} />} onClick={() => { void ler() }} disabled={!podeLer}>
            {lendo ? 'Lendo a nota…' : 'Ler nota'}
          </Button>
        </div>
      </div>

      {camera && (
        <Suspense fallback={<Spinner />}>
          <CameraNota onClose={() => setCamera(false)} valido={ehLink} onQr={lerQrDaCamera} />
        </Suspense>
      )}
      <ConfirmacaoModal open={avisoEnvio != null} onClose={() => setAvisoEnvio(null)} title="Enviar documento para leitura" confirmLabel="Aceitar e ler documento"
        description="Para ler foto ou PDF, o documento pode ser enviado a um serviço externo de inteligência artificial. Ele pode conter seu CPF, e a imagem não será ocultada antes do envio. Você precisa conferir os dados depois da leitura."
        onConfirm={() => { if (avisoEnvio) { const pedido = { ...avisoEnvio, confirmouEnvioIa: true }; setAvisoEnvio(null); void ler(pedido) } }} />
      {leitura && entrada && (
        <ModalConciliacaoNota leitura={leitura} arquivo={entrada.arquivo}
          comprovanteLink={entrada.qrUrl ?? null}
          onTentarNovamente={recomecar} onClose={recomecar}
          onCriado={c => navigate(`/compras/${c.id}`, { state: { toast: `Rascunho ${c.identificador} criado a partir da nota. O estoque ainda não mudou.` } })} />
      )}
      {jaRegistrada && (
        <ModalNotaJaRegistrada identificador={jaRegistrada.identificador} mensagem={jaRegistrada.mensagem} onOk={() => setJaRegistrada(null)} />
      )}
      {modalErro}
    </AppLayout>
  )
}
