/* dashboard-app.jsx — Tela 4 · Dashboard · Pense & Precifique */
const { useState, useEffect } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 40 }) {
  return (
    <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
         style={{ display:'block', objectFit:'contain', transform:'translateX(3%)' }} />);
}
function Wordmark({ teal = '#2A9D8F', size = 17 }) {
  return (
    <span style={{ fontWeight:700, fontSize:size, letterSpacing:'-0.01em', lineHeight:1.05 }}>
      <span style={{ color:teal }}>Pense</span>
      <span style={{ color:'#F97316', margin:'0 1px' }}>&amp;</span>
      <span style={{ color:'#3A372F' }}>Precifique</span>
    </span>);
}

/* ─────────  ÍCONES  ───────── */
const sw = { strokeWidth:1.7, fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round' };
const I = {
  grid: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>,
  users: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="9" cy="8" r="3.3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4"/></svg>,
  doc: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V9h5"/><path d="M8.5 13.5h7M8.5 16.5h5"/></svg>,
  box: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8"/></svg>,
  cube: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2M7.7 4.9l8.6 4.5"/></svg>,
  factory: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/><path d="M3.5 20.5h17M7 16.5h.01M11.5 16.5h.01M16 16.5h.01"/></svg>,
  gear: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.4a1.7 1.7 0 0 0 1-1.6V2.7a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2"/></svg>,
  logout: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5"/><path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6"/></svg>,
  dollar: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M12 3v18M16 7.2c-.7-1.4-2.3-2.2-4-2.2-2.2 0-4 1.3-4 3.1 0 4.3 8.4 2.3 8.4 6.7 0 1.9-2 3.2-4.4 3.2-1.9 0-3.6-.8-4.3-2.3"/></svg>,
  fileStack: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M8 3.5h6l4 4V17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4"/><path d="M5 7v12.5a1 1 0 0 0 1 1h9"/></svg>,
  alert: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4.2" strokeWidth="1.9"/><circle cx="12" cy="17.4" r=".4" fill="currentColor" stroke="none"/></svg>,
  arrow: (p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M5 12h13M13 6.5 18.5 12 13 17.5"/></svg>,
  plus: (p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  bulb: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M9.2 17.6h5.6M9.9 20.3h4.2"/><path d="M12 3.4a6 6 0 0 0-3.6 10.8c.6.45.9 1 .9 1.7v.2h5.4v-.2c0-.7.3-1.25.9-1.7A6 6 0 0 0 12 3.4Z"/></svg>,
  menu: (p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  spark: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M5 14l1.8 3.5L10.5 19 6.8 20.6 5 24l-1.8-3.4L-.5 19l3.7-1.5L5 14Z" transform="translate(2 -6)"/><path d="M15 3l1.4 3 3 1.4-3 1.4L15 12l-1.4-3.2-3-1.4 3-1.4L15 3Z"/></svg>,
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:I.grid },
  { id:'clientes', label:'Clientes', icon:I.users },
  { id:'orcamentos', label:'Orçamentos', icon:I.doc },
  { id:'insumos', label:'Insumos', icon:I.box },
  { id:'produtos', label:'Produtos', icon:I.cube },
  { id:'producao', label:'Produção', icon:I.factory },
  { id:'config', label:'Configurações', icon:I.gear },
];
function Sidebar({ teal, active, open, onClose }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div style={{ padding:'22px 20px 18px', display:'flex', alignItems:'center', gap:11, borderBottom:'1px solid var(--line)' }}>
        <span style={{ display:'grid', placeItems:'center', width:44, height:44, background:'#fff',
          border:'1px solid #EFEDE8', borderRadius:13, boxShadow:'0 2px 7px rgba(0,0,0,0.07)' }}>
          <Logo size={32} />
        </span>
        <div style={{ lineHeight:1.15 }}>
          <Wordmark teal={teal} size={15.5} />
          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2, fontWeight:500 }}>Para artesãs</div>
        </div>
        <button onClick={onClose} aria-label="Fechar menu" className="drawer-close" style={{ marginLeft:'auto', border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', padding:2 }}>
          <I.x />
        </button>
      </div>

      <nav style={{ flex:1, padding:'14px 14px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
        {NAV.map((it) => {
          const on = it.id === active;
          return (
            <a key={it.id} href="#" onClick={(e)=>{ e.preventDefault(); onClose(); }}
              style={{ display:'flex', alignItems:'center', gap:13, padding:'11px 13px', borderRadius:11,
                textDecoration:'none', fontSize:14.5, fontWeight: on?600:500,
                color: on ? 'var(--orange)' : '#5C594F',
                background: on ? 'var(--orange-soft)' : 'transparent',
                boxShadow: on ? 'inset 3px 0 0 var(--orange)' : 'none', transition:'background .14s, color .14s' }}
              onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.background='#FAF8F5'; }}
              onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.background='transparent'; }}>
              <span style={{ display:'flex', color: on ? 'var(--orange)' : '#A29E96' }}><it.icon /></span>
              {it.label}
            </a>);
        })}
      </nav>

      <div style={{ padding:'12px 14px 18px', borderTop:'1px solid var(--line)' }}>
        <a href="Login.html" style={{ display:'flex', alignItems:'center', gap:13, padding:'11px 13px', borderRadius:11,
          textDecoration:'none', fontSize:14.5, fontWeight:500, color:'#7C786F' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'}
          onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
          <span style={{ display:'flex', color:'#A29E96' }}><I.logout /></span>
          Sair
        </a>
      </div>
    </aside>);
}

/* ─────────  CARD BASE  ───────── */
function Card({ children, style }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)',
      boxShadow:'0 2px 8px rgba(0,0,0,0.05)', ...style }}>{children}</div>);
}

/* ─────────  MÉTRICA  ───────── */
function Metric({ icon, iconBg, iconColor, label, value, valueColor, delta, deltaColor, empty }) {
  return (
    <Card style={{ padding:'20px 22px', animation:'fadeUp .45s ease both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:13.5, fontWeight:500, color:'var(--muted)' }}>{label}</span>
        <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:42, height:42, borderRadius:12,
          background:iconBg, color:iconColor }}>{icon}</span>
      </div>
      <div style={{ marginTop:10, fontSize:30, fontWeight:700, letterSpacing:'-0.02em', color:valueColor, lineHeight:1.1 }}>{value}</div>
      {delta ? (
        <div style={{ marginTop:9, fontSize:12.5, fontWeight:600, color:deltaColor, display:'flex', alignItems:'center', gap:5 }}>
          {delta}
        </div>
      ) : (
        <div style={{ marginTop:9, fontSize:12.5, color:'#B7B4AD' }}>{empty || '—'}</div>
      )}
    </Card>);
}

/* ─────────  DOTS DECORATIVOS  ───────── */
function DotTrail({ color }) {
  const dots = [[18,24,2.6],[30,16,2],[42,28,2.2],[55,18,2.8],[68,30,2],[80,20,2.4],[90,34,1.8],[24,70,2.2],[40,80,2.6],[58,74,2],[74,84,2.4],[88,72,1.8]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {dots.map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r*0.5} fill={color} opacity={0.45+(i%3)*0.18} />)}
    </svg>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "completo",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter",
  "decor": 70
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawer, setDrawer] = useState(false);
  const empty = t.estado === 'conta nova';

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A', tealDeep:'#2A8377' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80', tealDeep:'#176A60' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' };
  const radii = { reto:{card:12,btn:6}, suave:{card:16,btn:10}, redondo:{card:22,btn:14} }[t.roundness] || { card:16, btn:10 };
  const decorVal = t.decor/100;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`);
    r.setProperty('--orange', palette.orange);
    r.setProperty('--teal', palette.teal);
    r.setProperty('--r-card', radii.card+'px');
    r.setProperty('--r-btn', radii.btn+'px');
  }, [t.font, t.balance, t.roundness]);

  const teal = palette.teal, orange = palette.orange;

  const quickActions = [
    { label:'Cadastrar novo insumo', icon:I.box },
    { label:'Criar produto', icon:I.cube },
    { label:'Gerar orçamento', icon:I.doc },
  ];

  return (
    <div className="app-shell">
      <div className={'scrim' + (drawer ? ' show' : '')} onClick={()=>setDrawer(false)} />
      <Sidebar teal={teal} active="dashboard" open={drawer} onClose={()=>setDrawer(false)} />

      <div className="main-area">
        {/* mobile topbar */}
        <div className="mobile-topbar">
          <button onClick={()=>setDrawer(true)} aria-label="Abrir menu"
            style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}>
            <I.menu />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Logo size={26} /><Wordmark teal={teal} size={14} />
          </div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}>
            <I.bell />
          </button>
        </div>

        <div className="content">
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap', marginBottom:26 }}>
            <div>
              <h1 style={{ margin:0, fontSize:30, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Dashboard</h1>
              <p style={{ margin:'7px 0 0', fontSize:15, color:'var(--muted)', lineHeight:1.5 }}>
                {empty
                  ? <>Bem-vinda, <strong style={{ fontWeight:600, color:'#6B6860' }}>Ana</strong>! Vamos preparar seu negócio? Comece pelos insumos.</>
                  : <>Bem-vinda de volta, <strong style={{ fontWeight:600, color:'#6B6860' }}>Ana</strong>! Aqui está o resumo do seu negócio.</>}
              </p>
            </div>
            <button style={{ flexShrink:0, height:46, padding:'0 20px', border:'none', borderRadius:'var(--r-btn)',
              background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
              display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
              onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'}
              onMouseUp={(e)=>e.currentTarget.style.transform='none'}
              onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'}
              onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
              {empty ? <>Comece cadastrando seus insumos <I.arrow /></> : <>Novo Orçamento <I.arrow /></>}
            </button>
          </div>

          {/* MÉTRICAS */}
          <div className="metrics">
            <Metric icon={<I.dollar />} iconBg={hexA(orange,0.12)} iconColor={orange}
              label="Faturamento Mensal"
              value={empty ? 'R$ 0,00' : 'R$ 1.890,00'} valueColor={orange}
              delta={empty ? null : <><span style={{ fontSize:13 }}>↑</span> +23% este mês</>} deltaColor="#3E9D5A"
              empty="Sem vendas ainda" />
            <Metric icon={<I.cube />} iconBg={hexA(teal,0.12)} iconColor={teal}
              label="Produtos Cadastrados"
              value={empty ? '0' : '18'} valueColor={teal}
              delta={empty ? null : <><span style={{ fontSize:13 }}>↑</span> +2 este mês</>} deltaColor="#3E9D5A"
              empty="Nenhum produto" />
            <Metric icon={<I.fileStack />} iconBg="#F1F0EC" iconColor="#7C786F"
              label="Orçamentos Pendentes"
              value={empty ? '0' : '4'} valueColor="var(--ink)"
              delta={empty ? null : <span style={{ color:'var(--muted)', fontWeight:500 }}>Aguardando resposta</span>} deltaColor="var(--muted)"
              empty="Nenhum pendente" />
          </div>

          {/* ALERTA DE ESTOQUE (somente estado completo) */}
          {!empty && (
            <Card style={{ marginTop:18, padding:'18px 22px', borderLeft:`4px solid ${orange}`, animation:'fadeUp .5s ease both' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>
                <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:40, height:40, borderRadius:11,
                  background:hexA(orange,0.12), color:orange, marginTop:1 }}><I.alert /></span>
                <div style={{ flex:1, minWidth:220 }}>
                  <div style={{ fontSize:15.5, fontWeight:600, color:'var(--ink)' }}>3 insumos com estoque baixo</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:11 }}>
                    {[['Fita dupla face 12mm','0,5 m'],['Papel A4 180g','2 folhas'],['Linha teal 100g','0,8 g']].map(([n,q],i)=>(
                      <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:13, color:'#6B6860', whiteSpace:'nowrap',
                        background:'#FCFBF9', border:'1px solid var(--line)', borderRadius:999, padding:'6px 12px' }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:orange }} />
                        {n} <strong style={{ fontWeight:600, color:'#A35A26' }}>· {q}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <a href="Insumos.html" onClick={(e)=>e.preventDefault()} style={{ flexShrink:0, alignSelf:'center', display:'inline-flex', alignItems:'center', gap:6,
                  fontSize:13.5, fontWeight:600, color:orange, textDecoration:'none' }}>
                  Ver todos os insumos <I.arrow />
                </a>
              </div>
            </Card>
          )}

          {/* AÇÕES RÁPIDAS + DICA */}
          <div className="lower-grid" style={{ marginTop:18 }}>
            <Card style={{ padding:'22px 24px', animation:'fadeUp .55s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:16 }}>
                <span style={{ display:'grid', placeItems:'center', width:42, height:42, borderRadius:12, background:hexA(orange,0.12), color:orange }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" {...sw}><path d="M4 14.5 9 9l3.2 3L20 4.2"/><path d="M15.5 4.2H20V8.7"/></svg>
                </span>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>Ações Rápidas</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginTop:1 }}>{empty ? 'Comece por aqui' : 'Acesso direto ao essencial'}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {quickActions.map((a,i)=>{
                  const highlight = empty && i===0;
                  return (
                    <a key={i} href="#" onClick={(e)=>e.preventDefault()}
                      style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 15px', borderRadius:12,
                        textDecoration:'none', border:`1px solid ${highlight ? hexA(orange,0.4) : 'var(--line)'}`,
                        background: highlight ? 'var(--orange-soft)' : '#FCFBF9', transition:'background .14s, border-color .14s, transform .12s' }}
                      onMouseEnter={(e)=>{ e.currentTarget.style.background = highlight ? hexA(orange,0.16) : '#F6F4F0'; e.currentTarget.style.transform='translateX(2px)'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background = highlight ? 'var(--orange-soft)' : '#FCFBF9'; e.currentTarget.style.transform='none'; }}>
                      <span style={{ display:'grid', placeItems:'center', width:34, height:34, borderRadius:9,
                        background: highlight ? '#fff' : hexA(teal,0.10), color: highlight ? orange : teal }}><a.icon /></span>
                      <span style={{ flex:1, fontSize:14.5, fontWeight:600, color:'var(--ink)' }}>{a.label}</span>
                      <span style={{ color: highlight ? orange : '#B7B4AD' }}><I.arrow /></span>
                    </a>);
                })}
              </div>
            </Card>

            {/* DICA DO DIA */}
            <Card style={{ position:'relative', overflow:'hidden', padding:'24px 26px', animation:'fadeUp .6s ease both',
              background:`linear-gradient(150deg, ${hexA(teal,0.10)} 0%, #FFFFFF 52%, ${hexA(orange,0.07)} 100%)`,
              border:`1px solid ${hexA(teal,0.18)}` }}>
              <div style={{ position:'absolute', inset:0, opacity:decorVal*0.9, pointerEvents:'none' }}>
                <DotTrail color={orange} />
                <div style={{ position:'absolute', width:150, height:150, borderRadius:'46% 54% 60% 40% / 50% 44% 56% 50%',
                  background:hexA(teal,0.10), top:-60, right:-40, animation:'floaty 10s ease-in-out infinite' }} />
              </div>
              <div style={{ position:'relative', display:'flex', alignItems:'center', gap:13, marginBottom:14 }}>
                <span style={{ display:'grid', placeItems:'center', width:46, height:46, borderRadius:13, background:'#fff',
                  color:teal, boxShadow:'0 4px 12px -4px rgba(31,122,111,0.4)', border:'1px solid '+hexA(teal,0.2) }}>
                  <I.bulb />
                </span>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>Dica do Dia</div>
                  <div style={{ fontSize:13, color:teal, fontWeight:600, marginTop:1 }}>Melhore seus lucros</div>
                </div>
              </div>
              <p style={{ position:'relative', margin:0, fontSize:14.5, lineHeight:1.62, color:'#5C594F', maxWidth:440 }}>
                {empty
                  ? <>Cadastre seus insumos com os preços reais de compra. É a base de toda precificação justa — e leva só alguns minutos.</>
                  : <>Revise o preço dos seus produtos depois de cada compra de insumo — pequenas variações acumulam e corroem sua margem ao longo do mês.</>}
              </p>
            </Card>
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Conteúdo" value={t.estado}
          options={[{value:'completo',label:'Com dados'},{value:'conta nova',label:'Conta nova'}]}
          onChange={(v)=>setTweak('estado',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSlider label="Intensidade decorativa" value={t.decor} min={0} max={100} unit="%" onChange={(v)=>setTweak('decor',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

function hexA(hex, a) {
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map((c)=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
