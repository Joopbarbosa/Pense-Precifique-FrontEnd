/* orcamentos-lista-app.jsx — Tela 9 · Orçamentos (lista) · Pense & Precifique */
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
  cal:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>,
  plus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  dots:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></svg>,
  copy:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>,
  ban:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><circle cx="12" cy="12" r="8.2"/><path d="m6.5 6.5 11 11"/></svg>,
  eye:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4" strokeWidth="1.9"/><circle cx="12" cy="17" r=".4" fill="currentColor" stroke="none"/></svg>,
  filter:(p)=><svg viewBox="0 0 24 24" width="34" height="34" {...sw} {...p}><path d="M3.5 5.5h17l-6.5 8v5l-4 2v-7l-6.5-8Z"/></svg>,
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
/* "04/06/2026" -> Date ; "2026-06-04" (input) -> Date */
function dmyToDate(s) { if(!s) return null; const [d,m,y]=s.split('/').map(Number); return new Date(y, m-1, d); }
function isoToDate(s) { if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d); }
function fmtBR(iso) { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }

/* ─────────  STATUS  ───────── */
const STATUS_META = {
  'Rascunho': { bg:'#F1F0EC', fg:'#7C786F', dot:'#A8A49C' },
  'Enviado': { bg:'#EAF1FB', fg:'#2A6FB0', dot:'#3A86CE' },
  'Aprovado': { bg:'#EAF7EF', fg:'#3E9D5A', dot:'#54B36F' },
  'Em Produção': { bg:'#FFF1E8', fg:'#C8721F', dot:'#F97316' },
  'Finalizado': { bg:'#E7F4F1', fg:'#1F7A6F', dot:'#2A9D8F' },
  'Entregue': { bg:'#E8F5EE', fg:'#1F8A5B', dot:'#34A56F' },
  'Pago': { bg:'#E2F0E6', fg:'#176B43', dot:'#1F8A5B' },
  'Cancelado': { bg:'#FCF0EC', fg:'#C0492B', dot:'#D06A4E' },
};
const FILTERS = ['Todos','Rascunho','Enviado','Aprovado','Em Produção','Finalizado','Entregue','Pago','Cancelado'];

function StatusBadge({ status, small }) {
  const s = STATUS_META[status] || STATUS_META['Rascunho'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, height: small?24:28, padding: small?'0 9px':'0 11px', borderRadius:999,
      background:s.bg, color:s.fg, fontSize: small?11.5:12.5, fontWeight:600, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot }} />{status}
    </span>);
}
function VencidoBadge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, height:24, padding:'0 9px', borderRadius:999,
      background:'#FCF0EC', color:'#C0492B', fontSize:11.5, fontWeight:600, whiteSpace:'nowrap' }}>
      <I.alert /> Vencido
    </span>);
}

/* ─────────  MENU 3 PONTOS  ───────── */
function RowMenu({ teal, orange, open, onToggle, cancelado }) {
  return (
    <div style={{ position:'relative' }}>
      <button onClick={onToggle} aria-label="Mais ações" style={{ width:34, height:34, borderRadius:9, border:'none', background: open?'#F1F0EC':'transparent', color:'#8A8780', cursor:'pointer', display:'grid', placeItems:'center' }}
        onMouseEnter={(e)=>{ if(!open) e.currentTarget.style.background='#F1F0EC'; }} onMouseLeave={(e)=>{ if(!open) e.currentTarget.style.background='transparent'; }}>
        <I.dots />
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:40, zIndex:40, width:180, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
          {(cancelado ? [['Ver detalhes', I.eye, '#5C594F', 'Detalhe.html']] : [['Ver detalhes', I.eye, '#5C594F', 'Detalhe.html'], ['Duplicar', I.copy, '#5C594F', null]]).map(([label, Ic, col, href],k)=>(
            <button key={k} onClick={()=>{ onToggle(); if(href) window.location.href=href; }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13.5, fontWeight:500, color:col }}
              onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
              <span style={{ display:'flex', color:'#A29E96' }}><Ic /></span>{label}
            </button>
          ))}
          {!cancelado && (
            <>
              <div style={{ height:1, background:'var(--line)', margin:'5px 8px' }} />
              <button onClick={onToggle} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13.5, fontWeight:500, color:'#C0492B' }}
                onMouseEnter={(e)=>e.currentTarget.style.background='#FCF1ED'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                <span style={{ display:'flex' }}><I.ban /></span>Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>);
}

/* ─────────  DADOS  ───────── */
const ORCAMENTOS = [
  { num:'#0042', cliente:'Mariana Costa', total:183.6, criacao:'04/06/2026', validade:'11/06/2026', status:'Em Produção', vencido:false },
  { num:'#0041', cliente:'Camila Rocha', total:320, criacao:'02/06/2026', validade:'06/06/2026', status:'Enviado', vencido:true },
  { num:'#0040', cliente:'Patrícia Mendes', total:89, criacao:'28/05/2026', validade:null, status:'Pago', vencido:false },
  { num:'#0039', cliente:'Juliana Ferreira', total:240, criacao:'20/05/2026', validade:null, status:'Cancelado', vencido:false },
];

/* ─────────  LINHA (desktop)  ───────── */
function Row({ o, teal, orange, menuOpen, onMenu }) {
  const cancelado = o.status === 'Cancelado';
  return (
    <div className="q-row" style={{ position:'relative', zIndex: menuOpen ? 30 : 1, background: o.vencido ? '#FEF7F4' : '#fff', opacity: cancelado ? 0.62 : 1, transition:'background .12s', animation: cancelado ? 'none' : 'fadeUp .35s ease both' }}
      onMouseEnter={(e)=>{ if(!menuOpen && !o.vencido) e.currentTarget.style.background='#FCFBF9'; }}
      onMouseLeave={(e)=>{ if(!menuOpen) e.currentTarget.style.background = o.vencido ? '#FEF7F4' : '#fff'; }}>
      <a href="Detalhe.html" style={{ fontSize:14, fontWeight:700, color: cancelado ? '#9A968E' : 'var(--ink)', textDecoration:'none', fontVariantNumeric:'tabular-nums' }}>{o.num}</a>
      <div style={{ fontSize:14, fontWeight:600, color: cancelado ? '#9A968E' : 'var(--ink)', textDecoration: cancelado ? 'line-through' : 'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.cliente}</div>
      <div style={{ fontSize:14, fontWeight:600, color: cancelado ? '#9A968E' : '#3A372F', textDecoration: cancelado ? 'line-through' : 'none', fontVariantNumeric:'tabular-nums' }}>{BRL(o.total)}</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ color:'#B7B4AD', display:'flex' }}><I.cal /></span>{o.criacao}</div>
        {o.validade ? (
          <div style={{ marginTop:3, fontSize:12, color: o.vencido ? '#C0492B' : '#A8A49C', fontWeight: o.vencido ? 600 : 400 }}>
            {o.vencido ? 'venceu em ' : 'válido até '}{o.validade}
          </div>
        ) : <div style={{ marginTop:3, fontSize:12, color:'#C0BCB4' }}>sem validade</div>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <StatusBadge status={o.status} />
        {o.vencido && <VencidoBadge />}
      </div>
      <RowMenu teal={teal} orange={orange} open={menuOpen} onToggle={onMenu} cancelado={cancelado} />
    </div>);
}

/* ─────────  CARD (mobile)  ───────── */
function CardMobile({ o, teal, orange, menuOpen, onMenu, i }) {
  const cancelado = o.status === 'Cancelado';
  return (
    <div className="q-card-mobile" style={{ position:'relative', zIndex: menuOpen ? 30 : 1, padding:'16px 18px', borderBottom:'1px solid var(--line)', background: o.vencido ? '#FEF7F4' : '#fff', opacity: cancelado ? 0.62 : 1, animation: cancelado ? 'none' : 'fadeUp .35s ease both' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14.5, fontWeight:700, color: cancelado?'#9A968E':'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{o.num}</span>
            <StatusBadge status={o.status} small />
            {o.vencido && <VencidoBadge />}
          </div>
          <div style={{ fontSize:14, fontWeight:600, color: cancelado?'#9A968E':'var(--ink)', marginTop:6, textDecoration: cancelado?'line-through':'none' }}>{o.cliente}</div>
        </div>
        <RowMenu teal={teal} orange={orange} open={menuOpen} onToggle={onMenu} cancelado={cancelado} />
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, marginTop:12 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em' }}>Total</div>
          <div style={{ fontSize:18, fontWeight:700, color: cancelado?'#9A968E':orange, textDecoration: cancelado ? 'line-through' : 'none', fontVariantNumeric:'tabular-nums' }}>{BRL(o.total)}</div>
        </div>
        <div style={{ textAlign:'right', fontSize:12, color:'var(--muted)' }}>
          <div>Criado {o.criacao}</div>
          {o.validade ? <div style={{ marginTop:2, color: o.vencido ? '#C0492B' : '#A8A49C', fontWeight: o.vencido?600:400 }}>{o.vencido ? 'venceu ' : 'válido até '}{o.validade}</div> : <div style={{ marginTop:2, color:'#C0BCB4' }}>sem validade</div>}
        </div>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "lista",
  "clienteFiltro": "off",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtro, setFiltro] = useState('Todos');
  const [query, setQuery] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const periodRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [clienteFiltro, setClienteFiltro] = useState(t.clienteFiltro === 'on' ? 'Camila Rocha' : null);
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
  useEffect(() => { setClienteFiltro(t.clienteFiltro === 'on' ? 'Camila Rocha' : null); }, [t.clienteFiltro]);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
    };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  let lista = ORCAMENTOS;
  if (clienteFiltro) lista = lista.filter((o)=>o.cliente === clienteFiltro);
  if (filtro !== 'Todos') lista = lista.filter((o)=>o.status === filtro);
  if (query.trim()) lista = lista.filter((o)=>o.cliente.toLowerCase().includes(query.toLowerCase()) || o.num.includes(query));
  const fromD = isoToDate(dateFrom), toD = isoToDate(dateTo);
  if (fromD) lista = lista.filter((o)=>dmyToDate(o.criacao) >= fromD);
  if (toD) lista = lista.filter((o)=>dmyToDate(o.criacao) <= toD);
  const periodActive = !!(dateFrom || dateTo);
  const periodLabel = periodActive ? `${dateFrom?fmtBR(dateFrom):'…'} – ${dateTo?fmtBR(dateTo):'…'}` : 'Período';

  const setPreset = (days) => {
    const today = new Date(2026, 5, 5); // 05/06/2026 (data atual do sistema)
    const past = new Date(today); past.setDate(today.getDate() - days);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setDateFrom(iso(past)); setDateTo(iso(today));
  };
  const clearPeriod = () => { setDateFrom(''); setDateTo(''); };

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
              <h1 style={{ margin:0, fontSize:29, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Orçamentos</h1>
              <p style={{ margin:'7px 0 0', fontSize:14.5, color:'var(--muted)' }}>Acompanhe e gerencie todos os seus orçamentos.</p>
            </div>
            <a href="Criar-Orcamento.html" style={{ textDecoration:'none', flexShrink:0 }}>
              <button style={{ height:46, padding:'0 20px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
                onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
                <I.plus /> Novo Orçamento
              </button>
            </a>
          </div>

          {!empty && (
            <>
              {/* FILTROS */}
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:18 }}>
                {/* chips */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {FILTERS.map((f)=>{ const on=filtro===f; return (
                    <button key={f} onClick={()=>setFiltro(f)} style={{ height:34, padding:'0 14px', borderRadius:999, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit',
                      border:`1.5px solid ${on?teal:'var(--line)'}`, background: on?teal:'#fff', color: on?'#fff':'#5C594F', transition:'all .14s' }}
                      onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.background='#FAF8F5'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.background='#fff'; }}>{f}</button>); })}
                </div>
                {/* busca + data */}
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <div style={{ position:'relative', flex:1, minWidth:200 }}>
                    <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', display:'flex' }}><I.search /></span>
                    <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por cliente ou número…" style={{ width:'100%', height:44, padding:'0 16px 0 42px', border:'1.5px solid var(--line)', borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit' }}
                      onFocus={(e)=>{ e.target.style.borderColor=teal; e.target.style.boxShadow=`0 0 0 4px ${hexA(teal,0.12)}`; }} onBlur={(e)=>{ e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none'; }} />
                  </div>
                  <div ref={periodRef} style={{ position:'relative', flexShrink:0 }}>
                    <button onClick={()=>setPeriodOpen((o)=>!o)} style={{ height:44, padding:'0 16px', border:`1.5px solid ${periodActive||periodOpen?teal:'var(--line)'}`, borderRadius:'var(--r-input)', background: periodActive?hexA(teal,0.07):'#fff', color: periodActive?teal:'#5C594F', fontSize:14, fontWeight: periodActive?600:500, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap' }}
                      onMouseEnter={(e)=>{ if(!periodActive) e.currentTarget.style.background='#FAF8F5'; }} onMouseLeave={(e)=>{ if(!periodActive) e.currentTarget.style.background='#fff'; }}>
                      <span style={{ color:teal, display:'flex' }}><I.cal /></span> {periodLabel} <span style={{ color: periodActive?teal:'#B7B4AD', fontSize:12 }}>▾</span>
                    </button>
                    {periodOpen && (
                      <div style={{ position:'absolute', right:0, top:50, zIndex:40, width:300, background:'#fff', border:'1px solid var(--line)', borderRadius:14, boxShadow:'0 14px 36px -10px rgba(0,0,0,0.2)', padding:16, animation:'pop .14s ease both' }}>
                        <div style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C', marginBottom:10 }}>Filtrar por data de criação</div>
                        {/* presets */}
                        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
                          {[['7 dias',7],['30 dias',30],['90 dias',90]].map(([lbl,d])=>(
                            <button key={d} onClick={()=>setPreset(d)} style={{ height:30, padding:'0 12px', borderRadius:999, border:'1px solid var(--line)', background:'#FCFBF9', color:'#5C594F', fontSize:12.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
                              onMouseEnter={(e)=>{ e.currentTarget.style.background=hexA(teal,0.08); e.currentTarget.style.borderColor=hexA(teal,0.4); e.currentTarget.style.color=teal; }}
                              onMouseLeave={(e)=>{ e.currentTarget.style.background='#FCFBF9'; e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.color='#5C594F'; }}>Últimos {lbl}</button>
                          ))}
                        </div>
                        {/* de / até */}
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          <label style={{ display:'block' }}>
                            <span style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#5C594F', marginBottom:5 }}>De</span>
                            <input type="date" value={dateFrom} max={dateTo||undefined} onChange={(e)=>setDateFrom(e.target.value)} style={{ width:'100%', height:42, padding:'0 12px', border:'1.5px solid var(--line)', borderRadius:'var(--r-input)', fontSize:13.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit' }}
                              onFocus={(e)=>{ e.target.style.borderColor=teal; e.target.style.boxShadow=`0 0 0 4px ${hexA(teal,0.12)}`; }} onBlur={(e)=>{ e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none'; }} />
                          </label>
                          <label style={{ display:'block' }}>
                            <span style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#5C594F', marginBottom:5 }}>Até</span>
                            <input type="date" value={dateTo} min={dateFrom||undefined} onChange={(e)=>setDateTo(e.target.value)} style={{ width:'100%', height:42, padding:'0 12px', border:'1.5px solid var(--line)', borderRadius:'var(--r-input)', fontSize:13.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit' }}
                              onFocus={(e)=>{ e.target.style.borderColor=teal; e.target.style.boxShadow=`0 0 0 4px ${hexA(teal,0.12)}`; }} onBlur={(e)=>{ e.target.style.borderColor='var(--line)'; e.target.style.boxShadow='none'; }} />
                          </label>
                        </div>
                        {/* ações */}
                        <div style={{ display:'flex', gap:9, marginTop:16 }}>
                          <button onClick={()=>{ clearPeriod(); }} disabled={!periodActive} style={{ flex:1, height:40, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color: periodActive?'#5C594F':'#C0BCB4', fontSize:13.5, fontWeight:600, fontFamily:'inherit', cursor: periodActive?'pointer':'default' }}>Limpar</button>
                          <button onClick={()=>setPeriodOpen(false)} style={{ flex:1.2, height:40, borderRadius:'var(--r-btn)', border:'none', background:teal, color:'#fff', fontSize:13.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>Aplicar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* banner filtro de cliente */}
              {clienteFiltro && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:16, padding:'12px 16px', borderRadius:12, background:hexA(teal,0.08), border:`1px solid ${hexA(teal,0.25)}`, animation:'fadeUp .3s ease both' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13.5, color:'#5C594F' }}>Exibindo orçamentos de:</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:7, height:28, padding:'0 12px', borderRadius:999, background:teal, color:'#fff', fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center', background:'rgba(255,255,255,0.25)', fontSize:11, fontWeight:700 }}>{clienteFiltro.charAt(0)}</span>
                      {clienteFiltro}
                    </span>
                  </div>
                  <button onClick={()=>setTweak('clienteFiltro','off')} aria-label="Limpar filtro" style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px', borderRadius:8, border:'none', background:'#fff', color:'#5C594F', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap' }}
                    onMouseEnter={(e)=>e.currentTarget.style.background='#F1F0EC'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>
                    <I.x width="15" height="15" /> Limpar
                  </button>
                </div>
              )}

              {/* TABELA / CARDS */}
              <div ref={menuRef} style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
                <div className="q-head">
                  {['Número','Cliente','Total','Criação','Status',''].map((h,k)=>(
                    <div key={k} style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>{h}</div>
                  ))}
                </div>
                {lista.length === 0 ? (
                  <div style={{ padding:'48px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Nenhum orçamento encontrado</div>
                    <p style={{ margin:'6px 0 0', fontSize:13.5, color:'var(--muted)' }}>Ajuste os filtros ou a busca.</p>
                  </div>
                ) : lista.map((o,i)=>(
                  <React.Fragment key={o.num}>
                    <Row o={o} teal={teal} orange={orange} menuOpen={menuOpen===o.num} onMenu={()=>setMenuOpen(menuOpen===o.num?null:o.num)} />
                    <CardMobile o={o} i={i} teal={teal} orange={orange} menuOpen={menuOpen===o.num} onMenu={()=>setMenuOpen(menuOpen===o.num?null:o.num)} />
                  </React.Fragment>
                ))}
              </div>
              <div style={{ marginTop:14, fontSize:12.5, color:'var(--muted)', textAlign:'right' }}>{lista.length} {lista.length===1?'orçamento':'orçamentos'}{clienteFiltro?` de ${clienteFiltro}`:''}</div>
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
                <span style={{ display:'inline-grid', placeItems:'center', width:74, height:74, borderRadius:'50%', background:hexA(teal,0.1), color:teal, marginBottom:18 }}><I.filter /></span>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'var(--ink)' }}>Você ainda não tem orçamentos</h2>
                <p style={{ margin:'8px auto 22px', maxWidth:360, fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>Que tal criar o primeiro? Leva poucos minutos e já sai com o preço certo.</p>
                <a href="Criar-Orcamento.html" style={{ textDecoration:'none' }}>
                  <button style={{ height:48, padding:'0 24px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 10px 22px -10px ${hexA(orange,0.7)}` }}
                    onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
                    <I.plus /> Criar primeiro orçamento
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
        <TweakRadio label="Filtro por cliente" value={t.clienteFiltro} options={[{value:'off',label:'Não'},{value:'on',label:'Camila Rocha'}]} onChange={(v)=>setTweak('clienteFiltro',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
