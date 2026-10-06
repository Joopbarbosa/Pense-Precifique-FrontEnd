// #690 — fixture S3 em memória, somente para container de teste isolado.
// PUT decodifica aws-chunked; GET/HEAD servem arquivo, DELETE remove.
//
// Formato aws-chunked (upload em streaming do SDK da AWS, assinatura SigV4): o corpo é uma sequência de blocos
//   <tamanho em hexadecimal>[;chunk-signature=...]\r\n<bytes do bloco>\r\n
// terminada por um bloco de tamanho 0. O armazenamento real devolve só os bytes decodificados; o fake faz o mesmo
// para o teste conferir o conteúdo idêntico ao enviado. Referência: "Signature Calculations for the Authorization
// Header: Transferring Payload in Multiple Chunks" na documentação do Amazon S3.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'

const LIMITE_BYTES = 10 * 1024 * 1024
const arquivos = new Map()

function decodificarAwsChunked(dados) {
  const partes = []
  let pos = 0
  while (pos < dados.length) {
    const fim = dados.indexOf('\r\n', pos)
    if (fim < 0) return null
    const quantidade = Number.parseInt(dados.subarray(pos, fim).toString().split(';')[0], 16)
    if (!Number.isFinite(quantidade) || quantidade < 0) return null
    if (quantidade === 0) break
    pos = fim + 2
    if (pos + quantidade + 2 > dados.length) return null
    partes.push(dados.subarray(pos, pos + quantidade))
    pos += quantidade + 2
  }
  return Buffer.concat(partes)
}

async function lerCorpo(req, res) {
  let tamanho = 0
  const blocos = []
  for await (const c of req) {
    tamanho += c.length
    if (tamanho > LIMITE_BYTES) {
      res.writeHead(413).end()
      return null
    }
    blocos.push(c)
  }
  return Buffer.concat(blocos)
}

createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://localhost').pathname
  if (req.method === 'PUT') {
    let dados = await lerCorpo(req, res)
    if (!dados) return
    if (req.headers['content-encoding']?.includes('aws-chunked')) {
      dados = decodificarAwsChunked(dados)
      if (!dados) {
        res.writeHead(400).end()
        return
      }
    }
    const etag = '"' + createHash('sha256').update(dados).digest('hex') + '"'
    arquivos.set(caminho, { dados, tipo: req.headers['content-type'] ?? 'application/octet-stream', etag })
    res.writeHead(200, { ETag: etag }).end()
    return
  }
  if (req.method === 'DELETE') {
    arquivos.delete(caminho)
    res.writeHead(204).end()
    return
  }
  const a = arquivos.get(caminho)
  if (!a) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'Content-Type': a.tipo, 'Content-Length': a.dados.length, ETag: a.etag, 'Access-Control-Allow-Origin': '*' })
  res.end(req.method === 'HEAD' ? undefined : a.dados)
}).listen(9000, '0.0.0.0')
