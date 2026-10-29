import { useEffect, useState } from 'react'
import { insumoService } from '../services/insumoService'
import { produtoService } from '../services/produtoService'
import type { CadastroLinkavel } from '../utils/linksDescricao'

const TAMANHO = 500
let cache: Promise<CadastroLinkavel[]> | null = null

/** Nomes de produtos, customizações e insumos (inclusive inativos) com a rota de cada cadastro; carregados uma vez por sessão da tela. */
function carregar(): Promise<CadastroLinkavel[]> {
  if (!cache) {
    cache = Promise.all([
      produtoService.listar(0, TAMANHO, undefined, undefined, undefined, undefined, true),
      insumoService.listar(0, TAMANHO, undefined, undefined, 'nome,asc', true),
    ]).then(([produtos, insumos]) => [
      ...produtos.content.map(p => ({ nome: p.nome, to: `/produtos/${p.id}` })),
      ...insumos.content.map(i => ({ nome: i.nome, to: `/insumos/${i.id}` })),
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
