import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { LINHAS_BUSCA_VISIVEIS, limitarOpcoesBusca } from '../../src/constants/buscadores.ts'

// PP-698 — PDT-010 / INS-008: buscador sempre com 6 registros no primeiro clique.

test('o limite dos buscadores é 6', () => {
  assert.equal(LINHAS_BUSCA_VISIVEIS, 6)
})

test('lista com mais de 6 opções é cortada em 6, na ordem recebida', () => {
  const opcoes = Array.from({ length: 10 }, (_, i) => ({ valor: String(i) }))
  const r = limitarOpcoesBusca(opcoes)
  assert.equal(r.length, 6)
  assert.deepEqual(r.map(o => o.valor), ['0', '1', '2', '3', '4', '5'])
  assert.equal(opcoes.length, 10)
})

test('lista com 6 ou menos opções passa inteira, e lista vazia continua vazia', () => {
  assert.equal(limitarOpcoesBusca([1, 2, 3, 4, 5, 6]).length, 6)
  assert.equal(limitarOpcoesBusca([1, 2]).length, 2)
  assert.deepEqual(limitarOpcoesBusca([]), [])
})

test('nenhum buscador ou serviço de busca volta a fixar 8 registros', () => {
  const arquivos = {
    'src/components/shared/CampoFiltros.tsx': /slice\(0,\s*8\)/,
    'src/services/orcamentoService.ts': /size\s*=\s*8\b/,
    'src/services/caixaService.ts': /size\s*=\s*8\b/,
  }
  for (const [arq, proibido] of Object.entries(arquivos)) {
    const fonte = readFileSync(new URL(`../../${arq}`, import.meta.url), 'utf8')
    assert.doesNotMatch(fonte, proibido, `${arq} ainda fixa 8 registros`)
  }
  const filtros = readFileSync(new URL('../../src/components/shared/CampoFiltros.tsx', import.meta.url), 'utf8')
  assert.match(filtros, /limitarOpcoesBusca\(r\)/)
})
