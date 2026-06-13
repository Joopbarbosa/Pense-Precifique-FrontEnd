/* produtos-lista-app.jsx — Tela 13 · Produtos (lista) · Pense & Precifique */
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
  plus:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  dots:(p)=><svg viewBox="0 0 24 24" width="19" height="19" {...sw} {...p}><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/></svg>,
  edit:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>,
  copy:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.4"/><path d="M5.5 15.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5"/></svg>,
  power:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 3.5v7M7.5 6.5a7 7 0 1 0 9 0"/></svg>,
  camera:(p)=><svg viewBox="0 0 24 24" width="30" height="30" {...sw} {...p}><path d="M4 8.5h3l1.4-2.2a1 1 0 0 1 .85-.47h5.5a1 1 0 0 1 .85.47L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z"/><circle cx="12" cy="13.5" r="3.4"/></svg>,
  cubeBig:(p)=><svg viewBox="0 0 24 24" width="40" height="40" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  stack:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M12 3 21 8l-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid, href:'Dashboard.html' },
  { id:'clientes', label:'Clientes', icon:I.users, href:'Clientes.html' },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc, href:'Orcamentos.html' },
  { id:'insumos', label:'Insumos', icon:I.box, href:'Insumos.html' },
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
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

/* ─────────  DADOS  ───────── */
const CATS = ['Todos','Produto','Produto Base','Customização','Inativos'];
const PRODUTOS = [
  { id:'p1', nome:'Kit Convite Casamento',    cat:'Produto',      preco:53.00, estoque:0,    status:'ativo' },
  { id:'p2', nome:'Etiqueta personalizada',   cat:'Produto',      preco:4.50,  estoque:25,   status:'ativo' },
  { id:'p3', nome:'Amigurumi Coelhinha Rosa', cat:'Produto',      preco:89.00, estoque:2,    status:'ativo' },
  { id:'p4', nome:'Miolo de Agenda',          cat:'Produto Base', preco:12.00, estoque:8,    status:'ativo' },
  { id:'p5', nome:'Laminação fosca',          cat:'Customização', preco:8.00,  estoque:null, status:'ativo' },
  { id:'p6', nome:'Envelope personalizado',   cat:'Customização', preco:5.00,  estoque:null, status:'ativo' },
  { id:'p7', nome:'Caixa kraft com laço',       cat:'Produto',      preco:18.00, estoque:0,    status:'inativo' },
];
/* badge por categoria: Produto = cinza · Produto Base = azul claro · Customização = teal */
function catStyle(cat, teal) {
  if (cat === 'Produto Base') return { bg:'#E9F1F9', fg:'#3A6FA0' };
  if (cat === 'Customização') return { bg:hexA(teal,0.14), fg:teal };
  return { bg:'#EFEDE9', fg:'#6B6860' };
}

/* ─────────  MENU 3 PONTOS  ───────── */
function CardMenu({ teal, inativo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const item = (icon, label, danger, href) => {
    const sty = { display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left', padding:'9px 11px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:13.5, fontWeight:500, color: danger?'var(--danger)':'#4A473F', textDecoration:'none', boxSizing:'border-box' };
    const inner = <React.Fragment><span style={{ display:'flex', color: danger?'var(--danger)':'#A29E96' }}>{icon}</span>{label}</React.Fragment>;
    const hov = (e)=>e.currentTarget.style.background = danger?'#FBEDE9':'#F7F5F1';
    const out = (e)=>e.currentTarget.style.background='transparent';
    return href
      ? <a href={href} onClick={()=>setOpen(false)} style={sty} onMouseEnter={hov} onMouseLeave={out}>{inner}</a>
      : <button onClick={()=>setOpen(false)} style={sty} onMouseEnter={hov} onMouseLeave={out}>{inner}</button>;
  };
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={(e)=>{ e.preventDefault(); setOpen((o)=>!o); }} aria-label="Mais ações" style={{ width:34, height:34, borderRadius:9, border:'none', background: open?'#F1F0EC':'rgba(255,255,255,0.85)', backdropFilter:'blur(4px)', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}><I.dots /></button>
      {open && (
        <div style={{ position:'absolute', top:40, right:0, zIndex:20, width:168, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 14px 34px -10px rgba(0,0,0,0.22)', padding:6, animation:'pop .14s ease both' }}>
          {item(<svg viewBox="0 0 24 24" width="16" height="16" {...sw}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>, 'Ver detalhes', false, 'Detalhe-Produto.html')}
          {inativo ? (
            item(<I.power />, 'Reativar')
          ) : (
            <React.Fragment>
              {item(<I.edit />, 'Editar')}
              {item(<I.copy />, 'Duplicar')}
              <div style={{ height:1, background:'var(--line)', margin:'4px 6px' }} />
              {item(<I.power />, 'Desativar', true)}
            </React.Fragment>
          )}
        </div>
      )}
    </div>);
}

/* ─────────  CARD DE PRODUTO  ───────── */
function ProductCard({ p, teal, orange, showPhotos, i }) {
  const isCustom = p.cat === 'Customização';
  const inativo = p.status === 'inativo';
  const semEstoque = p.estoque === 0;
  const cs = catStyle(p.cat, teal);
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden', display:'flex', flexDirection:'column', opacity: inativo ? 0.72 : 1, animation: inativo ? 'none' : `fadeUp .4s ease both`, animationDelay:`${i*0.05}s`, transition:'box-shadow .18s, transform .18s' }}
      onMouseEnter={(e)=>{ e.currentTarget.style.boxShadow='0 10px 26px -10px rgba(0,0,0,0.18)'; e.currentTarget.style.transform='translateY(-3px)'; }}
      onMouseLeave={(e)=>{ e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='none'; }}>
      {/* FOTO */}
      <div style={{ position:'relative' }}>
        {showPhotos ? (
          <image-slot id={`prod-${p.id}`} shape="rect" fit="cover" placeholder="Arraste uma foto" style={{ width:'100%', aspectRatio:'1 / 1', background:'#F4F2EE' }}></image-slot>
        ) : (
          <div style={{ width:'100%', aspectRatio:'1 / 1', background:'linear-gradient(135deg, #F6F4F0, #EEEBE5)', display:'grid', placeItems:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(45deg, transparent, transparent 13px, rgba(0,0,0,0.018) 13px, rgba(0,0,0,0.018) 26px)' }} />
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'#C2BEB5' }}>
              <I.camera /><span style={{ fontSize:11.5, fontWeight:600, letterSpacing:'0.02em' }}>Sem foto</span>
            </div>
          </div>
        )}
        {inativo && <div style={{ position:'absolute', inset:0, background:'rgba(120,118,112,0.2)', pointerEvents:'none' }} />}
        <div style={{ position:'absolute', top:10, right:10 }}><CardMenu teal={teal} inativo={inativo} /></div>
        <div style={{ position:'absolute', top:10, left:10 }}>
          {inativo ? (
            <span style={{ display:'inline-flex', alignItems:'center', height:25, padding:'0 11px', borderRadius:999, background:'#FBEDE7', border:'1px solid #F2D8CF', color:'#C0492B', fontSize:11.5, fontWeight:700, letterSpacing:'0.01em', boxShadow:'0 1px 4px rgba(0,0,0,0.10)' }}>Inativo</span>
          ) : (
            <span style={{ display:'inline-flex', alignItems:'center', height:25, padding:'0 11px', borderRadius:999, background:cs.bg, backdropFilter:'blur(4px)', color:cs.fg, fontSize:11.5, fontWeight:700, letterSpacing:'0.01em', boxShadow:'0 1px 4px rgba(0,0,0,0.10)' }}>{p.cat}</span>
          )}
        </div>
      </div>
      {/* CORPO */}
      <div style={{ padding:'15px 16px 16px', display:'flex', flexDirection:'column', flex:1 }}>
        <h3 style={{ margin:0, fontSize:15.5, fontWeight:600, lineHeight:1.3, color:'var(--ink)', letterSpacing:'-0.01em', textWrap:'pretty' }}>{p.nome}</h3>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:10, marginTop:14, paddingTop:14, borderTop:'1px solid #F4F2EE' }}>
          <div>
            <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>{isCustom ? 'Valor adicional' : 'Preço de venda'}</div>
            <div style={{ fontSize:20, fontWeight:700, color: isCustom ? teal : 'var(--ink)', marginTop:3, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums' }}>{isCustom ? '+ ' + moeda(p.preco) : moeda(p.preco)}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>Estoque</div>
            {p.estoque === null ? (
              <div style={{ marginTop:7, fontSize:15, fontWeight:600, color:'#C2BEB5' }}>—</div>
            ) : (
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:5, height:26, padding:'0 10px', borderRadius:999, fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap',
                background: semEstoque ? '#F1F0EC' : hexA(teal,0.1), color: semEstoque ? '#9A968E' : teal }}>
                <span style={{ display:'flex' }}><I.stack /></span>{p.estoque} un
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);
}

/* ─────────  ESTADO VAZIO  ───────── */
function EmptyState({ teal, orange }) {
  return (
    <div style={{ position:'relative', background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'66px 24px 60px', textAlign:'center', overflow:'hidden', animation:'fadeUp .4s ease both' }}>
      {/* pontilhados artesanais sutis */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {[['12%','18%',7,orange],['86%','22%',6,teal],['78%','74%',8,orange],['16%','78%',6,teal],['50%','12%',5,teal],['90%','52%',5,orange]].map((d,k)=>(
          <span key={k} style={{ position:'absolute', left:d[0], top:d[1], width:d[2], height:d[2], borderRadius:'50%', background:hexA(d[3],0.5) }} />
        ))}
      </div>
      <div style={{ position:'relative' }}>
        <div style={{ width:96, height:96, margin:'0 auto', borderRadius:26, background:`linear-gradient(140deg, ${hexA(orange,0.12)}, ${hexA(teal,0.12)})`, display:'grid', placeItems:'center', color:teal, animation:'floaty 4s ease-in-out infinite' }}>
          <I.cubeBig />
        </div>
        <h2 style={{ margin:'24px 0 0', fontSize:20, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>Seu catálogo começa aqui</h2>
        <p style={{ margin:'9px auto 0', maxWidth:380, fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>Você ainda não cadastrou produtos. Comece criando seu primeiro!</p>
        <a href="#" onClick={(e)=>e.preventDefault()} style={{ textDecoration:'none' }}>
          <button style={{ marginTop:24, height:48, padding:'0 24px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 10px 22px -10px ${hexA(orange,0.8)}` }}
            onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
            <I.plus /> Criar primeiro produto
          </button>
        </a>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "com produtos",
  "fotos": "sem foto",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('Todos');
  const [buscaFocus, setBuscaFocus] = useState(false);

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F' };
  const radii = { reto:{card:12,btn:6,input:6}, suave:{card:16,btn:10,input:10}, redondo:{card:22,btn:14,input:14} }[t.roundness] || { card:16, btn:10, input:10 };
  const teal = palette.teal, orange = palette.orange;
  const showPhotos = t.fotos === 'com foto';
  const vazio = t.estado === 'vazio';

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal);
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px'); r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);

  const filtered = PRODUTOS.filter((p)=>{
    const buscaOk = busca.trim()==='' || p.nome.toLowerCase().includes(busca.trim().toLowerCase());
    if (!buscaOk) return false;
    if (cat==='Inativos') return p.status==='inativo';
    if (p.status!=='ativo') return false;
    return cat==='Todos' || p.cat===cat;
  });

  const chip = (label, active, onClick, count) => (
    <button key={label} onClick={onClick} style={{ height:36, padding:'0 15px', borderRadius:999, border:`1.5px solid ${active?'transparent':'var(--line)'}`, background: active?orange:'#fff', color: active?'#fff':'#5C594F', fontSize:13.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:7, transition:'all .14s', boxShadow: active?`0 6px 14px -7px ${hexA(orange,0.8)}`:'none' }}
      onMouseEnter={(e)=>{ if(!active){ e.currentTarget.style.background='#FAF8F5'; e.currentTarget.style.borderColor='#DEDBD4'; } }}
      onMouseLeave={(e)=>{ if(!active){ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='var(--line)'; } }}>
      {label}{count!=null && <span style={{ fontSize:11.5, fontWeight:700, opacity:.85, background: active?'rgba(255,255,255,0.25)':'#F1F0EC', color: active?'#fff':'#9A968E', borderRadius:999, padding:'1px 7px' }}>{count}</span>}
    </button>);

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
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap', marginBottom:22 }}>
            <div>
              <h1 style={{ margin:0, fontSize:27, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>Meus Produtos</h1>
              <p style={{ margin:'6px 0 0', fontSize:14.5, color:'var(--muted)' }}>O coração do seu negócio — tudo o que você cria e vende.</p>
            </div>
            <a href="#" onClick={(e)=>e.preventDefault()} style={{ textDecoration:'none' }}>
              <button style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
                <I.plus /> Novo Produto
              </button>
            </a>
          </div>

          {/* FILTROS */}
          <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:18 }}>
            {/* busca */}
            <div style={{ position:'relative', flex:'1 1 260px', minWidth:220, maxWidth:420 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: buscaFocus?teal:'#A8A49C', display:'flex' }}><I.search /></span>
              <input value={busca} onChange={(e)=>setBusca(e.target.value)} onFocus={()=>setBuscaFocus(true)} onBlur={()=>setBuscaFocus(false)} placeholder="Buscar por nome..."
                style={{ width:'100%', height:46, padding:'0 14px 0 42px', border:`1.5px solid ${buscaFocus?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: buscaFocus?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />
            </div>
          </div>

          {/* CHIPS DE CATEGORIA */}
          <div style={{ display:'flex', gap:9, flexWrap:'wrap', marginBottom:24, overflowX:'auto' }}>
            {CATS.map((c)=> chip(c, cat===c, ()=>setCat(c),
              c==='Todos' ? PRODUTOS.filter(p=>p.status==='ativo').length
              : c==='Inativos' ? PRODUTOS.filter(p=>p.status==='inativo').length
              : PRODUTOS.filter(p=>p.cat===c && p.status==='ativo').length))}
          </div>

          {/* GRID / VAZIO */}
          {vazio ? (
            <EmptyState teal={teal} orange={orange} />
          ) : filtered.length===0 ? (
            <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'48px 24px', textAlign:'center', color:'var(--muted)', fontSize:14.5 }}>
              {cat==='Inativos' ? 'Nenhum produto inativo no momento.' : 'Nenhum produto encontrado.'}
            </div>
          ) : (
            <>
              <div className="prod-grid">
                {filtered.map((p,i)=> <ProductCard key={p.id} p={p} teal={teal} orange={orange} showPhotos={showPhotos} i={i} />)}
              </div>
              <div style={{ marginTop:18, fontSize:13, color:'var(--muted)' }}>{filtered.length} {filtered.length===1?'produto':'produtos'}</div>
            </>
          )}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Conteúdo" value={t.estado} options={[{value:'com produtos',label:'Com produtos'},{value:'vazio',label:'Vazio'}]} onChange={(v)=>setTweak('estado',v)} />
        <TweakRadio label="Fotos" value={t.fotos} options={[{value:'com foto',label:'Com foto'},{value:'sem foto',label:'Sem foto'}]} onChange={(v)=>setTweak('fotos',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
