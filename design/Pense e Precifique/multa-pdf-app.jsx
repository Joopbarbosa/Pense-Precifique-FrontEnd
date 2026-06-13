/* multa-pdf-app.jsx — Tela 17 · Preview do PDF de Multa · Pense & Precifique */
const { useState, useEffect } = React;

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
  back:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M11 6.5 5.5 12 11 17.5M5.5 12H19"/></svg>,
  download:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>,
  chevron:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="m9 6 6 6-6 6"/></svg>,
  phone:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M6.5 4.5h3l1.2 3.2-1.7 1.3a11 11 0 0 0 4.7 4.7l1.3-1.7 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z"/></svg>,
  mail:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 5.5L20 7"/></svg>,
  whats:(p)=><svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M4 20.5 5.4 16a8 8 0 1 1 3.1 3.1L4 20.5Z"/><path d="M9 9.2c.2-.6.5-.6.8-.6h.6c.2 0 .5 0 .7.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.3c.3.1.4 0 .6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.8c.3.1.4.3.4.5s0 .9-.4 1.3c-.4.4-1.2.8-1.8.8a7 7 0 0 1-5-2.6 6.7 6.7 0 0 1-1.9-3.8c0-.8.3-1.5.5-1.7Z"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M12 4 21.5 20.5h-19L12 4Z"/><path d="M12 10.5v4.5" strokeWidth="2"/><circle cx="12" cy="18" r=".5" fill="currentColor" stroke="none"/></svg>,
  alertSm:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M12 4 21.5 20.5h-19L12 4Z"/><path d="M12 10.5v4.5" strokeWidth="1.9"/><circle cx="12" cy="18" r=".4" fill="currentColor" stroke="none"/></svg>,
  ban:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></svg>,
  scissors:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.7 8.3 20 18M8.7 15.7 20 6M11 12l2 1.6"/></svg>,
  pay:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/><path d="M6.5 14.5h3"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid, href:'Dashboard.html' },
  { id:'clientes', label:'Clientes', icon:I.users, href:'Clientes.html' },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc, href:'Orcamentos.html' },
  { id:'insumos', label:'Insumos', icon:I.box, href:'Insumos.html' },
  { id:'produtos', label:'Produtos', icon:I.cube, href:'Produtos.html' },
  { id:'producao', label:'Produção', icon:I.factory, href:'Producao.html' },
  { id:'config', label:'Configurações', icon:I.gear, href:'Configuracoes.html' },
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

function DocLogo({ size = 56 }) {
  return <img src="logo.png" width={size} height={size} alt="" style={{ objectFit:'contain', flexShrink:0 }} />;
}

/* ─────────  DADOS  ───────── */
const DANGER = '#C0492B', DANGER_SOFT = '#FBEDE9', DANGER_LINE = '#F0D4CC';
const CONSUMIDOS = [
  { item:'Papel couchê 180g', qtd:'4 folhas' },
  { item:'Fita dupla face 12mm', qtd:'30 cm' },
];
const VALOR_ORIGINAL = 183.60, PCT_MULTA = 50, VALOR_MULTA = 91.80;

/* ─────────  DOCUMENTO A4  ───────── */
function Documento({ teal, orange }) {
  return (
    <div className="a4" style={{ animation:'fadeUp .4s ease both' }}>
      {/* cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20, paddingBottom:22, borderBottom:`2px solid ${hexA(teal,0.25)}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <DocLogo size={56} />
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>Pense &amp; Crie Studio</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 14px', marginTop:5, fontSize:12, color:'#7C786F' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ color:teal, display:'flex' }}><I.mail /></span>penseecrie@email.com</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ color:teal, display:'flex' }}><I.phone /></span>(11) 98888-1234</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:DANGER }}>Orçamento</div>
          <div style={{ fontSize:24, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.02em', lineHeight:1.1 }}>#0042</div>
        </div>
      </div>

      {/* título de notificação */}
      <div style={{ marginTop:26, padding:'20px 22px', borderRadius:12, background:DANGER_SOFT, border:`1px solid ${DANGER_LINE}`, borderLeft:`4px solid ${DANGER}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:13 }}>
          <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:44, height:44, borderRadius:12, background:'#fff', color:DANGER, border:`1px solid ${DANGER_LINE}` }}><I.alert /></span>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:DANGER, letterSpacing:'-0.01em', lineHeight:1.2, textWrap:'balance' }}>NOTIFICAÇÃO DE MULTA POR CANCELAMENTO</h1>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 16px', marginTop:5, fontSize:12.5, color:'#8A5A4E' }}>
              <span>Referência: <strong style={{ fontWeight:700 }}>Orçamento #0042</strong></span>
              <span>Emissão: <strong style={{ fontWeight:700 }}>05/06/2026</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* dados da cliente */}
      <div style={{ padding:'22px 0 0' }}>
        <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#B0ACA4', marginBottom:9 }}>Dados da cliente</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 28px', alignItems:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>Mariana Costa</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#5C594F' }}><span style={{ color:teal, display:'flex' }}><I.whats /></span>WhatsApp: (11) 99999-0000</div>
        </div>
      </div>

      {/* detalhes do cancelamento */}
      <div style={{ marginTop:24 }}>
        <SectionTitle teal={teal} icon={<I.ban />}>Detalhes do cancelamento</SectionTitle>
        <div style={{ marginTop:14, border:'1px solid #F0EEE9', borderRadius:12, overflow:'hidden' }}>
          {[
            { k:'Data do cancelamento', v:'05/06/2026' },
            { k:'Valor total do orçamento original', v:BRL(VALOR_ORIGINAL) },
            { k:'Percentual de multa aplicado', v:`${PCT_MULTA}%` },
          ].map((r,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, padding:'12px 16px', borderBottom:'1px solid #F4F2EE' }}>
              <span style={{ fontSize:13, color:'#5C594F' }}>{r.k}</span>
              <span style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)', fontVariantNumeric:'tabular-nums' }}>{r.v}</span>
            </div>
          ))}
          {/* valor da multa — destaque */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, padding:'15px 16px', background:DANGER_SOFT }}>
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:DANGER }}><I.alertSm /> Valor da multa</span>
            <span style={{ fontSize:22, fontWeight:700, color:DANGER, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums' }}>{BRL(VALOR_MULTA)}</span>
          </div>
        </div>
      </div>

      {/* insumos consumidos */}
      <div style={{ marginTop:26 }}>
        <SectionTitle teal={teal} icon={<I.box width="15" height="15" />}>Insumos e materiais já consumidos</SectionTitle>
        <table className="a4-table" style={{ marginTop:12 }}>
          <thead>
            <tr><th>Item</th><th className="num">Quantidade consumida</th></tr>
          </thead>
          <tbody>
            {CONSUMIDOS.map((c,i)=>(
              <tr key={i}>
                <td style={{ fontWeight:600, color:'var(--ink)' }}>{c.item}</td>
                <td className="num" style={{ fontWeight:600 }}>{c.qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* instrução de pagamento */}
      <div style={{ marginTop:26 }}>
        <SectionTitle teal={teal} icon={<I.pay width="15" height="15" />}>Instrução de pagamento</SectionTitle>
        <div style={{ marginTop:12, padding:'16px 18px', borderRadius:12, background:'#FBFAF8', border:'1px solid #F0EEE9' }}>
          <p style={{ margin:0, fontSize:13.5, color:'#3A372F', lineHeight:1.65 }}>
            O valor de <strong style={{ fontWeight:700, color:DANGER }}>{BRL(VALOR_MULTA)}</strong> referente à multa por cancelamento deve ser pago até <strong style={{ fontWeight:700, color:'#5C594F' }}>12/06/2026</strong>. Entre em contato para combinar a forma de pagamento.
          </p>
        </div>
      </div>

      {/* rodapé */}
      <div style={{ marginTop:'auto', paddingTop:30 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18, borderTop:'1px solid #F0EEE9', fontSize:11.5, color:'#9A968E', flexWrap:'wrap' }}>
          <span style={{ display:'flex', color:teal }}><I.doc width="15" height="15" /></span>
          Este documento foi gerado pelo sistema
          <Wordmark teal={teal} size={11.5} />
          em <strong style={{ fontWeight:600, color:'#6B6860' }}>05/06/2026</strong>.
        </div>
      </div>
    </div>);
}

function SectionTitle({ teal, icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:28, height:28, borderRadius:8, background:hexA(teal,0.1), color:teal }}>{icon}</span>
      <h2 style={{ margin:0, fontSize:14.5, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.005em' }}>{children}</h2>
    </div>);
}

/* ─────────  BOTÕES DA BARRA  ───────── */
function ActionBtn({ children, variant, teal, orange, onClick }) {
  const base = { height:44, padding:'0 18px', borderRadius:'var(--r-btn)', fontSize:14, fontWeight:600, fontFamily:'inherit',
    cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, whiteSpace:'nowrap', transition:'filter .15s, background .15s, transform .12s' };
  const styles = {
    ghost: { ...base, border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F' },
    danger: { ...base, border:'none', background:DANGER, color:'#fff', boxShadow:`0 8px 18px -8px ${hexA(DANGER,0.7)}` },
  };
  return (
    <button onClick={onClick} style={styles[variant]}
      onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
      onMouseEnter={(e)=>{ if(variant==='ghost') e.currentTarget.style.background='#FAF8F5'; else e.currentTarget.style.filter='brightness(1.06)'; }}
      onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; if(variant==='ghost') e.currentTarget.style.background='#fff'; }}>
      {children}
    </button>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F' };
  const radii = { reto:{card:12,btn:6}, suave:{card:16,btn:10}, redondo:{card:22,btn:14} }[t.roundness] || { card:16, btn:10 };
  const teal = palette.teal, orange = palette.orange;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal);
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px');
  }, [t.font, t.balance, t.roundness]);

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

        {/* BARRA DE AÇÕES */}
        <div style={{ background:'#fff', borderBottom:'1px solid var(--line)', padding:'14px 28px' }}>
          <div style={{ maxWidth:820, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div style={{ minWidth:0 }}>
              {/* breadcrumb */}
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--muted)', marginBottom:6, flexWrap:'wrap' }}>
                <a href="Orcamentos.html" style={{ color:'var(--muted)', textDecoration:'none', fontWeight:500 }}
                  onMouseEnter={(e)=>e.currentTarget.style.color=teal} onMouseLeave={(e)=>e.currentTarget.style.color='var(--muted)'}>Orçamentos</a>
                <span style={{ display:'flex', color:'#CFCBC3' }}><I.chevron /></span>
                <a href="Detalhe.html" style={{ color:'var(--muted)', textDecoration:'none', fontWeight:500, whiteSpace:'nowrap' }}
                  onMouseEnter={(e)=>e.currentTarget.style.color=teal} onMouseLeave={(e)=>e.currentTarget.style.color='var(--muted)'}>#0042 — Mariana Costa</a>
                <span style={{ display:'flex', color:'#CFCBC3' }}><I.chevron /></span>
                <span style={{ color:'#5C594F', fontWeight:600, whiteSpace:'nowrap' }}>PDF de Multa</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <h1 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>PDF de Multa</h1>
                <span style={{ display:'inline-flex', alignItems:'center', gap:7, height:30, padding:'0 13px', borderRadius:999, background:DANGER_SOFT, color:DANGER, fontSize:13, fontWeight:600 }}>
                  <span style={{ display:'flex' }}><I.ban /></span>Cancelado
                </span>
              </div>
            </div>

            {/* botões */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <a href="Detalhe.html" style={{ textDecoration:'none' }}>
                <ActionBtn variant="ghost" teal={teal} orange={orange}><I.back /> Voltar ao orçamento</ActionBtn>
              </a>
              <ActionBtn variant="danger" teal={teal} orange={orange}><I.download /> Baixar PDF de Multa</ActionBtn>
            </div>
          </div>
        </div>

        {/* DOCUMENTO */}
        <div className="doc-scroll">
          <div className="doc-wrap">
            <Documento teal={teal} orange={orange} />
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
