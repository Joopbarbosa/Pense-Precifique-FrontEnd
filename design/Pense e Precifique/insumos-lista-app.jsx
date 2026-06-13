/* insumos-lista-app.jsx — Tela 10 · Insumos (lista) · Pense & Precifique */
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
  dots:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></svg>,
  edit:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>,
  history:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3.5 18v-4h4"/><path d="M12 7.5V12l3 1.8"/></svg>,
  power:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 3.5v7M7.5 6.5a7 7 0 1 0 9 0"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4" strokeWidth="1.9"/><circle cx="12" cy="17" r=".4" fill="currentColor" stroke="none"/></svg>,
  emptybox:(p)=><svg viewBox="0 0 24 24" width="34" height="34" {...sw} {...p}><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid, href:'Dashboard.html' },
  { id:'clientes', label:'Clientes', icon:I.users, href:'Clientes.html' },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc, href:'Orcamentos.html' },
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
function moeda(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: n < 0.1 ? 3 : 2, maximumFractionDigits:3 });
}

/* ─────────  DADOS  ───────── */
const INSUMOS = [
  { nome:'Papel couchê 180g', marca:'Suzano', un:'folha', estoque:24, minimo:10, custo:0.45, status:'Ativo' },
  { nome:'Fita dupla face 12mm', marca:'3M', un:'cm', estoque:45, minimo:200, custo:0.08, status:'Ativo' },
  { nome:'Linha de crochê teal 100g', marca:'Pingouin', un:'g', estoque:12, minimo:50, custo:0.089, status:'Ativo' },
  { nome:'Envelope kraft C6', marca:'s/ marca', un:'unidade', estoque:48, minimo:20, custo:1.20, status:'Ativo' },
  { nome:'Tinta acrílica azul', marca:'Acrilex', un:'ml', estoque:0, minimo:null, custo:0.15, status:'Inativo' },
];
const isLow = (o) => o.status === 'Ativo' && o.minimo != null && o.estoque < o.minimo;
const FILTERS = ['Todos','Ativos','Inativos','Estoque baixo'];

/* ─────────  BADGES  ───────── */
function StatusBadge({ o, small }) {
  const low = isLow(o);
  if (low) {
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:5, height: small?24:28, padding:'0 10px', borderRadius:999, background:'#FFF1E8', color:'#C8721F', fontSize: small?11.5:12.5, fontWeight:600, whiteSpace:'nowrap' }}>
        <I.alert /> Estoque baixo
      </span>);
  }
  if (o.status === 'Inativo') {
    return <span style={{ display:'inline-flex', alignItems:'center', gap:6, height: small?24:28, padding:'0 11px', borderRadius:999, background:'#F1F0EC', color:'#7C786F', fontSize: small?11.5:12.5, fontWeight:600, whiteSpace:'nowrap' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#A8A49C' }} />Inativo</span>;
  }
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, height: small?24:28, padding:'0 11px', borderRadius:999, background:'#E8F5EE', color:'#1F8A5B', fontSize: small?11.5:12.5, fontWeight:600, whiteSpace:'nowrap' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#34A56F' }} />Ativo</span>;
}

/* ─────────  MENU 3 PONTOS  ───────── */
function RowMenu({ open, onToggle, inativo }) {
  return (
    <div style={{ position:'relative' }}>
      <button onClick={onToggle} aria-label="Mais ações" style={{ width:34, height:34, borderRadius:9, border:'none', background: open?'#F1F0EC':'transparent', color:'#8A8780', cursor:'pointer', display:'grid', placeItems:'center' }}
        onMouseEnter={(e)=>{ if(!open) e.currentTarget.style.background='#F1F0EC'; }} onMouseLeave={(e)=>{ if(!open) e.currentTarget.style.background='transparent'; }}>
        <I.dots />
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:40, zIndex:40, width:185, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
          {[['Ver detalhes', (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>, 'Detalhe-Insumo.html'], ['Editar', I.edit, 'Cadastrar-Insumo.html'], ['Registrar compra', (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M3 4h2l2.2 11.2a1.4 1.4 0 0 0 1.4 1.1h8.1a1.4 1.4 0 0 0 1.4-1.1L20 7.5H6"/><circle cx="9.5" cy="20" r="1.2" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none"/></svg>, 'Detalhe-Insumo.html']].map(([label, Ic, href],k)=>(
            <button key={k} onClick={()=>{ onToggle(); if(href) window.location.href=href; }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13.5, fontWeight:500, color:'#5C594F' }}
              onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
              <span style={{ display:'flex', color:'#A29E96' }}><Ic /></span>{label}
            </button>
          ))}
          <div style={{ height:1, background:'var(--line)', margin:'5px 8px' }} />
          <button onClick={onToggle} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13.5, fontWeight:500, color:'#5C594F' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
            <span style={{ display:'flex', color:'#A29E96' }}><I.power /></span>{inativo ? 'Reativar' : 'Desativar'}
          </button>
        </div>
      )}
    </div>);
}

/* ─────────  LINHA (desktop)  ───────── */
function Row({ o, teal, orange, menuOpen, onMenu }) {
  const inativo = o.status === 'Inativo';
  const low = isLow(o);
  return (
    <div className="q-row" style={{ position:'relative', zIndex: menuOpen ? 30 : 1, background: low ? '#FFFAF5' : inativo ? '#FAF9F6' : '#fff', opacity: inativo ? 0.6 : 1, transition:'background .12s', animation: inativo ? 'none' : 'fadeUp .35s ease both' }}
      onMouseEnter={(e)=>{ if(!menuOpen && !low && !inativo) e.currentTarget.style.background='#FCFBF9'; }}
      onMouseLeave={(e)=>{ if(!menuOpen) e.currentTarget.style.background = low ? '#FFFAF5' : inativo ? '#FAF9F6' : '#fff'; }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
        <span style={{ flexShrink:0, width:38, height:38, borderRadius:10, display:'grid', placeItems:'center', background: inativo?'#F1F0EC':hexA(teal,0.1), color: inativo?'#A8A49C':teal }}><I.box /></span>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:600, color: inativo?'#9A968E':'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.nome}</span>
            {inativo && <span style={{ flexShrink:0, fontSize:10.5, fontWeight:700, color:'#C0492B', background:'#FBEDE7', border:'1px solid #F2D8CF', borderRadius:6, padding:'1px 7px', lineHeight:1.4 }}>Inativo</span>}
          </div>
          <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>{o.marca}</div>
        </div>
      </div>
      <div style={{ fontSize:13.5, color:'#5C594F' }}>{o.un}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color: low?'#C8721F':inativo?'#9A968E':'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{o.estoque} {o.un === 'unidade' ? 'un' : o.un}</div>
      </div>
      <div style={{ fontSize:13, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{o.minimo != null ? `${o.minimo} ${o.un === 'unidade' ? 'un' : o.un}` : '—'}</div>
      <div style={{ fontSize:13.5, fontWeight:600, color: inativo?'#9A968E':'#3A372F', fontVariantNumeric:'tabular-nums' }}>{moeda(o.custo)}<span style={{ fontWeight:400, color:'var(--muted)', fontSize:12 }}>/{o.un === 'unidade' ? 'un' : o.un}</span></div>
      <div><StatusBadge o={o} /></div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <RowMenu open={menuOpen} onToggle={onMenu} inativo={inativo} />
      </div>
    </div>);
}

/* ─────────  CARD (mobile)  ───────── */
function CardMobile({ o, teal, orange, menuOpen, onMenu }) {
  const inativo = o.status === 'Inativo';
  const low = isLow(o);
  return (
    <div className="q-card-mobile" style={{ position:'relative', zIndex: menuOpen ? 30 : 1, padding:'16px 18px', borderBottom:'1px solid var(--line)', background: low?'#FFFAF5':inativo?'#FAF9F6':'#fff', opacity: inativo?0.6:1, animation: inativo ? 'none' : 'fadeUp .35s ease both' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
          <span style={{ flexShrink:0, width:40, height:40, borderRadius:11, display:'grid', placeItems:'center', background: inativo?'#F1F0EC':hexA(teal,0.1), color: inativo?'#A8A49C':teal }}><I.box /></span>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:14.5, fontWeight:600, color: inativo?'#9A968E':'var(--ink)' }}>{o.nome}</span>
              {inativo && <span style={{ flexShrink:0, fontSize:10.5, fontWeight:700, color:'#C0492B', background:'#FBEDE7', border:'1px solid #F2D8CF', borderRadius:6, padding:'1px 7px', lineHeight:1.4 }}>Inativo</span>}
            </div>
            <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>{o.marca} · {o.un}</div>
          </div>
        </div>
        <RowMenu open={menuOpen} onToggle={onMenu} inativo={inativo} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
        <StatusBadge o={o} small />
      </div>
      <div style={{ display:'flex', gap:18, marginTop:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em' }}>Estoque</div>
          <div style={{ fontSize:15, fontWeight:700, color: low?'#C8721F':'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{o.estoque} {o.un === 'unidade' ? 'un' : o.un}{o.minimo!=null && <span style={{ fontSize:12, fontWeight:500, color:'var(--muted)' }}> · mín {o.minimo}</span>}</div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em' }}>Custo</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{moeda(o.custo)}<span style={{ fontSize:11.5, fontWeight:400, color:'var(--muted)' }}>/{o.un === 'unidade' ? 'un' : o.un}</span></div>
        </div>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "lista",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtro, setFiltro] = useState('Todos');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const empty = t.estado === 'vazio';

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
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  let lista = INSUMOS;
  if (filtro === 'Ativos') lista = lista.filter((o)=>o.status === 'Ativo');
  else if (filtro === 'Inativos') lista = lista.filter((o)=>o.status === 'Inativo');
  else if (filtro === 'Estoque baixo') lista = lista.filter(isLow);
  if (query.trim()) lista = lista.filter((o)=>o.nome.toLowerCase().includes(query.toLowerCase()) || o.marca.toLowerCase().includes(query.toLowerCase()));

  const lowCount = INSUMOS.filter(isLow).length;

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="insumos" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

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
              <h1 style={{ margin:0, fontSize:29, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Meus Insumos</h1>
              <p style={{ margin:'7px 0 0', fontSize:14.5, color:'var(--muted)' }}>A base de toda precificação justa começa aqui.</p>
            </div>
            <a href="Cadastrar-Insumo.html" style={{ textDecoration:'none', flexShrink:0 }}>
              <button style={{ height:46, padding:'0 20px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
                onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
                <I.plus /> Novo Insumo
              </button>
            </a>
          </div>

          {!empty && (
            <>
              {/* FILTROS */}
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:18 }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {FILTERS.map((f)=>{ const on=filtro===f; const isLowChip = f==='Estoque baixo'; return (
                    <button key={f} onClick={()=>setFiltro(f)} style={{ height:34, padding:'0 14px', borderRadius:999, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:7,
                      border:`1.5px solid ${on?(isLowChip?'#E8973A':teal):'var(--line)'}`, background: on?(isLowChip?'#F2913C':teal):'#fff', color: on?'#fff':'#5C594F', transition:'all .14s' }}
                      onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.background='#FAF8F5'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.background='#fff'; }}>
                      {isLowChip && <span style={{ display:'flex', color: on?'#fff':'#E8973A' }}><I.alert /></span>}{f}
                      {isLowChip && lowCount>0 && <span style={{ minWidth:18, height:18, padding:'0 5px', borderRadius:999, display:'grid', placeItems:'center', fontSize:11, fontWeight:700, background: on?'rgba(255,255,255,0.28)':'#FFF1E8', color: on?'#fff':'#C8721F' }}>{lowCount}</span>}
                    </button>); })}
                </div>
                <div style={{ position:'relative', maxWidth:440 }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', display:'flex' }}><I.search /></span>
                  <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nome ou marca…" style={{ width:'100%', height:44, padding:'0 16px 0 42px', border:'1.5px solid var(--line)', borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit' }}
                    onFocus={(e)=>{ e.target.style.borderColor=teal; e.target.style.boxShadow=`0 0 0 4px ${hexA(teal,0.12)}`; }} onBlur={(e)=>{ e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none'; }} />
                </div>
              </div>

              {/* TABELA / CARDS */}
              <div ref={menuRef} style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                <div className="q-head">
                  {['Insumo','Unidade','Estoque atual','Estoque mín.','Custo unitário','Status',''].map((h,k)=>(
                    <div key={k} style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C', textAlign: k===6?'right':'left' }}>{h}</div>
                  ))}
                </div>
                {lista.length === 0 ? (
                  <div style={{ padding:'48px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Nenhum insumo encontrado</div>
                    <p style={{ margin:'6px 0 0', fontSize:13.5, color:'var(--muted)' }}>Ajuste os filtros ou a busca.</p>
                  </div>
                ) : lista.map((o)=>(
                  <React.Fragment key={o.nome}>
                    <Row o={o} teal={teal} orange={orange} menuOpen={menuOpen===o.nome} onMenu={()=>setMenuOpen(menuOpen===o.nome?null:o.nome)} />
                    <CardMobile o={o} teal={teal} orange={orange} menuOpen={menuOpen===o.nome} onMenu={()=>setMenuOpen(menuOpen===o.nome?null:o.nome)} />
                  </React.Fragment>
                ))}
              </div>
              <div style={{ marginTop:14, fontSize:12.5, color:'var(--muted)', textAlign:'right' }}>{lista.length} {lista.length===1?'insumo':'insumos'}</div>
            </>
          )}

          {/* ESTADO VAZIO */}
          {empty && (
            <div style={{ position:'relative', overflow:'hidden', marginTop:8, padding:'72px 28px', textAlign:'center', background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ position:'absolute', inset:0, opacity:0.5, pointerEvents:'none' }}>
                <svg viewBox="0 0 100 100" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
                  {[[14,20,2.4],[26,12,1.8],[40,24,2],[80,16,2.4],[88,28,1.8],[72,12,2],[18,78,2],[34,86,2.4],[66,82,2],[84,74,1.8]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r*0.5} fill={orange} opacity={0.5+(i%3)*0.18} />)}
                </svg>
                <div style={{ position:'absolute', width:160, height:160, borderRadius:'46% 54% 60% 40% / 50% 44% 56% 50%', background:hexA(teal,0.08), top:-50, right:40, animation:'floaty 10s ease-in-out infinite' }} />
              </div>
              <div style={{ position:'relative' }}>
                <span style={{ display:'inline-grid', placeItems:'center', width:74, height:74, borderRadius:'50%', background:hexA(teal,0.1), color:teal, marginBottom:18 }}><I.emptybox /></span>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'var(--ink)' }}>Nenhum insumo cadastrado ainda</h2>
                <p style={{ margin:'8px auto 22px', maxWidth:380, fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>Cadastre o primeiro para começar a montar suas fichas técnicas.</p>
                <a href="Cadastrar-Insumo.html" style={{ textDecoration:'none' }}>
                  <button style={{ height:48, padding:'0 24px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 10px 22px -10px ${hexA(orange,0.7)}` }}
                    onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
                    <I.plus /> Cadastrar primeiro insumo
                  </button>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Conteúdo" value={t.estado} options={[{value:'lista',label:'Com lista'},{value:'vazio',label:'Vazio'}]} onChange={(v)=>setTweak('estado',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
