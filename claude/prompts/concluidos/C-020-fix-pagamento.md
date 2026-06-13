# C-020-FIX — Método de Pagamento na Seção 3 do Criar Orçamento

**Tipo:** correção do C-020  
**Arquivo:** `src/pages/orcamentos/CriarOrcamentoPage.tsx`  

---

## Contexto

A seção "3 Condições de pagamento" precisa perguntar o método de pagamento **antes** de perguntar sobre o sinal. O método escolhido aparece no PDF do orçamento como "método combinado".

**Métodos:** Pix | Dinheiro | Crédito | Débito | Transferência | Boleto Bancário | Outro  
**"Outro":** exige justificativa com mínimo de 50 caracteres.

---

## Prompt

Cole este prompt no Claude Code:

---

No arquivo `src/pages/orcamentos/CriarOrcamentoPage.tsx`, atualizar a seção "3 Condições de pagamento" para incluir o método de pagamento **antes** do toggle de sinal.

### 1. Adicionar estado para método de pagamento

```tsx
const METODOS_PAGAMENTO = [
  { id: 'pix',           label: 'Pix' },
  { id: 'dinheiro',      label: 'Dinheiro' },
  { id: 'credito',       label: 'Crédito' },
  { id: 'debito',        label: 'Débito' },
  { id: 'transferencia', label: 'Transferência' },
  { id: 'boleto',        label: 'Boleto Bancário' },
  { id: 'outro',         label: 'Outro' },
]

// Adicionar aos estados da página principal:
const [metodoPagamento, setMetodoPagamento] = useState('pix')
const [metodoPagamentoObs, setMetodoPagamentoObs] = useState('')
const [metodoPagamentoObsFocus, setMetodoPagamentoObsFocus] = useState(false)
```

### 2. Atualizar o componente PagamentoSection

Substituir a assinatura e o conteúdo do `PagamentoSection` para incluir os novos campos:

```tsx
function PagamentoSection({
  metodoPagamento, setMetodoPagamento,
  metodoPagamentoObs, setMetodoPagamentoObs,
  ativo, setAtivo,
  tipo, setTipo,
  valor, setValor,
  sinalAplicado, restante,
}: {
  metodoPagamento: string
  setMetodoPagamento: (v: string) => void
  metodoPagamentoObs: string
  setMetodoPagamentoObs: (v: string) => void
  ativo: boolean
  setAtivo: (v: boolean) => void
  tipo: '%' | 'R$'
  setTipo: (v: '%' | 'R$') => void
  valor: string
  setValor: (v: string) => void
  sinalAplicado: number
  restante: number
}) {
  const [focus, setFocus] = useState<string | null>(null)
  const obsCharCount = metodoPagamentoObs.length
  const obsValida = metodoPagamento !== 'outro' || obsCharCount >= 50

  return (
    <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* MÉTODO DE PAGAMENTO */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
            <Icons.wallet />
          </span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Método de pagamento</div>
            <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Como a cliente vai pagar.</div>
          </div>
        </div>

        {/* Grid de chips de método */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {METODOS_PAGAMENTO.map(m => {
            const on = metodoPagamento === m.id
            return (
              <button key={m.id} onClick={() => setMetodoPagamento(m.id)} style={{
                height: 38, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                border: `1.5px solid ${on ? '#2A9D8F' : '#EFEDE8'}`,
                background: on ? '#2A9D8F' : '#fff',
                color: on ? '#fff' : '#5C594F',
                transition: 'all .14s',
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#FAF8F5' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = '#fff' }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Campo de justificativa para "Outro" */}
        {metodoPagamento === 'outro' && (
          <div style={{ marginTop: 12, animation: 'fadeUp .2s ease both' }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
                <span>Descreva o método de pagamento <span style={{ color: '#F97316' }}>*</span></span>
                <span style={{ fontWeight: 400, color: obsCharCount >= 50 ? '#3E9D5A' : '#A29E96' }}>
                  {obsCharCount}/50 caracteres mín.
                </span>
              </span>
              <textarea
                value={metodoPagamentoObs}
                onChange={e => setMetodoPagamentoObs(e.target.value)}
                onFocus={() => setFocus('obs')}
                onBlur={() => setFocus(null)}
                placeholder="Ex: cheque à vista, transferência internacional..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: `1.5px solid ${focus === 'obs' ? '#2A9D8F' : obsCharCount > 0 && obsCharCount < 50 ? '#F2B8A6' : '#EFEDE8'}`,
                  borderRadius: 10, fontSize: 14, color: '#3A372F',
                  background: '#fff', outline: 'none', fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box',
                  boxShadow: focus === 'obs' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                  transition: 'border-color .15s',
                }}
              />
              {obsCharCount > 0 && obsCharCount < 50 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 13, color: '#C0492B' }}>
                  <Icons.alertCircle width={13} height={13} />
                  Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
                </div>
              )}
            </label>
          </div>
        )}
      </div>

      {/* DIVISOR */}
      <div style={{ height: 1, background: '#EFEDE8' }} />

      {/* SINAL */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: 'rgba(42,157,143,0.10)', color: '#2A9D8F' }}>
              <Icons.dollar />
            </span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#3A372F' }}>Cobrar entrada (sinal)?</div>
              <div style={{ fontSize: 12.5, color: '#A29E96', marginTop: 1 }}>Garante o início da produção.</div>
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
            {([['Não', false], ['Sim', true]] as [string, boolean][]).map(([lbl, val]) => (
              <button key={String(lbl)} onClick={() => setAtivo(val)} style={{
                width: 60, height: 40, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                background: ativo === val ? (val ? '#2A9D8F' : '#F1F0EC') : '#fff',
                color: ativo === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                transition: 'background .14s',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Campos de valor do sinal */}
        {ativo && (
          <div style={{ marginTop: 16, animation: 'fadeUp .25s ease both' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', borderRadius: 9, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
                {(['%', 'R$'] as const).map(tp => (
                  <button key={tp} onClick={() => setTipo(tp)} style={{
                    width: 46, height: 46, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    background: tipo === tp ? '#2A9D8F' : '#fff',
                    color: tipo === tp ? '#fff' : '#8A8780',
                  }}>{tp}</button>
                ))}
              </div>
              <input
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                onFocus={() => setFocus('s')}
                onBlur={() => setFocus(null)}
                inputMode="decimal"
                placeholder={tipo === '%' ? '50' : '0,00'}
                style={{
                  flex: 1, minWidth: 0, height: 46, padding: '0 14px',
                  border: `1.5px solid ${focus === 's' ? '#2A9D8F' : '#EFEDE8'}`,
                  borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#3A372F',
                  background: '#fff', outline: 'none', fontFamily: 'inherit',
                  boxShadow: focus === 's' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                  transition: 'border-color .15s',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(42,157,143,0.06)', border: '1px dashed rgba(42,157,143,0.35)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#2A9D8F' }}>
                  <Icons.wallet width={15} height={15} /> Sinal solicitado
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>
                  {`R$ ${sinalAplicado.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '0 2px' }}>
                <span>Restante após sinal</span>
                <span style={{ fontWeight: 600, color: '#3A372F', fontVariantNumeric: 'tabular-nums' }}>
                  {`R$ ${restante.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3. Atualizar o uso do PagamentoSection na página principal

```tsx
<PagamentoSection
  metodoPagamento={metodoPagamento}
  setMetodoPagamento={setMetodoPagamento}
  metodoPagamentoObs={metodoPagamentoObs}
  setMetodoPagamentoObs={setMetodoPagamentoObs}
  ativo={sinalAtivo}
  setAtivo={setSinalAtivo}
  tipo={sinalTipo}
  setTipo={setSinalTipo}
  valor={sinalValor}
  setValor={setSinalValor}
  sinalAplicado={sinalAplicado}
  restante={restante}
/>
```

---

## Como testar

### URL: `http://localhost:5173/orcamentos/novo`

### Passo 1 — Verificar seção 3 atualizada
- Abre `http://localhost:5173/orcamentos/novo`
- Rolar até a seção **"3 Condições de pagamento"**
- ✅ Primeiro bloco: ícone carteira + "Método de pagamento" + chips dos 7 métodos
- ✅ "Pix" selecionado por padrão (teal)
- ✅ Divisor horizontal entre método e sinal
- ✅ Segundo bloco: "Cobrar entrada (sinal)?" igual ao anterior

### Passo 2 — Testar seleção de método
- Clicar em "Crédito" → chip fica teal, "Pix" volta ao branco
- Clicar em "Boleto Bancário" → seleciona corretamente

### Passo 3 — Testar método "Outro"
- Clicar em **"Outro"**
- ✅ Campo de textarea aparece com animação
- Digitar 10 caracteres → contador mostra "10/50 · Faltam 40" em vermelho
- Digitar até 50+ caracteres → contador fica verde, mensagem de erro some
- ✅ Enquanto menor que 50 caracteres, mostrar mensagem de erro

### Passo 4 — Testar sinal (sem alteração)
- Toggle "Sim" → campos de sinal aparecem normalmente
- Cálculo continua funcionando

### Passo 5 — Comparar posição na tela
A seção 3 deve ficar:
```
[3] Condições de pagamento
    Quer pedir um sinal (entrada) para começar?

    💳 Método de pagamento
       Como a cliente vai pagar.
    [Pix] [Dinheiro] [Crédito] [Débito] [Transferência] [Boleto Bancário] [Outro]

    ─────────────────────────────────────────

    💰 Cobrar entrada (sinal)?
       Garante o início da produção.    [Não][Sim]
```

---

## Checklist de validação

- [ ] 7 chips de método de pagamento visíveis
- [ ] "Pix" selecionado por padrão
- [ ] Seleção exclusiva (só um método por vez)
- [ ] "Outro" exibe textarea com contador de caracteres
- [ ] Menos de 50 chars: contador vermelho + mensagem de erro
- [ ] 50+ chars: contador verde, erro some
- [ ] Divisor entre método e sinal
- [ ] Sinal continua funcionando normalmente abaixo
- [ ] `npm run dev` sem erros TypeScript

## Commit

```bash
git add .
git commit -m "feat(orcamentos): adiciona método de pagamento na seção 3 do Criar Orçamento"
```
