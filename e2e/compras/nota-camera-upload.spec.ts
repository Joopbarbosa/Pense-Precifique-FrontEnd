import { test, expect, type APIRequestContext } from '@playwright/test'
import QRCode from 'qrcode'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { login } from '../helpers/auth'
import { apiLogin, criarInsumo } from '../helpers/api'

const leitor = `http://localhost:${process.env.E2E_LEITOR_FALSO_PORT ?? 13502}`
const chave = () => '35' + String(Date.now()).padStart(13, '0') + String(Math.floor(Math.random() * 1e9)).padStart(29, '0')
async function fixture(request: APIRequestContext, origem = 'NFE_FOTO') {
  const token = await apiLogin(request); const nome = `Papel E2E682 ${Date.now()}`
  await criarInsumo(request, token, nome)
  const acesso = chave(); const qrUrl = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${acesso}|2|1|1|HASH`
  const nota = { emitente: { cnpj: '11222333000181', nome: 'Papelaria Estrela E2E', uf: 'SP' }, chaveAcesso: acesso, numero: '1', serie: '1', dataEmissao: new Date(Date.now() - 86_400_000).toISOString(), totalPago: '17.43', descontoGeral: '0', acrescimos: '0', itens: [{ nome, quantidade: '3', valorFinal: '17.43', unidade: 'UN' }], origem, metodo: origem === 'NFCE_QR' ? 'LEITOR_UF' : 'IA', doCache: false, uf: 'SP', leiaute: 'SP-E2E682', avisos: [] }
  const r = await request.post(`${leitor}/_fixture`, { data: { chave: acesso, nota } }); expect(r.ok(), await r.text()).toBeTruthy()
  return { nome, qrUrl, nota }
}
// /_observacoes só existe no leitor integrado (e2e/fakes/leitor-fiscal-integrado.mjs), que sobe com E2E_LEITOR_REAL_REPO
// apontando para o checkout compilado (dist) do leitor-fiscal. Sem isso o leitor falso devolve "rota inexistente".
const observacoes = async (request: APIRequestContext) => {
  const corpo = await (await request.get(`${leitor}/_observacoes`)).json()
  if ('erro' in corpo) {
    throw new Error('Leitor de teste sem /_observacoes: defina E2E_LEITOR_REAL_REPO com o checkout compilado (dist) do leitor-fiscal, na versão do commit fixado.')
  }
  return corpo
}

test('CEN6: foto NF-e reduzida, cancelamento não envia, aceite abre conciliação com IA sem QR', async ({ page, request }) => {
  const f = await fixture(request)
  await login(page); await page.goto('/compras/nota'); await page.getByRole('button', { name: 'Nota (NF-e)', exact: true }).click()
  const foto = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 3600; c.height = 2400; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#000'; ctx.font = '60px sans-serif'; ctx.fillText('NOTA FISCAL DE TESTE SEM QR', 100, 150); return c.toDataURL('image/png').split(',')[1] })
  let envios = 0; page.on('request', r => { if (r.url().includes('/compras/nota/leitura') && r.method() === 'POST') envios++ })
  await page.getByTestId('campo-xml').setInputFiles({ name: 'nota-grande.png', mimeType: 'image/png', buffer: Buffer.from(foto, 'base64') })
  await expect(page.getByTestId('arquivo-nota-preparado')).toContainText('nota-grande.jpg')
  await page.getByRole('button', { name: 'Ler nota', exact: true }).click(); await expect(page.getByText(/pode conter seu CPF/)).toBeVisible(); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(envios).toBe(0)
  await page.getByRole('button', { name: 'Ler nota', exact: true }).click(); await page.getByRole('button', { name: 'Aceitar e ler documento', exact: true }).click()
  await expect(page.getByText('Conferir itens da nota', { exact: true })).toBeVisible(); await expect(page.getByTestId('item-nota-0')).toContainText(f.nome)
  expect(await observacoes(request)).toMatchObject({ qrChamadas: 0, iaChamadas: 1 }); expect(envios).toBe(1)
})

test('CEN7: print do QR passa por decodificador real e abre conciliação sem câmera/IA', async ({ page, request }) => {
  const f = await fixture(request, 'NFCE_QR'); const png = await QRCode.toBuffer(f.qrUrl, { width: 640, margin: 4 })
  await login(page); await page.goto('/compras/nota')
  await page.getByTestId('campo-xml').setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Ler nota', exact: true }).click(); await page.getByRole('button', { name: 'Aceitar e ler documento', exact: true }).click()
  await expect(page.getByText('Conferir itens da nota', { exact: true })).toBeVisible(); await expect(page.getByTestId('item-nota-0')).toContainText(f.nome)
  expect(await observacoes(request)).toMatchObject({ qrChamadas: 1, iaChamadas: 0 }); await expect(page.getByTestId('camera-nota')).toHaveCount(0)
})

test('câmera: jsQR decodifica vídeo controlado, usa link e libera stream ao abrir conciliação', async ({ page, request }) => {
  const f = await fixture(request, 'NFCE_QR'); const png = await QRCode.toDataURL(f.qrUrl, { width: 640, margin: 4 })
  await page.addInitScript(({ imagem }) => {
    const w = window as typeof window & { __cameraTerminou?: () => boolean }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 640; const ctx = c.getContext('2d')!; const img = new Image(); const pronta = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject }); img.src = imagem; await pronta; ctx.drawImage(img, 0, 0)
      const stream = c.captureStream(10); w.__cameraTerminou = () => stream.getTracks().every(t => t.readyState === 'ended'); return stream
    } } })
  }, { imagem: png })
  await login(page); await page.goto('/compras/nota'); await page.getByRole('button', { name: 'Ler QR pela câmera', exact: true }).click()
  await expect(page.getByText('Conferir itens da nota', { exact: true })).toBeVisible({ timeout: 15_000 }); await expect(page.getByTestId('item-nota-0')).toContainText(f.nome)
  expect(await page.evaluate(() => (window as typeof window & { __cameraTerminou?: () => boolean }).__cameraTerminou?.())).toBe(true)
  expect(await observacoes(request)).toMatchObject({ qrChamadas: 0, iaChamadas: 0 })
})

test('PDF textual pede aceite e percorre cadeia IA', async ({ page, request }) => {
  const f = await fixture(request, 'NFE_PDF'); const pdf = await PDFDocument.create(); const pagina = pdf.addPage(); const fonte = await pdf.embedFont(StandardFonts.Helvetica); pagina.drawText('NOTA FISCAL DE TESTE. ITENS Papel 3 unidades 17,43.', { font: fonte, size: 12 }); const dados = Buffer.from(await pdf.save())
  await login(page); await page.goto('/compras/nota'); await page.getByRole('button', { name: 'Nota (NF-e)', exact: true }).click()
  await page.getByTestId('campo-xml').setInputFiles({ name: 'nota.pdf', mimeType: 'application/pdf', buffer: dados }); await page.getByRole('button', { name: 'Ler nota', exact: true }).click(); await page.getByRole('button', { name: 'Aceitar e ler documento', exact: true }).click()
  await expect(page.getByTestId('item-nota-0')).toContainText(f.nome); expect(await observacoes(request)).toMatchObject({ qrChamadas: 0, iaChamadas: 1 })
})

test('negativos: PDF acima5MB e tipo inválido bloqueiam sem envio; câmera negada orienta alternativa', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError') } } }))
  await login(page); await page.goto('/compras/nota'); let envios = 0; page.on('request', r => { if (r.url().includes('/compras/nota/leitura')) envios++ })
  await page.getByTestId('campo-xml').setInputFiles({ name: 'nota.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }); await expect(page.getByTestId('modal-erro')).toContainText('tamanho máximo permitido é 5MB'); await page.getByRole('button', { name: 'OK', exact: true }).click()
  await page.getByTestId('campo-xml').setInputFiles({ name: 'arquivo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') }); await expect(page.getByTestId('modal-erro')).toContainText('XML, PDF, JPG ou PNG'); await page.getByRole('button', { name: 'OK', exact: true }).click()
  await page.getByRole('button', { name: 'Ler QR pela câmera', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Permita o acesso'); await page.getByRole('button', { name: 'Fechar câmera', exact: true }).click(); expect(envios).toBe(0)
})


test('XML válido continua sem aviso e usa parser real sem IA/QR', async ({ page, request }) => {
  const f = await fixture(request, 'NFE_XML')
  const cnpj = f.nota.emitente.cnpj
  const acesso = '35' + '2610' + cnpj + '55' + '001' + String(Date.now() % 1e9).padStart(9, '0') + '1' + '12345678' + '9'
  const xml = `<NFe><infNFe Id="NFe${acesso}" versao="4.00"><ide><cUF>35</cUF><mod>55</mod><nNF>1</nNF><serie>1</serie><dhEmi>${f.nota.dataEmissao}</dhEmi></ide><emit><CNPJ>${cnpj}</CNPJ><xNome>Papelaria Estrela E2E</xNome><enderEmit><UF>SP</UF></enderEmit></emit><det nItem="1"><prod><xProd>${f.nome}</xProd><qCom>3</qCom><uCom>UN</uCom><vProd>17.43</vProd></prod></det><total><ICMSTot><vNF>17.43</vNF></ICMSTot></total></infNFe></NFe>`
  await login(page); await page.goto('/compras/nota'); await page.getByRole('button', { name: 'Nota (NF-e)', exact: true }).click()
  await page.getByTestId('campo-xml').setInputFiles({ name: 'nota.xml', mimeType: 'application/xml', buffer: Buffer.from(xml) }); await page.getByRole('button', { name: 'Ler nota', exact: true }).click()
  await expect(page.getByTestId('item-nota-0')).toContainText(f.nome); await expect(page.getByRole('button', { name: 'Aceitar e ler documento', exact: true })).toHaveCount(0)
  expect(await observacoes(request)).toMatchObject({ qrChamadas: 0, iaChamadas: 0 })
})

// #729: QR lido pela câmera que não é link (ex.: Pix) não vai ao backend; a câmera segue aberta com a orientação.
test('câmera: QR que não é link orienta e não envia ao backend', async ({ page }) => {
  const png = await QRCode.toDataURL('00020126580014BR.GOV.BCB.PIX0136chave-pix-de-teste5204000053039865802BR', { width: 640, margin: 4 })
  await page.addInitScript(({ imagem }) => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 640
      const ctx = c.getContext('2d')!
      const img = new Image()
      const pronta = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject })
      img.src = imagem
      await pronta
      ctx.drawImage(img, 0, 0)
      return c.captureStream(10)
    } } })
  }, { imagem: png })
  let envios = 0
  page.on('request', r => { if (r.url().includes('/compras/nota/leitura')) envios++ })
  await login(page)
  await page.goto('/compras/nota')
  await page.getByRole('button', { name: 'Ler QR pela câmera', exact: true }).click()
  await expect(page.getByTestId('camera-nota-aviso')).toContainText('não é o link de uma nota fiscal', { timeout: 15_000 })
  await expect(page.getByTestId('camera-nota')).toBeVisible()
  expect(envios).toBe(0)
})
