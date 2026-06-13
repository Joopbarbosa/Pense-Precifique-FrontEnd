/* configuracoes-app.jsx — Tela 16 · Configurações · Pense & Precifique */
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
  info:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" strokeWidth="1.9"/><circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/></svg>,
  check:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M5 12.5 10 17.5 19.5 7" strokeWidth="2.2"/></svg>,
  clock:(p)=><svg viewBox="0 0 24 24" width="19" height="19" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>,
  percent:(p)=><svg viewBox="0 0 24 24" width="19" height="19" {...sw} {...p}><path d="M6 18 18 6"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>,
  arrowRight:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M5 12h13M14 6l6 6-6 6" strokeWidth="1.9"/></svg>,
  building:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 5v15.5M15 9.5h3.5A1.5 1.5 0 0 1 20 11v9.5M3.5 20.5h17M8 7.5h4M8 11h4M8 14.5h4"/></svg>,
  shield:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/></svg>,
  sliders:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>,
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
  { id:'producao', label:'Produção', icon:I.factory, href:'Producao.html' },
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

/* ─────────  CAMPO COM AFFIX  ───────── */
function AffixInput({ value, onChange, prefix, suffix, icon, teal, inputMode }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'stretch', border:`1.5px solid ${f?teal:'var(--line)'}`, borderRadius:'var(--r-input)', background:'#fff', overflow:'hidden', boxShadow: f?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s', maxWidth:300 }}>
      {prefix && (
        <span style={{ display:'flex', alignItems:'center', gap:7, padding:'0 14px', fontSize:14.5, fontWeight:600, color: f?'var(--teal-deep)':'#6B6860', background:'#FAF8F5', borderRight:'1px solid var(--line)', whiteSpace:'nowrap' }}>
          {icon && <span style={{ display:'flex', color: f?teal:'#A8A49C' }}>{icon}</span>}{prefix}
        </span>)}
      <input value={value} onChange={(e)=>onChange(e.target.value)} inputMode={inputMode} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ flex:1, minWidth:0, height:52, padding:'0 14px', border:'none', outline:'none', fontSize:17, fontWeight:600, color:'var(--ink)', background:'transparent', fontFamily:'inherit', fontVariantNumeric:'tabular-nums' }} />
      {suffix && <span style={{ display:'flex', alignItems:'center', padding:'0 16px', fontSize:15, fontWeight:600, color: f?'var(--teal-deep)':'#6B6860', background:'#FAF8F5', borderLeft:'1px solid var(--line)' }}>{suffix}</span>}
    </div>);
}

/* ─────────  TOAST  ───────── */
function Toast({ show, teal }) {
  if (!show) return null;
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:200, display:'flex', alignItems:'center', gap:11, padding:'13px 20px 13px 15px', background:'#143D33', color:'#fff', borderRadius:13, boxShadow:'0 16px 40px -10px rgba(0,0,0,0.5)', animation:'toastIn .3s cubic-bezier(.34,1.3,.5,1) both', maxWidth:'calc(100vw - 32px)' }}>
      <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:26, height:26, borderRadius:'50%', background:'#34A56F', color:'#fff' }}><I.check /></span>
      <span style={{ fontSize:14, fontWeight:600, whiteSpace:'nowrap' }}>Configurações salvas com sucesso!</span>
    </div>);
}

/* ─────────  SUB-NAV  ───────── */
function SubNav({ aba, setAba, teal }) {
  const ABAS = [
    { id:'precificacao', label:'Precificação', icon:I.sliders },
    { id:'perfil', label:'Perfil da empresa', icon:I.building },
    { id:'conta', label:'Conta', icon:I.shield },
  ];
  return (
    <div style={{ display:'flex', gap:4, marginBottom:26, borderBottom:'1.5px solid var(--line)', overflowX:'auto' }}>
      {ABAS.map((a)=>{ const on=aba===a.id; return (
        <button key={a.id} onClick={()=>setAba(a.id)} style={{ position:'relative', display:'flex', alignItems:'center', gap:8, padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14.5, fontWeight: on?600:500, color: on?teal:'#8A8780', whiteSpace:'nowrap', transition:'color .14s' }}
          onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.color='#5C594F'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.color='#8A8780'; }}>
          <span style={{ display:'flex', color: on?teal:'#B0ACA4' }}><a.icon /></span>{a.label}
          {on && <span style={{ position:'absolute', left:8, right:8, bottom:-1.5, height:2.5, borderRadius:3, background:teal }} />}
        </button>); })}
    </div>);
}

/* ─────────  CARD PERFIL (preview)  ───────── */
function PerfilCard({ teal, orange }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden', animation:'fadeUp .4s ease both' }}>
      <div style={{ height:64, background:`linear-gradient(120deg, ${hexA(teal,0.16)}, ${hexA(orange,0.12)})`, position:'relative' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          {[['18%','40%',5,orange],['82%','30%',6,teal],['66%','68%',4,orange]].map((d,k)=>(<span key={k} style={{ position:'absolute', left:d[0], top:d[1], width:d[2], height:d[2], borderRadius:'50%', background:hexA(d[3],0.6) }} />))}
        </div>
      </div>
      <div style={{ padding:'0 20px 20px', marginTop:-32, textAlign:'center' }}>
        <div style={{ width:72, height:72, margin:'0 auto', borderRadius:'50%', background:'#fff', border:'3px solid #fff', boxShadow:'0 4px 14px -4px rgba(0,0,0,0.2)', display:'grid', placeItems:'center', overflow:'hidden' }}>
          <span style={{ display:'grid', placeItems:'center', width:'100%', height:'100%', background:'#FAF8F5' }}><Logo size={42} /></span>
        </div>
        <h3 style={{ margin:'13px 0 0', fontSize:17, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>Ateliê da Ana</h3>
        <p style={{ margin:'3px 0 0', fontSize:13.5, color:'var(--muted)' }}>ana@atelier.com</p>
        <a href="#" onClick={(e)=>e.preventDefault()} style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:16, fontSize:13.5, fontWeight:600, color:teal, textDecoration:'none', whiteSpace:'nowrap' }}
          onMouseEnter={(e)=>e.currentTarget.style.gap='9px'} onMouseLeave={(e)=>e.currentTarget.style.gap='6px'}>Editar perfil <I.arrowRight /></a>
      </div>
    </div>);
}

/* ─────────  ABA PRECIFICAÇÃO  ───────── */
function Precificacao({ teal, orange }) {
  const HORA0 = '25,00', MARGEM0 = '40';
  const [hora, setHora] = useState(HORA0);
  const [margem, setMargem] = useState(MARGEM0);
  const [toast, setToast] = useState(false);
  const [saved, setSaved] = useState({ hora: HORA0, margem: MARGEM0 });
  const dirty = hora !== saved.hora || margem !== saved.margem;
  const timer = useRef(null);

  const salvar = () => {
    setSaved({ hora, margem });
    setToast(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(()=>setToast(false), 3200);
  };
  useEffect(()=>()=>clearTimeout(timer.current), []);

  return (
    <div className="cfg-grid">
      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        {/* CARD 1 — parâmetros */}
        <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'26px 28px', animation:'fadeUp .35s ease both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:5 }}>
            <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:hexA(teal,0.1), color:teal }}><I.sliders /></span>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>Como você quer precificar?</h2>
          </div>
          <p style={{ margin:'0 0 22px 49px', fontSize:13.5, color:'var(--muted)', lineHeight:1.5 }}>Estes parâmetros alimentam a calculadora de preço de todos os seus produtos.</p>

          <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
            <div>
              <label style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>Valor da sua hora de trabalho</label>
              <AffixInput value={hora} onChange={(v)=>setHora(v.replace(/[^\d.,]/g,''))} prefix="R$/h" icon={<I.clock />} teal={teal} inputMode="decimal" />
              <p style={{ margin:'8px 0 0', fontSize:12.5, color:'#A8A49C' }}>Quanto vale uma hora do seu tempo produzindo.</p>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>Margem de lucro padrão</label>
              <AffixInput value={margem} onChange={(v)=>setMargem(v.replace(/[^\d]/g,''))} suffix="%" teal={teal} inputMode="numeric" />
              <p style={{ margin:'8px 0 0', fontSize:12.5, color:'#A8A49C' }}>Percentual aplicado sobre o custo para formar o preço sugerido.</p>
            </div>
          </div>

          {/* banner informativo */}
          <div style={{ display:'flex', gap:12, marginTop:24, padding:'14px 16px', borderRadius:12, background:hexA(teal,0.06), borderLeft:`3px solid ${teal}`, border:`1px solid ${hexA(teal,0.18)}`, borderLeftWidth:3, borderLeftColor:teal }}>
            <span style={{ flexShrink:0, color:teal, marginTop:1 }}><I.info /></span>
            <p style={{ margin:0, fontSize:13, color:'#3F5B54', lineHeight:1.55 }}>Alterar estes valores <strong style={{ fontWeight:700 }}>não recalcula orçamentos já criados</strong>. Somente novos orçamentos usarão os parâmetros atualizados.</p>
          </div>

          {/* footer salvar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginTop:24, paddingTop:22, borderTop:'1px solid var(--line)', flexWrap:'wrap' }}>
            <span style={{ fontSize:12.5, fontWeight:500, color: dirty?'#C8721F':'#A8A49C', display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: dirty?'#E8913B':'#CFCBC3', boxShadow: dirty?'0 0 0 4px rgba(232,145,59,0.18)':'none' }} />
              {dirty ? 'Você tem alterações não salvas' : 'Tudo salvo'}
            </span>
            <button onClick={salvar} disabled={!dirty} style={{ '--ring': hexA(orange,0.7), height:48, padding:'0 24px', borderRadius:'var(--r-btn)', border:'none', background: dirty?orange:'#E7E4DE', color: dirty?'#fff':'#B0ACA4', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor: dirty?'pointer':'default', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow: dirty?`0 8px 18px -8px ${hexA(orange,0.7)}`:'none', animation: dirty?'pulseRing 2s ease-in-out infinite':'none', transition:'background .15s, color .15s' }}
              onMouseEnter={(e)=>{ if(dirty) e.currentTarget.style.filter='brightness(1.05)'; }} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
              <I.check /> Salvar alterações
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2 — perfil preview */}
      <PerfilCard teal={teal} orange={orange} />

      <Toast show={toast} teal={teal} />
    </div>);
}

/* ─────────  ABAS PLACEHOLDER (perfil / conta)  ───────── */
function Placeholder({ icon, titulo, texto, teal }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'54px 24px', textAlign:'center', animation:'fadeUp .35s ease both' }}>
      <div style={{ width:64, height:64, margin:'0 auto', borderRadius:18, background:hexA(teal,0.1), color:teal, display:'grid', placeItems:'center' }}><span style={{ transform:'scale(1.6)' }}>{icon}</span></div>
      <h3 style={{ margin:'18px 0 0', fontSize:18, fontWeight:700, color:'var(--ink)' }}>{titulo}</h3>
      <p style={{ margin:'8px auto 0', maxWidth:360, fontSize:14, color:'var(--muted)', lineHeight:1.55 }}>{texto}</p>
    </div>);
}

/* ─────────  CAMPOS DE FORMULÁRIO  ───────── */
function CfgField({ label, opt, children }) {
  return (
    <label style={{ display:'block' }}>
      <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:8 }}>{label}{opt && <span style={{ fontSize:12, fontWeight:500, color:'#B0ACA4', marginLeft:6 }}>(opcional)</span>}</span>
      {children}
    </label>);
}
function CfgInput({ value='', type='text', placeholder, teal, readOnly }) {
  const [v, setV] = useState(value);
  const [f, setF] = useState(false);
  return (
    <input type={type} value={v} placeholder={placeholder} readOnly={readOnly} onChange={(e)=>setV(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{ width:'100%', height:48, padding:'0 14px', border:`1.5px solid ${f&&!readOnly?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color: readOnly?'#7C786F':'var(--ink)', background: readOnly?'#FAF8F5':'#fff', outline:'none', fontFamily:'inherit', boxShadow: f&&!readOnly?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' }} />);
}
function PrimaryBtn({ orange, children, onClick }) {
  return (
    <button onClick={onClick} style={{ height:48, padding:'0 24px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'filter .15s' }}
      onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>{children}</button>);
}
function GhostBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ height:48, padding:'0 18px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap' }}
      onMouseEnter={(e)=>{ e.currentTarget.style.background='#FAF8F5'; e.currentTarget.style.borderColor='#DEDBD4'; }} onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='var(--line)'; }}>{children}</button>);
}
function SectionHead({ icon, titulo, teal }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:18 }}>
      <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:hexA(teal,0.1), color:teal }}>{icon}</span>
      <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>{titulo}</h2>
    </div>);
}

/* ─────────  ABA PERFIL DA EMPRESA  ───────── */
function PerfilEmpresa({ teal, orange }) {
  return (
    <div style={{ maxWidth:640, animation:'fadeUp .35s ease both' }}>
      <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'26px 28px' }}>
        <SectionHead icon={<I.building />} titulo="Perfil da empresa" teal={teal} />

        {/* logo */}
        <div style={{ display:'flex', alignItems:'center', gap:18, paddingBottom:22, marginBottom:22, borderBottom:'1px solid var(--line)', flexWrap:'wrap' }}>
          <span style={{ flexShrink:0, width:84, height:84, borderRadius:'50%', background:'#FAF8F5', border:'1px solid #EFEDE8', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', display:'grid', placeItems:'center', overflow:'hidden' }}><Logo size={50} /></span>
          <div>
            <GhostBtn>Alterar logo</GhostBtn>
            <p style={{ margin:'9px 0 0', fontSize:12.5, color:'#A8A49C', lineHeight:1.5 }}>PNG ou JPG, fundo transparente recomendado.</p>
          </div>
        </div>

        {/* campos */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <CfgField label="Nome da empresa"><CfgInput value="Pense & Crie Studio" teal={teal} /></CfgField>
          <CfgField label="E-mail de contato"><CfgInput value="penseecrie@email.com" type="email" teal={teal} /></CfgField>
          <CfgField label="WhatsApp / Telefone"><CfgInput value="(11) 98888-1234" teal={teal} inputMode="tel" /></CfgField>
          <CfgField label="Endereço" opt><CfgInput value="" placeholder="Rua, número, bairro, cidade" teal={teal} /></CfgField>
        </div>

        {/* aviso teal */}
        <div style={{ display:'flex', gap:12, marginTop:22, padding:'14px 16px', borderRadius:12, background:hexA(teal,0.06), border:`1px solid ${hexA(teal,0.18)}`, borderLeft:`3px solid ${teal}` }}>
          <span style={{ flexShrink:0, color:teal, marginTop:1 }}><I.info /></span>
          <p style={{ margin:0, fontSize:13, color:'#3F5B54', lineHeight:1.55 }}>Estas informações aparecem em todos os PDFs gerados pelo sistema (orçamentos, recibos e multas).</p>
        </div>

        {/* footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:24, paddingTop:22, borderTop:'1px solid var(--line)' }}>
          <PrimaryBtn orange={orange}><I.check /> Salvar alterações</PrimaryBtn>
        </div>
      </div>
    </div>);
}

/* ─────────  ABA CONTA  ───────── */
function ContaSeguranca({ teal, orange }) {
  return (
    <div style={{ maxWidth:640, display:'flex', flexDirection:'column', gap:22, animation:'fadeUp .35s ease both' }}>
      {/* dados de acesso */}
      <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'26px 28px' }}>
        <SectionHead icon={<I.shield />} titulo="Dados de acesso" teal={teal} />

        <CfgField label="E-mail atual">
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ flex:'1 1 240px', minWidth:0 }}><CfgInput value="ana@atelier.com" teal={teal} readOnly /></div>
            <GhostBtn>Alterar e-mail</GhostBtn>
          </div>
        </CfgField>

        {/* alterar senha */}
        <div style={{ marginTop:22, paddingTop:22, borderTop:'1px solid var(--line)' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'var(--ink)' }}>Alterar senha</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <CfgField label="Senha atual"><CfgInput value="" type="password" placeholder="••••••••" teal={teal} /></CfgField>
            <CfgField label="Nova senha"><CfgInput value="" type="password" placeholder="Mínimo 8 caracteres" teal={teal} /></CfgField>
            <CfgField label="Confirmar nova senha"><CfgInput value="" type="password" placeholder="Repita a nova senha" teal={teal} /></CfgField>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <PrimaryBtn orange={orange}>Atualizar senha</PrimaryBtn>
          </div>
        </div>
      </div>

      {/* zona de perigo */}
      <div style={{ background:'#FEF8F6', border:'1.5px solid #F2D8CF', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', padding:'24px 28px' }}>
        <h3 style={{ margin:0, fontSize:15.5, fontWeight:700, color:'#B23A1E' }}>Excluir conta</h3>
        <p style={{ margin:'7px 0 18px', fontSize:13.5, color:'#8A5A4C', lineHeight:1.55, maxWidth:440 }}>Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.</p>
        <button style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid #E3A799', background:'transparent', color:'#C0492B', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap', transition:'background .15s' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FBEDE7'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>Solicitar exclusão da conta</button>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "aba": "precificacao",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aba, setAba] = useState(t.aba);

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
  useEffect(() => { setAba(t.aba); }, [t.aba]);

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="config" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}><I.menu /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}><I.bell /></button>
        </div>

        <div className="content">
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:22 }}>
            <span style={{ flexShrink:0, width:52, height:52, borderRadius:15, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.gear /></span>
            <div>
              <h1 style={{ margin:0, fontSize:27, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>Configurações</h1>
              <p style={{ margin:'4px 0 0', fontSize:14.5, color:'var(--muted)' }}>Defina as regras do seu negócio.</p>
            </div>
          </div>

          <SubNav aba={aba} setAba={setAba} teal={teal} />

          {aba==='precificacao' && <Precificacao teal={teal} orange={orange} />}
          {aba==='perfil' && <PerfilEmpresa teal={teal} orange={orange} />}
          {aba==='conta' && <ContaSeguranca teal={teal} orange={orange} />}
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Sub-aba" value={t.aba} options={[{value:'precificacao',label:'Precificação'},{value:'perfil',label:'Perfil'},{value:'conta',label:'Conta'}]} onChange={(v)=>setTweak('aba',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
