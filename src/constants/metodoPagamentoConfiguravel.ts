import { createElement, type ReactNode } from 'react'
import { Banknote, QrCode, CreditCard, Tag } from 'lucide-react'
import type { TipoMetodoPagamento } from '../types/empresa'

/**
 * #491/#487 (V0.12.0) — método de pagamento configurável do Caixa/PDV. Sem relação com
 * `METODOS_PAGAMENTO` (`metodosPagamento.ts`) — aquele é o enum fixo antigo, exclusivo de
 * Orçamento (7 valores: PIX/DINHEIRO/CREDITO/DEBITO/TRANSFERENCIA/BOLETO/OUTRO). Este tipo tem só
 * 5 valores e nomes diferentes (CARTAO_CREDITO/CARTAO_DEBITO) — mesma colisão de nome (não de
 * significado) já documentada no Backend (`shared.domain.enums.MetodoPagamento` vs
 * `MetodoPagamentoConfiguravel`, ver decisoes-config-perfil.md). Consumido por
 * `ConfiguracoesPage.tsx` (aba Métodos de Pagamento, #491) e `CaixaPage.tsx` (venda rápida, #487)
 * — extraído para constante compartilhada porque o 2º consumidor apareceu.
 */
export const LABEL_TIPO_METODO_PAGAMENTO: Record<TipoMetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão Crédito', CARTAO_DEBITO: 'Cartão Débito', OUTRO: '',
}

export const ICON_TIPO_METODO_PAGAMENTO: Record<TipoMetodoPagamento, ReactNode> = {
  DINHEIRO: createElement(Banknote, { size: 18 }),
  PIX: createElement(QrCode, { size: 18 }),
  CARTAO_CREDITO: createElement(CreditCard, { size: 18 }),
  CARTAO_DEBITO: createElement(CreditCard, { size: 18 }),
  OUTRO: createElement(Tag, { size: 18 }),
}

export function rotuloMetodoPagamento(tipo: TipoMetodoPagamento, nome?: string | null): string {
  return tipo === 'OUTRO' ? (nome || 'Sem nome') : LABEL_TIPO_METODO_PAGAMENTO[tipo]
}
