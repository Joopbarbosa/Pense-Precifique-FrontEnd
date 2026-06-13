/* producao-app.jsx — Tela 15 · Produção Antecipada · Pense & Precifique */
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
  plus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  minus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M5 12h14" strokeWidth="2"/></svg>,
  calendar:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>,
  chevron:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="m9 6 6 6-6 6"/></svg>,
  caret:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="m6 9 6 6 6-6"/></svg>,
  check:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M5 12.5 10 17.5 19.5 7" strokeWidth="2.2"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4" strokeWidth="1.9"/><circle cx="12" cy="17" r=".4" fill="currentColor" stroke="none"/></svg>,
  info:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" strokeWidth="1.9"/><circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/></svg>,
  factoryBig:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/><path d="M3.5 20.5h17"/></svg>,
  layers:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 3 21 8l-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid, href:'Dashboard.html' },
  { id:'clientes', label:'Clientes', icon:I.users, href:'Clientes.html' },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc, href:'Orcamentos.html' },
  { id:'insumos', label:'Insumos', icon:I.box, href:'Insumos.html' },
  { id:'produtos', label:'Produtos', icon:I.cube, href:'Produtos.html' },
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

/* ─────────  DADOS  ───────── */
const HISTORICO = [
  { num:18, data:'04/06/2026', produto:'Amigurumi Coelhinha Rosa', qtd:3, un:'unidades', insumos:[{n:'Linha teal',v:'45g'},{n:'Olhinhos',v:'6 un'}],
    consumidos:[{nome:'Linha de crochê teal 100g', total:'45 g'},{nome:'Olhinhos de segurança 6mm', total:'6 un'},{nome:'Arame para estrutura', total:'15 cm'}] },
  { num:17, data:'28/05/2026', produto:'Kit Convite Casamento', qtd:5, un:'kits', insumos:[{n:'Papel couchê',v:'10 folhas'},{n:'Fita',v:'75cm'}],
    consumidos:[{nome:'Papel couchê 180g', total:'10 folhas'},{nome:'Fita dupla face 12mm', total:'75 cm'}] },
];

const PRODUTOS_PROD = [
  { nome:'Amigurumi Coelhinha Rosa', categoria:'Produto', tipo:'Produto' },
  { nome:'Kit Convite Casamento', categoria:'Produto', tipo:'Produto' },
  { nome:'Etiqueta personalizada', categoria:'Produto', tipo:'Produto' },
  { nome:'Miolo de Agenda', categoria:'Produto Base', tipo:'Produto Base' },
  { nome:'Capa Kraft', categoria:'Produto Base', tipo:'Produto Base' },
  { nome:'Laminação fosca', categoria:'Customização', tipo:'Customização' },
  { nome:'Envelope personalizado', categoria:'Customização', tipo:'Customização' },
];

// ficha técnica do produto selecionado (consumo por unidade)
const FICHA = [
  { nome:'Linha de crochê teal 100g', porUn:15, un:'g', disponivel:12 },
  { nome:'Olhinhos de segurança 6mm', porUn:2, un:'un', disponivel:24 },
  { nome:'Arame para estrutura', porUn:5, un:'cm', disponivel:200 },
];

/* ─────────  HISTÓRICO  ───────── */
function HistRows({ teal, onVerDetalhe }) {
  return HISTORICO.map((h,i)=>(
    <React.Fragment key={i}>
      <div className="prod-row" style={{ animation:'fadeUp .35s ease both' }}>
        <div style={{ fontSize:13, color:'#5C594F', fontVariantNumeric:'tabular-nums' }}>{h.data}</div>
        <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
          <span style={{ flexShrink:0, width:34, height:34, borderRadius:9, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.produto}</span>
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{h.qtd} {h.un}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {h.insumos.map((ins,k)=>(
            <span key={k} style={{ fontSize:12, fontWeight:500, color:'#6B6860', background:'#F4F2EE', padding:'4px 9px', borderRadius:999, whiteSpace:'nowrap' }}>{ins.n}: <strong style={{ fontWeight:700, color:'#3A372F' }}>{ins.v}</strong></span>
          ))}
        </div>
        <a href="#" onClick={(e)=>{ e.preventDefault(); onVerDetalhe(h); }} style={{ fontSize:13, fontWeight:600, color:teal, textDecoration:'none', display:'flex', alignItems:'center', gap:4, justifySelf:'end', whiteSpace:'nowrap' }}>Ver detalhe <I.chevron /></a>
      </div>
      {/* mobile card */}
      <div className="prod-card" style={{ padding:'16px 18px', borderTop:'1px solid var(--line)', animation:'fadeUp .35s ease both' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <span style={{ flexShrink:0, width:32, height:32, borderRadius:9, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{h.produto}</span>
          </div>
          <span style={{ fontSize:13.5, fontWeight:700, color:teal, whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{h.qtd} {h.un}</span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
          {h.insumos.map((ins,k)=>(
            <span key={k} style={{ fontSize:11.5, fontWeight:500, color:'#6B6860', background:'#F4F2EE', padding:'4px 9px', borderRadius:999 }}>{ins.n}: <strong style={{ fontWeight:700 }}>{ins.v}</strong></span>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11 }}>
          <span style={{ fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{h.data}</span>
          <a href="#" onClick={(e)=>{ e.preventDefault(); onVerDetalhe(h); }} style={{ fontSize:13, fontWeight:600, color:teal, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>Ver detalhe <I.chevron /></a>
        </div>
      </div>
    </React.Fragment>
  ));
}

/* ─────────  MODAL · NOVA PRODUÇÃO  ───────── */
function ProdutoSelect({ teal, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); }, []);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={()=>setOpen((o)=>!o)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1.5px solid ${open?teal:'var(--line)'}`, borderRadius:'var(--r-input)', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', boxShadow: open?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }}>
        <span style={{ flexShrink:0, width:40, height:40, borderRadius:11, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'block', fontSize:14.5, fontWeight:600, color:'var(--ink)' }}>{value.nome}</span>
          <span style={{ display:'block', fontSize:12.5, color:'var(--muted)', marginTop:1 }}>{value.categoria}</span>
        </span>
        <span style={{ color:'var(--muted)', display:'flex' }}><I.caret /></span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 14px 34px -10px rgba(0,0,0,0.2)', padding:6, animation:'pop .14s ease both', maxHeight:260, overflowY:'auto' }}>
          {options.map((p)=>{ const on=p.nome===value.nome; return (
            <button key={p.nome} onClick={()=>{ onChange(p); setOpen(false); }} style={{ display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:9, border:'none', background: on?hexA(teal,0.08):'transparent', cursor:'pointer', fontFamily:'inherit' }}
              onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.background='#F7F5F1'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.background= on?hexA(teal,0.08):'transparent'; }}>
              <span style={{ flexShrink:0, width:32, height:32, borderRadius:8, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:14, fontWeight:600, color: on?teal:'var(--ink)' }}>{p.nome}</span>
                <span style={{ display:'block', fontSize:12, color:'var(--muted)' }}>{p.categoria}</span>
              </span>
              {on && <span style={{ color:teal, display:'flex' }}><I.check /></span>}
            </button>); })}
        </div>
      )}
    </div>);
}

function Counter({ value, setValue, teal }) {
  const btn = (icon, fn, disabled) => (
    <button onClick={fn} disabled={disabled} aria-label="ajustar" style={{ width:44, height:44, borderRadius:11, border:'1.5px solid var(--line)', background: disabled?'#F8F7F4':'#fff', color: disabled?'#CFCBC3':'#5C594F', cursor: disabled?'default':'pointer', display:'grid', placeItems:'center', flexShrink:0 }}
      onMouseEnter={(e)=>{ if(!disabled){ e.currentTarget.style.borderColor=teal; e.currentTarget.style.color=teal; } }} onMouseLeave={(e)=>{ if(!disabled){ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='#5C594F'; } }}>{icon}</button>);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      {btn(<I.minus />, ()=>setValue(Math.max(1, value-1)), value<=1)}
      <div style={{ minWidth:54, textAlign:'center', fontSize:24, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{value}</div>
      {btn(<I.plus />, ()=>setValue(value+1))}
    </div>);
}

function NovaProducaoModal({ teal, orange, onClose }) {
  const [tipoItem, setTipoItem] = useState('Produto');
  const produtosFiltrados = PRODUTOS_PROD.filter((p)=>p.tipo===tipoItem);
  const [produto, setProduto] = useState(PRODUTOS_PROD[0]);
  const [qtd, setQtd] = useState(3);
  const [confirma, setConfirma] = useState(false);
  const trocaTipo = (v) => { setTipoItem(v); setProduto(PRODUTOS_PROD.filter((p)=>p.tipo===v)[0]); };

  const consumo = FICHA.map((f)=>({ ...f, total: f.porUn*qtd, falta: f.porUn*qtd > f.disponivel }));
  const temFalta = consumo.some((c)=>c.falta);
  const podeConfirmar = !temFalta || confirma;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto', background:'rgba(20,18,16,0.4)', backdropFilter:'blur(1.5px)', animation:'fadeUp .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{ position:'relative', width:'min(560px, 100%)', display:'flex', flexDirection:'column', background:'#fff', borderRadius:20, boxShadow:'0 30px 70px -20px rgba(0,0,0,0.4)', overflow:'hidden', animation:'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both', margin:'auto' }}>
        {/* head */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:13 }}>
            <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:42, height:42, borderRadius:12, background:hexA(orange,0.12), color:orange }}><I.factoryBig /></span>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>Nova Produção</div>
              <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Produza antecipado e baixe os insumos do estoque.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#E9E7E2'} onMouseLeave={(e)=>e.currentTarget.style.background='#F1F0EC'}><I.x /></button>
        </div>

        <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          {/* tipo do item produzido */}
          <div>
            <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>Tipo do item produzido</span>
            <div style={{ display:'flex', padding:4, background:'#F1F0EC', borderRadius:'var(--r-btn)', gap:3 }}>
              {['Produto','Produto Base','Customização'].map((v)=>{ const on=tipoItem===v; return (
                <button key={v} type="button" onClick={()=>trocaTipo(v)} style={{ flex:1, height:40, borderRadius:8, border:'none', background: on?'#fff':'transparent', color: on?'var(--ink)':'#8A8780', fontSize:12.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', padding:'0 4px', boxShadow: on?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all .14s' }}>{v}</button>); })}
            </div>
          </div>
          {/* produto */}
          <div>
            <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>{tipoItem==='Produto Base' ? 'Produto base a produzir' : tipoItem==='Customização' ? 'Customização a produzir' : 'Produto a produzir'}</span>
            <ProdutoSelect teal={teal} value={produto} onChange={setProduto} options={produtosFiltrados} />
          </div>
          {/* quantidade */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:13.5, fontWeight:600, color:'#5C594F' }}>Quantidade a produzir</span>
            <Counter value={qtd} setValue={setQtd} teal={teal} />
          </div>

          {/* card insumos consumidos */}
          <div style={{ borderRadius:14, background:hexA(teal,0.05), border:`1.5px solid ${hexA(teal,0.22)}`, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'13px 16px', borderBottom:`1px solid ${hexA(teal,0.18)}` }}>
              <span style={{ display:'flex', color:teal }}><I.layers /></span>
              <span style={{ fontSize:13.5, fontWeight:700, color:'var(--teal-deep)' }}>Insumos que serão consumidos para {qtd} {qtd===1?'unidade':'unidades'}</span>
            </div>
            <div>
              {consumo.map((c,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderTop: i===0?'none':`1px solid ${hexA(teal,0.12)}`, animation:'rowIn .25s ease both' }}>
                  <span style={{ flexShrink:0, width:22, height:22, borderRadius:7, display:'grid', placeItems:'center', background: c.falta?'#FBEDE9':'#E8F5EE', color: c.falta?'var(--danger)':'#1F8A5B' }}>{c.falta ? <I.alert /> : <I.check />}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.8, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nome}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>Disponível: <strong style={{ fontWeight:600, color: c.falta?'var(--danger)':'#5C594F' }}>{c.disponivel}{c.un}</strong></div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{c.total}{c.un}</div>
                    {c.falta
                      ? <div style={{ fontSize:11, fontWeight:700, color:'var(--danger)', display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end', marginTop:1 }}><I.alert /> Saldo insuficiente</div>
                      : <div style={{ fontSize:11, fontWeight:600, color:'#1F8A5B', marginTop:1 }}>OK</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* aviso + checkbox */}
          {temFalta && (
            <div style={{ animation:'fadeUp .3s ease both' }}>
              <div style={{ display:'flex', gap:10, padding:'13px 15px', borderRadius:12, background:'#FFF8F0', border:'1px solid #F6E4CE' }}>
                <span style={{ flexShrink:0, color:'#C8721F', marginTop:1 }}><I.alert /></span>
                <p style={{ margin:0, fontSize:12.8, color:'#7A5A33', lineHeight:1.55 }}>Um ou mais insumos estão com <strong style={{ fontWeight:700 }}>saldo insuficiente</strong>. Você pode confirmar mesmo assim — o saldo ficará negativo.</p>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:11, marginTop:12, cursor:'pointer', userSelect:'none' }}>
                <span onClick={()=>setConfirma((c)=>!c)} style={{ flexShrink:0, width:22, height:22, borderRadius:6, border:`1.5px solid ${confirma?orange:'#CFCBC3'}`, background: confirma?orange:'#fff', display:'grid', placeItems:'center', color:'#fff', transition:'all .14s' }}>{confirma && <I.check />}</span>
                <span onClick={()=>setConfirma((c)=>!c)} style={{ fontSize:13.5, fontWeight:500, color:'#5C594F' }}>Confirmar mesmo com saldo insuficiente</span>
              </label>
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:11, justifyContent:'flex-end', flexWrap:'wrap' }}>
          <button onClick={onClose} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
          <button onClick={onClose} disabled={!podeConfirmar} style={{ height:46, padding:'0 22px', borderRadius:'var(--r-btn)', border:'none', background: podeConfirmar?orange:'#E7E4DE', color: podeConfirmar?'#fff':'#B0ACA4', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor: podeConfirmar?'pointer':'default', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap', boxShadow: podeConfirmar?`0 8px 18px -8px ${hexA(orange,0.7)}`:'none', transition:'all .15s' }}
            onMouseEnter={(e)=>{ if(podeConfirmar) e.currentTarget.style.filter='brightness(1.05)'; }} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}><I.factoryBig style={{ width:17, height:17 }} /> Confirmar produção</button>
        </div>
      </div>
    </div>);
}

/* ─────────  DETALHE DA PRODUÇÃO  ───────── */
function ProducaoDetalhe({ prod, onBack, teal, orange }) {
  return (
    <div style={{ animation:'fadeUp .35s ease both' }}>
      <button onClick={onBack} style={{ display:'inline-flex', alignItems:'center', gap:8, height:40, padding:'0 16px 0 12px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', marginBottom:20 }}
        onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>
        <span style={{ display:'flex', transform:'rotate(180deg)' }}><I.chevron /></span> Voltar para Produção
      </button>

      {/* header */}
      <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:22 }}>
        <span style={{ flexShrink:0, width:52, height:52, borderRadius:15, display:'grid', placeItems:'center', background:hexA(orange,0.12), color:orange }}><I.factoryBig /></span>
        <div>
          <h1 style={{ margin:0, fontSize:25, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>Produção #{prod.num} — {prod.data}</h1>
          <p style={{ margin:'5px 0 0', fontSize:14, color:'var(--muted)' }}>Baixa de insumos registrada no estoque.</p>
        </div>
      </div>

      {/* card produto */}
      <div style={{ display:'flex', alignItems:'center', gap:14, background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'18px 20px', marginBottom:18 }}>
        <span style={{ flexShrink:0, width:48, height:48, borderRadius:13, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.cube /></span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>{prod.produto}</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Produzido em {prod.data}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:24, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{prod.qtd}</div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginTop:3 }}>{prod.un} produzidas</div>
        </div>
      </div>

      {/* tabela insumos consumidos */}
      <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'14px 18px', borderBottom:'1px solid var(--line)' }}>
          <span style={{ display:'flex', color:teal }}><I.layers /></span>
          <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:'#5C594F', textTransform:'uppercase', letterSpacing:'0.03em' }}>Insumos consumidos</h2>
        </div>
        {prod.consumidos.map((row,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 18px', borderTop: i===0?'none':'1px solid #F4F2EE' }}>
            <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
              <span style={{ flexShrink:0, width:32, height:32, borderRadius:9, display:'grid', placeItems:'center', background:'#F1F0EC', color:'#9A968E' }}><I.box /></span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{row.nome}</span>
            </div>
            <span style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{row.total}</span>
          </div>
        ))}
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "modal": "aberto",
  "tela": "lista",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [buscaFocus, setBuscaFocus] = useState(false);
  const [modal, setModal] = useState(t.modal === 'aberto');
  const [detalhe, setDetalhe] = useState(t.tela === 'detalhe' ? HISTORICO[0] : null);

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F' };
  const radii = { reto:{card:12,btn:6,input:6}, suave:{card:16,btn:10,input:10}, redondo:{card:22,btn:14,input:14} }[t.roundness] || { card:16, btn:10, input:10 };
  const teal = palette.teal, orange = palette.orange;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal); r.setProperty('--teal-deep','#1F7A6F');
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px'); r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);
  useEffect(() => { setModal(t.modal === 'aberto'); }, [t.modal]);
  useEffect(() => { setDetalhe(t.tela === 'detalhe' ? HISTORICO[0] : null); }, [t.tela]);

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="producao" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}><I.menu /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}><I.bell /></button>
        </div>

        <div className="content">
          {detalhe ? (
            <ProducaoDetalhe prod={detalhe} onBack={()=>{ setDetalhe(null); setTweak('tela','lista'); }} teal={teal} orange={orange} />
          ) : (
          <React.Fragment>
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap', marginBottom:22 }}>
            <div>
              <h1 style={{ margin:0, fontSize:27, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>Registro de Produção</h1>
              <p style={{ margin:'6px 0 0', fontSize:14.5, color:'var(--muted)' }}>Registre o que você produziu para dar baixa nos insumos e atualizar o estoque dos seus produtos.</p>
            </div>
            <button onClick={()=>setModal(true)} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
              onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
              <I.plus /> Nova Produção
            </button>
          </div>

          {/* FILTROS */}
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:18 }}>
            <div style={{ position:'relative', flex:'1 1 240px', minWidth:200, maxWidth:380 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: buscaFocus?teal:'#A8A49C', display:'flex' }}><I.search /></span>
              <input value={busca} onChange={(e)=>setBusca(e.target.value)} onFocus={()=>setBuscaFocus(true)} onBlur={()=>setBuscaFocus(false)} placeholder="Buscar por produto..."
                style={{ width:'100%', height:46, padding:'0 14px 0 42px', border:`1.5px solid ${buscaFocus?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: buscaFocus?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
            </div>
            <DateRange teal={teal} />
          </div>

          {/* HISTÓRICO */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ display:'flex', color:'#A8A49C' }}><I.factory style={{ width:17, height:17 }} /></span>
            <h2 style={{ margin:0, fontSize:14.5, fontWeight:700, color:'#5C594F', textTransform:'uppercase', letterSpacing:'0.03em' }}>Histórico de produções</h2>
          </div>
          <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
            <div className="prod-head">
              {['Data','Produto','Quantidade','Insumos consumidos','']. map((h,k)=>(
                <div key={k} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C', textAlign: k===4?'right':'left' }}>{h}</div>
              ))}
            </div>
            <HistRows teal={teal} onVerDetalhe={(h)=>setDetalhe(h)} />
          </div>
          </React.Fragment>
          )}
        </div>
      </div>

      {modal && !detalhe && <NovaProducaoModal teal={teal} orange={orange} onClose={()=>setModal(false)} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Modal Nova Produção" value={t.modal} options={[{value:'aberto',label:'Aberto'},{value:'fechado',label:'Fechado'}]} onChange={(v)=>setTweak('modal',v)} />
        <TweakRadio label="Tela" value={t.tela} options={[{value:'lista',label:'Lista'},{value:'detalhe',label:'Detalhe'}]} onChange={(v)=>setTweak('tela',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

function DateRange({ teal }) {
  const [f, setF] = useState(false);
  return (
    <button onClick={()=>setF((x)=>!x)} style={{ display:'flex', alignItems:'center', gap:10, height:46, padding:'0 16px', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:'var(--r-input)', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:500, color:'#5C594F', whiteSpace:'nowrap', boxShadow: f?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }}
      onMouseLeave={()=>setF(false)}>
      <span style={{ display:'flex', color:'#A8A49C' }}><I.calendar /></span>
      <span>01 mai — 08 jun 2026</span>
      <span style={{ display:'flex', color:'var(--muted)' }}><I.caret /></span>
    </button>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
