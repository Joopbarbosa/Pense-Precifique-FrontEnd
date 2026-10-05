import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileSearch } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { Button, Field, SegmentedControl, Spinner } from '../../components/ui'
import ModalConciliacaoNota from '../../components/compra/nota/ModalConciliacaoNota'
import ModalNotaJaRegistrada from '../../components/compra/nota/ModalNotaJaRegistrada'
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
const inputBase = 'h-12 w-full rounded-input border-[1.5px] border-line bg-white px-3.5 font-[inherit] text-[14.5px] text-dark outline-none focus:border-teal focus:ring-4 focus:ring-teal/focus'

const MODELOS = [
  { value: 'NFCE' as ModeloNota, label: 'Cupom (NFC-e)' },
  { value: 'NFE' as ModeloNota, label: 'Nota (NF-e)' },
]

export default function LerNotaPage() {
  const navigate = useNavigate()
  const [modelo, setModelo] = useState<ModeloNota>('NFCE')
  const [texto, setTexto] = useState('')
  const [xml, setXml] = useState<File | null>(null)
  const [lendo, setLendo] = useState(false)
  const [leitura, setLeitura] = useState<NotaLeituraResponse | null>(null)
  const [entrada, setEntrada] = useState<EntradaLeituraNota | null>(null)
  const [jaRegistrada, setJaRegistrada] = useState<{ identificador: string; mensagem: string } | null>(null)
  const { modalErro, mostrarErro } = useModalErro()

  const montarEntrada = (): EntradaLeituraNota => {
    if (xml) return { modelo, arquivo: xml }
    const valor = texto.trim()
    return /^https?:\/\//i.test(valor) ? { modelo, qrUrl: valor } : { modelo, chaveAcesso: valor.replace(/\s/g, '') }
  }

  const ler = async () => {
    const pedido = montarEntrada()
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

  const recomecar = () => {
    setLeitura(null)
    setEntrada(null)
  }

  const podeLer = !lendo && (xml != null || texto.trim().length > 0)

  return (
    <AppLayout active="compras" compact>
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="m-0 text-[29px] font-bold tracking-[-0.025em] text-dark">Ler nota fiscal</h1>
          <p className="mb-0 mt-[7px] text-[14.5px] text-muted">Registre a compra a partir do cupom ou da nota: o sistema lê os itens e você confere.</p>
        </div>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/compras')}>Voltar</Button>
      </div>

      <div className="flex max-w-[640px] flex-col gap-4 rounded-card border border-[#F0EEE9] bg-white px-[26px] py-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <Field label="Tipo de documento">
          <SegmentedControl options={MODELOS} value={modelo} onChange={setModelo} height="h-11" />
        </Field>
        <Field label="Link do QR code ou chave de acesso" hint="Cole o link lido do QR code do cupom, ou os 44 caracteres da chave de acesso.">
          <input data-testid="campo-link-chave" className={inputBase} value={texto} disabled={xml != null}
            placeholder="https://… ou 3526 1011 2223 …" onChange={e => setTexto(e.target.value)} />
        </Field>
        <Field label="Ou o arquivo XML da nota" hint="O XML é lido sem IA.">
          <input data-testid="campo-xml" type="file" accept=".xml,application/xml,text/xml"
            onChange={e => setXml(e.target.files?.[0] ?? null)} className="text-[13.5px]" />
        </Field>
        <div>
          <Button variant="primary" icon={lendo ? <Spinner size={15} /> : <FileSearch size={16} />} onClick={ler} disabled={!podeLer}>
            {lendo ? 'Lendo a nota…' : 'Ler nota'}
          </Button>
        </div>
      </div>

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
