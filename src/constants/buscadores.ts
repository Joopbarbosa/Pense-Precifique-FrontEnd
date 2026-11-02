/** PDT-010 / INS-008 (PP-698) — todo buscador de lista suspensa mostra 6 registros no primeiro clique, sem exceção. */
export const LINHAS_BUSCA_VISIVEIS = 6

/** Corta a lista suspensa no limite de registros visíveis dos buscadores (6). */
export const limitarOpcoesBusca = <T,>(opcoes: readonly T[]): T[] => opcoes.slice(0, LINHAS_BUSCA_VISIVEIS)
