/* cadastrar-insumo-app.jsx — Tela 11 · Cadastrar/Editar Insumo · Pense & Precifique */
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
  chevron:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="m9 6 6 6-6 6"/></svg>,
  caret:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="m6 9 6 6 6-6"/></svg>,
  calc:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15v3M8.5 18h3.5"/></svg>,
  info:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" strokeWidth="1.9"/><circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4.2" strokeWidth="1.9"/><circle cx="12" cy="17.4" r=".4" fill="currentColor" stroke="none"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>,
  cubeSmall:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  save:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 4.5h11l3 3V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1-1.5Z"/><path d="M8 4.5v4h6v-4M8 19v-5h8v5"/></svg>,
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
const num = (s) => parseFloat((s||'').replace(/\./g,'').replace(',','.')) || 0;

/* ─────────  CAMPO  ───────── */
function Field({ label, opt, hint, children, span }) {
  return (
    <label style={{ display:'block', gridColumn: span ? '1 / -1' : 'auto' }}>
      <span style={{ display:'flex', alignItems:'baseline', gap:6, fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:7 }}>
        {label}{opt && <span style={{ fontSize:12, fontWeight:500, color:'#B0ACA4' }}>(opcional)</span>}
      </span>
      {children}
      {hint && <span style={{ display:'block', marginTop:6, fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{hint}</span>}
    </label>);
}

/* ─────────  SEÇÃO  ───────── */
function Section({ n, title, sub, teal, children }) {
  return (
    <section style={{ padding:'24px 26px', borderTop:'1px solid var(--line)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:13, marginBottom:20 }}>
        <span style={{ flexShrink:0, width:28, height:28, borderRadius:8, display:'grid', placeItems:'center', background:hexA(teal,0.12), color:teal, fontWeight:700, fontSize:13.5 }}>{n}</span>
        <div>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>{title}</h2>
          {sub && <p style={{ margin:'3px 0 0', fontSize:12.5, color:'var(--muted)' }}>{sub}</p>}
        </div>
      </div>
      {children}
    </section>);
}

/* ─────────  MODAL  ───────── */
function ModalShell({ onClose, width=500, children }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(20,18,16,0.4)', backdropFilter:'blur(1.5px)', animation:'fadeUp .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{ position:'relative', zIndex:110, width:`min(${width}px, 100%)`, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'#fff', borderRadius:20, boxShadow:'0 30px 70px -20px rgba(0,0,0,0.4)', overflow:'hidden', animation:'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>
        {children}
      </div>
    </div>);
}
function DesativarModal({ teal, orange, onClose }) {
  const fichas = [
    { nome:'Kit Convite Casamento', tipo:'Produto', icon:I.cubeSmall },
    { nome:'Etiqueta personalizada', tipo:'Produto', icon:I.cubeSmall },
    { nome:'Laminação fosca', tipo:'Customização', icon:I.tag },
  ];
  return (
    <ModalShell onClose={onClose} width={500}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'grid', placeItems:'center', width:40, height:40, borderRadius:11, background:'#FFF4E8', color:'#C8721F' }}><I.alert /></span>
          <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)' }}>Atenção — este insumo está em uso</div>
        </div>
        <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}><I.x /></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        <p style={{ margin:'0 0 16px', fontSize:14, color:'#5C594F', lineHeight:1.55 }}>Desativar este insumo pode afetar o custo das fichas técnicas abaixo:</p>
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {fichas.map((f,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:11, background:'#FCFBF9', border:'1px solid var(--line)' }}>
              <span style={{ flexShrink:0, width:32, height:32, borderRadius:9, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><f.icon /></span>
              <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--ink)' }}>{f.nome}</span>
              <span style={{ fontSize:11.5, fontWeight:600, color:'#7C786F', background:'#F1F0EC', padding:'3px 9px', borderRadius:999 }}>{f.tipo}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={onClose} style={{ flex:'1 1 90px', height:46, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
        <button onClick={onClose} style={{ flex:'1 1 110px', height:46, borderRadius:'var(--r-btn)', border:`1.5px solid ${hexA(teal,0.4)}`, background:hexA(teal,0.07), color:teal, fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
          onMouseEnter={(e)=>e.currentTarget.style.background=hexA(teal,0.13)} onMouseLeave={(e)=>e.currentTarget.style.background=hexA(teal,0.07)}>Ver fichas</button>
        <button onClick={onClose} style={{ flex:'1 1 150px', height:46, borderRadius:'var(--r-btn)', border:'1.5px solid '+hexA('#C0492B',0.4), background:'#FBEDE9', color:'#C0492B', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#F7E0DA'} onMouseLeave={(e)=>e.currentTarget.style.background='#FBEDE9'}>Desativar mesmo assim</button>
      </div>
    </ModalShell>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "modal": "fechado",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

const UNIDADES = ['Unidade','cm','g','ml','Folha'];
const unLabel = (u) => u === 'Unidade' ? 'un' : u === 'Folha' ? 'folha' : u;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(t.modal === 'desativar' ? 'desativar' : null);

  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [unidade, setUnidade] = useState('Folha');
  const [fracao, setFracao] = useState(false);
  const [estoque, setEstoque] = useState('');
  const [minimo, setMinimo] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [qtdCompra, setQtdCompra] = useState('');
  const [focus, setFocus] = useState(null);
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const unRef = useRef(null);

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
  useEffect(() => { setModal(t.modal === 'desativar' ? 'desativar' : null); }, [t.modal]);
  useEffect(() => {
    const h = (e) => { if (unRef.current && !unRef.current.contains(e.target)) setUnidadeOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  // cálculo automático
  const preco = num(precoCompra), qComprada = num(qtdCompra);
  const custoUnit = qComprada > 0 ? preco / qComprada : null;
  const custoFmt = custoUnit != null ? 'R$ ' + custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: custoUnit < 0.1 ? 3 : 2, maximumFractionDigits:3 }) : '—';

  const inputBase = (active) => ({ width:'100%', height:48, padding:'0 14px', border:`1.5px solid ${active?teal:'var(--line)'}`,
    borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
    boxShadow: active?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' });
  const bind = (k, val, set) => ({ value:val, onChange:(e)=>set(e.target.value), onFocus:()=>setFocus(k), onBlur:()=>setFocus(null), style:inputBase(focus===k) });
  const numBind = (k, val, set) => ({ ...bind(k,val,set), onChange:(e)=>set(e.target.value.replace(/[^\d.,]/g,'')), inputMode:'decimal' });

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
          {/* HEADER + breadcrumb */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--muted)', marginBottom:8 }}>
              <a href="Insumos.html" style={{ color:'var(--muted)', textDecoration:'none', fontWeight:500 }}
                onMouseEnter={(e)=>e.currentTarget.style.color=teal} onMouseLeave={(e)=>e.currentTarget.style.color='var(--muted)'}>Insumos</a>
              <span style={{ display:'flex', color:'#CFCBC3' }}><I.chevron /></span>
              <span style={{ color:'#5C594F', fontWeight:600 }}>Novo Insumo</span>
            </div>
            <h1 style={{ margin:0, fontSize:28, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Novo Insumo</h1>
          </div>

          {/* CARD FORM */}
          <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden', animation:'fadeUp .4s ease both' }}>
            {/* SEÇÃO 1 */}
            <div style={{ borderTop:'none' }}>
              <Section n="1" title="Identificação" sub="Como você reconhece este insumo." teal={teal}>
                <div className="two-col">
                  <Field label="Nome do insumo *">
                    <input placeholder="Papel couchê 180g" {...bind('nome', nome, setNome)} />
                  </Field>
                  <Field label="Marca" opt>
                    <input placeholder="Suzano" {...bind('marca', marca, setMarca)} />
                  </Field>
                </div>
                <div style={{ display:'flex', gap:9, marginTop:14, padding:'11px 13px', borderRadius:11, background:hexA(teal,0.05), border:`1px solid ${hexA(teal,0.15)}` }}>
                  <span style={{ flexShrink:0, color:teal, marginTop:1 }}><I.info /></span>
                  <p style={{ margin:0, fontSize:12.3, color:'#5C594F', lineHeight:1.5 }}>O par <strong style={{ fontWeight:600 }}>nome + marca</strong> deve ser único. O mesmo insumo de marcas diferentes pode ser cadastrado separadamente.</p>
                </div>
              </Section>
            </div>

            {/* SEÇÃO 2 */}
            <Section n="2" title="Medida e fracionamento" sub="Como este insumo é medido e consumido." teal={teal}>
              <div className="two-col">
                <Field label="Unidade de medida *">
                  <div ref={unRef} style={{ position:'relative' }}>
                    <button type="button" onClick={()=>setUnidadeOpen((o)=>!o)} style={{ ...inputBase(unidadeOpen), display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', textAlign:'left' }}>
                      {unidade}<span style={{ color:'var(--muted)', display:'flex' }}><I.caret /></span>
                    </button>
                    {unidadeOpen && (
                      <div style={{ position:'absolute', top:52, left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
                        {UNIDADES.map((u)=>(
                          <button key={u} type="button" onClick={()=>{ setUnidade(u); setUnidadeOpen(false); }} style={{ width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:8, border:'none', background: u===unidade?hexA(teal,0.08):'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight: u===unidade?600:500, color: u===unidade?teal:'var(--ink)' }}
                            onMouseEnter={(e)=>{ if(u!==unidade) e.currentTarget.style.background='#F7F5F1'; }} onMouseLeave={(e)=>{ if(u!==unidade) e.currentTarget.style.background='transparent'; }}>{u}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Pode ser usado em frações?" hint={fracao ? 'Permite consumo de 0,5g, por exemplo.' : 'Sempre será consumido em quantidades inteiras.'}>
                  <div style={{ display:'flex', borderRadius:'var(--r-input)', border:'1.5px solid var(--line)', overflow:'hidden', height:48 }}>
                    {[['Não',false],['Sim',true]].map(([lbl,val])=>(
                      <button key={lbl} type="button" onClick={()=>setFracao(val)} style={{ flex:1, border:'none', cursor:'pointer', fontSize:14.5, fontWeight:600, fontFamily:'inherit',
                        background: fracao===val ? (val?teal:'#F1F0EC') : '#fff', color: fracao===val ? (val?'#fff':'#5C594F') : '#A8A49C', transition:'background .14s' }}>{lbl}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </Section>

            {/* SEÇÃO 3 */}
            <Section n="3" title="Estoque e custo" sub="O custo unitário é calculado automaticamente." teal={teal}>
              <div className="two-col">
                <Field label="Quantidade em estoque *">
                  <div style={{ position:'relative' }}>
                    <input placeholder="100" {...numBind('estoque', estoque, setEstoque)} style={{ ...inputBase(focus==='estoque'), paddingRight:64 }} />
                    <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>{unLabel(unidade)}</span>
                  </div>
                </Field>
                <Field label="Estoque mínimo para alerta" opt>
                  <div style={{ position:'relative' }}>
                    <input placeholder="10" {...numBind('minimo', minimo, setMinimo)} style={{ ...inputBase(focus==='minimo'), paddingRight:64 }} />
                    <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>{unLabel(unidade)}</span>
                  </div>
                </Field>
                <Field label="Preço total da compra *">
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:0, top:0, bottom:0, width:44, display:'grid', placeItems:'center', fontSize:14, fontWeight:600, color:'#6B6860', background:'#FAF8F5', borderRadius:'var(--r-input) 0 0 var(--r-input)', borderRight:'1px solid var(--line)', pointerEvents:'none' }}>R$</span>
                    <input placeholder="45,00" {...numBind('preco', precoCompra, setPrecoCompra)} style={{ ...inputBase(focus==='preco'), paddingLeft:56 }} />
                  </div>
                </Field>
                <Field label="Quantidade comprada *">
                  <div style={{ position:'relative' }}>
                    <input placeholder="100" {...numBind('qtd', qtdCompra, setQtdCompra)} style={{ ...inputBase(focus==='qtd'), paddingRight:64 }} />
                    <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>{unLabel(unidade)}</span>
                  </div>
                </Field>
              </div>

              {/* CARD RESULTADO */}
              <div key={custoFmt} style={{ marginTop:18, display:'flex', alignItems:'center', gap:15, padding:'18px 20px', borderRadius:14, background:`linear-gradient(135deg, ${hexA(teal,0.12)}, ${hexA(teal,0.05)})`, border:`1.5px solid ${hexA(teal,0.25)}`, animation: custoUnit!=null ? 'flash .6s ease' : 'none' }}>
                <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:48, height:48, borderRadius:13, background:'#fff', color:teal, boxShadow:'0 4px 12px -4px rgba(31,122,111,0.3)' }}><I.calc /></span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'var(--teal-deep, #1F7A6F)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Custo unitário calculado</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:3 }}>
                    <span style={{ fontSize:26, fontWeight:700, color:teal, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums' }}>{custoFmt}</span>
                    {custoUnit != null && <span style={{ fontSize:15, fontWeight:600, color:'#5C594F' }}>/ {unLabel(unidade)}</span>}
                  </div>
                  {custoUnit == null && <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Preencha o preço e a quantidade comprada.</div>}
                </div>
              </div>
            </Section>

            {/* BOTÕES */}
            <div style={{ padding:'18px 26px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'flex-end', gap:12, flexWrap:'wrap' }}>
              <a href="Insumos.html" style={{ textDecoration:'none' }}>
                <button style={{ height:48, padding:'0 22px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
                  onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
              </a>
              <button style={{ height:48, padding:'0 26px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
                onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.98)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
                <I.save /> Salvar insumo
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal === 'desativar' && <DesativarModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Modal" value={t.modal} options={[{value:'fechado',label:'Fechado'},{value:'desativar',label:'Desativar em uso'}]} onChange={(v)=>setTweak('modal',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
        <TweakSection label="Demonstração" />
        <TweakButton label={precoCompra?'Limpar exemplo':'Preencher exemplo'} onClick={()=>{ if(precoCompra){ setNome(''); setMarca(''); setEstoque(''); setMinimo(''); setPrecoCompra(''); setQtdCompra(''); } else { setNome('Papel couchê 180g'); setMarca('Suzano'); setUnidade('Folha'); setEstoque('100'); setMinimo('10'); setPrecoCompra('45,00'); setQtdCompra('100'); } }} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
