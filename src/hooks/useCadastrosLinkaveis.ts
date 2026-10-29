import { useEffect, useState } from 'react'
import { insumoService } from '../services/insumoService'
import { produtoService } from '../services/produtoService'
import type { CadastroLinkavel } from '../utils/linksDescricao'

const TAMANHO = 100 // limite de tamanho de página da API
const MAX_PAGINAS = 20
let cache: Promise<CadastroLinkavel[]> | null = null

/** Nomes de produtos, customizações e insumos (inclusive inativos) com a rota de cada cadastro; carregados uma vez por sessão da tela. */
async function todasAsPaginas<T>(buscar: (pagina: number) => Promise<{ content: T[] }>): Promise<T[]> {
  const itens: T[] = []
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { content } = await buscar(pagina)
    itens.push(...content)
    if (content.length < TAMANHO) break
  }
  return itens
}

function carregar(): Promise<CadastroLinkavel[]> {
  if (!cache) {
    cache = Promise.all([
      todasAsPaginas(pagina => produtoService.listar(pagina, TAMANHO, undefined, undefined, undefined, undefined, true)),
      todasAsPaginas(pagina => insumoService.listar(pagina, TAMANHO, undefined, undefined, 'nome,asc', true)),
    ]).then(([produtos, insumos]) => [
      ...produtos.map(p => ({ nome: p.nome, to: `/produtos/${p.id}` })),
      ...insumos.map(i => ({ nome: i.nome, to: `/insumos/${i.id}` })),
    ]).catch(() => { cache = null; return [] })
  }
  return cache
}

/** V0.18.0 (#1179) — falha de carga não quebra a tela: a descrição fica como texto simples. */
export function useCadastrosLinkaveis(): CadastroLinkavel[] {
  const [cadastros, setCadastros] = useState<CadastroLinkavel[]>([])
  useEffect(() => {
    let vivo = true
    void carregar().then(c => { if (vivo) setCadastros(c) })
    return () => { vivo = false }
  }, [])
  return cadastros
}
