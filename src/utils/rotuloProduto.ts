/**
 * #1017 (RN-NOVA-36) — "Nome — Marca" quando o produto ou item de catálogo tem marca; só o nome quando não tem.
 * Usado onde a tela recebe nome e marca separados; as respostas que já vêm com o rótulo montado pelo servidor
 * (orçamento, Caixa, produção, histórico do cliente) não passam por aqui.
 */
export function rotuloProduto(nome: string, marca?: string | null): string {
  const m = marca?.trim()
  return m ? `${nome} — ${m}` : nome
}
