import { useEffect, useState } from 'react'

/**
 * V0.15.0 (#440, RN-NOVA-46) — foto escolhida na criação do produto/item de catálogo, enviada logo depois
 * de salvar. Formato e tamanho são conferidos ao escolher o arquivo, com os mesmos textos do backend
 * (`ValidadorArquivoImagem`), que valida de novo no envio.
 */
export function erroArquivoImagem(arquivo: File): string | null {
  if (!['image/jpeg', 'image/png'].includes(arquivo.type)) return 'Só são aceitos arquivos JPG ou PNG.'
  if (arquivo.size > 5 * 1024 * 1024) return 'Arquivo muito grande. O tamanho máximo permitido é 5MB.'
  return null
}

/** Endereço local para a prévia do arquivo escolhido (liberado ao trocar/desmontar). */
export function usePreviaArquivo(arquivo: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!arquivo) { setUrl(null); return }
    const u = URL.createObjectURL(arquivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [arquivo])
  return url
}

/** Modal de erro (RN-NOVA-32) quando o cadastro foi salvo mas o envio da foto falhou. */
export function erroFotoNaoEnviada(oQue: 'O produto' | 'O item', motivo: string) {
  return {
    titulo: `${oQue} foi salvo, mas a foto não foi enviada`,
    mensagem: `${oQue} foi salvo, mas a foto não foi enviada.`,
    motivo,
    comoResolver: `Abra ${oQue === 'O produto' ? 'o produto' : 'o item'} e envie a foto de novo.`,
  }
}
