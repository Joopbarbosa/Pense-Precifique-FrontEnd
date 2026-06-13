/* clientes-app.jsx — Tela 5 · Clientes · Pense & Precifique */
const { useState, useEffect, useRef } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 40 }) {
  return (
    <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
         style={{ display:'block', objectFit:'contain', transform:'translateX(3%)' }} />);
}
function Wordmark({ teal = '#2A9D8F', size = 15.5 }) {
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
  cube: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
  factory: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z"/><path d="M3.5 20.5h17"/></svg>,
  gear: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.4a1.7 1.7 0 0 0 1-1.6V2.7a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2"/></svg>,
  logout: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5"/><path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6"/></svg>,
  search: (p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></svg>,
  phone: (p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M6.5 4.5h3l1.2 3.2-1.7 1.3a11 11 0 0 0 4.7 4.7l1.3-1.7 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z"/></svg>,
  plus: (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  dots: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>,
  edit: (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>,
  list: (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>,
  ban: (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><circle cx="12" cy="12" r="8.2"/><path d="m6.5 6.5 11 11"/></svg>,
  refresh: (p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/></svg>,
  menu: (p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x: (p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell: (p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  mail: (p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>,
  note: (p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M5 4.5h14a1 1 0 0 1 1 1V16l-4 4H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z"/><path d="M20 16h-4v4M8 9h8M8 12.5h5"/></svg>,
  user: (p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="12" cy="8" r="3.6"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/></svg>,
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
        <span style={{ display:'grid', placeItems:'center', width:44, height:44, background:'#fff',
          border:'1px solid #EFEDE8', borderRadius:13, boxShadow:'0 2px 7px rgba(0,0,0,0.07)' }}><Logo size={32} /></span>
        <div style={{ lineHeight:1.15 }}>
          <Wordmark teal={teal} size={15.5} />
          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2, fontWeight:500 }}>Para artesãs</div>
        </div>
        <button onClick={onClose} aria-label="Fechar menu" className="drawer-close" style={{ marginLeft:'auto', border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', padding:2 }}><I.x /></button>
      </div>
      <nav style={{ flex:1, padding:'14px 14px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
        {NAV.map((it) => {
          const on = it.id === active;
          return (
            <a key={it.id} href={it.href} onClick={(e)=>{ if(it.href==='#'){ e.preventDefault(); } onClose(); }}
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
          <span style={{ display:'flex', color:'#A29E96' }}><I.logout /></span> Sair
        </a>
      </div>
    </aside>);
}

/* ─────────  DADOS  ───────── */
const CLIENTES = [
  { nome:'Mariana Costa', whats:'(11) 99999-0000', orc:'#0042', data:'04/06/2026', email:'mariana.costa@gmail.com', obs:'' },
  { nome:'Camila Rocha', whats:'(11) 97777-2233', orc:'#0041', data:'02/06/2026', email:'camila.rocha@gmail.com', obs:'Prefere retirar no ateliê aos sábados pela manhã. Sempre pede embrulho de presente.' },
  { nome:'Patrícia Mendes', whats:'(21) 98888-5566', orc:'#0040', data:'28/05/2026', email:'', obs:'' },
  { nome:'Juliana Ferreira', whats:'(11) 96666-4411', orc:null, data:null, email:'', obs:'', ativa:false },
];
const AVATAR_TINTS = ['#2A9D8F','#3FA89A','#E0843C','#5A8FB0','#B06A8F'];

/* ─────────  AVATAR  ───────── */
function Avatar({ nome, i, teal, inativa }) {
  const bg = teal;
  return (
    <span style={{ flexShrink:0, width:42, height:42, borderRadius:'50%', display:'grid', placeItems:'center',
      background: inativa ? '#ECEAE5' : hexA(bg,0.13), color: inativa ? '#9A968E' : bg, fontWeight:700, fontSize:16,
      opacity: inativa ? 0.7 : 1 }}>
      {nome.trim().charAt(0).toUpperCase()}
    </span>);
}

/* ─────────  LINHA DE CLIENTE  ───────── */
function ClientRow({ c, i, teal, orange, menuOpen, onMenu, onEdit }) {
  const inativa = c.ativa === false;
  return (
    <div className="client-row" style={{ position:'relative', zIndex: menuOpen===i ? 30 : 1, padding:'14px 18px', borderBottom:'1px solid var(--line)',
      background: inativa ? '#FAF9F6' : 'transparent',
      transition:'background .12s', animation:`fadeUp .4s ease both`, animationDelay:`${i*0.05}s` }}
      onMouseEnter={(e)=>e.currentTarget.style.background = inativa ? '#F5F3EF' : '#FCFBF9'}
      onMouseLeave={(e)=>e.currentTarget.style.background = inativa ? '#FAF9F6' : 'transparent'}>
      {/* cliente */}
      <div className="cell" style={{ display:'flex', alignItems:'center', gap:13, minWidth:0 }}>
        <Avatar nome={c.nome} i={i} teal={teal} inativa={inativa} />
        <div style={{ minWidth:0, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:15, fontWeight:600, color: inativa ? '#AAA69E' : 'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nome}</span>
          {inativa && (
            <span style={{ flexShrink:0, fontSize:11, fontWeight:700, letterSpacing:'0.01em', color:'#C0492B',
              background:'#FBEDE7', border:'1px solid #F2D8CF', borderRadius:6, padding:'2px 8px', lineHeight:1.45 }}>Inativa</span>
          )}
        </div>
      </div>
      {/* whatsapp */}
      <div className="cell">
        <span className="cell-label">WhatsApp</span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:14, color:'#5C594F' }}>
          <span style={{ color:teal, display:'flex' }}><I.phone /></span>{c.whats}
        </span>
      </div>
      {/* último orçamento */}
      <div className="cell">
        <span className="cell-label">Último orçamento</span>
        {c.orc ? (
          <span style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:14, color:'#5C594F' }}>
            <span style={{ fontWeight:600, color:orange }}>{c.orc}</span>
            <span style={{ color:'#C9C5BD' }}>·</span>
            <span style={{ color:'var(--muted)' }}>{c.data}</span>
          </span>
        ) : (
          <span style={{ fontSize:13.5, color:'#B7B4AD', fontStyle:'italic' }}>Nenhum orçamento ainda</span>
        )}
      </div>
      {/* menu */}
      <div className="cell" style={{ display:'flex', justifyContent:'flex-end', position:'relative' }}>
        <button onClick={(e)=>{ e.stopPropagation(); onMenu(menuOpen===i ? null : i); }} aria-label="Mais ações"
          style={{ width:36, height:36, borderRadius:9, border:'1px solid transparent', background: menuOpen===i?'#F1F0EC':'transparent',
            color:'var(--muted)', cursor:'pointer', display:'grid', placeItems:'center' }}
          onMouseEnter={(e)=>{ if(menuOpen!==i) e.currentTarget.style.background='#F1F0EC'; }}
          onMouseLeave={(e)=>{ if(menuOpen!==i) e.currentTarget.style.background='transparent'; }}>
          <I.dots />
        </button>
        {menuOpen===i && (
          <div style={{ position:'absolute', top:42, right:0, zIndex:20, width:182, background:'#fff',
            border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)',
            padding:6, animation:'pop .14s ease both' }}>
            {[['Editar', I.edit, '#5C594F'], ['Ver orçamentos', I.list, '#5C594F'], inativa ? ['Reativar', I.refresh, teal] : ['Desativar', I.ban, '#C0492B']].map(([label, Ic, col],k)=>(
              <button key={k} onClick={()=>{ onMenu(null); if(label==='Editar' && onEdit) onEdit(c); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
                  border:'none', background:'transparent', color:col, fontSize:13.5, fontWeight:500, fontFamily:'inherit',
                  cursor:'pointer', textAlign:'left' }}
                onMouseEnter={(e)=>e.currentTarget.style.background = col==='#C0492B' ? '#FCF1ED' : (label==='Reativar' ? hexA(teal,0.09) : '#F7F5F1')}
                onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
                <span style={{ display:'flex', color: col==='#5C594F' ? '#A29E96' : col }}><Ic /></span>{label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>);
}

/* ─────────  DRAWER NOVA CLIENTE  ───────── */
function maskPhone(v) {
  const d = v.replace(/\D/g,'').slice(0,11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function DrawerField({ icon, label, required, children, hint }) {
  return (
    <label style={{ display:'block' }}>
      <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:7 }}>
        {label}{required && <span style={{ color:'#E0613F', marginLeft:3 }}>*</span>}
      </span>
      <div style={{ position:'relative' }}>
        {icon && <span style={{ position:'absolute', left:13, top:14, color:'var(--muted)', display:'flex', pointerEvents:'none' }}>{icon}</span>}
        {children}
      </div>
      {hint && <span style={{ display:'block', marginTop:6, fontSize:12, color:'var(--muted)' }}>{hint}</span>}
    </label>);
}
function NovaClienteDrawer({ teal, orange, onClose, editData }) {
  const isEdit = !!editData;
  const [form, setForm] = useState(editData || { nome:'', whats:'', email:'', obs:'' });
  const [focus, setFocus] = useState(null);
  const set = (k) => (e) => setForm((s)=>({ ...s, [k]: k==='whats' ? maskPhone(e.target.value) : e.target.value }));
  const inputStyle = (active, padLeft=40, area=false) => ({
    width:'100%', minHeight: area?86:48, padding: area?'12px 14px':'0 14px 0 '+padLeft+'px',
    border:`1.5px solid ${active?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:15,
    color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
    boxShadow: active?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s',
    resize: area?'vertical':'none', lineHeight: area?1.5:'normal',
  });
  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(20,18,16,0.34)', zIndex:80, animation:'fadeUp .2s ease both' }} />
      <div className="cliente-drawer" style={{ position:'fixed', zIndex:90, background:'#fff', display:'flex', flexDirection:'column',
        top:0, right:0, height:'100vh', width:'min(440px, 100%)', boxShadow:'-12px 0 40px -12px rgba(0,0,0,0.22)',
        animation:'slideInRight .3s cubic-bezier(.4,0,.2,1) both' }}>
        {/* header */}
        <div style={{ position:'relative', overflow:'hidden', padding:'24px 26px',
          background:`linear-gradient(150deg, ${teal} 0%, ${hexA(teal,0.92)} 70%, #1F7A6F 100%)`, color:'#fff' }}>
          <DotsDeco color={orange} />
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ display:'grid', placeItems:'center', width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.3)', fontWeight:700, fontSize:17 }}>
                {isEdit ? form.nome.trim().charAt(0).toUpperCase() : <I.user />}
              </span>
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.01em' }}>{isEdit ? 'Editar Cliente' : 'Nova Cliente'}</div>
                <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.85)', marginTop:1 }}>{isEdit ? 'Atualize os dados da cliente' : 'Adicione à sua agenda'}</div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none',
              background:'rgba(255,255,255,0.16)', color:'#fff', cursor:'pointer', display:'grid', placeItems:'center' }}><I.x /></button>
          </div>
        </div>
        {/* body */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 26px', display:'flex', flexDirection:'column', gap:18 }}>
          <DrawerField icon={<I.user />} label="Nome completo" required>
            <input type="text" placeholder="Beatriz Santos" value={form.nome} onChange={set('nome')}
              onFocus={()=>setFocus('nome')} onBlur={()=>setFocus(null)} style={inputStyle(focus==='nome')} />
          </DrawerField>
          <DrawerField icon={<I.phone />} label="WhatsApp" required hint="Usado para enviar orçamentos diretamente.">
            <input type="tel" inputMode="numeric" placeholder="(11) 99999-0000" value={form.whats} onChange={set('whats')}
              onFocus={()=>setFocus('whats')} onBlur={()=>setFocus(null)} style={inputStyle(focus==='whats', 38)} />
          </DrawerField>
          <DrawerField icon={<I.mail />} label="E-mail" hint="Opcional">
            <input type="email" placeholder="beatriz@email.com" value={form.email} onChange={set('email')}
              onFocus={()=>setFocus('email')} onBlur={()=>setFocus(null)} style={inputStyle(focus==='email')} />
          </DrawerField>
          <DrawerField icon={null} label="Observações">
            <textarea placeholder="Ex: Prefere entregas às sextas" value={form.obs} onChange={set('obs')}
              onFocus={()=>setFocus('obs')} onBlur={()=>setFocus(null)} style={inputStyle(focus==='obs', 14, true)} />
          </DrawerField>
        </div>
        {/* footer */}
        <div style={{ padding:'16px 26px', borderTop:'1px solid var(--line)', display:'flex', gap:12, background:'#fff' }}>
          <button onClick={onClose} style={{ flex:1, height:48, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)',
            background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
            onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'}
            onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
          <button onClick={onClose} style={{ flex:1.5, height:48, borderRadius:'var(--r-btn)', border:'none',
            background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
            boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'filter .15s' }}
            onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'}
            onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>{isEdit ? 'Salvar alterações' : 'Salvar cliente'}</button>
        </div>
      </div>
      <style>{`@media (max-width:560px){ .cliente-drawer{ top:auto !important; bottom:0 !important; height:auto !important; max-height:92vh; width:100% !important; border-radius:22px 22px 0 0; animation:slideInUp .3s cubic-bezier(.4,0,.2,1) both !important; } }`}</style>
    </React.Fragment>);
}
function DotsDeco({ color }) {
  const dots = [[18,30,2.4],[34,18,2],[52,30,2.6],[70,20,2.2],[84,34,1.8],[90,60,2.2],[30,72,2]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.55 }}>
      {dots.map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r*0.55} fill={color} opacity={0.6} />)}
    </svg>);
}

/* ─────────  ESTADO VAZIO  ───────── */
function EmptyState({ teal, orange, onNew }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
      padding:'56px 32px', textAlign:'center', animation:'fadeUp .4s ease both' }}>
      <div style={{ position:'relative', width:84, height:84, margin:'0 auto 22px' }}>
        <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:hexA(teal,0.10), display:'grid', placeItems:'center', color:teal }}>
          <svg viewBox="0 0 24 24" width="38" height="38" {...sw}><circle cx="9" cy="8" r="3.3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4"/></svg>
        </span>
        <span style={{ position:'absolute', right:-2, bottom:-2, width:30, height:30, borderRadius:'50%', background:orange, color:'#fff', display:'grid', placeItems:'center', border:'3px solid #fff' }}><I.plus /></span>
      </div>
      <h3 style={{ margin:0, fontSize:19, fontWeight:700, color:'var(--ink)' }}>Sua agenda está pronta para começar</h3>
      <p style={{ margin:'10px auto 22px', maxWidth:420, fontSize:14.5, color:'var(--muted)', lineHeight:1.6 }}>
        Você ainda não cadastrou clientes. Quando criar um orçamento, poderá cadastrar a cliente diretamente de lá!
      </p>
      <button onClick={onNew} style={{ height:48, padding:'0 22px', border:'none', borderRadius:'var(--r-btn)',
        background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
        display:'inline-flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}>
        <I.plus /> Cadastrar primeira cliente
      </button>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "estado": "lista",
  "drawer": "edição",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawer, setDrawer] = useState(t.drawer === 'aberto' || t.drawer === 'edição');
  const [editClient, setEditClient] = useState(t.drawer === 'edição' ? CLIENTES[1] : null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const [searchFocus, setSearchFocus] = useState(false);
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
    r.setProperty('--font', `'${t.font}'`);
    r.setProperty('--orange', orange);
    r.setProperty('--teal', teal);
    r.setProperty('--r-card', radii.card+'px');
    r.setProperty('--r-btn', radii.btn+'px');
    r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);
  useEffect(() => {
    if (t.drawer === 'aberto') { setEditClient(null); setDrawer(true); }
    else if (t.drawer === 'edição') { setEditClient(CLIENTES[1]); setDrawer(true); }
    else setDrawer(false);
  }, [t.drawer]);
  const openNova = () => { setEditClient(null); setDrawer(true); };
  const openEdit = (c) => { setEditClient(c); setDrawer(true); };

  const filtered = CLIENTES.filter((c) =>
    c.nome.toLowerCase().includes(query.toLowerCase()) || c.whats.replace(/\D/g,'').includes(query.replace(/\D/g,'')));

  return (
    <div className="app-shell" onClick={()=>setMenuOpen(null)}>
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={()=>setSidebarOpen(false)} />
      <Sidebar teal={teal} active="clientes" open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu" style={{ border:'none', background:'transparent', color:'var(--ink)', cursor:'pointer', display:'flex', padding:4 }}><I.menu /></button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', padding:4 }}><I.bell /></button>
        </div>

        <div className="content">
          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap', marginBottom:8 }}>
            <div>
              <h1 style={{ margin:0, fontSize:29, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>Minhas Clientes</h1>
              <p style={{ margin:'7px 0 0', fontSize:14.5, color:'var(--muted)', lineHeight:1.5 }}>
                {empty ? 'Cuide do relacionamento com quem compra de você.' : <>Você tem <strong style={{ fontWeight:600, color:'#6B6860' }}>{CLIENTES.length} clientes</strong> na sua agenda.</>}
              </p>
            </div>
            <button onClick={openNova} style={{ flexShrink:0, height:46, padding:'0 20px', border:'none', borderRadius:'var(--r-btn)',
              background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', whiteSpace:'nowrap',
              display:'flex', alignItems:'center', gap:9, boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
              onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'}
              onMouseUp={(e)=>e.currentTarget.style.transform='none'}
              onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'}
              onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
              <I.plus /> Nova Cliente
            </button>
          </div>

          {empty ? (
            <div style={{ marginTop:26 }}><EmptyState teal={teal} orange={orange} onNew={openNova} /></div>
          ) : (
            <React.Fragment>
              {/* BUSCA */}
              <div style={{ position:'relative', margin:'22px 0 18px', maxWidth:440 }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', display:'flex' }}><I.search /></span>
                <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nome ou WhatsApp"
                  onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)}
                  style={{ width:'100%', height:46, padding:'0 16px 0 42px', border:`1.5px solid ${searchFocus?teal:'var(--line)'}`,
                    borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit',
                    boxShadow: searchFocus?`0 0 0 4px ${hexA(teal,0.12)}`:'0 1px 2px rgba(0,0,0,0.03)', transition:'border-color .15s, box-shadow .15s' }} />
              </div>

              {/* TABELA */}
              <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="client-head" style={{ padding:'13px 18px', borderBottom:'1px solid var(--line)' }}>
                  {['Cliente','WhatsApp','Último orçamento',''].map((h,k)=>(
                    <div key={k} style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#B7B4AD' }}>{h}</div>
                  ))}
                </div>
                <div className="client-list">
                  {filtered.length ? filtered.map((c,i)=>(
                    <ClientRow key={c.nome} c={c} i={i} teal={teal} orange={orange} menuOpen={menuOpen} onMenu={setMenuOpen} onEdit={openEdit} />
                  )) : (
                    <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--muted)', fontSize:14 }}>
                      Nenhuma cliente encontrada para “{query}”.
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {drawer && <NovaClienteDrawer key={editClient ? editClient.nome : 'nova'} teal={teal} orange={orange} editData={editClient} onClose={()=>setDrawer(false)} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakRadio label="Conteúdo" value={t.estado}
          options={[{value:'lista',label:'Com clientes'},{value:'vazio',label:'Vazio'}]}
          onChange={(v)=>setTweak('estado',v)} />
        <TweakRadio label="Painel lateral" value={t.drawer}
          options={[{value:'fechado',label:'Fechado'},{value:'aberto',label:'Nova'},{value:'edição',label:'Edição'}]}
          onChange={(v)=>setTweak('drawer',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
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
