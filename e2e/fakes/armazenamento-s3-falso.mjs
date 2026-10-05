// #690 — fixture S3 em memória, somente para container de teste isolado.
// PUT decodifica aws-chunked; GET/HEAD servem arquivo, DELETE remove.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
const arquivos = new Map()
createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://localhost').pathname
  if (req.method === 'PUT') {
    let tamanho = 0; const blocos = []
    for await (const c of req) { tamanho += c.length; if (tamanho > 10 * 1024 * 1024) { res.writeHead(413).end(); return } blocos.push(c) }
    let dados = Buffer.concat(blocos)
    // S3 recebe aws-chunked assinado e serve somente o conteúdo decodificado.
    if (req.headers['content-encoding']?.includes('aws-chunked')) {
      const partes = []; let pos = 0
      while (pos < dados.length) {
        const fim = dados.indexOf('\r\n', pos)
        if (fim < 0) { res.writeHead(400).end(); return }
        const quantidade = Number.parseInt(dados.subarray(pos, fim).toString().split(';')[0], 16)
        if (!Number.isFinite(quantidade) || quantidade < 0) { res.writeHead(400).end(); return }
        if (quantidade === 0) break
        pos = fim + 2
        if (pos + quantidade + 2 > dados.length) { res.writeHead(400).end(); return }
        partes.push(dados.subarray(pos, pos + quantidade)); pos += quantidade + 2
      }
      dados = Buffer.concat(partes)
    }
    const etag = '"' + createHash('sha256').update(dados).digest('hex') + '"'
    arquivos.set(caminho, { dados, tipo: req.headers['content-type'] ?? 'application/octet-stream', etag })
    res.writeHead(200, { ETag: etag }).end(); return
  }
  if (req.method === 'DELETE') { arquivos.delete(caminho); res.writeHead(204).end(); return }
  const a = arquivos.get(caminho)
  if (!a) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': a.tipo, 'Content-Length': a.dados.length, ETag: a.etag, 'Access-Control-Allow-Origin': '*' })
  res.end(req.method === 'HEAD' ? undefined : a.dados)
}).listen(9000, '0.0.0.0')
