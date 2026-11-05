// #1170 (V0.19.0) — envio de PDF por WhatsApp. Espelha WhatsappDtos do backend.
export type EstadoWhatsapp = 'NAO_CONECTADO' | 'AGUARDANDO_QR' | 'CONECTADO' | 'DESCONECTADO'

export type TipoDocumentoWhatsapp =
  | 'ORCAMENTO' | 'RECIBO_SINAL' | 'RECIBO_PAGAMENTO' | 'MULTA' | 'ESTORNO_SINAL'
  | 'RECIBO_CAIXA' | 'COMPRA' | 'LISTA_COMPRAS' | 'CATALOGO'

export interface WhatsappStatus {
  habilitado: boolean
  estado: EstadoWhatsapp
  estadoAlteradoEm: string | null
}

export interface WhatsappQr {
  estado: EstadoWhatsapp
  qrBase64: string | null
}

export interface WhatsappEnvioRequest {
  tipoDocumento: TipoDocumentoWhatsapp
  documentoId: string
  clienteId?: string
  numero?: string
  confirmoAceite?: boolean
  legenda?: string
  confirmaPrecosFornecedor?: boolean
  reenviarSegundaParte?: boolean
}

export interface WhatsappEnvioResponse {
  resultado: 'ENVIADO' | 'FALHOU' | 'BLOQUEADO'
  enviadoEm: string
  enviadosHoje: number
  limiteDiario: number
}
