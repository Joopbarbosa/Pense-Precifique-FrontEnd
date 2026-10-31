import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button, ModalShell, SegmentedControl, Spinner, TextArea, Input } from '../ui'
import { whatsappService } from '../../services/whatsappService'
import { clienteService } from '../../services/clienteService'
import { extractApiError } from '../../utils/apiError'
import { LEGENDA_MAX, legendaExcedeu, numeroWhatsappValido } from '../../utils/whatsapp'
import type { TipoDocumentoWhatsapp, WhatsappStatus } from '../../types/whatsapp'
import type { ClienteResponse } from '../../types/cliente'

type Destino = 'cliente' | 'numero'

/**
 * #1170 (V0.19.0, RN-NOVA-27 a 33) — botão "Enviar por WhatsApp" reutilizável. Some quando o recurso
 * está desligado no ambiente. O destinatário é um cliente com aceite registrado OU um número digitado
 * com confirmação ativa de que a pessoa aceitou. As regras finais (limite, intervalo, recusa) são do servidor.
 */
export default function EnviarWhatsappBotao({ tipoDocumento, documentoId, clienteSugeridoId, mostrarAvisoFornecedor = false, rotulo = 'Enviar por WhatsApp' }: {
  tipoDocumento: TipoDocumentoWhatsapp
  documentoId: string
  clienteSugeridoId?: string | null
  /** Lista de compras: o PDF mostra preços de referência do fornecedor (pede confirmação). */
  mostrarAvisoFornecedor?: boolean
  rotulo?: string
}) {
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [aberto, setAberto] = useState(false)
  const [destino, setDestino] = useState<Destino>('cliente')
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [clienteId, setClienteId] = useState('')
  const [numero, setNumero] = useState('')
  const [aceite, setAceite] = useState(false)
  const [legenda, setLegenda] = useState('')
  const [confirmaPrecos, setConfirmaPrecos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    whatsappService.status().then(s => { if (vivo) setStatus(s) }).catch(() => { if (vivo) setStatus(null) })
    return () => { vivo = false }
  }, [])

  const abrir = async () => {
    setErro(null); setSucesso(null); setAceite(false); setConfirmaPrecos(false)
    setClienteId(clienteSugeridoId ?? '')
    setAberto(true)
    try {
      setStatus(await whatsappService.status())
      const pagina = await clienteService.listar(0, 100)
      setClientes(pagina.content ?? [])
    } catch { /* o servidor valida de qualquer forma */ }
  }

  if (!status?.habilitado) return null

  const cliente = clientes.find(c => c.id === clienteId)
  const desconectado = status.estado !== 'CONECTADO'
  const legendaInvalida = legendaExcedeu(legenda)
  const destinoOk = destino === 'cliente'
    ? !!cliente && !!cliente.aceitaWhatsapp && !cliente.recusouWhatsapp
    : numeroWhatsappValido(numero) && aceite
  const podeEnviar = !desconectado && !legendaInvalida && destinoOk && (!mostrarAvisoFornecedor || confirmaPrecos) && !enviando

  const enviar = async () => {
    setEnviando(true); setErro(null)
    try {
      const r = await whatsappService.enviar({
        tipoDocumento, documentoId,
        ...(destino === 'cliente' ? { clienteId } : { numero: numero.trim(), confirmoAceite: aceite }),
        ...(legenda.trim() ? { legenda: legenda.trim() } : {}),
        ...(mostrarAvisoFornecedor ? { confirmaPrecosFornecedor: confirmaPrecos } : {}),
      })
      setSucesso(`PDF enviado. Hoje: ${r.enviadosHoje} de ${r.limiteDiario} envios.`)
    } catch (err) {
      setErro(extractApiError(err, 'Não foi possível enviar. Tente novamente.'))
    } finally { setEnviando(false) }
  }

  return (
    <>
      <Button variant="ghost" icon={<MessageCircle size={16} />} onClick={abrir} data-testid="btn-enviar-whatsapp">{rotulo}</Button>
      <ModalShell
        open={aberto}
        onClose={() => setAberto(false)}
        title="Enviar por WhatsApp"
        subtitle="O PDF vai como anexo, com uma legenda."
        footer={
          <div className="flex w-full gap-2.5">
            <Button variant="ghost" fullWidth onClick={() => setAberto(false)}>{sucesso ? 'Fechar' : 'Cancelar'}</Button>
            {!sucesso && (
              <Button variant="primary" fullWidth onClick={enviar} disabled={!podeEnviar}
                icon={enviando ? <Spinner size={15} color="#fff" /> : undefined}>
                {enviando ? 'Enviando…' : 'Enviar'}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-3.5">
          {desconectado && (
            <div role="alert" className="rounded-lg bg-[#FFF8E7] px-3.5 py-2.5 text-[13.5px] text-body" data-testid="aviso-desconectado">
              Seu WhatsApp está desconectado — reconecte em Configurações &gt; WhatsApp.
            </div>
          )}

          <SegmentedControl<Destino>
            options={[{ value: 'cliente', label: 'Cliente cadastrado' }, { value: 'numero', label: 'Outro número' }]}
            value={destino} onChange={setDestino} height="h-10" />

          {destino === 'cliente' ? (
            <div className="flex flex-col gap-1.5">
              <select value={clienteId} onChange={e => setClienteId(e.target.value)} aria-label="Cliente"
                className="h-11 rounded-lg border-[1.5px] border-line bg-white px-3 text-[14px]">
                <option value="">Escolha o cliente</option>
                {clientes.filter(c => c.whatsapp || c.whatsappCanonico).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {cliente?.recusouWhatsapp && <p className="m-0 text-[13px] text-[#B3261E]">Esta pessoa pediu para parar de receber.</p>}
              {cliente && !cliente.recusouWhatsapp && !cliente.aceitaWhatsapp && (
                <p className="m-0 text-[13px] text-[#B3261E]">Este cliente ainda não aceitou receber pelo WhatsApp. Marque no cadastro depois de combinar com ele.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input label="Número com DDD" value={numero} onChange={setNumero} placeholder="11 91234-5678"
                error={numero && !numeroWhatsappValido(numero) ? 'Número inválido. Use DDD e número, ex.: 11 91234-5678.' : undefined} />
              <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-body">
                <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} />
                Confirmo que esta pessoa aceitou receber pelo WhatsApp.
              </label>
            </div>
          )}

          <TextArea value={legenda} onChange={setLegenda} rows={3} maxLength={LEGENDA_MAX} ariaLabel="Legenda (opcional)"
            placeholder="Legenda (opcional) — em branco usa a legenda padrão." />

          {mostrarAvisoFornecedor && (
            <label className="flex cursor-pointer items-start gap-2 text-[13.5px] text-body">
              <input type="checkbox" checked={confirmaPrecos} onChange={e => setConfirmaPrecos(e.target.checked)} className="mt-1" />
              O PDF mostra os seus preços de referência. Enviar mesmo assim?
            </label>
          )}

          {erro && <div role="alert" className="rounded-lg bg-[#FDECEA] px-3.5 py-2.5 text-[13.5px] text-[#B3261E]">{erro}</div>}
          {sucesso && <div role="status" className="rounded-lg bg-[#E7F5EE] px-3.5 py-2.5 text-[13.5px] text-[#1F8A5B]">{sucesso}</div>}
        </div>
      </ModalShell>
    </>
  )
}
