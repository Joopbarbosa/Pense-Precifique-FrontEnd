/** V0.18.0 (#1179, RN-NOVA-47) — acha, no texto da descrição, os nomes de produto, insumo ou customização que têm cadastro. */
export interface CadastroLinkavel {
  nome: string
  /** Rota do cadastro (ex.: /insumos/123). */
  to: string
}

export type TrechoDescricao = { texto: string; to?: string }

const NOME_MINIMO = 3

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Divide o texto em trechos; os que citam um cadastro levam `to`. O nome mais longo vence; nome sem cadastro fica texto simples. */
export function segmentarDescricao(texto: string, cadastros: CadastroLinkavel[]): TrechoDescricao[] {
  const porNome = new Map<string, string>()
  for (const c of cadastros) {
    const nome = c.nome.trim()
    if (nome.length >= NOME_MINIMO && !porNome.has(nome.toLowerCase())) porNome.set(nome.toLowerCase(), c.to)
  }
  if (!texto || porNome.size === 0) return [{ texto }]

  const nomes = [...porNome.keys()].sort((a, b) => b.length - a.length).map(escapar)
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${nomes.join('|')})(?![\\p{L}\\p{N}])`, 'giu')
  const trechos: TrechoDescricao[] = []
  let fim = 0
  for (const m of texto.matchAll(regex)) {
    const inicio = m.index ?? 0
    if (inicio > fim) trechos.push({ texto: texto.slice(fim, inicio) })
    trechos.push({ texto: m[0], to: porNome.get(m[0].toLowerCase()) })
    fim = inicio + m[0].length
  }
  if (fim < texto.length) trechos.push({ texto: texto.slice(fim) })
  return trechos.length > 0 ? trechos : [{ texto }]
}
