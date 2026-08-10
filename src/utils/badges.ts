import type { TipoProduto } from '../types/index'

export const tipoProdutoBadge = (tipo: TipoProduto): { label: string; bg: string; fg: string } => {
  switch (tipo) {
    case 'PRODUTO':      return { label: 'Produto',       bg: '#E9F1F9', fg: '#3A6FA0' }
    case 'CUSTOMIZACAO': return { label: 'Customização',  bg: 'rgba(42,157,143,0.14)', fg: '#2A9D8F' }
  }
}

export const ESTADO_PRODUCAO_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  AGUARDANDO_INICIO: { label: 'Aguardando início', bg: '#FFF8EC', fg: '#B07A1F' },
  EM_ANDAMENTO:       { label: 'Em andamento',      bg: '#EAF1FB', fg: '#2A6FB0' },
  TRAVADA_SISTEMA:    { label: 'Travada (estoque)', bg: '#FCF0EC', fg: '#C0492B' },
  TRAVADA_USUARIO:    { label: 'Travada (manual)',  bg: '#FFF1E8', fg: '#C8721F' },
  FINALIZADA:         { label: 'Finalizada',        bg: '#E7F4F1', fg: '#1F7A6F' },
  CANCELADA:          { label: 'Cancelada',         bg: '#F1F0EC', fg: '#7C786F' },
  NAO_REALIZADA:      { label: 'Não realizada',     bg: '#F1F0EC', fg: '#8A8780' },
}

export function getBadgeEstado(
  estado: string,
  historicoStatus?: { statusNovo: string; origem: string }[]
): { label: string; bg: string; fg: string } {
  if (estado === 'TRAVADA') {
    const travas = historicoStatus?.filter(h => h.statusNovo === 'TRAVADA') ?? []
    const ultimaTrava = travas[travas.length - 1]
    const chave = ultimaTrava?.origem === 'USUARIO' ? 'TRAVADA_USUARIO' : 'TRAVADA_SISTEMA'
    return ESTADO_PRODUCAO_BADGE[chave]
  }
  return ESTADO_PRODUCAO_BADGE[estado] ?? { label: estado, bg: '#F1F0EC', fg: '#7C786F' }
}
