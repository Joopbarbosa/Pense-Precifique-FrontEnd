# C-021-FIX-3 — Método de Pagamento no Modal de Confirmar Sinal

**Tipo:** correção do C-021  
**Arquivo:** `src/pages/orcamentos/DetalheOrcamentoPage.tsx`  

---

## Contexto

O `ModalSinal` (confirmar recebimento do sinal) precisa de um campo de **método de pagamento recebido** — separado do método combinado no orçamento, pois podem ser diferentes.

O método confirmado aqui aparece no **recibo do sinal**.

---

## Prompt

Cole este prompt no Claude Code:

---

No arquivo `src/pages/orcamentos/DetalheOrcamentoPage.tsx`, atualizar o componente `ModalSinal` para incluir seleção de método de pagamento com campo de justificativa para "Outro".

### 1. Adicionar constante de métodos (antes do componente)

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
```

### 2. Substituir o componente ModalSinal completo

```tsx
function ModalSinal({ onClose }: { onClose: () => void }) {
  const [forma, setForma] = useState('pix')
  const [formaObs, setFormaObs] = useState('')
  const [data, setData] = useState('2026-06-05')
  const [focus, setFocus] = useState<string | null>(null)

  const obsCharCount = formaObs.length
  const obsValida = forma !== 'outro' || obsCharCount >= 50
  const podeConfirmar = obsValida

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Confirmar recebimento do sinal"
      subtitle="Aguardando Sinal"
      icon={<Icons.wallet />}
      iconBg="#FFF4E8"
      iconColor="#B5701F"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!podeConfirmar} onClick={onClose}>
            Confirmar e gerar recibo →
          </Button>
        </>
      }
    >
      {/* Valor esperado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: 'rgba(42,157,143,0.07)', border: '1px solid rgba(42,157,143,0.2)', marginBottom: 20 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#5C594F' }}>Valor esperado</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#2A9D8F', fontVariantNumeric: 'tabular-nums' }}>
          R$ 91,80 <span style={{ fontSize: 13, fontWeight: 600, color: '#A29E96' }}>(50%)</span>
        </span>
      </div>

      {/* Forma de pagamento — chips */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 9 }}>
          Forma de pagamento recebida
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {METODOS_PAGAMENTO.map(m => {
            const on = forma === m.id
            return (
              <button key={m.id} onClick={() => setForma(m.id)} style={{
                height: 38, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
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

        {/* Campo justificativa para Outro */}
        {forma === 'outro' && (
          <div style={{ marginTop: 12, animation: 'fadeUp .2s ease both' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
              <span>Descreva a forma de pagamento <span style={{ color: '#F97316' }}>*</span></span>
              <span style={{ fontWeight: 400, color: obsCharCount >= 50 ? '#3E9D5A' : '#A29E96' }}>
                {obsCharCount}/50 mín.
              </span>
            </span>
            <textarea
              value={formaObs}
              onChange={e => setFormaObs(e.target.value)}
              onFocus={() => setFocus('obs')}
              onBlur={() => setFocus(null)}
              placeholder="Ex: cheque à vista, app de pagamento..."
              rows={2}
              style={{
                width: '100%', padding: '10px 14px',
                border: `1.5px solid ${focus === 'obs' ? '#2A9D8F' : obsCharCount > 0 && obsCharCount < 50 ? '#F2B8A6' : '#EFEDE8'}`,
                borderRadius: 10, fontSize: 13.5, color: '#3A372F',
                background: '#fff', outline: 'none', fontFamily: 'inherit',
                resize: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                boxShadow: focus === 'obs' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
              }}
            />
            {obsCharCount > 0 && obsCharCount < 50 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12.5, color: '#C0492B' }}>
                <Icons.alertCircle width={13} height={13} /> Mínimo de 50 caracteres. Faltam {50 - obsCharCount}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data */}
      <label style={{ display: 'block', marginBottom: 18 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
          <Icons.calendar style={{ color: '#2A9D8F' }} /> Data do recebimento
        </span>
        <input
          type="date" value={data}
          onChange={e => setData(e.target.value)}
          onFocus={() => setFocus('d')}
          onBlur={() => setFocus(null)}
          style={{
            width: '100%', height: 46, padding: '0 14px',
            border: `1.5px solid ${focus === 'd' ? '#2A9D8F' : '#EFEDE8'}`,
            borderRadius: 10, fontSize: 14.5, color: '#3A372F',
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            boxShadow: focus === 'd' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
          }}
        />
      </label>

      {/* Aviso */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.18)' }}>
        <Icons.receipt style={{ flexShrink: 0, color: '#2A9D8F', marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: '#5C594F', lineHeight: 1.55 }}>
          Após confirmar, o sistema avançará para <strong style={{ fontWeight: 600, color: '#3A372F' }}>Em Produção</strong> e gerará o recibo do sinal com a forma de pagamento registrada.
        </p>
      </div>
    </ModalShell>
  )
}
```

---

## Como testar

### URL: `http://localhost:5173/orcamentos/0042`

Para testar o ModalSinal, alterar temporariamente o status mockado para `'Aguardando Sinal'`:
```tsx
const statusAtual = 'Aguardando Sinal'
```

### Passo 1 — Abrir modal de confirmar sinal
Clicar em **"Avançar para: Sinal Pago →"**

### Passo 2 — Verificar campos
- ✅ Card teal com "Valor esperado — R$ 91,80 (50%)"
- ✅ Chips dos 7 métodos de pagamento — "Pix" selecionado por padrão
- ✅ Campo de data
- ✅ Aviso teal sobre geração do recibo

### Passo 3 — Testar seleção de método
- Clicar em "Dinheiro" → chip teal, "Pix" volta ao branco
- Clicar em "Transferência" → seleciona corretamente

### Passo 4 — Testar método "Outro"
- Clicar em **"Outro"**
- ✅ Textarea aparece com animação
- Digitar 20 chars → "20/50 mín." em cinza + mensagem erro vermelho
- Digitar até 50+ → contador fica verde, erro some
- ✅ Botão "Confirmar e gerar recibo" fica **desabilitado** enquanto < 50 chars
- ✅ Fica habilitado ao completar 50 chars

### Passo 5 — Confirmar
- Com método válido selecionado, clicar "Confirmar e gerar recibo →"
- Modal fecha

---

## Checklist de validação

- [ ] 7 chips de método visíveis, "Pix" padrão
- [ ] Seleção exclusiva entre métodos
- [ ] "Outro" exibe textarea com contador
- [ ] Menos de 50 chars: contador vermelho + botão desabilitado
- [ ] 50+ chars: contador verde + botão habilitado
- [ ] Campo de data com foco teal
- [ ] Botão "Confirmar" desabilitado com "Outro" < 50 chars
- [ ] `npm run dev` sem erros TypeScript

## Commit

```bash
git add .
git commit -m "feat(orcamentos): adiciona método de pagamento recebido no modal de confirmar sinal"
```
