const MAXIMO = 5 * 1024 * 1024
export const ERRO_TAMANHO_NOTA = 'Arquivo muito grande. O tamanho máximo permitido é 5MB.'
/** #682: preparação local do upload; regras fiscais continuam no backend. */
export async function prepararArquivoNota(arquivo: File): Promise<File> {
  const mime = arquivo.type || (/\.xml$/i.test(arquivo.name) ? 'application/xml' : /\.pdf$/i.test(arquivo.name) ? 'application/pdf' : '')
  if (['application/xml', 'text/xml', 'application/pdf'].includes(mime)) {
    if (arquivo.size > MAXIMO) throw new Error(ERRO_TAMANHO_NOTA)
    return arquivo.type ? arquivo : new File([arquivo], arquivo.name, { type: mime })
  }
  if (!['image/jpeg', 'image/png'].includes(mime)) throw new Error('Só são aceitos arquivos XML, PDF, JPG ou PNG.')
  const imagem = await createImageBitmap(arquivo).catch(() => { throw new Error('Não foi possível ler a foto. Escolha um arquivo JPG ou PNG válido.') })
  try {
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível preparar a foto. Tente outro arquivo.')
    for (const [lado, qualidade] of [[2000, 0.92], [1600, 0.85], [1280, 0.78], [960, 0.72]]) {
      const escala = Math.min(1, lado / Math.max(imagem.width, imagem.height))
      canvas.width = Math.max(1, Math.round(imagem.width * escala)); canvas.height = Math.max(1, Math.round(imagem.height * escala))
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', qualidade))
      if (blob && blob.size <= MAXIMO) return new File([blob], arquivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    }
    throw new Error(ERRO_TAMANHO_NOTA)
  } finally { imagem.close() }
}
