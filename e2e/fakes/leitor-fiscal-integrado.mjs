// #682: rotas/orquestrador/QR/cadeia IA reais do leitor; portal, autenticação e provedor simulados.
// E2E_LEITOR_REAL_REPO deve apontar para checkout compilado do leitor (#680 ou posterior).
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
const repo = process.env.E2E_LEITOR_REAL_REPO
if (!repo) throw new Error('Configure E2E_LEITOR_REAL_REPO para o E2E integrado da nota')
process.env.NODE_ENV = 'test'
const importar = arquivo => import(pathToFileURL(join(repo, 'dist', arquivo)).href)
const [{ criarApp }, { Orquestrador }, { decodificarQr }, { CadeiaIa }, { criarProvedor }, { CacheMemoria }, { notaSchema }] = await Promise.all([
  importar('api/app.js'), importar('leitura/orquestrador.js'), importar('leitura/qr/decodificar.js'), importar('ia/cadeia.js'),
  importar('ia/adaptadores.js'), importar('cache/notas.js'), importar('api/leituras/schemas.js'),
])
const porta = Number(process.env.E2E_LEITOR_FALSO_PORT ?? 13502)
const notas = new Map(); let iaNota; let qrChamadas = 0; let iaChamadas = 0
const decimais = new Set(['totalPago', 'descontoGeral', 'acrescimos', 'quantidade', 'valorFinal', 'valorBruto', 'desconto'])
function normalizar(valor) {
  if (Array.isArray(valor)) return valor.map(normalizar)
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor)
    .filter(([k, v]) => !(v == null && ['valorBruto', 'desconto', 'unidade', 'codigo', 'ean'].includes(k)))
    .map(([k, v]) => [k, ['descontoGeral', 'acrescimos'].includes(k) && v == null ? '0' : decimais.has(k) && typeof v === 'number' ? String(v) : normalizar(v)]))
  return valor
}
const cadeia = new CadeiaIa([criarProvedor({ nome: 'simulado', modelo: 'modelo-e2e', tipo: 'openai-compativel', urlBase: `http://127.0.0.1:${porta}/v1`, chave: 'ficticia' })])
const app = await criarApp({ autenticar: async segredo => segredo === 'a'.repeat(64) ? '11111111-1111-4111-8111-111111111111' : undefined,
  orquestrador: new Orquestrador({ cache: new CacheMemoria(),
    decodificarQr: async (...args) => { qrChamadas++; return decodificarQr(...args) },
    // Sem busca externa. A fixture de portal é o retorno do leitor próprio simulado.
    leitorUf: async entrada => notas.get(entrada.chaveAcesso ?? new URL(entrada.qrUrl).searchParams.get('p')?.slice(0, 44)),
    ia: (entrada, contexto) => cadeia.ler(entrada, contexto),
  }, true),
})
app.post('/_fixture', async req => {
  const { chave, nota } = req.body
  const pronta = notaSchema.parse(normalizar(nota)); notas.set(chave.toUpperCase(), pronta); iaNota = pronta
  qrChamadas = 0; iaChamadas = 0
  return { ok: true }
})
app.get('/_observacoes', async () => ({ qrChamadas, iaChamadas }))
app.post('/v1/chat/completions', async () => {
  iaChamadas++
  if (!iaNota) throw new Error('Fixture IA ausente')
  return { choices: [{ message: { content: JSON.stringify(iaNota) } }], usage: { prompt_tokens: 127, completion_tokens: 53 } }
})
for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => { void app.close() })
await app.listen({ port: porta, host: '0.0.0.0' })
