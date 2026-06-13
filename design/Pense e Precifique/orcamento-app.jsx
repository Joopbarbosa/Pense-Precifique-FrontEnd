/* orcamento-app.jsx — Tela 6 · Criar Orçamento · Pense & Precifique */
const { useState, useEffect, useRef } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 40 }) {
  return <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
    style={{ display:'block', objectFit:'contain', transform:'translateX(3%)' }} />;
}
function Wordmark({ teal = '#2A9D8F', size = 15.5 }) {
  return (
    <span style={{ fontWeight:700, fontSize:size, letterSpacing:'-0.01em', lineHeight:1.05 }}>
      <span style={{ color:teal }}>Pense</span><span style={{ color:'#F97316', margin:'0 1px' }}>&amp;</span><span style={{ color:'#3A372F' }}>Precifique</span>
    </span>);
}

/* ─────────  ÍCONES  ───────── */
const sw = { strokeWidth:1.7, fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round' };
const I = {
  grid:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>,
  users:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="9" cy="8" r="3.3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4"/></svg>,
  doc:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/><path d="M8.5 13.5h7M8.5 16.5h5"/></svg>,
  box:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8"/></svg>,
  cube:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
  factory:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/><path d="M3.5 20.5h17"/></svg>,
  gear:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.4a1.7 1.7 0 0 0 1-1.6V2.7a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2"/></svg>,
  logout:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5"/><path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6"/></svg>,
  search:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></svg>,
  phone:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M6.5 4.5h3l1.2 3.2-1.7 1.3a11 11 0 0 0 4.7 4.7l1.3-1.7 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z"/></svg>,
  plus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  minus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M5 12h14" strokeWidth="2"/></svg>,
  trash:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M4.5 6.5h15M9 6.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M6 6.5 6.7 19a1 1 0 0 0 1 .9h8.6a1 1 0 0 0 1-.9L18 6.5M10 10v6M14 10v6"/></svg>,
  sliders:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2.2"/><circle cx="9" cy="16" r="2.2"/></svg>,
  arrow:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M5 12h13M13 6.5 18.5 12 13 17.5"/></svg>,
  chevron:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="m6 9 6 6 6-6"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  pdf:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/><path d="M8 14h1.5a1.3 1.3 0 0 1 0 2.6H8V14Zm0 0v5"/></svg>,
  save:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1-1.5Z"/><path d="M8 4.5v4h6v-4M8 19v-5h8v5"/></svg>,
  cart:(p)=><svg viewBox="0 0 24 24" width="34" height="34" {...sw} {...p}><path d="M3.5 4.5h2l2 11h9.5l2-7.5H7"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>,
  cal:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>,
  note:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M5 4.5h14a1 1 0 0 1 1 1V16l-4 4H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z"/><path d="M20 16h-4v4M8 9h8M8 12.5h5"/></svg>,
  wallet:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1.5 1.5 0 0 1 1.5 1.5V9M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-2.5M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5V12"/><path d="M20 12h-3.2a1.8 1.8 0 0 0 0 3.6H20V12Z"/></svg>,
  check:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="m5 12.5 4.2 4.2L19 7" strokeWidth="2.4"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid, href:'Dashboard.html' },
  { id:'clientes', label:'Clientes', icon:I.users, href:'Clientes.html' },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc, href:'#' },
  { id:'insumos', label:'Insumos', icon:I.box, href:'#' },
  { id:'produtos', label:'Produtos', icon:I.cube, href:'#' },
  { id:'producao', label:'Produção', icon:I.factory, href:'#' },
  { id:'config', label:'Configurações', icon:I.gear, href:'#' },
];
function Sidebar({ teal, active, open, onClose }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div style={{ padding:'22px 20px 18px', display:'flex', alignItems:'center', gap:11, borderBottom:'1px solid var(--line)' }}>
        <span style={{ display:'grid', placeItems:'center', width:44, height:44, background:'#fff', border:'1px solid #EFEDE8', borderRadius:13, boxShadow:'0 2px 7px rgba(0,0,0,0.07)' }}><Logo size={32} /></span>
        <div style={{ lineHeight:1.15 }}>
          <Wordmark teal={teal} size={15.5} />
          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2, fontWeight:500 }}>Para artesãs</div>
        </div>
        <button onClick={onClose} aria-label="Fechar menu" className="drawer-close" style={{ marginLeft:'auto', border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', padding:2 }}><I.x /></button>
      </div>
      <nav style={{ flex:1, padding:'14px 14px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
        {NAV.map((it)=>{ const on=it.id===active; return (
          <a key={it.id} href={it.href} onClick={(e)=>{ if(it.href==='#') e.preventDefault(); onClose(); }}
            style={{ display:'flex', alignItems:'center', gap:13, padding:'11px 13px', borderRadius:11, textDecoration:'none',
              fontSize:14.5, fontWeight: on?600:500, color: on?'var(--orange)':'#5C594F',
              background: on?'var(--orange-soft)':'transparent', boxShadow: on?'inset 3px 0 0 var(--orange)':'none', transition:'background .14s' }}
            onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.background='#FAF8F5'; }}
            onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.background='transparent'; }}>
            <span style={{ display:'flex', color: on?'var(--orange)':'#A29E96' }}><it.icon /></span>{it.label}
          </a>); })}
      </nav>
      <div style={{ padding:'12px 14px 18px', borderTop:'1px solid var(--line)' }}>
        <a href="Login.html" style={{ display:'flex', alignItems:'center', gap:13, padding:'11px 13px', borderRadius:11, textDecoration:'none', fontSize:14.5, fontWeight:500, color:'#7C786F' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
          <span style={{ display:'flex', color:'#A29E96' }}><I.logout /></span> Sair
        </a>
      </div>
    </aside>);
}

/* ─────────  HELPERS  ───────── */
function hexA(hex, a) {
  const h = hex.replace('#',''); const n = parseInt(h.length===3 ? h.split('').map((c)=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
const BRL = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });

const CLIENTES = [
  { nome:'Mariana Costa', whats:'(11) 99999-0000' },
  { nome:'Camila Rocha', whats:'(11) 97777-2233' },
  { nome:'Patrícia Mendes', whats:'(21) 98888-5566' },
  { nome:'Juliana Ferreira', whats:'(11) 96666-4411' },
];
const CATALOGO = ['Kit Convite Casamento','Etiqueta personalizada','Caixa para lembrancinha','Tag de agradecimento','Topo de bolo'];

/* ─────────  CARD  ───────── */
function Card({ children, style, label, icon, teal, step, hint }) {
  return (
    <section style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', ...style }}>
      {label && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px 0' }}>
          {step!=null && <span style={{ flexShrink:0, width:26, height:26, borderRadius:8, display:'grid', placeItems:'center', background:hexA(teal,0.12), color:teal, fontWeight:700, fontSize:13 }}>{step}</span>}
          <div>
            <h2 style={{ margin:0, fontSize:15.5, fontWeight:600, color:'var(--ink)', letterSpacing:'-0.01em' }}>{label}</h2>
            {hint && <p style={{ margin:'2px 0 0', fontSize:12.5, color:'var(--muted)' }}>{hint}</p>}
          </div>
        </div>
      )}
      {children}
    </section>);
}

/* ─────────  AUTOCOMPLETE CLIENTE  ───────── */
function ClienteSelect({ teal, orange, cliente, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const results = CLIENTES.filter((c)=>c.nome.toLowerCase().includes(q.toLowerCase()) || c.whats.includes(q));

  if (cliente) {
    return (
      <div style={{ padding:'14px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12,
          background:hexA(teal,0.07), border:`1px solid ${hexA(teal,0.2)}` }}>
          <span style={{ flexShrink:0, width:46, height:46, borderRadius:'50%', display:'grid', placeItems:'center', background:hexA(teal,0.15), color:teal, fontWeight:700, fontSize:18 }}>
            {cliente.nome.charAt(0)}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>{cliente.nome}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13.5, color:'#5C594F', marginTop:2 }}>
              <span style={{ color:teal, display:'flex' }}><I.phone /></span>{cliente.whats}
            </div>
          </div>
          <button onClick={onClear} style={{ flexShrink:0, fontSize:13, fontWeight:600, color:teal, background:'transparent', border:'none', cursor:'pointer', padding:'6px 8px' }}>Trocar</button>
        </div>
      </div>);
  }
  return (
    <div style={{ padding:'14px 20px 20px', display:'flex', gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>
      <div ref={wrapRef} style={{ position:'relative', flex:1, minWidth:220 }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', display:'flex' }}><I.search /></span>
        <input value={q} onChange={(e)=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=>{ setFocus(true); setOpen(true); }} onBlur={()=>setFocus(false)}
          placeholder="Selecionar cliente..." style={{ width:'100%', height:48, padding:'0 16px 0 42px',
            border:`1.5px solid ${focus?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)',
            background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
        {open && (
          <div style={{ position:'absolute', top:54, left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)',
            borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both', maxHeight:248, overflowY:'auto' }}>
            {results.length ? results.map((c)=>(
              <button key={c.nome} onClick={()=>{ onSelect(c); setOpen(false); setQ(''); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'9px 10px', borderRadius:9, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}
                onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                <span style={{ flexShrink:0, width:34, height:34, borderRadius:'50%', display:'grid', placeItems:'center', background:hexA(teal,0.13), color:teal, fontWeight:700, fontSize:14 }}>{c.nome.charAt(0)}</span>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:14, fontWeight:600, color:'var(--ink)' }}>{c.nome}</span>
                  <span style={{ display:'block', fontSize:12.5, color:'var(--muted)' }}>{c.whats}</span>
                </span>
              </button>
            )) : <div style={{ padding:'14px 12px', fontSize:13.5, color:'var(--muted)', textAlign:'center' }}>Nenhuma cliente encontrada.</div>}
          </div>
        )}
      </div>
      <button style={{ height:48, padding:'0 16px', borderRadius:'var(--r-btn)', border:`1.5px solid ${hexA(teal,0.4)}`, background:hexA(teal,0.06),
        color:teal, fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}
        onMouseEnter={(e)=>e.currentTarget.style.background=hexA(teal,0.12)} onMouseLeave={(e)=>e.currentTarget.style.background=hexA(teal,0.06)}>
        <I.plus /> Nova cliente
      </button>
    </div>);
}

/* ─────────  STEPPER QTD  ───────── */
function Stepper({ value, onChange, teal }) {
  const btn = (dis) => ({ width:34, height:34, borderRadius:9, border:'1px solid var(--line)', background:'#fff',
    color: dis?'#D6D3CC':'#5C594F', cursor: dis?'default':'pointer', display:'grid', placeItems:'center', flexShrink:0 });
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
      <button style={btn(value<=1)} disabled={value<=1} onClick={()=>onChange(Math.max(1,value-1))}
        onMouseEnter={(e)=>{ if(value>1){ e.currentTarget.style.borderColor=teal; e.currentTarget.style.color=teal; } }}
        onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color=value<=1?'#D6D3CC':'#5C594F'; }}><I.minus /></button>
      <span style={{ minWidth:30, textAlign:'center', fontSize:15.5, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{value}</span>
      <button style={btn(false)} onClick={()=>onChange(value+1)}
        onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=teal; e.currentTarget.style.color=teal; }}
        onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='#5C594F'; }}><I.plus /></button>
    </div>);
}

/* ─────────  ITEM DO ORÇAMENTO  ───────── */
function ItemRow({ item, i, teal, orange, onQtd, onRemove, onCustom }) {
  const [expanded, setExpanded] = useState(item.customs.length > 0);
  const lineTotal = item.preco * item.qtd;
  return (
    <div style={{ padding:'16px 20px', borderTop: i>0 ? '1px solid var(--line)' : 'none', animation:'fadeUp .35s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>{item.nome}</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{BRL(item.preco)} / unidade</div>
        </div>
        <Stepper value={item.qtd} onChange={(v)=>onQtd(item.id, v)} teal={teal} />
        <div style={{ minWidth:108, textAlign:'right' }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#B7B4AD' }}>Subtotal</div>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{BRL(lineTotal)}</div>
        </div>
        <button onClick={()=>onRemove(item.id)} aria-label="Remover" style={{ width:38, height:38, borderRadius:9, border:'1px solid transparent', background:'transparent', color:'#B7B4AD', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}
          onMouseEnter={(e)=>{ e.currentTarget.style.background='#FCF1ED'; e.currentTarget.style.color='#C0492B'; }}
          onMouseLeave={(e)=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#B7B4AD'; }}><I.trash /></button>
      </div>

      {/* linha de customizações */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' }}>
        <button onClick={()=>onCustom(item)} style={{ display:'inline-flex', alignItems:'center', gap:7, height:34, padding:'0 12px',
          borderRadius:9, border:`1px solid ${item.customs.length?hexA(orange,0.4):'var(--line)'}`, background: item.customs.length?'var(--orange-soft)':'#FCFBF9',
          color: item.customs.length?'#A35A26':'#5C594F', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
          <I.sliders /> Customizações{item.customs.length ? ` (${item.customs.length})` : ''}
        </button>
        {item.customs.map((c,k)=>(
          <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6, height:30, padding:'0 11px', borderRadius:999,
            background:'#fff', border:'1px solid var(--line)', fontSize:12.5, color:'#6B6860' }}>
            <span style={{ color:orange, display:'flex' }}><I.tag /></span>{c.nome} <strong style={{ fontWeight:600, color:'#A35A26' }}>+{BRL(c.valor)}/un</strong>
          </span>
        ))}
      </div>
    </div>);
}

/* ─────────  MODAL CUSTOMIZAÇÕES  ───────── */
const CUSTOM_CADASTRADAS = [
  { nome:'Laminação fosca', valor:8 },
  { nome:'Envelope kraft', valor:3.5 },
];
function CustomModal({ item, teal, orange, onClose, onConfirm }) {
  const [checked, setChecked] = useState(() => {
    const set = {}; CUSTOM_CADASTRADAS.forEach((c)=>{ set[c.nome] = item.customs.some((x)=>x.nome===c.nome); }); return set;
  });
  const [avNome, setAvNome] = useState('');
  const [avCusto, setAvCusto] = useState('');
  const [avulsos, setAvulsos] = useState(() => item.customs.filter((c)=>!CUSTOM_CADASTRADAS.some((cc)=>cc.nome===c.nome)));
  const [focus, setFocus] = useState(null);

  const toggle = (nome) => setChecked((s)=>({ ...s, [nome]: !s[nome] }));
  const addAvulso = () => {
    const v = parseFloat(avCusto.replace(',','.')); if (!avNome.trim() || isNaN(v)) return;
    setAvulsos((a)=>[...a, { nome:avNome.trim(), valor:v }]); setAvNome(''); setAvCusto('');
  };
  const confirm = () => {
    const picked = CUSTOM_CADASTRADAS.filter((c)=>checked[c.nome]);
    onConfirm(item.id, [...picked, ...avulsos]);
  };
  const inputBase = (active) => ({ width:'100%', height:46, padding:'0 14px', border:`1.5px solid ${active?teal:'var(--line)'}`,
    borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
    boxShadow: active?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' });

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
      padding:16, background:'rgba(20,18,16,0.4)', backdropFilter:'blur(1.5px)', animation:'fadeUp .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{ position:'relative', zIndex:110,
        width:'min(520px, 100%)', maxHeight:'90vh', display:'flex', flexDirection:'column', background:'#fff',
        borderRadius:20, boxShadow:'0 30px 70px -20px rgba(0,0,0,0.4)', overflow:'hidden', animation:'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>
        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:40, height:40, borderRadius:11, background:'var(--orange-soft)', color:orange }}><I.sliders /></span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Customizações</div>
              <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.nome}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ flexShrink:0, width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center' }}><I.x /></button>
        </div>
        {/* body */}
        <div style={{ flex:1, overflowY:'auto', padding:'22px 24px', display:'flex', flexDirection:'column', gap:24 }}>
          <div>
            <div style={{ fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:12 }}>Customizações cadastradas</div>
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {CUSTOM_CADASTRADAS.map((c)=>{ const on = checked[c.nome]; return (
                <button key={c.nome} onClick={()=>toggle(c.nome)} style={{ display:'flex', alignItems:'center', gap:13, padding:'12px 14px', borderRadius:12,
                  border:`1.5px solid ${on?hexA(teal,0.5):'var(--line)'}`, background: on?hexA(teal,0.06):'#fff', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'border-color .14s, background .14s' }}>
                  <span style={{ flexShrink:0, width:24, height:24, borderRadius:7, display:'grid', placeItems:'center', border:`1.5px solid ${on?teal:'#D6D3CC'}`, background: on?teal:'#fff', color:'#fff' }}>{on && <I.check />}</span>
                  <span style={{ flex:1, fontSize:14.5, fontWeight:500, color:'var(--ink)' }}>{c.nome}</span>
                  <span style={{ fontSize:14, fontWeight:700, color: on?teal:'#8A8780' }}>+{BRL(c.valor)}</span>
                </button>); })}
            </div>
          </div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:4 }}>Adicionar insumo avulso</div>
            <p style={{ margin:'0 0 12px', fontSize:12.5, color:'var(--muted)' }}>Para algo específico deste pedido que não está cadastrado.</p>
            {avulsos.map((a,k)=>(
              <div key={k} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', marginBottom:8, borderRadius:10, background:'#FCFBF9', border:'1px solid var(--line)' }}>
                <span style={{ color:orange, display:'flex' }}><I.tag /></span>
                <span style={{ flex:1, fontSize:14, color:'var(--ink)', fontWeight:500 }}>{a.nome}</span>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#A35A26' }}>+{BRL(a.valor)}</span>
                <button onClick={()=>setAvulsos((x)=>x.filter((_,j)=>j!==k))} aria-label="Remover" style={{ border:'none', background:'transparent', color:'#B7B4AD', cursor:'pointer', display:'flex' }}><I.x width="16" height="16" /></button>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, alignItems:'stretch', flexWrap:'wrap' }}>
              <input value={avNome} onChange={(e)=>setAvNome(e.target.value)} onFocus={()=>setFocus('n')} onBlur={()=>setFocus(null)}
                placeholder="Nome do insumo" style={{ ...inputBase(focus==='n'), flex:2, minWidth:140 }} />
              <div style={{ position:'relative', flex:1, minWidth:110, display:'flex' }}>
                <span style={{ position:'absolute', left:0, top:0, bottom:0, width:42, display:'grid', placeItems:'center', fontSize:14, fontWeight:600, color:'#6B6860', background:'#FAF8F5', borderRadius:'var(--r-input) 0 0 var(--r-input)', borderRight:'1px solid var(--line)', pointerEvents:'none' }}>R$</span>
                <input value={avCusto} onChange={(e)=>setAvCusto(e.target.value.replace(/[^\d.,]/g,''))} onFocus={()=>setFocus('c')} onBlur={()=>setFocus(null)}
                  inputMode="decimal" placeholder="0,00" style={{ ...inputBase(focus==='c'), paddingLeft:52 }} />
              </div>
              <button onClick={addAvulso} style={{ height:46, padding:'0 16px', borderRadius:'var(--r-btn)', border:`1.5px solid ${hexA(teal,0.4)}`, background:hexA(teal,0.06), color:teal, fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
                <I.plus /> Adicionar
              </button>
            </div>
          </div>
        </div>
        {/* footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:12 }}>
          <button onClick={onClose} style={{ flex:1, height:48, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
          <button onClick={confirm} style={{ flex:1.4, height:48, borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
            onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Confirmar</button>
        </div>
      </div>
    </div>);
}

/* ─────────  CONDIÇÕES DE PAGAMENTO (SINAL)  ───────── */
function PagamentoSection({ teal, orange, ativo, setAtivo, tipo, setTipo, valor, setValor, sinalAplicado, restante, total }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ padding:'16px 20px 20px' }}>
      {/* toggle sim/não */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:hexA(teal,0.10), color:teal }}><I.wallet /></span>
          <div>
            <div style={{ fontSize:14.5, fontWeight:600, color:'var(--ink)' }}>Cobrar entrada (sinal)?</div>
            <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>Garante o início da produção.</div>
          </div>
        </div>
        <div style={{ display:'flex', borderRadius:10, border:'1px solid var(--line)', overflow:'hidden', flexShrink:0 }}>
          {[['Não',false],['Sim',true]].map(([lbl,val])=>(
            <button key={lbl} onClick={()=>setAtivo(val)} style={{ width:60, height:40, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit',
              background: ativo===val ? (val?teal:'#F1F0EC') : '#fff', color: ativo===val ? (val?'#fff':'#5C594F') : '#A8A49C', transition:'background .14s' }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* detalhes do sinal */}
      {ativo && (
        <div style={{ marginTop:16, animation:'fadeUp .25s ease both' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', borderRadius:9, border:'1px solid var(--line)', overflow:'hidden', flexShrink:0 }}>
              {['%','R$'].map((tp)=>(
                <button key={tp} onClick={()=>setTipo(tp)} style={{ width:46, height:46, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit',
                  background: tipo===tp ? teal : '#fff', color: tipo===tp ? '#fff' : '#8A8780' }}>{tp}</button>
              ))}
            </div>
            <div style={{ position:'relative', flex:1, minWidth:120 }}>
              <input value={valor} onChange={(e)=>setValor(e.target.value.replace(/[^\d.,]/g,''))} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
                inputMode="decimal" placeholder={tipo==='%'?'50':'0,00'} style={{ width:'100%', height:46, padding:'0 14px', border:`1.5px solid ${focus?teal:'var(--line)'}`,
                  borderRadius:'var(--r-input)', fontSize:15, fontWeight:600, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
                  boxShadow: focus?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s' }} />
            </div>
          </div>
          {/* preview */}
          <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:140, padding:'12px 14px', borderRadius:12, background:hexA(teal,0.08), border:`1px solid ${hexA(teal,0.2)}` }}>
              <div style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:teal }}>Sinal</div>
              <div style={{ fontSize:18, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums', marginTop:2 }}>{BRL(sinalAplicado)}</div>
            </div>
            <div style={{ flex:1, minWidth:140, padding:'12px 14px', borderRadius:12, background:'#FCFBF9', border:'1px solid var(--line)' }}>
              <div style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>Restante na entrega</div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums', marginTop:2 }}>{BRL(restante)}</div>
            </div>
          </div>
        </div>
      )}
    </div>);
}

/* ─────────  RESUMO  ───────── */
function Summary({ teal, orange, subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante, compact }) {
  const [focus, setFocus] = useState(null);
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ display:'grid', placeItems:'center', width:30, height:30, borderRadius:9, background:hexA(teal,0.12), color:teal }}><I.doc /></span>
        <h2 style={{ margin:0, fontSize:15.5, fontWeight:700, color:'var(--ink)' }}>Resumo do orçamento</h2>
      </div>
      <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* subtotal */}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14.5, color:'#5C594F' }}>
          <span>Subtotal</span><span style={{ fontWeight:600, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{BRL(subtotal)}</span>
        </div>
        {/* desconto */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:14.5, color:'#5C594F' }}>Desconto</span>
            <span style={{ fontSize:14.5, fontWeight:600, color:'#C0492B', fontVariantNumeric:'tabular-nums' }}>− {BRL(descontoAplicado)}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ display:'flex', borderRadius:9, border:'1px solid var(--line)', overflow:'hidden', flexShrink:0 }}>
              {['%','R$'].map((tp)=>(
                <button key={tp} onClick={()=>setDescTipo(tp)} style={{ width:42, height:42, border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'inherit',
                  background: descTipo===tp ? teal : '#fff', color: descTipo===tp ? '#fff' : '#8A8780' }}>{tp}</button>
              ))}
            </div>
            <input value={descValor} onChange={(e)=>setDescValor(e.target.value.replace(/[^\d.,]/g,''))} onFocus={()=>setFocus('d')} onBlur={()=>setFocus(null)}
              inputMode="decimal" placeholder="0" style={{ flex:1, minWidth:0, height:42, padding:'0 14px', border:`1.5px solid ${focus==='d'?teal:'var(--line)'}`,
                borderRadius:'var(--r-input)', fontSize:14.5, fontWeight:600, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
                boxShadow: focus==='d'?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s' }} />
          </div>
        </div>
        {/* total */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'14px 16px', borderRadius:12, background:hexA(teal,0.08), border:`1px solid ${hexA(teal,0.18)}` }}>
          <span style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Total</span>
          <span style={{ fontSize:26, fontWeight:700, color:teal, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums' }}>{BRL(total)}</span>
        </div>
        {/* sinal + restante */}
        {sinalAtivo && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:-2 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:10, background:hexA(teal,0.06), border:`1px dashed ${hexA(teal,0.35)}` }}>
              <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:13.5, fontWeight:600, color:teal }}><span style={{ display:'flex' }}><I.wallet /></span>Sinal solicitado</span>
              <span style={{ fontSize:15, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums' }}>{BRL(sinalAplicado)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13.5, color:'#5C594F', padding:'0 2px' }}>
              <span>Restante após sinal</span><span style={{ fontWeight:600, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{BRL(restante)}</span>
            </div>
          </div>
        )}
        {/* validade */}
        <label style={{ display:'block' }}>
          <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:6, whiteSpace:'nowrap' }}><span style={{ color:teal, display:'flex' }}><I.cal /></span>Validade do orçamento</span>
          <input type="date" value={validade} onChange={(e)=>setValidade(e.target.value)} onFocus={()=>setFocus('v')} onBlur={()=>setFocus(null)}
            style={{ width:'100%', height:44, padding:'0 14px', border:`1.5px solid ${focus==='v'?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
              boxShadow: focus==='v'?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }} />
        </label>
        {/* obs */}
        <label style={{ display:'block' }}>
          <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:6 }}><span style={{ color:teal, display:'flex' }}><I.note /></span>Observações</span>
          <textarea value={obs} onChange={(e)=>setObs(e.target.value)} onFocus={()=>setFocus('o')} onBlur={()=>setFocus(null)} rows={2}
            placeholder="Ex: Entrega combinada para 15/06" style={{ width:'100%', minHeight:64, padding:'10px 14px', border:`1.5px solid ${focus==='o'?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.5,
              boxShadow: focus==='o'?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }} />
        </label>
        {/* botões */}
        <button style={{ height:50, marginTop:2, border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 10px 22px -10px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
          onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.985)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
          <I.pdf /> Gerar PDF <I.arrow />
        </button>
        <button style={{ height:46, border:'1.5px solid var(--line)', borderRadius:'var(--r-btn)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, whiteSpace:'nowrap' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>
          <I.save /> Salvar Rascunho
        </button>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "preenchido",
  "modal": "fechado",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

const SEED_ITEMS = [
  { id:1, nome:'Kit Convite Casamento', qtd:3, preco:45, customs:[{ nome:'Laminação fosca', valor:8 }] },
  { id:2, nome:'Etiqueta personalizada', qtd:10, preco:4.5, customs:[] },
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const empty = t.estado === 'vazio';

  const [cliente, setCliente] = useState(empty ? null : CLIENTES[0]);
  const [items, setItems] = useState(empty ? [] : SEED_ITEMS);
  const [modalItem, setModalItem] = useState(null);
  const [descTipo, setDescTipo] = useState('%');
  const [descValor, setDescValor] = useState('10');
  const [sinalAtivo, setSinalAtivo] = useState(true);
  const [sinalTipo, setSinalTipo] = useState('%');
  const [sinalValor, setSinalValor] = useState('50');
  const [validade, setValidade] = useState('2026-06-11');
  const [obs, setObs] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const prodRef = useRef(null);

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F' };
  const radii = { reto:{card:12,btn:6,input:6}, suave:{card:16,btn:10,input:10}, redondo:{card:22,btn:14,input:14} }[t.roundness] || { card:16, btn:10, input:10 };
  const teal = palette.teal, orange = palette.orange;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal);
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px'); r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);

  // reagir aos tweaks de estado
  useEffect(() => {
    if (t.estado === 'vazio') { setItems([]); setCliente(null); setModalItem(null); }
    else { setItems(SEED_ITEMS); setCliente(CLIENTES[0]); }
  }, [t.estado]);
  useEffect(() => {
    if (t.modal === 'aberto' && !empty) setModalItem(SEED_ITEMS[0]);
    else if (t.modal === 'fechado') setModalItem(null);
  }, [t.modal, t.estado]);

  useEffect(() => {
    const h = (e) => { if (prodRef.current && !prodRef.current.contains(e.target)) setProductOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const subtotal = items.reduce((s,it)=>s + it.preco*it.qtd, 0);
  const descNum = parseFloat((descValor||'0').replace(',','.')) || 0;
  const descontoAplicado = descTipo === '%' ? subtotal * descNum/100 : Math.min(descNum, subtotal);
  const total = Math.max(0, subtotal - descontoAplicado);
  const sinalNum = parseFloat((sinalValor||'0').replace(',','.')) || 0;
  const sinalAplicado = sinalAtivo ? (sinalTipo === '%' ? total * sinalNum/100 : Math.min(sinalNum, total)) : 0;
  const restante = Math.max(0, total - sinalAplicado);

  const setQtd = (id, v) => setItems((arr)=>arr.map((it)=>it.id===id ? { ...it, qtd:v } : it));
  const removeItem = (id) => setItems((arr)=>arr.filter((it)=>it.id!==id));
  const confirmCustom = (id, customs) => { setItems((arr)=>arr.map((it)=>it.id===id ? { ...it, customs } : it)); setModalItem(null); };
  const addProduct = (nome) => {
    const base = { 'Kit Convite Casamento':45, 'Etiqueta personalizada':4.5, 'Caixa para lembrancinha':12, 'Tag de agradecimento':2, 'Topo de bolo':28 }[nome] || 10;
    setItems((arr)=>[...arr, { id:Date.now(), nome, qtd:1, preco:base, customs:[] }]); setProductOpen(false);
  };

  const summaryProps = { teal, orange, subtotal, descTipo, descValor, setDescTipo, setDescValor, descontoAplicado, total, validade, setValidade, obs, setObs, sinalAtivo, sinalAplicado, restante };

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="orcamentos" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}><I.menu /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}><I.bell /></button>
        </div>

        <div className="content">
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap', marginBottom:22 }}>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:teal, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Orçamentos</div>
              <h1 style={{ margin:0, fontSize:29, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Novo Orçamento</h1>
            </div>
            <button style={{ flexShrink:0, height:44, padding:'0 18px', border:'1.5px solid var(--line)', borderRadius:'var(--r-btn)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}
              onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>
              <I.save /> Salvar Rascunho
            </button>
          </div>

          <div className="quote-layout">
            {/* COLUNA ESQUERDA */}
            <div style={{ display:'flex', flexDirection:'column', gap:18, minWidth:0 }}>
              {/* 1. cliente */}
              <Card label="Cliente" step="1" teal={teal} hint="Quem vai receber este orçamento?">
                <ClienteSelect teal={teal} orange={orange} cliente={cliente} onSelect={setCliente} onClear={()=>setCliente(null)} />
              </Card>

              {/* 2. itens */}
              <Card label="Itens do orçamento" step="2" teal={teal} hint="Produtos e quantidades do pedido.">
                <div style={{ marginTop:14 }}>
                  {items.length === 0 ? (
                    <div style={{ margin:'4px 20px 20px', padding:'40px 24px', textAlign:'center', border:'1.5px dashed var(--line)', borderRadius:14, background:'#FCFBF9' }}>
                      <span style={{ display:'inline-grid', placeItems:'center', width:64, height:64, borderRadius:'50%', background:hexA(teal,0.10), color:teal, marginBottom:14 }}><I.cart /></span>
                      <div style={{ fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>Nenhum produto adicionado</div>
                      <p style={{ margin:'6px 0 0', fontSize:13.5, color:'var(--muted)' }}>Comece pelo botão abaixo.</p>
                    </div>
                  ) : (
                    items.map((it,i)=>(
                      <ItemRow key={it.id} item={it} i={i} teal={teal} orange={orange} onQtd={setQtd} onRemove={removeItem} onCustom={setModalItem} />
                    ))
                  )}
                  {/* adicionar produto */}
                  <div ref={prodRef} style={{ position:'relative', padding:'14px 20px 20px', borderTop: items.length ? '1px solid var(--line)' : 'none' }}>
                    <button onClick={()=>setProductOpen((o)=>!o)} style={{ width:'100%', height:48, borderRadius:'var(--r-btn)', border:`1.5px dashed ${hexA(teal,0.5)}`, background:hexA(teal,0.05), color:teal, fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}
                      onMouseEnter={(e)=>e.currentTarget.style.background=hexA(teal,0.1)} onMouseLeave={(e)=>e.currentTarget.style.background=hexA(teal,0.05)}>
                      <I.plus /> Adicionar produto
                    </button>
                    {productOpen && (
                      <div style={{ position:'absolute', left:20, right:20, top:62, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
                        {CATALOGO.map((p)=>(
                          <button key={p} onClick={()=>addProduct(p)} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'10px 11px', borderRadius:9, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:14, fontWeight:500, color:'var(--ink)' }}
                            onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                            <span style={{ display:'grid', placeItems:'center', width:30, height:30, borderRadius:8, background:hexA(teal,0.1), color:teal }}><I.cube /></span>{p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* 3. condições de pagamento */}
              <Card label="Condições de pagamento" step="3" teal={teal} hint="Quer pedir um sinal (entrada) para começar?">
                <PagamentoSection teal={teal} orange={orange} ativo={sinalAtivo} setAtivo={setSinalAtivo}
                  tipo={sinalTipo} setTipo={setSinalTipo} valor={sinalValor} setValor={setSinalValor}
                  sinalAplicado={sinalAplicado} restante={restante} total={total} />
              </Card>

              {/* resumo no mobile (inline) */}
              <div className="summary-inline-mobile">
                <Summary {...summaryProps} compact />
              </div>
            </div>

            {/* COLUNA DIREITA — RESUMO */}
            <div className="summary-col">
              <Summary {...summaryProps} />
            </div>
          </div>
        </div>

        {/* barra resumo mobile */}
        <div className="mobile-summary-bar">
          <div>
            <div style={{ fontSize:11.5, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Total</div>
            <div style={{ fontSize:22, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>{BRL(total)}</div>
          </div>
          <button onClick={()=>{ const el=document.querySelector('.summary-inline-mobile'); }} style={{ height:48, padding:'0 22px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}>
            <I.pdf /> Gerar PDF
          </button>
        </div>
      </div>

      {modalItem && <CustomModal item={modalItem} teal={teal} orange={orange} onClose={()=>setModalItem(null)} onConfirm={confirmCustom} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Conteúdo" value={t.estado} options={[{value:'preenchido',label:'Com itens'},{value:'vazio',label:'Vazio'}]} onChange={(v)=>setTweak('estado',v)} />
        <TweakRadio label="Modal customizações" value={t.modal} options={[{value:'fechado',label:'Fechado'},{value:'aberto',label:'Aberto'}]} onChange={(v)=>setTweak('modal',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
