# C-021-FIX-2 — Modal de Cancelamento para Status "Sinal Pago"

**Tipo:** correção do C-021  
**Arquivo:** `src/pages/orcamentos/DetalheOrcamentoPage.tsx`  

---

## Contexto

Quando o orçamento está em **"Sinal Pago"** e a artesã cancela, o sistema deve perguntar se quer estornar o sinal ao cliente. Se sim, gera um recibo de estorno em laranja.

**Regras:**
- Multa **não** se aplica no status "Sinal Pago" — produção não iniciou
- Se optar por não estornar → só registra o cancelamento
- Se optar por estornar → gera recibo de estorno com destaque laranja

---

## Prompt

Cole este prompt no Claude Code:

---

No arquivo `src/pages/orcamentos/DetalheOrcamentoPage.tsx`, adicionar o componente `ModalCancelSinalPago` — wizard de 2 passos para cancelamento quando status é "Sinal Pago".

**Visual de referência:** seguir o mesmo padrão visual dos outros modais de cancelamento já existentes no arquivo, usando laranja `#F97316` como cor de destaque para o recibo de estorno.

---

### Componente ModalCancelSinalPago (adicionar antes da função principal)

```tsx
function ModalCancelSinalPago({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [estornar, setEstornar] = useState(true)
  const [focusField, setFocusField] = useState(false)
  const [dataEstorno, setDataEstorno] = useState('2026-06-13')

  const valorSinal = 91.80
  const nomeCliente = 'Mariana Costa'

  // Barra de progresso (2 passos)
  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px' }}>
      {[1, 2].map(n => (
        <span key={n} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: n <= step ? '#C0492B' : '#EFEDE8',
        }} />
      ))}
    </div>
  )

  // Header comum
  const Header = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: '1px solid #EFEDE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#FCF3F0', color: '#C0492B', flexShrink: 0 }}>
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cancelar · Passo {step} de 2
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3A372F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
        </div>
      </div>
      <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: '#F1F0EC', color: '#7C786F', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icons.x />
      </button>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(20,18,16,0.4)', backdropFilter: 'blur(1.5px)', animation: 'fadeIn .2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        {/* ─── PASSO 1 — ESTORNO ─── */}
        {step === 1 && (
          <>
            <Header title={`Estornar sinal para ${nomeCliente}?`} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px' }}>

              {/* Valor do sinal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Sinal recebido</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                    {`R$ ${valorSinal.toFixed(2).replace('.', ',')}`}
                  </div>
                </div>
                <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 13, background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
                  <Icons.wallet />
                </span>
              </div>

              {/* Toggle Sim/Não */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#3A372F', marginBottom: 10 }}>
                  Deseja estornar o sinal?
                </div>
                <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', width: 'fit-content' }}>
                  {([['Não', false], ['Sim', true]] as [string, boolean][]).map(([lbl, val]) => (
                    <button key={String(lbl)} onClick={() => setEstornar(val)} style={{
                      width: 80, height: 44, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                      background: estornar === val ? (val ? '#F97316' : '#F1F0EC') : '#fff',
                      color: estornar === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                      transition: 'all .14s',
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Data do estorno (só quando Sim) */}
              {estornar && (
                <div style={{ animation: 'fadeUp .2s ease both' }}>
                  <label style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
                      <Icons.calendar style={{ color: '#F97316' }} /> Data do estorno
                    </span>
                    <input
                      type="date"
                      value={dataEstorno}
                      onChange={e => setDataEstorno(e.target.value)}
                      onFocus={() => setFocusField(true)}
                      onBlur={() => setFocusField(false)}
                      style={{
                        width: '100%', height: 46, padding: '0 14px',
                        border: `1.5px solid ${focusField ? '#F97316' : '#EFEDE8'}`,
                        borderRadius: 10, fontSize: 14.5, color: '#3A372F',
                        background: '#fff', outline: 'none', fontFamily: 'inherit',
                        boxShadow: focusField ? '0 0 0 4px rgba(249,115,22,0.12)' : 'none',
                        transition: 'border-color .15s, box-shadow .15s',
                      }}
                    />
                  </label>

                  {/* Aviso recibo */}
                  <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}>
                    <Icons.receipt style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: '#8A5A33', lineHeight: 1.55 }}>
                      Um <strong style={{ fontWeight: 700 }}>recibo de estorno</strong> será gerado para enviar à cliente como comprovante da devolução.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso sem estorno */}
              {!estornar && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#F7F5F1', border: '1px solid #EFEDE8', animation: 'fadeUp .2s ease both' }}>
                  <Icons.info style={{ flexShrink: 0, color: '#A29E96', marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: '#6B6860', lineHeight: 1.55 }}>
                    O orçamento será cancelado sem devolução do sinal. Nenhum documento será gerado.
                  </p>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={onClose}>Voltar</Button>
              <Button variant="primary" fullWidth onClick={() => setStep(2)}>
                {estornar ? 'Próximo →' : 'Confirmar cancelamento'}
              </Button>
            </div>
          </>
        )}

        {/* ─── PASSO 2 — CONFIRMAR ESTORNO ─── */}
        {step === 2 && estornar && (
          <>
            <Header title="Confirmar estorno do sinal" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card de destaque do recibo — laranja */}
              <div style={{
                borderRadius: 14,
                background: 'linear-gradient(135deg, #F97316 0%, #F4853A 100%)',
                padding: '20px 22px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Blob decorativo */}
                <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', top: -40, right: -30, pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
                    Recibo de Estorno
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                    {`R$ ${valorSinal.toFixed(2).replace('.', ',')}`}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.88)' }}>
                    {nomeCliente} · {dataEstorno.split('-').reverse().join('/')}
                  </div>
                </div>
              </div>

              {/* Resumo da operação */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Cliente', nomeCliente],
                  ['Valor do estorno', `R$ ${valorSinal.toFixed(2).replace('.', ',')}`],
                  ['Data do estorno', dataEstorno.split('-').reverse().join('/')],
                  ['Orçamento', '#0042'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '9px 0', borderBottom: '1px solid #EFEDE8' }}>
                    <span style={{ color: '#A29E96', fontWeight: 500 }}>{label}</span>
                    <span style={{ color: '#3A372F', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Aviso final */}
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <Icons.receipt style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: '#8A5A33', lineHeight: 1.55 }}>
                  O recibo de estorno ficará disponível para download na tela de detalhe do orçamento cancelado.
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
              <Button variant="primary" fullWidth onClick={onClose}>
                Confirmar e gerar recibo de estorno
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
```

---

### Atualizar a lógica de cancelamento na página principal

No `DetalheOrcamentoPage`, atualizar a constante de status e a lógica do modal de cancelar:

```tsx
// Status mockado — trocar para 'Sinal Pago' para testar este modal
const statusAtual = 'Sinal Pago'

// Lógica de qual modal abrir
const cancelaComWizard = statusAtual === 'Em Produção' || statusAtual === 'Finalizado'
const cancelaComEstorno = statusAtual === 'Sinal Pago'

// Substituir os modais de cancelar por:
{modalCancel && cancelaComWizard && (
  <ModalCancelWizard onClose={() => setModalCancel(false)} />
)}
{modalCancel && cancelaComEstorno && (
  <ModalCancelSinalPago onClose={() => setModalCancel(false)} />
)}
{modalCancel && !cancelaComWizard && !cancelaComEstorno && (
  <ModalCancelSimples onClose={() => setModalCancel(false)} />
)}
```

---

## Como testar

### URL: `http://localhost:5173/orcamentos/0042`

### Passo 1 — Verificar que o status está em "Sinal Pago"
Confirmar que `statusAtual = 'Sinal Pago'` no código e que a timeline mostra "Sinal Pago" como atual.

### Passo 2 — Abrir modal de cancelamento
Clicar em **"Cancelar orçamento"** (texto vermelho abaixo da timeline).

### Passo 3 — Verificar Passo 1
- Modal abre com "Cancelar · Passo 1 de 2"
- Card laranja mostrando "Sinal recebido — R$ 91,80"
- Toggle "Não/Sim" com "Sim" selecionado (laranja)
- Campo de data preenchido com hoje
- Aviso laranja: "Um recibo de estorno será gerado..."
- ✅ Trocar para "Não" → aviso muda para cinza "sem devolução, nenhum documento será gerado"
- ✅ Trocar de volta para "Sim" → campos voltam com animação
- Clicar **"Próximo →"**

### Passo 4 — Verificar Passo 2
- Header: "Passo 2 de 2 · Confirmar estorno do sinal"
- Card laranja com gradiente mostrando "Recibo de Estorno · R$ 91,80"
- Nome da cliente e data abaixo do valor
- Tabela resumo: Cliente, Valor, Data, Orçamento
- Aviso laranja sobre disponibilidade do recibo
- Clicar **"← Voltar"** → volta ao passo 1
- Clicar **"Confirmar e gerar recibo de estorno"** → modal fecha

### Passo 5 — Testar fluxo sem estorno
1. Abrir modal novamente
2. Selecionar **"Não"** no toggle
3. Botão muda para **"Confirmar cancelamento"** (sem "Próximo")
4. Clicar → modal fecha direto (sem passo 2)

---

## Checklist de validação

- [ ] Modal abre ao clicar "Cancelar orçamento" com status "Sinal Pago"
- [ ] Passo 1: card laranja com valor do sinal, toggle Sim/Não, campo de data
- [ ] Toggle "Sim": campo de data + aviso laranja aparecem com animação
- [ ] Toggle "Não": aviso cinza aparece, botão vira "Confirmar cancelamento" direto
- [ ] Passo 2: card laranja com gradiente, resumo da operação, aviso do recibo
- [ ] Navegação entre passos (Próximo / Voltar)
- [ ] Fluxo "Não" encerra no passo 1 sem ir para passo 2
- [ ] Clicar fora fecha o modal
- [ ] `npm run dev` sem erros TypeScript

## Commit

```bash
git add .
git commit -m "feat(orcamentos): adiciona ModalCancelSinalPago com wizard de estorno em 2 passos"
```
