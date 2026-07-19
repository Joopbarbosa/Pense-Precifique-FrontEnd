export const MOTIVOS_BAIXA_INSUMO: { api: string; label: string }[] = [
  { api: 'PERDA',     label: 'Perda' },
  { api: 'AVARIA',    label: 'Avaria' },
  { api: 'USO_EXTRA', label: 'Uso extra' },
  { api: 'CORRECAO',  label: 'Correção de estoque' },
  { api: 'OUTRO',     label: 'Outro' },
]

export const MOTIVOS_BAIXA_PRODUTO: { api: string; label: string }[] = [
  { api: 'PERDA',     label: 'Perda' },
  { api: 'AVARIA',    label: 'Avaria' },
  { api: 'USO_EXTRA', label: 'Uso extra' },
  { api: 'CORRECAO',  label: 'Correção de estoque' },
  { api: 'OUTRO',     label: 'Outro' },
]

export const MOTIVO_LABEL: Record<string, string> = {
  PRODUCAO:         'Produção',
  ORCAMENTO:        'Orçamento',
  ESTORNO_PRODUCAO: 'Cancelamento de produção',
  PERDA:            'Perda',
  AVARIA:           'Avaria',
  USO_EXTRA:        'Uso extra',
  CORRECAO:         'Correção de estoque',
  OUTRO:            'Outro',
}
