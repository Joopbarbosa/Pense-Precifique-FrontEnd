// V0.16.0 (#681) — leitor-fiscal falso para o E2E da compra por nota. Sem dependências; o Playwright o sobe
// (webServer em playwright.config.ts). O backend da pilha de teste aponta LEITOR_FISCAL_BASE_URL para cá.
// O spec registra a nota que quer devolver (POST /_fixture { chave, nota }); POST /v1/leituras devolve a
// nota da chave pedida (chaveAcesso no JSON ou parâmetro p= do link do QR), no contrato do openapi.yaml da #677.
import { createServer } from 'node:http'

const PORTA = Number(process.env.E2E_LEITOR_FALSO_PORT ?? 13501)
const notas = new Map()

const corpo = req => new Promise(resolve => {
  let dados = ''
  req.on('data', c => { dados += c })
  req.on('end', () => resolve(dados))
})

const responder = (res, status, json) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(json))
}

const bloqueio = (res, motivo) => responder(res, 400, {
  tipo: 'BLOQUEIO', codigo: 'LEITURA_IMPOSSIVEL', titulo: 'Leitura impossível', motivo,
  comoResolver: 'Confira o QR code ou a chave e tente de novo.', itens: [],
})

if (process.env.E2E_LEITOR_REAL_REPO) {
  await import('./leitor-fiscal-integrado.mjs')
} else {
createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/saude') return responder(res, 200, { status: 'ok' })
  if (req.method === 'POST' && req.url === '/_fixture') {
    const { chave, nota } = JSON.parse(await corpo(req))
    notas.set(chave.toUpperCase(), nota)
    return responder(res, 201, { ok: true })
  }
  if (req.method === 'POST' && req.url === '/v1/leituras') {
    if (!req.headers.authorization?.startsWith('Bearer ')) return responder(res, 401, { tipo: 'BLOQUEIO', codigo: 'NAO_AUTORIZADO', titulo: 'Não autorizado', motivo: 'Chave ausente', comoResolver: '-', itens: [] })
    const texto = await corpo(req)
    let chave = null
    try {
      const pedido = JSON.parse(texto)
      chave = pedido.chaveAcesso ?? new URL(pedido.qrUrl).searchParams.get('p')?.slice(0, 44) ?? null
    } catch {
      return bloqueio(res, 'O leitor falso só aceita chave ou link do QR em JSON.')
    }
    const nota = chave && notas.get(chave.toUpperCase())
    return nota ? responder(res, 200, nota) : bloqueio(res, 'Nota não registrada no leitor falso.')
  }
  responder(res, 404, { erro: 'rota inexistente' })
}).listen(PORTA, () => console.log(`leitor-fiscal falso na porta ${PORTA}`))

}
