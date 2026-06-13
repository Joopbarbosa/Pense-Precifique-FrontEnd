/* detalhe-app.jsx — Tela 8 · Detalhe do Orçamento — Gestão de Status · Pense & Precifique */
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
  check:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="m5 12.5 4.2 4.2L19 7" strokeWidth="2.6"/></svg>,
  copy:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>,
  arrow:(p)=><svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 12h13M13 6.5 18.5 12 13 17.5"/></svg>,
  phone:(p)=><svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M6.5 4.5h3l1.2 3.2-1.7 1.3a11 11 0 0 0 4.7 4.7l1.3-1.7 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z"/></svg>,
  alert:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4.2" strokeWidth="1.9"/><circle cx="12" cy="17.4" r=".4" fill="currentColor" stroke="none"/></svg>,
  ban:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><circle cx="12" cy="12" r="8.2"/><path d="m6.5 6.5 11 11"/></svg>,
  broken:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="M13 3 7 11h4l-2 10 8-12h-5l1-6Z"/></svg>,
  cal:(p)=><svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>,
  tag:(p)=><svg viewBox="0 0 24 24" width="12" height="12" {...sw} {...p}><path d="M3.5 11.5 11 4h7.5v7.5L11 19a1.4 1.4 0 0 1-2 0l-5.5-5.5a1.4 1.4 0 0 1 0-2Z"/><circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>,
  menu:(p)=><svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x:(p)=><svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  bell:(p)=><svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>,
  layers:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5ZM3 12l9 4.5L21 12M3 16l9 4.5L21 16"/></svg>,
  search:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></svg>,
  plus:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M12 5v14M5 12h14" strokeWidth="2"/></svg>,
  trash:(p)=><svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="M4.5 6.5h15M9 6.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M6 6.5 6.7 19a1 1 0 0 0 1 .9h8.6a1 1 0 0 0 1-.9L18 6.5"/></svg>,
  wallet:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1.5 1.5 0 0 1 1.5 1.5V9M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-2.5M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5V12"/><path d="M20 12h-3.2a1.8 1.8 0 0 0 0 3.6H20V12Z"/></svg>,
  receipt:(p)=><svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M6 3.5h12v17l-2.5-1.5L13 20l-2.5-1L8 20l-2-1.5V3.5Z"/><path d="M9 8h6M9 11.5h6M9 15h3"/></svg>,
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

/* ─────────  TIMELINE  ───────── */
const STEPS = ['Rascunho','Enviado','Aprovado','Aguardando Sinal','Sinal Pago','Em Produção','Finalizado','Entregue','Pago'];
const STATUS_META = {
  'Rascunho': { bg:'#F1F0EC', fg:'#7C786F', dot:'#A8A49C' },
  'Enviado': { bg:'#EAF1FB', fg:'#2A6FB0', dot:'#3A86CE' },
  'Aprovado': { bg:'#E8F5EE', fg:'#1F8A5B', dot:'#34A56F' },
  'Aguardando Sinal': { bg:'#FFF4E8', fg:'#B5701F', dot:'#E8973A' },
  'Sinal Pago': { bg:'#E8F5EE', fg:'#1F8A5B', dot:'#34A56F' },
  'Em Produção': { bg:'#E7F4F1', fg:'#1F7A6F', dot:'#2A9D8F' },
  'Finalizado': { bg:'#E7F4F1', fg:'#1F7A6F', dot:'#2A9D8F' },
  'Entregue': { bg:'#EAF1FB', fg:'#2A6FB0', dot:'#3A86CE' },
  'Pago': { bg:'#E8F5EE', fg:'#1F8A5B', dot:'#34A56F' },
};
function Timeline({ current, teal }) {
  const ci = STEPS.indexOf(current);
  return (
    <div className="timeline">
      {STEPS.map((s,i)=>{
        const done = i < ci, active = i === ci;
        const circleBg = active ? teal : done ? hexA(teal,0.16) : '#F1F0EC';
        const circleColor = active ? '#fff' : done ? teal : '#B7B4AD';
        const connColor = i <= ci ? hexA(teal,0.5) : 'var(--line)';
        return (
          <div className="tl-step" key={s}>
            {i>0 && <span className="tl-connector" style={{ background:connColor }} />}
            <span style={{ position:'relative', zIndex:1, width:36, height:36, borderRadius:'50%', display:'grid', placeItems:'center',
              background:circleBg, color:circleColor, border: active?`2px solid ${teal}`:'2px solid transparent',
              boxShadow: active?`0 0 0 5px ${hexA(teal,0.14)}`:'none', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {done ? <I.check /> : (active ? <span style={{ width:9, height:9, borderRadius:'50%', background:'#fff' }} /> : i+1)}
            </span>
            <span className="tl-label-wrap" style={{ marginTop:10 }}>
              <span style={{ display:'block', fontSize:12.5, fontWeight: active?700:500, color: active?'var(--ink)':done?'#6B6860':'#B7B4AD', whiteSpace:'nowrap' }}>{s}</span>
              {active && <span style={{ display:'inline-block', marginTop:5, fontSize:10.5, fontWeight:600, color:teal, background:hexA(teal,0.12), padding:'2px 8px', borderRadius:999 }}>Atual</span>}
            </span>
          </div>);
      })}
    </div>);
}

/* ─────────  MODAL BASE (centralizado por flex)  ───────── */
function ModalShell({ onClose, width=520, children }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
      padding:16, background:'rgba(20,18,16,0.4)', backdropFilter:'blur(1.5px)', animation:'fadeUp .2s ease both' }}>
      <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={{ position:'relative', zIndex:110,
        width:`min(${width}px, 100%)`, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'#fff',
        borderRadius:20, boxShadow:'0 30px 70px -20px rgba(0,0,0,0.4)', overflow:'hidden', animation:'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both' }}>
        {children}
      </div>
    </div>);
}

/* ─────────  MODAL FINALIZAÇÃO  ───────── */
const INSUMOS_BAIXA = [
  { nome:'Papel couchê 180g (A4)', un:'folhas', qtd:'6', saldo:null },
  { nome:'Fita dupla face 12mm', un:'cm', qtd:'45', saldo:null },
  { nome:'Envelope kraft C6', un:'unidades', qtd:'3', saldo:null },
  { nome:'Linha de crochê 100g teal', un:'g', qtd:'1,2', saldo:'Saldo insuficiente (0,5g disponível)' },
];
function FinalizacaoModal({ teal, orange, onClose }) {
  const [qts, setQts] = useState(INSUMOS_BAIXA.map((x)=>x.qtd));
  const [confirmInsuf, setConfirmInsuf] = useState(false);
  const hasInsuf = INSUMOS_BAIXA.some((x)=>x.saldo);
  const blocked = hasInsuf && !confirmInsuf;
  return (
    <ModalShell onClose={onClose} width={560}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'grid', placeItems:'center', width:40, height:40, borderRadius:11, background:hexA(teal,0.12), color:teal }}><I.layers /></span>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Confirmar finalização</div>
            <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)' }}>Confirmar baixa no estoque</div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}><I.x /></button>
      </div>
      {/* body */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        <p style={{ margin:'0 0 16px', fontSize:14, color:'#5C594F', lineHeight:1.55 }}>Os itens abaixo serão descontados do seu estoque:</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {INSUMOS_BAIXA.map((it,i)=>{
            const insuf = !!it.saldo;
            return (
              <div key={i} style={{ padding:'12px 14px', borderRadius:12, border:`1.5px solid ${insuf?hexA('#C0492B',0.4):'var(--line)'}`, background: insuf?'#FCF3F0':'#FCFBF9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:150 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{it.nome}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input value={qts[i]} onChange={(e)=>setQts((a)=>a.map((v,j)=>j===i?e.target.value.replace(/[^\d.,]/g,''):v))}
                      inputMode="decimal" style={{ width:72, height:40, padding:'0 12px', textAlign:'right', border:`1.5px solid ${insuf?hexA('#C0492B',0.5):'var(--line)'}`,
                        borderRadius:'var(--r-input)', fontSize:14.5, fontWeight:600, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', fontVariantNumeric:'tabular-nums' }} />
                    <span style={{ fontSize:13, color:'var(--muted)', minWidth:54 }}>{it.un}</span>
                  </div>
                </div>
                {insuf && (
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:9, fontSize:12.5, fontWeight:600, color:'#C0492B' }}>
                    <span style={{ display:'flex' }}><I.alert /></span>{it.saldo}
                  </div>
                )}
              </div>);
          })}
        </div>
        {hasInsuf && (
          <button onClick={()=>setConfirmInsuf((c)=>!c)} style={{ display:'flex', alignItems:'flex-start', gap:11, marginTop:16, width:'100%', textAlign:'left',
            padding:'12px 14px', borderRadius:12, border:`1.5px solid ${confirmInsuf?hexA('#C0492B',0.5):'var(--line)'}`, background: confirmInsuf?'#FCF3F0':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
            <span style={{ flexShrink:0, width:22, height:22, borderRadius:6, display:'grid', placeItems:'center', marginTop:1,
              border:`1.5px solid ${confirmInsuf?'#C0492B':'#D6D3CC'}`, background: confirmInsuf?'#C0492B':'#fff', color:'#fff' }}>{confirmInsuf && <I.check />}</span>
            <span style={{ fontSize:13.5, color:'#5C594F', lineHeight:1.5 }}>Confirmar mesmo com saldo insuficiente<br/><span style={{ fontSize:12, color:'var(--muted)' }}>O estoque ficará negativo até você repor o insumo.</span></span>
          </button>
        )}
      </div>
      {/* footer */}
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:12 }}>
        <button onClick={onClose} style={{ flex:1, height:48, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
          onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>Cancelar</button>
        <button onClick={onClose} disabled={blocked} style={{ flex:1.4, height:48, borderRadius:'var(--r-btn)', border:'none',
          background: blocked ? '#F0C9B3' : orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor: blocked?'not-allowed':'pointer',
          boxShadow: blocked?'none':`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'filter .15s' }}
          onMouseEnter={(e)=>{ if(!blocked) e.currentTarget.style.filter='brightness(1.05)'; }} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Confirmar baixa</button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL CONFIRMAR SINAL  ───────── */
function SinalModal({ teal, orange, onClose }) {
  const [forma, setForma] = useState('PIX');
  const [data, setData] = useState('2026-06-05');
  const [focus, setFocus] = useState(null);
  const formas = ['PIX','Dinheiro','Cartão','Outro'];
  return (
    <ModalShell onClose={onClose} width={500}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'grid', placeItems:'center', width:40, height:40, borderRadius:11, background:'#FFF4E8', color:'#B5701F' }}><I.wallet /></span>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Aguardando Sinal</div>
            <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)' }}>Confirmar recebimento do sinal</div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}><I.x /></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:18 }}>
        {/* valor esperado */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderRadius:12, background:hexA(teal,0.07), border:`1px solid ${hexA(teal,0.2)}` }}>
          <span style={{ fontSize:13.5, fontWeight:600, color:'#5C594F' }}>Valor esperado</span>
          <span style={{ fontSize:20, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums' }}>{BRL(91.8)} <span style={{ fontSize:13, fontWeight:600, color:'var(--muted)' }}>(50%)</span></span>
        </div>
        {/* forma de pagamento */}
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:9 }}>Forma de pagamento</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {formas.map((fp)=>{ const on=forma===fp; return (
              <button key={fp} onClick={()=>setForma(fp)} style={{ flex:'1 1 100px', height:44, borderRadius:'var(--r-btn)', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit',
                border:`1.5px solid ${on?teal:'var(--line)'}`, background: on?hexA(teal,0.08):'#fff', color: on?teal:'#5C594F', transition:'all .14s' }}>{fp}</button>); })}
          </div>
        </div>
        {/* data */}
        <label style={{ display:'block' }}>
          <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:7 }}><span style={{ color:teal, display:'flex' }}><I.cal /></span>Data do recebimento</span>
          <input type="date" value={data} onChange={(e)=>setData(e.target.value)} onFocus={()=>setFocus('d')} onBlur={()=>setFocus(null)}
            style={{ width:'100%', height:46, padding:'0 14px', border:`1.5px solid ${focus==='d'?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14.5, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus==='d'?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }} />
        </label>
        {/* aviso */}
        <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:hexA(teal,0.06), border:`1px solid ${hexA(teal,0.18)}` }}>
          <span style={{ flexShrink:0, color:teal, marginTop:1 }}><I.receipt /></span>
          <p style={{ margin:0, fontSize:12.5, color:'#5C594F', lineHeight:1.55 }}>Após confirmar, o sistema avançará para <strong style={{ fontWeight:600, color:'var(--ink)' }}>Em Produção</strong> e gerará o recibo do sinal.</p>
        </div>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:12 }}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={onClose} style={btnPrimary(orange, 1.5)}
          onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Confirmar e gerar recibo <I.arrow /></button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL CANCELAR — SIMPLES (Rascunho/Enviado/Aprovado)  ───────── */
function CancelSimpleModal({ teal, orange, onClose }) {
  return (
    <ModalShell onClose={onClose} width={440}>
      <div style={{ padding:'26px 26px 0', textAlign:'center' }}>
        <span style={{ display:'inline-grid', placeItems:'center', width:54, height:54, borderRadius:15, background:'#FCF3F0', color:'#C0492B', marginBottom:16 }}><I.ban width="24" height="24" /></span>
        <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:'var(--ink)' }}>Cancelar orçamento?</h2>
        <p style={{ margin:'10px 0 0', fontSize:14, color:'#5C594F', lineHeight:1.6 }}>Esta ação não pode ser desfeita.</p>
      </div>
      <div style={{ padding:'22px 26px 24px', display:'flex', gap:12 }}>
        <button onClick={onClose} style={btnGhost}>Voltar</button>
        <button onClick={onClose} style={btnDanger(1.3)}
          onMouseEnter={(e)=>e.currentTarget.style.background='#F7E0DA'} onMouseLeave={(e)=>e.currentTarget.style.background='#FBEDE9'}>Confirmar cancelamento</button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL CANCELAR — JUSTIFICATIVA (Entregue/Pago)  ───────── */
function CancelJustModal({ teal, orange, onClose }) {
  const [txt, setTxt] = useState('');
  const [focus, setFocus] = useState(false);
  const ok = txt.trim().length >= 50;
  return (
    <ModalShell onClose={onClose} width={500}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'20px 24px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'grid', placeItems:'center', width:40, height:40, borderRadius:11, background:'#FCF3F0', color:'#C0492B' }}><I.ban /></span>
          <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)' }}>Cancelar orçamento?</div>
        </div>
        <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}><I.x /></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:'#FCF3F0', border:`1px solid ${hexA('#C0492B',0.25)}` }}>
          <span style={{ flexShrink:0, color:'#C0492B', marginTop:1 }}><I.alert /></span>
          <p style={{ margin:0, fontSize:12.8, color:'#8A4A36', lineHeight:1.55 }}>A baixa no estoque já foi realizada e <strong style={{ fontWeight:700 }}>não será revertida</strong>.</p>
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#5C594F' }}>Justificativa <span style={{ color:'#C0492B' }}>*</span></span>
            <span style={{ fontSize:12, fontWeight:600, color: ok?teal:'#B0ACA4', fontVariantNumeric:'tabular-nums' }}>{Math.min(txt.trim().length,99)}/50</span>
          </div>
          <textarea value={txt} onChange={(e)=>setTxt(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} rows={4}
            placeholder="Explique o motivo do cancelamento (mínimo 50 caracteres)…" style={{ width:'100%', minHeight:100, padding:'12px 14px', border:`1.5px solid ${focus?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.55, boxShadow: focus?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }} />
          {!ok && txt.length>0 && <span style={{ display:'block', marginTop:6, fontSize:12, color:'#C0492B' }}>Faltam {50 - txt.trim().length} caracteres.</span>}
        </div>
      </div>
      <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:12 }}>
        <button onClick={onClose} style={btnGhost}>Voltar</button>
        <button onClick={onClose} disabled={!ok} style={{ ...btnDanger(1.3), opacity: ok?1:0.5, cursor: ok?'pointer':'not-allowed' }}
          onMouseEnter={(e)=>{ if(ok) e.currentTarget.style.background='#F7E0DA'; }} onMouseLeave={(e)=>e.currentTarget.style.background='#FBEDE9'}>Confirmar cancelamento</button>
      </div>
    </ModalShell>);
}

/* ─────────  MODAL CANCELAR — WIZARD 3 PASSOS (Em Produção/Finalizado)  ───────── */
const CATALOGO_CANCEL = ['Papel couchê 180g','Fita dupla face 12mm','Envelope kraft C6','Linha de crochê teal','Kit Convite Casamento'];
function CancelWizardModal({ teal, orange, onClose, startStep=1 }) {
  const [step, setStep] = useState(startStep);
  const [consumidos, setConsumidos] = useState([{ nome:'Papel couchê 180g', qtd:'4 folhas' }]);
  const [busca, setBusca] = useState('');
  const [qtd, setQtd] = useState('');
  const [openList, setOpenList] = useState(false);
  const [multaAtiva, setMultaAtiva] = useState(true);
  const [multaTipo, setMultaTipo] = useState('%');
  const [multaValor, setMultaValor] = useState('50');
  const [focus, setFocus] = useState(null);

  const total = 183.6;
  const multaNum = parseFloat((multaValor||'0').replace(',','.'))||0;
  const multaAplicada = multaAtiva ? (multaTipo==='%' ? total*multaNum/100 : Math.min(multaNum,total)) : 0;

  const addItem = () => { if(!busca.trim()) return; setConsumidos((a)=>[...a,{ nome:busca.trim(), qtd:qtd.trim()||'1' }]); setBusca(''); setQtd(''); setOpenList(false); };

  const Header = ({ title }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'18px 24px', borderBottom:'1px solid var(--line)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
        <span style={{ display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:'#FCF3F0', color:'#C0492B', flexShrink:0 }}><I.ban /></span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:11.5, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cancelar · Passo {step} de 3</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
        </div>
      </div>
      <button onClick={onClose} aria-label="Fechar" style={{ width:34, height:34, borderRadius:9, border:'none', background:'#F1F0EC', color:'#7C786F', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}><I.x /></button>
    </div>
  );
  const Dots = () => (
    <div style={{ display:'flex', gap:6, padding:'0 24px 16px' }}>
      {[1,2,3].map((n)=><span key={n} style={{ flex:1, height:4, borderRadius:2, background: n<=step ? '#C0492B' : 'var(--line)' }} />)}
    </div>
  );

  return (
    <ModalShell onClose={onClose} width={540}>
      {/* PASSO 1 — CONSUMO */}
      {step===1 && <>
        <Header title="Houve consumo de insumos ou produtos?" />
        <div style={{ flex:1, overflowY:'auto', padding:'18px 24px 8px' }}>
          <p style={{ margin:'0 0 14px', fontSize:13.5, color:'#5C594F', lineHeight:1.55 }}>Registre o que já foi usado para dar baixa no estoque mesmo com o cancelamento.</p>
          <div style={{ position:'relative', display:'flex', gap:10, alignItems:'stretch', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:2, minWidth:160 }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', display:'flex' }}><I.search /></span>
              <input value={busca} onChange={(e)=>{ setBusca(e.target.value); setOpenList(true); }} onFocus={()=>{ setFocus('b'); setOpenList(true); }} onBlur={()=>setFocus(null)}
                placeholder="Buscar insumo ou produto…" style={{ width:'100%', height:46, padding:'0 14px 0 40px', border:`1.5px solid ${focus==='b'?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus==='b'?`0 0 0 4px ${hexA(teal,0.12)}`:'none' }} />
              {openList && busca && (
                <div style={{ position:'absolute', top:50, left:0, right:0, zIndex:20, background:'#fff', border:'1px solid var(--line)', borderRadius:12, boxShadow:'0 12px 30px -8px rgba(0,0,0,0.18)', padding:6, animation:'pop .14s ease both' }}>
                  {CATALOGO_CANCEL.filter((c)=>c.toLowerCase().includes(busca.toLowerCase())).slice(0,4).map((c)=>(
                    <button key={c} onMouseDown={()=>{ setBusca(c); setOpenList(false); }} style={{ width:'100%', textAlign:'left', padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', fontSize:13.5, color:'var(--ink)' }}
                      onMouseEnter={(e)=>e.currentTarget.style.background='#F7F5F1'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>{c}</button>
                  ))}
                </div>
              )}
            </div>
            <input value={qtd} onChange={(e)=>setQtd(e.target.value)} onFocus={()=>setFocus('q')} onBlur={()=>setFocus(null)}
              placeholder="Qtd" style={{ width:90, height:46, padding:'0 12px', border:`1.5px solid ${focus==='q'?teal:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:14, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit' }} />
            <button onClick={addItem} style={{ height:46, padding:'0 16px', borderRadius:'var(--r-btn)', border:`1.5px solid ${hexA(teal,0.4)}`, background:hexA(teal,0.06), color:teal, fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}><I.plus /> Adicionar</button>
          </div>
          {/* lista */}
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
            {consumidos.length===0 ? (
              <div style={{ padding:'20px', textAlign:'center', fontSize:13, color:'var(--muted)', border:'1.5px dashed var(--line)', borderRadius:12 }}>Nenhum item adicionado ainda.</div>
            ) : consumidos.map((it,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#FCFBF9', border:'1px solid var(--line)' }}>
                <span style={{ flex:1, fontSize:14, fontWeight:500, color:'var(--ink)' }}>{it.nome}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#6B6860' }}>{it.qtd}</span>
                <button onClick={()=>setConsumidos((a)=>a.filter((_,j)=>j!==i))} aria-label="Remover" style={{ border:'none', background:'transparent', color:'#B7B4AD', cursor:'pointer', display:'flex' }} onMouseEnter={(e)=>e.currentTarget.style.color='#C0492B'} onMouseLeave={(e)=>e.currentTarget.style.color='#B7B4AD'}><I.trash /></button>
              </div>
            ))}
          </div>
        </div>
        <Dots />
        <div style={{ padding:'0 24px 22px', display:'flex', gap:12 }}>
          <button onClick={()=>setStep(2)} style={btnGhost}>Pular</button>
          <button onClick={()=>setStep(2)} style={btnPrimary(orange, 1.3)}
            onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Próximo <I.arrow /></button>
        </div>
      </>}

      {/* PASSO 2 — MULTA */}
      {step===2 && <>
        <Header title="Deseja cobrar multa pelo cancelamento?" />
        <div style={{ flex:1, overflowY:'auto', padding:'18px 24px 8px' }}>
          <div style={{ display:'flex', borderRadius:10, border:'1px solid var(--line)', overflow:'hidden', width:'fit-content', marginBottom:18 }}>
            {[['Não',false],['Sim',true]].map(([lbl,val])=>(
              <button key={lbl} onClick={()=>setMultaAtiva(val)} style={{ width:80, height:44, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit',
                background: multaAtiva===val ? (val?orange:'#F1F0EC') : '#fff', color: multaAtiva===val ? (val?'#fff':'#5C594F') : '#A8A49C' }}>{lbl}</button>
            ))}
          </div>
          {multaAtiva && (
            <div style={{ animation:'fadeUp .25s ease both' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', borderRadius:9, border:'1px solid var(--line)', overflow:'hidden', flexShrink:0 }}>
                  {['%','R$'].map((tp)=>(
                    <button key={tp} onClick={()=>setMultaTipo(tp)} style={{ width:46, height:46, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'inherit',
                      background: multaTipo===tp ? orange : '#fff', color: multaTipo===tp ? '#fff' : '#8A8780' }}>{tp}</button>
                  ))}
                </div>
                <input value={multaValor} onChange={(e)=>setMultaValor(e.target.value.replace(/[^\d.,]/g,''))} onFocus={()=>setFocus('m')} onBlur={()=>setFocus(null)}
                  inputMode="decimal" placeholder={multaTipo==='%'?'50':'0,00'} style={{ flex:1, minWidth:120, height:46, padding:'0 14px', border:`1.5px solid ${focus==='m'?orange:'var(--line)'}`, borderRadius:'var(--r-input)', fontSize:15, fontWeight:600, color:'var(--ink)', background:'#fff', outline:'none', fontFamily:'inherit', boxShadow: focus==='m'?`0 0 0 4px ${hexA(orange,0.12)}`:'none' }} />
              </div>
              <div style={{ marginTop:10, fontSize:12, color:'var(--muted)' }}>Sugestão padrão: 50% do valor total.</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, padding:'14px 16px', borderRadius:12, background:'var(--orange-soft)', border:`1px solid ${hexA(orange,0.25)}` }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Multa</span>
                <span style={{ fontSize:20, fontWeight:700, color:orange, fontVariantNumeric:'tabular-nums' }}>{BRL(multaAplicada)}</span>
              </div>
            </div>
          )}
        </div>
        <Dots />
        <div style={{ padding:'0 24px 22px', display:'flex', gap:12 }}>
          <button onClick={()=>setStep(1)} style={btnGhost}><I.arrow style={{ transform:'rotate(180deg)' }} /> Voltar</button>
          <button onClick={()=>setStep(3)} style={btnPrimary(orange, 1.3)}
            onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>e.currentTarget.style.filter='none'}>Próximo <I.arrow /></button>
        </div>
      </>}

      {/* PASSO 3 — CONFIRMAÇÃO */}
      {step===3 && <>
        <Header title="Resumo do cancelamento" />
        <div style={{ flex:1, overflowY:'auto', padding:'18px 24px 8px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'#B0ACA4', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Insumos consumidos</div>
            {consumidos.length===0 ? <div style={{ fontSize:13.5, color:'var(--muted)' }}>Nenhum consumo registrado.</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {consumidos.map((it,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13.5, color:'#3A372F', padding:'9px 12px', borderRadius:9, background:'#FCFBF9', border:'1px solid var(--line)' }}>
                    <span style={{ fontWeight:500 }}>{it.nome}</span><span style={{ fontWeight:600, color:'#6B6860' }}>{it.qtd}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {multaAtiva && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', borderRadius:12, background:'var(--orange-soft)', border:`1px solid ${hexA(orange,0.25)}` }}>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Multa <span style={{ fontWeight:500, color:'var(--muted)' }}>({multaTipo==='%'?`${multaValor||0}%`:'valor fixo'})</span></span>
              <span style={{ fontSize:18, fontWeight:700, color:orange, fontVariantNumeric:'tabular-nums' }}>{BRL(multaAplicada)}</span>
            </div>
          )}
          <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:'var(--orange-soft)', border:`1px solid ${hexA(orange,0.3)}` }}>
            <span style={{ flexShrink:0, color:orange, marginTop:1 }}><I.alert /></span>
            <p style={{ margin:0, fontSize:12.8, color:'#8A5A33', lineHeight:1.55 }}>Um <strong style={{ fontWeight:700 }}>PDF de multa</strong> será gerado para enviar à cliente.</p>
          </div>
        </div>
        <Dots />
        <div style={{ padding:'0 24px 22px', display:'flex', gap:12 }}>
          <button onClick={()=>setStep(2)} style={btnGhost}><I.arrow style={{ transform:'rotate(180deg)' }} /> Voltar</button>
          <button onClick={onClose} style={btnDanger(1.6)}
            onMouseEnter={(e)=>e.currentTarget.style.background='#F7E0DA'} onMouseLeave={(e)=>e.currentTarget.style.background='#FBEDE9'}>Confirmar e gerar PDF de multa</button>
        </div>
      </>}
    </ModalShell>);
}

/* botões reutilizáveis */
const btnGhost = { flex:1, height:48, borderRadius:'var(--r-btn)', border:'1.5px solid var(--line)', background:'#fff', color:'#5C594F', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 };
function btnPrimary(orange, flex) { return { flex, height:48, borderRadius:'var(--r-btn)', border:'none', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'filter .15s' }; }
function btnDanger(flex) { return { flex, height:48, borderRadius:'var(--r-btn)', border:'1.5px solid '+hexA('#C0492B',0.4), background:'#FBEDE9', color:'#C0492B', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, whiteSpace:'nowrap', transition:'background .15s' }; }

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "modal": "fechado",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(t.modal);
  const current = 'Em Produção';
  const idx = STEPS.indexOf(current);
  const next = STEPS[idx+1];

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
    setModal(t.modal === 'fechado' ? null : t.modal);
  }, [t.modal]);

  const meta = STATUS_META[current];

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
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:18, flexWrap:'wrap', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:teal, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Orçamento</div>
              <div style={{ display:'flex', alignItems:'center', gap:13, flexWrap:'wrap' }}>
                <h1 style={{ margin:0, fontSize:25, fontWeight:700, letterSpacing:'-0.025em', color:'var(--ink)' }}>#0042 — Mariana Costa</h1>
                <span style={{ display:'inline-flex', alignItems:'center', gap:7, height:30, padding:'0 13px', borderRadius:999, background:meta.bg, color:meta.fg, fontSize:13, fontWeight:600 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:meta.dot }} />{current}
                </span>
              </div>
            </div>
            <button style={{ flexShrink:0, height:44, padding:'0 18px', border:'1.5px solid var(--line)', borderRadius:'var(--r-btn)', background:'#fff', color:'#5C594F', fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}
              onMouseEnter={(e)=>e.currentTarget.style.background='#FAF8F5'} onMouseLeave={(e)=>e.currentTarget.style.background='#fff'}>
              <I.copy /> Duplicar orçamento
            </button>
          </div>

          {/* SEÇÃO 1 — TIMELINE */}
          <section style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'26px 28px', animation:'fadeUp .4s ease both' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#5C594F', marginBottom:24 }}>Andamento do pedido</div>
            <Timeline current={current} teal={teal} />

            <div style={{ marginTop:30, paddingTop:22, borderTop:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
                <button onClick={()=>setModal('cancel-producao')} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'transparent', border:'none', color:hexA('#C0492B',0.85), fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', padding:0 }}
                  onMouseEnter={(e)=>e.currentTarget.style.color='#C0492B'} onMouseLeave={(e)=>e.currentTarget.style.color=hexA('#C0492B',0.85)}>
                  <I.ban /> Cancelar orçamento
                </button>
              </div>
              <button onClick={()=>setModal('finalizacao')} style={{ height:48, padding:'0 22px', border:'none', borderRadius:'var(--r-btn)', background:orange, color:'#fff', fontSize:14.5, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:10, whiteSpace:'nowrap', boxShadow:`0 8px 18px -8px ${hexA(orange,0.7)}`, transition:'transform .12s, filter .15s' }}
                onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={(e)=>e.currentTarget.style.transform='none'}
                onMouseEnter={(e)=>e.currentTarget.style.filter='brightness(1.05)'} onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
                Avançar para: {next} <I.arrow />
              </button>
            </div>
          </section>

          {/* SEÇÃO 2 — RESUMO */}
          <div className="lower-grid" style={{ marginTop:18 }}>
            <section style={{ background:'#fff', border:'1px solid #F0EEE9', borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'22px 24px', animation:'fadeUp .5s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <span style={{ display:'grid', placeItems:'center', width:32, height:32, borderRadius:9, background:hexA(teal,0.12), color:teal }}><I.doc /></span>
                <h2 style={{ margin:0, fontSize:15.5, fontWeight:700, color:'var(--ink)' }}>Resumo do orçamento</h2>
              </div>
              {/* cliente */}
              <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:16, borderBottom:'1px solid var(--line)' }}>
                <span style={{ width:42, height:42, borderRadius:'50%', display:'grid', placeItems:'center', background:hexA(teal,0.14), color:teal, fontWeight:700, fontSize:16, flexShrink:0 }}>M</span>
                <div>
                  <div style={{ fontSize:14.5, fontWeight:600, color:'var(--ink)' }}>Mariana Costa</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'var(--muted)', marginTop:2 }}><span style={{ color:teal, display:'flex' }}><I.phone /></span>(11) 99999-0000</div>
                </div>
              </div>
              {/* itens */}
              <div style={{ padding:'16px 0', borderBottom:'1px solid var(--line)', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ width:30, height:30, borderRadius:8, display:'grid', placeItems:'center', background:hexA(orange,0.1), color:orange, flexShrink:0, fontSize:12, fontWeight:700 }}>×3</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Kit Convite Casamento</div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:4, fontSize:11.5, color:'#A35A26', background:'var(--orange-soft)', padding:'2px 8px', borderRadius:999 }}><I.tag /> Laminação fosca</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ width:30, height:30, borderRadius:8, display:'grid', placeItems:'center', background:hexA(orange,0.1), color:orange, flexShrink:0, fontSize:11, fontWeight:700 }}>×10</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Etiqueta personalizada</div></div>
                </div>
              </div>
              {/* total + sinal + validade */}
              <div style={{ paddingTop:16, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>Total</div>
                    <div style={{ fontSize:22, fontWeight:700, color:orange, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em' }}>{BRL(183.6)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>Validade</div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:14, fontWeight:600, color:'#5C594F', marginTop:2 }}><span style={{ color:teal, display:'flex' }}><I.cal /></span>11/06/2026</div>
                  </div>
                </div>
                {/* sinal recebido + restante */}
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:140, padding:'10px 13px', borderRadius:10, background:hexA(teal,0.07), border:`1px solid ${hexA(teal,0.2)}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em', color:teal, whiteSpace:'nowrap' }}><I.check width="12" height="12" /> Sinal recebido</div>
                    <div style={{ fontSize:16, fontWeight:700, color:teal, fontVariantNumeric:'tabular-nums', marginTop:4 }}>{BRL(91.8)}</div>
                  </div>
                  <div style={{ flex:1, minWidth:140, padding:'10px 13px', borderRadius:10, background:'#FCFBF9', border:'1px solid var(--line)' }}>
                    <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.03em', color:'#A8A49C', whiteSpace:'nowrap' }}>Restante</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', fontVariantNumeric:'tabular-nums', marginTop:4 }}>{BRL(91.8)}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* nota lateral */}
            <section style={{ background:`linear-gradient(150deg, ${hexA(teal,0.08)} 0%, #fff 55%, ${hexA(orange,0.05)} 100%)`, border:`1px solid ${hexA(teal,0.18)}`, borderRadius:'var(--r-card)', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'22px 24px', animation:'fadeUp .55s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:12 }}>
                <span style={{ display:'grid', placeItems:'center', width:38, height:38, borderRadius:11, background:'#fff', color:teal, border:'1px solid '+hexA(teal,0.2) }}><I.layers /></span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>Próximo passo</div>
                  <div style={{ fontSize:12.5, color:teal, fontWeight:600, marginTop:1 }}>Finalizar produção</div>
                </div>
              </div>
              <p style={{ margin:0, fontSize:13.5, lineHeight:1.6, color:'#5C594F' }}>
                Ao avançar para <strong style={{ fontWeight:600, color:'var(--ink)' }}>Finalizado</strong>, o sistema vai pedir a confirmação da <strong style={{ fontWeight:600, color:'var(--ink)' }}>baixa de estoque</strong> dos insumos usados. Revise as quantidades antes de confirmar.
              </p>
            </section>
          </div>
        </div>
      </div>

      {modal === 'finalizacao' && <FinalizacaoModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}
      {modal === 'sinal' && <SinalModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}
      {modal === 'cancel-simples' && <CancelSimpleModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}
      {modal === 'cancel-producao' && <CancelWizardModal teal={teal} orange={orange} onClose={()=>setModal(null)} startStep={1} />}
      {modal === 'cancel-entregue' && <CancelJustModal teal={teal} orange={orange} onClose={()=>setModal(null)} />}

      <TweaksPanel>
        <TweakSection label="Estado da tela" />
        <TweakSelect label="Modal" value={t.modal}
          options={[
            { value:'fechado', label:'Fechado' },
            { value:'finalizacao', label:'Confirmar finalização' },
            { value:'sinal', label:'Confirmar sinal' },
            { value:'cancel-simples', label:'Cancelar (Rasc./Env./Aprov.)' },
            { value:'cancel-producao', label:'Cancelar (Em Produção)' },
            { value:'cancel-entregue', label:'Cancelar (Entregue/Pago)' },
          ]}
          onChange={(v)=>setTweak('modal',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
