/* detalhe-insumo-app.jsx — Tela 12 · Detalhe do Insumo + Histórico · Pense & Precifique */
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
  edit:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>,
  cart:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M3 4h2l2.2 11.2a1.4 1.4 0 0 0 1.4 1.1h8.1a1.4 1.4 0 0 0 1.4-1.1L20 7.5H6"/><circle cx="9.5" cy="20" r="1.2" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none"/></svg>,
  minus:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 12h14" strokeWidth="2"/></svg>,
  calc:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15v3M8.5 18h3.5"/></svg>,
  info:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5" strokeWidth="1.9"/><circle cx="12" cy="7.8" r=".5" fill="currentColor" stroke="none"/></svg>,
  arrowDown:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M12 5v14M12 19l5-5M12 19l-5-5" strokeWidth="2"/></svg>,
  arrowRight:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 12h13M14 6l6 6-6 6" strokeWidth="1.9"/></svg>,
  history:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><path d="M3.5 18v-4h4"/><path d="M12 7.5V12l3 1.8"/></svg>,
  layers:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 3 21 8l-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5M3 8v0"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>,
  cubeSmall:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"/><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2"/></svg>,
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
const num = (s) => parseFloat((s||'').toString().replace(/\./g,'').replace(',','.')) || 0;
function moeda(n, dec) {
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: dec != null ? dec : (n < 0.1 ? 3 : 2), maximumFractionDigits: dec != null ? dec : 3 });
}

/* ─────────  DADOS  ───────── */
const INSUMO = { nome:'Papel couchê 180g', marca:'Suzano', un:'folha', fracao:false, saldo:24, minimo:10, custo:0.45 };

const HIST = [
  { data:'04/06/2026', tipo:'saida', titulo:'Saída — Produção', delta:-6, custo:0.45, ref:'Produção #18' },
  { data:'01/06/2026', tipo:'entrada', titulo:'Entrada — Compra', delta:100, custo:0.45, ref:'Compra: R$ 45,00 / 100 un' },
  { data:'15/05/2026', tipo:'saida', titulo:'Saída — Orçamento', delta:-9, custo:0.48, ref:'Orçamento #0038' },
  { data:'10/05/2026', tipo:'saida', titulo:'Saída — Baixa manual', delta:-3, custo:0.48, ref:'folhas danificadas' },
];

const FICHAS = [
  { nome:'Kit Convite Casamento', tipo:'Produto', icon:I.cubeSmall, consumo:'4 folhas / un', preco:45.00, novo:43.80 },
  { nome:'Etiqueta personalizada', tipo:'Produto', icon:I.cubeSmall, consumo:'1 folha / un', preco:4.50, novo:4.38 },
  { nome:'Laminação fosca', tipo:'Customização', icon:I.tag, consumo:'0,5 folha / un', preco:null, novo:null },
];

/* ─────────  MODAL SHELL  ───────── */
function ModalShell({ onClose, width=500, children }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(20,18,16,0.4)', backdropFilter:'blur(1.5px)', animation:'fadeUp .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{ position:'relative', zIndex:110, width:`min(${width}px, 100%)`, maxHeight:'92vh', display:'flex', flexDirection:'column', background:'#fff', borderRadius:20, boxShadow:'0 30px 70px -20px rgba(0,0,0,0.4)', overflow:'hidden', animation:'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>
        {children}
      </div>
    </div>);
}
function ModalHead({ icon, tint, title, sub, onClose }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:13, minWidth:0 }}>
        <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:42, height:42, borderRadius:12, background:hexA(tint,0.12), color:tint }}>{icon}</span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.01em' }}>{title}</div>
          {sub && <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>{sub}</div>}
        </div>
      </div>
      <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}
        onMouseEnter={(e)=>e.currentTarget.style.background='#E9E7E2'} onMouseLeave={(e)=>e.currentTarget.style.background='#F1F0EC'}><I.x /></button>
    </div>);
}
const fieldLabel = { display:'block', fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:7 };
const optTag = { fontSize:12, fontWeight:500, color:'#B0ACA4', marginLeft:6 };

/* ─────────  MODAL · REGISTRAR COMPRA  ───────── */
function CompraModal({ teal, orange, onClose, onConfirm }) {
  const [qtd, setQtd] = useState('200');
  const [preco, setPreco] = useState('85,00');
  const [focus, setFocus] = useState(null);
  const q = num(qtd), p = num(preco);
  const novoCusto = q > 0 ? p / q : null;
  const inp = (k) => ({ onFocus:()=>setFocus(k), onBlur:()=>setFocus(null), style:{ width:'100%', height:48, padding:'0 14px', border:`1.5px solid ${focus===k?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus===k?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' } });
  return (
    <ModalShell onClose={onClose} width={520}>
      <ModalHead icon={<I.cart />} tint={orange} title="Registrar compra" sub="Atualiza saldo e recalcula o custo médio." onClose={onClose} />
      <div style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <label>
            <span style={fieldLabel}>Quantidade comprada *</span>
            <div style={{ position:'relative' }}>
              <input value={qtd} onChange={(e)=>setQtd(e.target.value.replace(/[^\d.,]/g,''))} inputMode="decimal" {...inp('qtd')} style={{ ...inp('qtd').style, paddingRight:62 }} />
              <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>folhas</span>
            </div>
          </label>
          <label>
            <span style={fieldLabel}>Preço total pago *</span>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:0, top:0, bottom:0, width:44, display:'grid', placeItems:'center', fontSize:14, fontWeight:600, color:'#6B6860', background:'#FAF8F5', borderRadius:'var(--r-input) 0 0 var(--r-input)', borderRight:'1px solid var(--line)', pointerEvents:'none' }}>R$</span>
              <input value={preco} onChange={(e)=>setPreco(e.target.value.replace(/[^\d.,]/g,''))} inputMode="decimal" {...inp('preco')} style={{ ...inp('preco').style, paddingLeft:56 }} />
            </div>
          </label>
        </div>

        {/* preview custo */}
        <div key={novoCusto} style={{ marginTop:18, display:'flex', alignItems:'center', gap:15, padding:'16px 18px', borderRadius:14, background:`linear-gradient(135deg, ${hexA(teal,0.12)}, ${hexA(teal,0.05)})`, border:`1.5px solid ${hexA(teal,0.25)}`, animation:'flash .6s ease' }}>
          <span style={{ flexShrink:0, display:'grid', placeItems:'center', width:46, height:46, borderRadius:13, background:'#fff', color:teal, boxShadow:'0 4px 12px -4px rgba(31,122,111,0.3)' }}><I.calc /></span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--teal-deep)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Novo custo unitário</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:3, flexWrap:'wrap' }}>
              <span style={{ fontSize:25, fontWeight:700, color:teal, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums' }}>{novoCusto!=null ? moeda(novoCusto)+' / folha' : '—'}</span>
              <span style={{ fontSize:13, color:'var(--muted)', textDecoration:'line-through', fontVariantNumeric:'tabular-nums' }}>antes {moeda(INSUMO.custo)}</span>
            </div>
          </div>
        </div>

        {/* aviso */}
        <div style={{ display:'flex', gap:10, marginTop:14, padding:'12px 14px', borderRadius:12, background:hexA(teal,0.06), border:`1px solid ${hexA(teal,0.18)}` }}>
          <span style={{ flexShrink:0, color:teal, marginTop:1 }}><I.info /></span>
          <p style={{ margin:0, fontSize:12.8, color:'#456', lineHeight:1.5 }}>Esta compra afeta <strong style={{ color:teal, fontWeight:700 }}>2 produtos</strong>. Você verá o impacto no próximo passo.</p>
        </div>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:11, justifyContent:'flex-end', flexWrap:'wrap' }}>
        <button onClick={onClose} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
        <button onClick={onConfirm} style={{ height:46, padding:'0 22px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>
          Confirmar e ver impacto <I.arrowRight />
        </button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL · IMPACTO NOS PRODUTOS  ───────── */
function ImpactoModal({ teal, orange, onClose }) {
  const linhas = FICHAS.filter((f)=>f.preco != null);
  return (
    <ModalShell onClose={onClose} width={540}>
      <ModalHead icon={<I.layers />} tint={teal} title="Impacto nos produtos" sub="O custo caiu — veja onde isso reflete." onClose={onClose} />
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        <div style={{ border:'1px solid var(--line)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, padding:'11px 16px', background:'#FBFAF8', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>
            <span>Produto</span><span style={{ textAlign:'right' }}>Custo do insumo</span>
          </div>
          {linhas.map((f,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center', padding:'14px 16px', borderTop:'1px solid var(--line)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
                <span style={{ flexShrink:0, width:34, height:34, borderRadius:9, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><f.icon /></span>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{f.nome}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:9, justifyContent:'flex-end', flexWrap:'wrap', fontVariantNumeric:'tabular-nums' }}>
                <span style={{ fontSize:13.5, color:'var(--muted)', textDecoration:'line-through' }}>{moeda(f.preco,2)}</span>
                <span style={{ display:'flex', color:'#A8A49C' }}><I.arrowRight /></span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:14.5, fontWeight:700, color:'#1F8A5B' }}><I.arrowDown />{moeda(f.novo,2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:16, padding:'13px 15px', borderRadius:12, background:'#FFF8F0', border:'1px solid #F6E4CE' }}>
          <span style={{ flexShrink:0, color:'#C8721F', marginTop:1 }}><I.info /></span>
          <p style={{ margin:0, fontSize:12.8, color:'#7A5A33', lineHeight:1.55 }}>Os <strong style={{ fontWeight:700 }}>preços de venda</strong> não foram alterados. Acesse cada ficha para atualizar manualmente.</p>
        </div>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ height:46, padding:'0 26px', borderRadius:'var(--r-btn)', border:'none', background:teal, color:'#fff', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 8px 18px -8px ${hexA(teal,0.6)}` }}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Fechar</button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL · BAIXA MANUAL  ───────── */
const MOTIVOS = ['Perda','Avaria','Uso extra','Correção de estoque','Outro'];
function BaixaModal({ teal, orange, onClose }) {
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('Perda');
  const [obs, setObs] = useState('');
  const [focus, setFocus] = useState(null);
  const [selOpen, setSelOpen] = useState(false);
  const selRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (selRef.current && !selRef.current.contains(e.target)) setSelOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const base = (k) => ({ width:'100%', minHeight:48, padding:'0 14px', border:`1.5px solid ${focus===k?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus===k?`0 0 0 4px ${hexA(teal,0.12)}`:'none', transition:'border-color .15s, box-shadow .15s' });
  return (
    <ModalShell onClose={onClose} width={500}>
      <ModalHead icon={<I.minus />} tint="#C8721F" title="Baixa manual" sub="Registra uma saída fora de produção." onClose={onClose} />
      <div style={{ flex:1, overflowY:'auto', padding:'22px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <label>
            <span style={fieldLabel}>Quantidade *</span>
            <div style={{ position:'relative' }}>
              <input value={qtd} onChange={(e)=>setQtd(e.target.value.replace(/[^\d.,]/g,''))} inputMode="decimal" placeholder="3" onFocus={()=>setFocus('qtd')} onBlur={()=>setFocus(null)} style={{ ...base('qtd'), height:48, paddingRight:62 }} />
              <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:600, color:'#A8A49C', pointerEvents:'none' }}>folhas</span>
            </div>
          </label>
          <label>
            <span style={fieldLabel}>Motivo *</span>
            <div ref={selRef} style={{ position:'relative' }}>
              <button type="button" onClick={()=>setSelOpen((o)=>!o)} style={{ ...base('sel'), height:48, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', textAlign:'left', borderColor: selOpen?teal:'var(--line)', boxShadow: selOpen?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }}>
                {motivo}<span style={{ color:'var(--muted)', display:'flex' }}><I.caret /></span>
              </button>
              {selOpen && (
                <div style={{ position:'absolute', top:52, left:0, right:0, zIndex:30, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
                  {MOTIVOS.map((m)=>(
                    <button key={m} type="button" onClick={()=>{ setMotivo(m); setSelOpen(false); }} style={{ width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:8, border:'none', background: m===motivo?hexA(teal,0.08):'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight: m===motivo?600:500, color: m===motivo?teal:'var(--ink)' }}
                      onMouseEnter={(e)=>{ if(m!==motivo) e.currentTarget.style.background='#F7F5F1'; }} onMouseLeave={(e)=>{ if(m!==motivo) e.currentTarget.style.background='transparent'; }}>{m}</button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>
        <label>
          <span style={fieldLabel}>Observação <span style={optTag}>(opcional)</span></span>
          <textarea value={obs} onChange={(e)=>setObs(e.target.value)} placeholder="Ex: folhas danificadas no manuseio" onFocus={()=>setFocus('obs')} onBlur={()=>setFocus(null)} rows={3} style={{ ...base('obs'), height:'auto', padding:'12px 14px', resize:'vertical', lineHeight:1.5 }} />
        </label>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:11, justifyContent:'flex-end', flexWrap:'wrap' }}>
        <button onClick={onClose} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
        <button onClick={onClose} style={{ height:46, padding:'0 22px', borderRadius:'var(--r-btn)', border:'none', background:'#C8721F', color:'#fff', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap', boxShadow:'0 8px 18px -8px rgba(200,114,31,0.6)' }}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}><I.minus /> Registrar baixa</button>
      </div>
    </ModalShell>);
}

/* ─────────  HISTÓRICO  ───────── */
function HistTipo({ tipo, titulo, teal }) {
  const entrada = tipo === 'entrada';
  const c = entrada ? '#1F8A5B' : '#C0492B';
  const bg = entrada ? '#E8F5EE' : '#FBEDE9';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
      <span style={{ flexShrink:0, width:30, height:30, borderRadius:9, display:'grid', placeItems:'center', background:bg, color:c }}>
        {entrada ? <I.arrowDown style={{ transform:'rotate(180deg)' }} /> : <I.arrowDown />}
      </span>
      <span style={{ fontSize:13.8, fontWeight:600, color:'var(--ink)' }}>{titulo}</span>
    </div>);
}
function HistRows({ teal }) {
  return HIST.map((h,i)=>{
    const entrada = h.tipo === 'entrada';
    const deltaC = entrada ? '#1F8A5B' : '#C0492B';
    const deltaT = (entrada ? '+ ' : '− ') + Math.abs(h.delta) + ' folhas';
    return (
      <React.Fragment key={i}>
        {/* desktop row */}
        <div className="hist-row" style={{ animation:'fadeUp .35s ease both' }}>
          <div style={{ fontSize:13, color:'#5C594F', fontVariantNumeric:'tabular-nums' }}>{h.data}</div>
          <HistTipo tipo={h.tipo} titulo={h.titulo} teal={teal} />
          <div style={{ fontSize:14, fontWeight:700, color:deltaC, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{deltaT}</div>
          <div style={{ fontSize:13.5, color:'#3A372F', fontVariantNumeric:'tabular-nums' }}>{moeda(h.custo,2)}</div>
          <div style={{ fontSize:13, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.ref}</div>
        </div>
        {/* mobile card */}
        <div className="hist-card" style={{ padding:'15px 18px', borderTop:'1px solid var(--line)', animation:'fadeUp .35s ease both' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <HistTipo tipo={h.tipo} titulo={h.titulo} teal={teal} />
            <span style={{ fontSize:14, fontWeight:700, color:deltaC, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{deltaT}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:9, flexWrap:'wrap', fontSize:12.5, color:'var(--muted)' }}>
            <span style={{ fontVariantNumeric:'tabular-nums' }}>{h.data}</span>
            <span style={{ color:'#D8D4CC' }}>·</span>
            <span style={{ fontVariantNumeric:'tabular-nums' }}>{moeda(h.custo,2)} / folha</span>
            <span style={{ color:'#D8D4CC' }}>·</span>
            <span>{h.ref}</span>
          </div>
        </div>
      </React.Fragment>);
  });
}

function FichasList({ teal, orange }) {
  return (
    <div>
      {FICHAS.map((f,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderTop:'1px solid var(--line)', animation:'fadeUp .35s ease both' }}>
          <span style={{ flexShrink:0, width:40, height:40, borderRadius:11, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><f.icon /></span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14.5, fontWeight:600, color:'var(--ink)' }}>{f.nome}</div>
            <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>Consome {f.consumo}</div>
          </div>
          <span style={{ fontSize:11.5, fontWeight:600, color:'#7C786F', background:'#F1F0EC', padding:'4px 10px', borderRadius:999, whiteSpace:'nowrap' }}>{f.tipo}</span>
          <a href="#" onClick={(e)=>e.preventDefault()} style={{ flexShrink:0, fontSize:13, fontWeight:600, color:teal, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>Ver ficha <I.chevron /></a>
        </div>
      ))}
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "modal": "fechado",
  "aba": "historico",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(t.modal === 'fechado' ? null : t.modal);
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
    r.setProperty('--font', `'${t.font}'`); r.setProperty('--orange', orange); r.setProperty('--teal', teal); r.setProperty('--teal-deep', '#1F7A6F');
    r.setProperty('--r-card', radii.card+'px'); r.setProperty('--r-btn', radii.btn+'px'); r.setProperty('--r-input', radii.input+'px');
  }, [t.font, t.balance, t.roundness]);
  useEffect(() => { setModal(t.modal === 'fechado' ? null : t.modal); }, [t.modal]);
  useEffect(() => { setAba(t.aba); }, [t.aba]);

  const o = INSUMO;
  const ABAS = [
    { id:'historico', label:'Histórico de movimentações', icon:I.history },
    { id:'fichas', label:'Fichas técnicas que usam este insumo', icon:I.layers },
  ];

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
          {/* BREADCRUMB */}
          <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--muted)', marginBottom:12 }}>
            <a href="Insumos.html" style={{ color:'var(--muted)', textDecoration:'none', fontWeight:500 }}
              onMouseEnter={(e)=>e.currentTarget.style.color=teal} onMouseLeave={(e)=>e.currentTarget.style.color='var(--muted)'}>Insumos</a>
            <span style={{ display:'flex', color:'#CFCBC3' }}><I.chevron /></span>
            <span style={{ color:'#5C594F', fontWeight:600, whiteSpace:'nowrap' }}>{o.nome}</span>
          </div>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:15, minWidth:0 }}>
              <span style={{ flexShrink:0, width:54, height:54, borderRadius:15, display:'grid', placeItems:'center', background:hexA(teal,0.1), color:teal }}><I.box /></span>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <h1 style={{ margin:0, fontSize:25, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>{o.nome}</h1>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, height:27, padding:'0 11px', borderRadius:999, background:'#E8F5EE', color:'#1F8A5B', fontSize:12.5, fontWeight:600 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#34A56F' }} />Ativo</span>
                </div>
                <div style={{ fontSize:14, color:'var(--muted)', marginTop:4 }}>Marca: <strong style={{ color:'#5C594F', fontWeight:600 }}>{o.marca}</strong></div>
              </div>
            </div>
            <a href="Cadastrar-Insumo.html" style={{ textDecoration:'none', flexShrink:0 }}>
              <button style={{ height:44, padding:'0 18px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}
                onMouseEnter={(e)=>{ e.currentTarget.style.background='#FAF8F5'; e.currentTarget.style.borderColor='#DEDBD4'; }} onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='var(--line)'; }}>
                <I.edit /> Editar
              </button>
            </a>
          </div>

          {/* CARD RESUMO */}
          <div style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden', animation:'fadeUp .4s ease both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:1, background:'var(--line)' }}>
              {[
                { k:'Unidade de medida', v:'Folha' },
                { k:'Fracionável', v: o.fracao ? 'Sim' : 'Não' },
                { k:'Saldo atual', v:`${o.saldo} folhas`, big:true },
                { k:'Estoque mínimo', v:`${o.minimo} folhas` },
                { k:'Custo unitário atual', v:`${moeda(o.custo,2)} / folha`, accent:true },
              ].map((c,i)=>(
                <div key={i} style={{ background:'#fff', padding:'18px 20px' }}>
                  <div style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>{c.k}</div>
                  <div style={{ marginTop:7, fontVariantNumeric:'tabular-nums', fontSize: c.big?28:c.accent?18:16, fontWeight: c.big||c.accent?700:600, letterSpacing: c.big?'-0.02em':'0', color: c.big||c.accent?teal:'var(--ink)' }}>{c.v}</div>
                </div>
              ))}
            </div>
            {/* ações */}
            <div style={{ display:'flex', gap:11, padding:'16px 20px', borderTop:'1px solid var(--line)', flexWrap:'wrap' }}>
              <button onClick={()=>setModal('compra')} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}` }}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}><I.cart /> Registrar compra</button>
              <button onClick={()=>setModal('baixa')} style={{ height:46, padding:'0 20px', borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap' }}
                onMouseEnter={(e)=>{ e.currentTarget.style.background='#FAF8F5'; e.currentTarget.style.borderColor='#DEDBD4'; }} onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='var(--line)'; }}><I.minus /> Baixa manual</button>
            </div>
          </div>

          {/* ABAS */}
          <div style={{ display:'flex', gap:4, marginTop:26, borderBottom:'1.5px solid var(--line)', overflowX:'auto' }}>
            {ABAS.map((a)=>{ const on=aba===a.id; return (
              <button key={a.id} onClick={()=>setAba(a.id)} style={{ position:'relative', display:'flex', alignItems:'center', gap:8, padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight: on?600:500, color: on?teal:'#8A8780', whiteSpace:'nowrap', transition:'color .14s' }}
                onMouseEnter={(e)=>{ if(!on) e.currentTarget.style.color='#5C594F'; }} onMouseLeave={(e)=>{ if(!on) e.currentTarget.style.color='#8A8780'; }}>
                <span style={{ display:'flex', color: on?teal:'#B0ACA4' }}><a.icon /></span>{a.label}
                {on && <span style={{ position:'absolute', left:8, right:8, bottom:-1.5, height:2.5, borderRadius:3, background:teal }} />}
              </button>); })}
          </div>

          {/* CONTEÚDO DA ABA */}
          <div style={{ marginTop:16, background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', overflow:'hidden' }}>
            {aba === 'historico' ? (
              <>
                <div className="hist-head">
                  {['Data','Movimentação','Quantidade','Custo unit.','Referência'].map((h,k)=>(
                    <div key={k} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#A8A49C' }}>{h}</div>
                  ))}
                </div>
                <HistRows teal={teal} />
              </>
            ) : (
              <FichasList teal={teal} orange={orange} />
            )}
          </div>
          {aba === 'historico' && <div style={{ marginTop:13, fontSize:12.5, color:'var(--muted)', textAlign:'right' }}>{HIST.length} movimentações</div>}
        </div>
      </div>

      {modal === 'compra' && <CompraModal teal={teal} orange={orange} onClose={()=>setModal(null)} onConfirm={()=>setModal('impacto')} />}
      {modal === 'impacto' && <ImpactoModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}
      {modal === 'baixa' && <BaixaModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakSelect label="Modal" value={t.modal} options={[
          {value:'fechado',label:'Fechado'},
          {value:'compra',label:'Registrar compra'},
          {value:'impacto',label:'Impacto nos produtos'},
          {value:'baixa',label:'Baixa manual'},
        ]} onChange={(v)=>setTweak('modal',v)} />
        <TweakRadio label="Aba ativa" value={t.aba} options={[{value:'historico',label:'Histórico'},{value:'fichas',label:'Fichas'}]} onChange={(v)=>setTweak('aba',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
