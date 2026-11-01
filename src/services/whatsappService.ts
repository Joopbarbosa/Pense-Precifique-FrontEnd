import api from './api'
import type { WhatsappEnvioRequest, WhatsappEnvioResponse, WhatsappQr, WhatsappStatus } from '../types/whatsapp'

// #1170 (V0.19.0) — nunca guarda nem registra o QR; só devolve ao componente.
export const whatsappService = {
  status: async (): Promise<WhatsappStatus> => (await api.get<WhatsappStatus>('/whatsapp/status')).data,
  conectar: async (entendiRiscos: boolean): Promise<WhatsappQr> =>
    (await api.post<WhatsappQr>('/whatsapp/conexao', { entendiRiscos })).data,
  qr: async (): Promise<WhatsappQr> => (await api.get<WhatsappQr>('/whatsapp/conexao/qr')).data,
  desconectar: async (): Promise<void> => { await api.delete('/whatsapp/conexao') },
  enviar: async (data: WhatsappEnvioRequest): Promise<WhatsappEnvioResponse> =>
    (await api.post<WhatsappEnvioResponse>('/whatsapp/envios', data)).data,
}
