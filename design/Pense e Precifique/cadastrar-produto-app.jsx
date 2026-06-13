/* cadastrar-produto-app.jsx — Tela 14 · Cadastrar Produto + Ficha Técnica · Pense & Precifique */
const { useState: useS, useEffect: useE, useRef: useR } = React;

/* ─────────  DADOS  ───────── */
const CATEGORIAS = ['Papelaria','Amigurumi','Embalagem','Acabamento','Outra'];
const INSUMOS_DB = [
  { nome:'Papel couchê 180g', marca:'Suzano', un:'folha', custo:0.45, tipo:'insumo' },
  { nome:'Fita dupla face 12mm', marca:'3M', un:'cm', custo:0.08, tipo:'insumo' },
  { nome:'Envelope kraft C6', marca:'s/ marca', un:'un', custo:1.20, tipo:'insumo' },
  { nome:'Linha de crochê teal 100g', marca:'Pingouin', un:'g', custo:0.089, tipo:'insumo' },
  { nome:'Tinta acrílica azul', marca:'Acrilex', un:'ml', custo:0.15, tipo:'insumo' },
];
const PRODUTOS_DB = [
  { nome:'Miolo de Agenda', marca:'Produto próprio', un:'un', custo:12.00, tipo:'produto' },
  { nome:'Capa Kraft', marca:'Produto próprio', un:'un', custo:6.50, tipo:'produto' },
];
const FICHA_INICIAL = [
  { nome:'Miolo de Agenda', marca:'Produto próprio', un:'un', qtd:1, custo:12.00, tipo:'produto' },
  { nome:'Papel couchê 180g', marca:'Suzano', un:'folha', qtd:2, custo:0.45, tipo:'insumo' },
  { nome:'Fita dupla face 12mm', marca:'3M', un:'cm', qtd:15, custo:0.08, tipo:'insumo' },
];
const CUSTOMIZACOES_INICIAL = [
  { nome:'Laminação fosca', desc:'Acabamento premium na capa', valor:8.00 },
  { nome:'Envelope personalizado', desc:'Impressão do nome dos convidados', valor:5.00 },
];
const VALOR_HORA = 25; // R$/h

/* ─────────  CONTROLES DE FORMULÁRIO  ───────── */
function Field({ label, opt, required, children }) {
  return (
    <label style={{ display:'block' }}>
      <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>
        {label}{required && <span style={{ color:'var(--orange)', marginLeft:3 }}>*</span>}
        {opt && <span style={{ fontSize:12, fontWeight:500, color:'#B0ACA4', marginLeft:6 }}>(opcional)</span>}
      </span>
      {children}
    </label>);
}
function TextInput({ value, onChange, placeholder, teal, suffix, prefix, inputMode }) {
  const [f, setF] = useS(false);
  return (
    <div style={{ position:'relative' }}>
      {prefix && <span style={{ position:'absolute', left:0, top:0, bottom:0, width:44, display:'grid', placeItems:'center', fontSize:14, fontWeight:600, color:'#6B6860', background:'#FAF8F5', borderRadius:'var(--r-input) 0 0 var(--r-input)', borderRight:'1px solid var(--line)', pointerEvents:'none' }}>{prefix}</span>}
      <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%', height:48, padding:`0 ${suffix?64:14}px 0 ${prefix?56:14}px`, border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: f?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
      {suffix && <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>{suffix}</span>}
    </div>);
}
function Select({ value, onChange, options, placeholder, teal }) {
  const [open, setOpen] = useS(false);
  const ref = useR(null);
  useE(() => { const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); }, []);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={()=>setOpen((o)=>!o)} style={{ width:'100%', height:48, padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', border:`1.5px solid ${open?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color: value?'var(--ink)':'#B7B4AD', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', boxShadow: open?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }}>
        {value || placeholder}<span style={{ color:'var(--muted)', display:'flex' }}><I.caret /></span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:52, left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
          {options.map((o)=>(
            <button key={o} type="button" onClick={()=>{ onChange(o); setOpen(false); }} style={{ width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:8, border:'none', background: o===value?hexA(teal,0.08):'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight: o===value?600:500, color: o===value?teal:'var(--ink)' }}
              onMouseEnter={(e)=>{ if(o!==value) e.currentTarget.style.background='#F7F5F1'; }} onMouseLeave={(e)=>{ if(o!==value) e.currentTarget.style.background='transparent'; }}>{o}</button>
          ))}
        </div>
      )}
    </div>);
}

/* ─────────  SELETOR DE TIPO DO PRODUTO  ───────── */
const TIPOS = [
  { v:'Produto', desc:'Item final que você vende' },
  { v:'Produto Base', desc:'Componente usado em outros produtos' },
  { v:'Customização', desc:'Extra opcional adicionado no orçamento' },
];
function TipoSelector({ value, onChange, teal }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
      {TIPOS.map((tp)=>{ const on = value===tp.v; return (
        <button key={tp.v} type="button" onClick={()=>onChange(tp.v)} style={{ textAlign:'left', padding:'13px 14px', borderRadius:'var(--r-input)', border:`1.5px solid ${on?teal:'var(--line)'}`, background: on?hexA(teal,0.06):'#fff', cursor:'pointer', fontFamily:'inherit', boxShadow: on?`0 0 0 3px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s', display:'flex', flexDirection:'column', gap:6 }}
          onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.borderColor='#DCD8D0'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.borderColor='var(--line)'; }}>
          <span style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:700, color: on?'var(--teal-deep)':'var(--ink)', whiteSpace:'nowrap' }}>{tp.v}</span>
            <span style={{ flexShrink:0, width:18, height:18, borderRadius:'50%', border:`1.5px solid ${on?teal:'#CFCBC3'}`, background: on?teal:'#fff', display:'grid', placeItems:'center' }}>
              {on && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19.5 7"/></svg>}
            </span>
          </span>
          <span style={{ fontSize:12, color:'var(--muted)', lineHeight:1.4, textWrap:'pretty' }}>{tp.desc}</span>
        </button>); })}
    </div>);
}

/* ─────────  ABA 1 · DADOS BÁSICOS  ───────── */
function DadosBasicos({ st, set, teal, orange, onNext }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'28px 30px', maxWidth:760, animation:'fadeUp .35s ease both' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'22px 24px' }}>
        <div style={{ gridColumn:'1 / -1' }}>
          <Field label="Nome do produto" required><TextInput value={st.nome} onChange={(v)=>set('nome',v)} placeholder="Ex: Kit Convite Casamento" teal={teal} /></Field>
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <Field label="Tipo do produto" required>
            <TipoSelector value={st.tipo} onChange={(v)=>set('tipo',v)} teal={teal} />
          </Field>
        </div>
        <Field label="Tempo de produção" required><TextInput value={st.tempo} onChange={(v)=>set('tempo',v.replace(/[^\d]/g,''))} placeholder="45" suffix="minutos" inputMode="numeric" teal={teal} /></Field>
        <div style={{ gridColumn:'1 / -1' }}>
          <Field label="Descrição" opt>
            <DescTextarea value={st.descricao} onChange={(v)=>set('descricao',v)} teal={teal} />
          </Field>
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <Field label="Foto do produto" opt>
            <image-slot id="produto-foto" shape="rounded" radius="12" fit="cover" placeholder="Arraste uma foto ou clique para enviar" style={{ display:'block', width:'100%', maxWidth:280, height:200, background:'#FAF8F5', border:'2px dashed #DCD8D0', borderRadius:12 }}></image-slot>
          </Field>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:28, paddingTop:22, borderTop:'1px solid var(--line)' }}>
        <button onClick={onNext} style={{ height:48, padding:'0 22px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
          Próximo: Ficha Técnica <I.arrowRight />
        </button>
      </div>
    </div>);
}
function DescTextarea({ value, onChange, teal }) {
  const [f, setF] = useS(false);
  return <textarea value={value} onChange={(e)=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} rows={3} placeholder="Conte os detalhes que tornam esse produto especial..."
    style={{ width:'100%', padding:'12px 14px', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.5, boxShadow: f?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />;
}

/* ─────────  ABA 2 · FICHA TÉCNICA  ───────── */
/* badge de tipo de componente */
function TipoBadge({ tipo, teal }) {
  const produto = tipo === 'produto';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', height:18, padding:'0 7px', borderRadius:999, fontSize:10.5, fontWeight:600, letterSpacing:'0.01em', whiteSpace:'nowrap',
      background: produto ? hexA(teal,0.12) : '#F1F0EC', color: produto ? teal : '#7C786F' }}>{produto ? 'Produto' : 'Insumo'}</span>);
}

function InsumoSearch({ teal, onAdd, jaAdicionados }) {
  const [q, setQ] = useS('');
  const [open, setOpen] = useS(false);
  const ref = useR(null);
  useE(() => { const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); }, []);
  const match = (i) => i.nome.toLowerCase().includes(q.trim().toLowerCase()) && !jaAdicionados.includes(i.nome);
  const insumos = INSUMOS_DB.filter(match);
  const produtos = PRODUTOS_DB.filter(match);
  const total = insumos.length + produtos.length;
  const [f, setF] = useS(false);
  const grupo = (titulo, itens) => itens.length===0 ? null : (
    <div key={titulo}>
      <div style={{ padding:'8px 11px 5px', fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#A8A49C' }}>{titulo}</div>
      {itens.map((i)=>(
        <button key={i.nome} onClick={()=>{ onAdd(i); setQ(''); setOpen(false); }} style={{ display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:9, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
          <span style={{ flexShrink:0, width:32, height:32, borderRadius:8, display:'grid', placeItems:'center', background: i.tipo==='produto'?hexA(teal,0.12):'#F1F0EC', color: i.tipo==='produto'?teal:'#9A968E' }}>{i.tipo==='produto' ? <I.cube /> : <I.box />}</span>
          <span style={{ flex:1, minWidth:0 }}>
            <span style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{i.nome}</span><TipoBadge tipo={i.tipo} teal={teal} /></span>
            <span style={{ display:'block', fontSize:12, color:'var(--muted)' }}>{i.marca} · {moeda(i.custo)} / {i.un}</span>
          </span>
          <span style={{ flexShrink:0, color:teal, display:'flex' }}><I.plus /></span>
        </button>
      ))}
    </div>);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: f?teal:'#A8A49C', display:'flex' }}><I.search /></span>
      <input value={q} onChange={(e)=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=>{ setF(true); setOpen(true); }} onBlur={()=>setF(false)} placeholder="Buscar insumo ou produto..."
        style={{ width:'100%', height:46, padding:'0 14px 0 42px', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: f?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
      {open && total>0 && (
        <div style={{ position:'absolute', top:50, left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 14px 34px -10px rgba(0,0,0,0.2)', padding:6, animation:'pop .14s ease both', maxHeight:320, overflowY:'auto' }}>
          {grupo('Insumos', insumos)}
          {grupo('Produtos', produtos)}
        </div>
      )}
    </div>);
}

function FichaTecnica({ ficha, setFicha, teal, orange }) {
  const add = (i) => setFicha((f)=>[...f, { ...i, qtd:1 }]);
  const remove = (idx) => setFicha((f)=>f.filter((_,k)=>k!==idx));
  const setQtd = (idx, v) => setFicha((f)=>f.map((row,k)=>k===idx ? { ...row, qtd: num(v) } : row));
  return (
    <div style={{ animation:'fadeUp .35s ease both' }}>
      <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
        <div style={{ padding:'20px 22px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
            <span style={{ display:'flex', color:teal }}><I.layers /></span>
            <h3 style={{ margin:0, fontSize:15.5, fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap' }}>Componentes do produto</h3>
          </div>
          <InsumoSearch teal={teal} onAdd={add} jaAdicionados={ficha.map((f)=>f.nome)} />
        </div>
        {/* tabela */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 132px 96px 44px', gap:12, padding:'10px 22px', background:'#FBFAF8', borderTop:'1px solid var(--line)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>
          <span>Componente</span><span>Quantidade</span><span style={{ textAlign:'right' }}>Custo</span><span></span>
        </div>
        {ficha.length===0 ? (
          <div style={{ padding:'34px 22px', textAlign:'center', color:'var(--muted)', fontSize:13.5, borderTop:'1px solid var(--line)' }}>Nenhum componente ainda. Use a busca acima para adicionar.</div>
        ) : ficha.map((row,idx)=>(
          <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 132px 96px 44px', gap:12, alignItems:'center', padding:'13px 22px', borderTop:'1px solid var(--line)', animation:'rowIn .25s ease both' }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.nome}</span>
                <TipoBadge tipo={row.tipo} teal={teal} />
              </div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{row.marca} · {moeda(row.custo)}/{row.un}</div>
            </div>
            <QtyInput value={row.qtd} un={row.un} onChange={(v)=>setQtd(idx,v)} teal={teal} />
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{moeda(row.qtd*row.custo)}</div>
            <button onClick={()=>remove(idx)} aria-label="Remover componente" style={{ width:34, height:34, borderRadius:9, border:'none', background:'transparent', color:'#BDB9B1', cursor:'pointer', display:'grid', placeItems:'center', justifySelf:'end' }}
              onMouseEnter={(e)=>{ e.currentTarget.style.background='#FBEDE9'; e.currentTarget.style.color='var(--danger)'; }} onMouseLeave={(e)=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#BDB9B1'; }}><I.trash /></button>
          </div>
        ))}
      </div>
    </div>);
}
function QtyInput({ value, un, onChange, teal }) {
  const [f, setF] = useS(false);
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits:2 });
  return (
    <div style={{ position:'relative' }}>
      <input defaultValue={fmt(value)} onChange={(e)=>onChange(e.target.value.replace(/[^\d.,]/g,''))} inputMode="decimal" onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%', height:40, padding:'0 38px 0 11px', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:8, fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', fontVariantNumeric:'tabular-nums', boxShadow: f?`0 0 0 3px ${hexA(teal,0.12)}`:'none' }} />
      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:11.5, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>{un}</span>
    </div>);
}

/* ─────────  CALCULADORA DE PREÇO  ───────── */
function Calculadora({ ficha, tempo, margem, setMargem, modoMargem, setModoMargem, precoFinal, setPrecoFinal, teal, orange }) {
  const custoInsumos = ficha.reduce((s,r)=>s + r.qtd*r.custo, 0);
  const maoObra = (num(tempo)/60) * VALOR_HORA;
  const subtotal = custoInsumos + maoObra;
  const lucro = subtotal * (num(margem)/100);
  const sugerido = subtotal + lucro;
  const pf = num(precoFinal);
  const diff = pf - sugerido;
  const manual = Math.abs(diff) > 0.005;

  const linha = (label, val, sub) => (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, padding:'9px 0' }}>
      <span style={{ fontSize:13.2, color:'#5C594F' }}>{label}{sub && <span style={{ display:'block', fontSize:11.5, color:'#A8A49C', marginTop:1 }}>{sub}</span>}</span>
      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{val}</span>
    </div>);

  return (
    <div className="calc-card">
      <div style={{ background:'#fff', border:`1.5px solid ${hexA(teal,0.3)}`, borderRadius:'var(--r-card)', boxShadow:`0 8px 26px -12px ${hexA(teal,0.4)}`, overflow:'hidden' }}>
        {/* header */}
        <div style={{ display:'flex', alignItems:'center', gap:11, padding:'16px 20px', background:`linear-gradient(135deg, ${hexA(teal,0.12)}, ${hexA(teal,0.04)})`, borderBottom:`1px solid ${hexA(teal,0.18)}` }}>
          <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:'#fff', color:teal, boxShadow:`0 3px 10px -3px ${hexA(teal,0.4)}` }}><I.calc /></span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--teal-deep)', letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>Calculadora de Preço</div>
            <div style={{ fontSize:11.5, color:teal, display:'flex', alignItems:'center', gap:4, marginTop:1 }}><I.spark style={{ width:12, height:12 }} /> Atualiza em tempo real</div>
          </div>
        </div>
        <div style={{ padding:'10px 20px 18px' }}>
          {linha('Custo dos insumos', moeda(custoInsumos))}
          {linha('Mão de obra', moeda(maoObra), `${num(tempo)} min × ${moeda(VALOR_HORA)}/h`)}
          <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, padding:'10px 0' }}>
            <span style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap' }}>Subtotal de custo</span>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{moeda(subtotal)}</span>
          </div>

          {/* margem */}
          <div style={{ marginTop:8, padding:'14px', borderRadius:12, background:'#FBFAF8', border:'1px solid var(--line)' }}>
            <div style={{ display:'flex', padding:3, background:'#F1F0EC', borderRadius:9, gap:3, marginBottom: modoMargem==='personalizar'?12:0 }}>
              {[['padrao','Margem padrão (40%)'],['personalizar','Personalizar']].map(([v,l])=>{ const on=modoMargem===v; return (
                <button key={v} onClick={()=>{ setModoMargem(v); if(v==='padrao') setMargem('40'); }} style={{ flex:1, height:34, borderRadius:7, border:'none', background: on?'#fff':'transparent', color: on?'var(--ink)':'#8A8780', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer', boxShadow: on?'0 1px 4px rgba(0,0,0,0.1)':'none', whiteSpace:'nowrap' }}>{l}</button>); })}
            </div>
            {modoMargem==='personalizar' && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#5C594F' }}>Margem de lucro</span>
                <MargemInput value={margem} onChange={setMargem} teal={teal} />
              </div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, padding:'12px 0 4px' }}>
            <span style={{ fontSize:13, color:'#5C594F' }}>Lucro ({num(margem)}%)</span>
            <span style={{ fontSize:14, fontWeight:700, color:'#1F8A5B', fontVariantNumeric:'tabular-nums' }}>+ {moeda(lucro)}</span>
          </div>

          {/* sugerido */}
          <div key={Math.round(sugerido*100)} style={{ marginTop:8, padding:'16px 18px', borderRadius:14, background:`linear-gradient(135deg, ${hexA(teal,0.14)}, ${hexA(teal,0.05)})`, border:`1.5px solid ${hexA(teal,0.28)}`, animation:'flash .55s ease' }}>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--teal-deep)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Preço sugerido</div>
            <div style={{ fontSize:30, fontWeight:700, color:teal, letterSpacing:'-0.02em', marginTop:2, fontVariantNumeric:'tabular-nums' }}>{moeda(sugerido)}</div>
          </div>

          {/* preço final */}
          <div style={{ marginTop:16 }}>
            <span style={{ display:'block', fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:7 }}>Preço final de venda</span>
            <PrecoFinalInput value={precoFinal} onChange={setPrecoFinal} teal={teal} orange={orange} highlight={manual} />
          </div>
          {manual && (
            <div style={{ display:'flex', gap:8, marginTop:12, padding:'11px 13px', borderRadius:11, background:'#FFF8F0', border:'1px solid #F6E4CE' }}>
              <span style={{ flexShrink:0, color:'#C8721F', marginTop:1 }}><I.info /></span>
              <p style={{ margin:0, fontSize:12.3, color:'#7A5A33', lineHeight:1.5 }}>Você ajustou o preço manualmente (<strong style={{ fontWeight:700 }}>{diff>0?'+':'−'}{moeda(Math.abs(diff)).replace('R$ ','R$ ')}</strong> {diff>0?'acima':'abaixo'} do sugerido).</p>
            </div>
          )}
        </div>
      </div>
    </div>);
}
function MargemInput({ value, onChange, teal }) {
  const [f, setF] = useS(false);
  return (
    <div style={{ position:'relative', width:92 }}>
      <input value={value} onChange={(e)=>onChange(e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%', height:40, padding:'0 30px 0 12px', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:9, fontSize:15, fontWeight:600, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', textAlign:'right', fontVariantNumeric:'tabular-nums', boxShadow: f?`0 0 0 3px ${hexA(teal,0.12)}`:'none' }} />
      <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:14, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>%</span>
    </div>);
}
function PrecoFinalInput({ value, onChange, teal, orange, highlight }) {
  const [f, setF] = useS(false);
  const bc = highlight ? orange : (f ? teal : 'var(--line)');
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:0, top:0, bottom:0, width:46, display:'grid', placeItems:'center', fontSize:15, fontWeight:700, color: highlight?orange:'#6B6860', background: highlight?hexA(orange,0.08):'#FAF8F5', borderRadius:'10px 0 0 10px', borderRight:`1px solid ${highlight?hexA(orange,0.3):'var(--line)'}`, pointerEvents:'none' }}>R$</span>
      <input value={value} onChange={(e)=>onChange(e.target.value.replace(/[^\d.,]/g,''))} inputMode="decimal" onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%', height:52, padding:'0 14px 0 58px', border:`1.5px solid ${bc}`, borderRadius:10, fontSize:20, fontWeight:700, color: highlight?orange:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', fontVariantNumeric:'tabular-nums', boxShadow: f?`0 0 0 4px ${hexA(highlight?orange:teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "aba": "ficha",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useS(false);
  const [aba, setAba] = useS(t.aba);
  const [dados, setDados] = useS({ nome:'Kit Convite Casamento', tipo:'Produto', descricao:'', tempo:'45' });
  const setD = (k,v) => setDados((d)=>({ ...d, [k]:v }));
  const [ficha, setFicha] = useS(FICHA_INICIAL);
  const [margem, setMargem] = useS('40');
  const [modoMargem, setModoMargem] = useS('padrao');
  const [precoFinal, setPrecoFinal] = useS('45,00');

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F' };
  const radii = { reto:{card:12,btn:6,input:6}, suave:{card:16,btn:10,input:10}, redondo:{card:22,btn:14,input:14} }[t.roundness] || { card:16, btn:10, input:10 };
  const teal = palette.teal, orange = palette.orange;

  useE(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal); r.setProperty('--teal-deep','#1F7A6F');
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px'); r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);
  useE(() => { setAba(t.aba); }, [t.aba]);

  const ABAS = [
    { id:'dados', label:'Dados básicos', icon:I.fileText },
    { id:'ficha', label:'Ficha Técnica', icon:I.layers },
  ];

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="produtos" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}><I.menu /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}><I.bell /></button>
        </div>

        <div className="content">
          {/* BREADCRUMB */}
          <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--muted)', marginBottom:12 }}>
            <a href="Produtos.html" style={{ color:'var(--muted)', textDecoration:'none', fontWeight:500 }}
              onMouseEnter={(e)=>e.currentTarget.style.color=teal} onMouseLeave={(e)=>e.currentTarget.style.color='var(--muted)'}>Produtos</a>
            <span style={{ display:'flex', color:'#CFCBC3' }}><I.chevron /></span>
            <span style={{ color:'#5C594F', fontWeight:600, whiteSpace:'nowrap' }}>Novo Produto</span>
          </div>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:22 }}>
            <span style={{ flexShrink:0, width:52, height:52, borderRadius:15, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
            <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)', whiteSpace:'nowrap' }}>Novo Produto</h1>
          </div>

          {/* ABAS */}
          <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1.5px solid var(--line)', overflowX:'auto' }}>
            {ABAS.map((a,i)=>{ const on=aba===a.id; return (
              <button key={a.id} onClick={()=>setAba(a.id)} style={{ position:'relative', display:'flex', alignItems:'center', gap:9, padding:'12px 18px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14.5, fontWeight: on?600:500, color: on?teal:'#8A8780', whiteSpace:'nowrap', transition:'color .14s' }}
                onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.color='#5C594F'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.color='#8A8780'; }}>
                <span style={{ display:'grid', placeItems:'center', width:24, height:24, borderRadius:7, background: on?hexA(teal,0.12):'#F1F0EC', color: on?teal:'#A8A49C', fontSize:12, fontWeight:700 }}>{i+1}</span>
                {a.label}
                {on && <span style={{ position:'absolute', left:8, right:8, bottom:-1.5, height:2.5, borderRadius:3, background:teal }} />}
              </button>); })}
          </div>

          {/* CONTEÚDO */}
          {aba==='dados' && <DadosBasicos st={dados} set={setD} teal={teal} orange={orange} onNext={()=>setAba('ficha')} />}
          {aba==='ficha' && (
            <div className="ficha-grid">
              <FichaTecnica ficha={ficha} setFicha={setFicha} teal={teal} orange={orange} />
              <Calculadora ficha={ficha} tempo={dados.tempo} margem={margem} setMargem={setMargem} modoMargem={modoMargem} setModoMargem={setModoMargem} precoFinal={precoFinal} setPrecoFinal={setPrecoFinal} teal={teal} orange={orange} />
            </div>
          )}

          {/* AÇÕES GLOBAIS */}
          {aba!=='dados' && (
            <div style={{ display:'flex', justifyContent:'flex-end', gap:11, marginTop:26, flexWrap:'wrap' }}>
              <a href="Produtos.html" style={{ textDecoration:'none' }}>
                <button style={{ height:48, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
                  onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
              </a>
              <button style={{ height:48, padding:'0 24px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Salvar produto</button>
            </div>
          )}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Aba ativa" value={t.aba} options={[{value:'dados',label:'Dados'},{value:'ficha',label:'Ficha'}]} onChange={(v)=>setTweak('aba',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
