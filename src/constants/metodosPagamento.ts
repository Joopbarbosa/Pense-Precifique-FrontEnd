import type { MetodoPagamento } from '../types/orcamento'

export const METODOS_PAGAMENTO: { id: MetodoPagamento; label: string }[] = [
  { id: 'PIX',           label: 'Pix' },
  { id: 'DINHEIRO',      label: 'Dinheiro' },
  { id: 'CREDITO',       label: 'Crédito' },
  { id: 'DEBITO',        label: 'Débito' },
  { id: 'TRANSFERENCIA', label: 'Transferência' },
  { id: 'BOLETO',        label: 'Boleto Bancário' },
  { id: 'OUTRO',         label: 'Outro' },
]
