import api from './api'
import type { CompraResumoResponse } from '../types/compra'
import type { ModeloNota, NotaLeituraResponse, NotaRascunhoRequest, NotaRascunhoResponse } from '../types/compraNota'

// V0.16.0 (#683, DT-NOVA-9) — registrar compra por nota. O navegador nunca fala com o leitor-fiscal:
// só com o backend, que lê, confere nota já registrada e assina a leitura.

export interface EntradaLeituraNota {
  modelo: ModeloNota
  /** Link do QR code (só NFC-e). Exatamente uma entre qrUrl, chaveAcesso e arquivo. */
  qrUrl?: string
  chaveAcesso?: string
  arquivo?: File
  /** Obrigatório para foto e PDF: a artesã aceitou o aviso de envio a um serviço externo de IA (RN-NOVA-7). */
  confirmouEnvioIa?: boolean
}

export const notaCompraService = {
  ler: async (entrada: EntradaLeituraNota): Promise<NotaLeituraResponse> => {
    const form = new FormData()
    form.append('modelo', entrada.modelo)
    if (entrada.qrUrl) form.append('qrUrl', entrada.qrUrl)
    if (entrada.chaveAcesso) form.append('chaveAcesso', entrada.chaveAcesso)
    if (entrada.arquivo) form.append('arquivo', entrada.arquivo)
    form.append('confirmouEnvioIa', String(entrada.confirmouEnvioIa === true))
    const response = await api.post('/compras/nota/leitura', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  },

  /**
   * Cria o rascunho, ou só calcula com `simular` (linhas, junções, desconto da nota e avisos; nada é gravado).
   * Com `arquivo` vai multipart; sem arquivo (câmera ou link do QR), JSON com o `comprovanteLink`.
   */
  criarRascunho: async (dados: NotaRascunhoRequest, arquivo?: File, simular = false): Promise<NotaRascunhoResponse> => {
    if (!arquivo) {
      const response = await api.post('/compras/nota/rascunho', dados, { params: { simular } })
      return response.data
    }
    const form = new FormData()
    form.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }))
    form.append('arquivo', arquivo)
    const response = await api.post('/compras/nota/rascunho', form, { params: { simular }, headers: { 'Content-Type': 'multipart/form-data' } })
    return response.data
  },

  /**
   * RN-NOVA-5 — o BLOQUEIO de nota já confirmada ou cancelada traz só o número da compra (COM-12);
   * a busca da lista de compras acha o id para o link.
   */
  buscarCompraPorIdentificador: async (identificador: string): Promise<CompraResumoResponse | null> => {
    const response = await api.get('/compras', { params: { busca: identificador, size: 5 } })
    const compras: CompraResumoResponse[] = response.data.content
    return compras.find(c => c.identificador === identificador) ?? null
  },
}
