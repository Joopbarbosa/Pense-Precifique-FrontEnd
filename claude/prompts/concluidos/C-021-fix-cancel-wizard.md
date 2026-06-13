# C-021-FIX — Modal de Cancelamento em 3 Passos (Em Produção / Finalizado)

**Tipo:** correção do C-021  
**Arquivo:** `src/pages/orcamentos/DetalheOrcamentoPage.tsx`  

---

## Contexto

O C-021 implementou o `ModalCancelSimples` (para Rascunho/Enviado/Aprovado), mas o cancelamento de orçamentos **Em Produção** ou **Finalizado** exige um wizard de 3 passos:

1. **Consumo** — listar o que foi consumido e dar baixa no estoque
2. **Multa** — decidir se cobra multa e calcular o valor
3. **Resumo** — confirmar e gerar PDF de multa

---

## Prompt

Cole este prompt no Claude Code:

---

No arquivo `src/pages/orcamentos/DetalheOrcamentoPage.tsx`, adicionar o componente `ModalCancelWizard` e atualizar o botão "Cancelar orçamento" para abrir o wizard quando o status for "Em Produção" ou "Finalizado".

**Visual de referência:** `design/Pense e Precifique/Detalhe.html`

---

### Dados mockados adicionais (adicionar junto aos existentes)

```tsx
const CATALOGO_CANCEL = [
  'Papel couchê 180g',
  'Fita dupla face 12mm',
  'Envelope kraft C6',
  'Linha de crochê teal',
  'Kit Convite Casamento',
]
```

---

### Componente ModalCancelWizard (adicionar antes da função principal)

```tsx
function ModalCancelWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [consumidos, setConsumidos] = useState([{ nome: 'Papel couchê 180g', qtd: '4 folhas' }])
  const [busca, setBusca] = useState('')
  const [qtd, setQtd] = useState('')
  const [openList, setOpenList] = useState(false)
  const [multaAtiva, setMultaAtiva] = useState(true)
  const [multaTipo, setMultaTipo] = useState<'%' | 'R$'>('%')
  const [multaValor, setMultaValor] = useState('50')
  const [focusField, setFocusField] = useState<string | null>(null)

  const total = 183.6
  const multaNum = parseFloat((multaValor || '0').replace(',', '.')) || 0
  const multaAplicada = multaAtiva
    ? (multaTipo === '%' ? total * multaNum / 100 : Math.min(multaNum, total))
    : 0

  const addItem = () => {
    if (!busca.trim()) return
    setConsumidos(a => [...a, { nome: busca.trim(), qtd: qtd.trim() || '1' }])
    setBusca('')
    setQtd('')
    setOpenList(false)
  }

  // Barra de progresso (3 passos)
  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, padding: '0 24px 16px' }}>
      {[1, 2, 3].map(n => (
        <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? '#C0492B' : '#EFEDE8' }} />
      ))}
    </div>
  )

  // Header comum dos 3 passos
  const Header = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: '1px solid #EFEDE8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11, background: '#FCF3F0', color: '#C0492B', flexShrink: 0 }}>
          <Icons.ban />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#A29E96', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cancelar · Passo {step} de 3
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
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(540px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>

        {/* ─── PASSO 1 — CONSUMO ─── */}
        {step === 1 && (
          <>
            <Header title="Houve consumo de insumos ou produtos?" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#5C594F', lineHeight: 1.55 }}>
                Registre o que já foi usado para dar baixa no estoque mesmo com o cancelamento.
              </p>

              {/* Buscador + campo de qtd + botão adicionar */}
              <div style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 2, minWidth: 160 }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#A29E96', display: 'flex' }}>
                    <Icons.search width={16} height={16} />
                  </span>
                  <input
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setOpenList(true) }}
                    onFocus={() => { setFocusField('b'); setOpenList(true) }}
                    onBlur={() => setFocusField(null)}
                    placeholder="Buscar insumo ou produto…"
                    style={{
                      width: '100%', height: 46, padding: '0 14px 0 40px',
                      border: `1.5px solid ${focusField === 'b' ? '#2A9D8F' : '#EFEDE8'}`,
                      borderRadius: 10, fontSize: 14, color: '#3A372F',
                      background: '#fff', outline: 'none', fontFamily: 'inherit',
                      boxShadow: focusField === 'b' ? '0 0 0 4px rgba(42,157,143,0.12)' : 'none',
                    }}
                  />
                  {/* Dropdown de sugestões */}
                  {openList && busca && (
                    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)', padding: 6, animation: 'pop .14s ease both' }}>
                      {CATALOGO_CANCEL.filter(c => c.toLowerCase().includes(busca.toLowerCase())).slice(0, 4).map(c => (
                        <button key={c} onMouseDown={() => { setBusca(c); setOpenList(false) }} style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, color: '#3A372F' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F7F5F1'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={qtd}
                  onChange={e => setQtd(e.target.value)}
                  onFocus={() => setFocusField('q')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Qtd"
                  style={{ width: 90, height: 46, padding: '0 12px', border: `1.5px solid ${focusField === 'q' ? '#2A9D8F' : '#EFEDE8'}`, borderRadius: 10, fontSize: 14, color: '#3A372F', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={addItem} style={{ height: 46, padding: '0 16px', borderRadius: 10, border: '1.5px solid rgba(42,157,143,0.4)', background: 'rgba(42,157,143,0.06)', color: '#2A9D8F', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <Icons.plus /> Adicionar
                </button>
              </div>

              {/* Lista de itens consumidos */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {consumidos.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#A29E96', border: '1.5px dashed #EFEDE8', borderRadius: 12 }}>
                    Nenhum item adicionado ainda.
                  </div>
                ) : consumidos.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#3A372F' }}>{it.nome}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6860' }}>{it.qtd}</span>
                    <button onClick={() => setConsumidos(a => a.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', color: '#B7B4AD', cursor: 'pointer', display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#C0492B'}
                      onMouseLeave={e => e.currentTarget.style.color = '#B7B4AD'}
                    >
                      <Icons.trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>Pular</Button>
              <Button variant="primary" fullWidth onClick={() => setStep(2)}>Próximo →</Button>
            </div>
          </>
        )}

        {/* ─── PASSO 2 — MULTA ─── */}
        {step === 2 && (
          <>
            <Header title="Deseja cobrar multa pelo cancelamento?" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>

              {/* Toggle Sim/Não */}
              <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #EFEDE8', overflow: 'hidden', width: 'fit-content', marginBottom: 18 }}>
                {([['Não', false], ['Sim', true]] as [string, boolean][]).map(([lbl, val]) => (
                  <button key={String(lbl)} onClick={() => setMultaAtiva(val)} style={{
                    width: 80, height: 44, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    background: multaAtiva === val ? (val ? '#F97316' : '#F1F0EC') : '#fff',
                    color: multaAtiva === val ? (val ? '#fff' : '#5C594F') : '#A8A49C',
                  }}>{lbl}</button>
                ))}
              </div>

              {multaAtiva && (
                <div style={{ animation: 'fadeUp .25s ease both' }}>
                  {/* Tipo + valor */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', borderRadius: 9, border: '1px solid #EFEDE8', overflow: 'hidden', flexShrink: 0 }}>
                      {(['%', 'R$'] as const).map(tp => (
                        <button key={tp} onClick={() => setMultaTipo(tp)} style={{
                          width: 46, height: 46, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                          background: multaTipo === tp ? '#F97316' : '#fff',
                          color: multaTipo === tp ? '#fff' : '#8A8780',
                        }}>{tp}</button>
                      ))}
                    </div>
                    <input
                      value={multaValor}
                      onChange={e => setMultaValor(e.target.value.replace(/[^\d.,]/g, ''))}
                      onFocus={() => setFocusField('m')}
                      onBlur={() => setFocusField(null)}
                      inputMode="decimal"
                      placeholder={multaTipo === '%' ? '50' : '0,00'}
                      style={{
                        flex: 1, minWidth: 120, height: 46, padding: '0 14px',
                        border: `1.5px solid ${focusField === 'm' ? '#F97316' : '#EFEDE8'}`,
                        borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#3A372F',
                        background: '#fff', outline: 'none', fontFamily: 'inherit',
                        boxShadow: focusField === 'm' ? '0 0 0 4px rgba(249,115,22,0.12)' : 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: '#A29E96' }}>Sugestão padrão: 50% do valor total.</div>

                  {/* Total da multa */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>Multa</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                      {`R$ ${multaAplicada.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Voltar</Button>
              <Button variant="primary" fullWidth onClick={() => setStep(3)}>Próximo →</Button>
            </div>
          </>
        )}

        {/* ─── PASSO 3 — RESUMO ─── */}
        {step === 3 && (
          <>
            <Header title="Resumo do cancelamento" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Insumos consumidos */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#B0ACA4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 9 }}>
                  Insumos consumidos
                </div>
                {consumidos.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: '#A29E96' }}>Nenhum consumo registrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {consumidos.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#3A372F', padding: '9px 12px', borderRadius: 9, background: '#FCFBF9', border: '1px solid #EFEDE8' }}>
                        <span style={{ fontWeight: 500 }}>{it.nome}</span>
                        <span style={{ fontWeight: 600, color: '#6B6860' }}>{it.qtd}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multa */}
              {multaAtiva && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#3A372F' }}>
                    Multa <span style={{ fontWeight: 500, color: '#A29E96' }}>({multaTipo === '%' ? `${multaValor || 0}%` : 'valor fixo'})</span>
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>
                    {`R$ ${multaAplicada.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              )}

              {/* Aviso PDF */}
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)' }}>
                <Icons.alertCircle style={{ flexShrink: 0, color: '#F97316', marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.8, color: '#8A5A33', lineHeight: 1.55 }}>
                  Um <strong style={{ fontWeight: 700 }}>PDF de multa</strong> será gerado para enviar à cliente.
                </p>
              </div>
            </div>
            <Dots />
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 12 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>← Voltar</Button>
              <Button variant="danger" fullWidth onClick={onClose}>
                Confirmar e gerar PDF de multa
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

### Atualizar o estado `modal` e o botão de cancelar na página principal

No componente `DetalheOrcamentoPage`, substituir o estado atual do modal e o botão de cancelar:

```tsx
// Adicionar ao estado
const [modalCancel, setModalCancel] = useState(false)

// O status atual que determina qual modal abrir
const statusAtual = 'Em Produção' // status mockado
const cancelaComWizard = statusAtual === 'Em Produção' || statusAtual === 'Finalizado'

// Substituir o botão de cancelar por:
<button
  onClick={() => setModalCancel(true)}
  style={{
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'transparent', border: 'none', color: 'rgba(192,73,43,0.85)',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', padding: 0,
  }}
  onMouseEnter={e => e.currentTarget.style.color = '#C0492B'}
  onMouseLeave={e => e.currentTarget.style.color = 'rgba(192,73,43,0.85)'}
>
  <Icons.ban width={15} height={15} /> Cancelar orçamento
</button>

// Substituir o modal de cancelar por:
{modalCancel && cancelaComWizard && (
  <ModalCancelWizard onClose={() => setModalCancel(false)} />
)}
{modalCancel && !cancelaComWizard && (
  <ModalCancelSimples onClose={() => setModalCancel(false)} />
)}
```

---

## Como testar

### URL: `http://localhost:5173/orcamentos/0042`

### Passo 1 — Abrir modal de cancelamento
Clicar em **"Cancelar orçamento"** (texto vermelho abaixo da timeline)

### Passo 2 — Verificar Passo 1 (Consumo)
- Modal abre com header: "Cancelar · Passo 1 de 3" + "Houve consumo de insumos?"
- 3 barras vermelhas no rodapé — primeira preenchida
- "Papel couchê 180g · 4 folhas" já listado (mock)
- Digitar "fita" no campo de busca → dropdown mostra "Fita dupla face 12mm"
- Clicar → nome vai para o campo
- Digitar "120" no campo Qtd → clicar "Adicionar"
- ✅ Item aparece na lista
- Clicar no ícone de lixeira → item removido
- Clicar **"Próximo →"**

### Passo 3 — Verificar Passo 2 (Multa)
- Header muda para "Passo 2 de 3" + "Deseja cobrar multa?"
- Toggle "Não/Sim" com "Sim" ativo (laranja)
- Campo com "50" preenchido e multa = R$ 91,80 (50% de R$ 183,60)
- Clicar "Não" → campos somem
- Clicar "Sim" → campos voltam com animação
- Trocar de % para R$ → digitar "30" → multa muda para R$ 30,00
- Clicar **"Próximo →"**

### Passo 4 — Verificar Passo 3 (Resumo)
- Header: "Passo 3 de 3" + "Resumo do cancelamento"
- Lista de insumos consumidos
- Card laranja com valor da multa
- Aviso "Um PDF de multa será gerado"
- Clicar **"Confirmar e gerar PDF de multa"** → modal fecha

### Passo 5 — Testar navegação entre passos
- No passo 2, clicar **"← Voltar"** → volta ao passo 1
- No passo 3, clicar **"← Voltar"** → volta ao passo 2

---

## Checklist de validação

- [ ] Modal abre ao clicar "Cancelar orçamento"
- [ ] Passo 1: busca de insumos com autocomplete, adicionar/remover itens
- [ ] Passo 2: toggle Sim/Não, tipo % ou R$, cálculo em tempo real
- [ ] Passo 3: resumo com insumos, multa e aviso de PDF
- [ ] Barras de progresso vermelhas indicando o passo atual
- [ ] Navegação entre passos (Próximo / Voltar)
- [ ] Clicar fora fecha o modal
- [ ] Botão "Confirmar" fecha o modal
- [ ] `npm run dev` sem erros TypeScript

## Commit

```bash
git add .
git commit -m "feat(orcamentos): adiciona ModalCancelWizard em 3 passos no DetalheOrcamento"
```
