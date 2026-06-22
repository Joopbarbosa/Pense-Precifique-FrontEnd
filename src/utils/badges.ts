import type { TipoProduto } from '../types/index'

export const tipoProdutoBadge = (tipo: TipoProduto): { label: string; bg: string; fg: string } => {
  switch (tipo) {
    case 'PRODUTO':      return { label: 'Produto',       bg: '#E9F1F9', fg: '#3A6FA0' }
    case 'PRODUTO_BASE': return { label: 'Produto Base',  bg: '#EFEDE9', fg: '#6B6860' }
    case 'CUSTOMIZACAO': return { label: 'Customização',  bg: 'rgba(42,157,143,0.14)', fg: '#2A9D8F' }
  }
}
