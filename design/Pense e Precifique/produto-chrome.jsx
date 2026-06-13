/* produto-chrome.jsx — shared sidebar/logo/icons for Tela 14 · Pense & Precifique */
const { useState, useEffect, useRef } = React;

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
  chevron:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="m9 6 6 6-6 6"/></svg>,
  caret:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="m6 9 6 6 6-6"/></svg>,
  search:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></svg>,
  plus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  trash:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5"/></svg>,
  edit:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>,
  calc:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15v3M8.5 18h3.5"/></svg>,
  info:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" strokeWidth="1.9"/><circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/></svg>,
  arrowRight:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 12h13M14 6l6 6-6 6" strokeWidth="1.9"/></svg>,
  clock:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>,
  layers:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 3 21 8l-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>,
  fileText:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/></svg>,
  image:(p)=><svg viewBox="0 0 24 24" width="28" height="28" {...sw} {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 17 4.5-4.5 4 4 3-3L20 17"/></svg>,
  spark:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
};

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

function hexA(hex, a) {
  const h = hex.replace('#',''); const n = parseInt(h.length===3 ? h.split('').map((c)=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
const num = (s) => parseFloat((s||'').toString().replace(/\./g,'').replace(',','.')) || 0;
function moeda(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

Object.assign(window, { Logo, Wordmark, I, Sidebar, hexA, num, moeda });
