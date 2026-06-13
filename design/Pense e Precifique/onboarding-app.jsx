/* onboarding-app.jsx — Tela 3 · Onboarding de Precificação · Pense & Precifique */
const { useState, useRef, useEffect } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 44 }) {
  return (
    <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
         style={{ display:'block', objectFit:'contain', transform:'translateX(4%)' }} />);
}
function Wordmark({ teal = '#2A9D8F', size = 18, dark = false }) {
  if (dark) return (
    <span style={{ fontWeight:700, fontSize:size, letterSpacing:'-0.01em', color:'#fff', lineHeight:1 }}>
      Pense<span style={{ color:'#FFD9BF', margin:'0 2px' }}>&amp;</span>Precifique
    </span>);
  return (
    <span style={{ fontWeight:700, fontSize:size, letterSpacing:'-0.01em', lineHeight:1 }}>
      <span style={{ color:teal }}>Pense</span>
      <span style={{ color:'#F97316', margin:'0 2px' }}>&amp;</span>
      <span style={{ color:'#3A372F' }}>Precifique</span>
    </span>);
}

/* ─────────  ÍCONES  ───────── */
const I = {
  clock: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trend: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M4 15.5 9 10l3.2 3L20 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.5 5.5H20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bulb: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...p}><path d="M9 17.5h6M9.7 20.3h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M12 3.2a6 6 0 0 0-3.6 10.8c.6.45.9 1 .9 1.7v.3h5.4v-.3c0-.7.3-1.25.9-1.7A6 6 0 0 0 12 3.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" {...p}><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  gear: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...p}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2.8v2.2M12 19v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.8 12H5M19 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

/* ─────────  CONSTELAÇÃO (DNA da logo)  ───────── */
function DotTrail({ color }) {
  const dots = [[12,22,3],[22,14,2],[30,26,2.4],[40,10,1.6],[50,30,3],[62,18,2],[74,28,2.6],[84,14,1.8],[92,32,2.2],[18,70,2.4],[30,80,3],[44,74,1.8],[58,84,2.4],[70,76,2],[82,86,2.8],[90,70,1.6],[8,50,2],[96,52,2.4]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {dots.map(([x,y,r],i) => <circle key={i} cx={x} cy={y} r={r*0.4} fill={color} opacity={0.5 + (i%3)*0.18} />)}
    </svg>);
}

/* ─────────  PAINEL DE MARCA (coluna esquerda — espelha o Cadastro)  ───────── */
function BrandPanel({ t, brandPanel, decor }) {
  const { teal, orange, tealDeep } = t;
  const dark = brandPanel === 'teal';
  const fg = dark ? '#FFFFFF' : '#3A372F';
  const subFg = dark ? 'rgba(255,255,255,0.82)' : '#7C786F';
  const bg = dark
    ? { background: `linear-gradient(150deg, ${teal} 0%, ${tealDeep} 78%, #15665C 100%)` }
    : { background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF7F1 60%, #F1FBF9 100%)' };

  const journey = [
    ['Sua conta', 'Conte sobre você e seu ateliê', 'done'],
    ['Precificação', 'Configure custos e margem', 'active'],
  ];

  return (
    <div style={{ position:'relative', overflow:'hidden', padding:'46px 44px', width:'100%',
      display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:560, ...bg }}>
      <div style={{ position:'absolute', inset:0, opacity:decor }}>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'46% 54% 60% 40% / 50% 44% 56% 50%',
          background: dark?'rgba(255,255,255,0.10)':'rgba(42,157,143,0.12)', top:-90, right:-70, animation:'floaty 9s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'60% 40% 45% 55% / 55% 50% 50% 45%',
          background: dark?'rgba(249,115,22,0.30)':'rgba(249,115,22,0.14)', bottom:-60, left:-50, animation:'floaty 11s ease-in-out infinite' }}/>
        <DotTrail color={orange} />
      </div>

      <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ display:'grid', placeItems:'center', width:56, height:56, background:'#fff',
          border: dark?'1px solid rgba(255,255,255,0.45)':'1px solid #EFEDE8', borderRadius:16, boxShadow:'0 2px 8px rgba(0,0,0,0.10)' }}>
          <Logo size={38} />
        </span>
        <Wordmark teal={teal} size={20} dark={dark} />
      </div>

      <div style={{ position:'relative', maxWidth:330 }}>
        <h2 style={{ margin:0, fontSize:29, lineHeight:1.2, fontWeight:700, letterSpacing:'-0.02em', color:fg }}>
          Quase lá!<br/>Só mais um passo.
        </h2>
        <p style={{ margin:'14px 0 0', fontSize:15, lineHeight:1.6, color:subFg }}>
          Vamos configurar como você quer precificar. Com isso, cada produto já nasce com um preço justo — sem achismo.
        </p>
      </div>

      {/* mini jornada (espelha o stepper) */}
      <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:14 }}>
        {journey.map(([title, desc, state], i) => {
          const done = state === 'done', active = state === 'active';
          return (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', opacity: (done||active)?1:0.7 }}>
              <span style={{ flexShrink:0, width:30, height:30, borderRadius:'50%', display:'grid', placeItems:'center',
                fontSize:13, fontWeight:700,
                background: active ? (dark?'#fff':teal) : done ? (dark?'rgba(255,255,255,0.22)':hexA(teal,0.14)) : 'transparent',
                color: active ? (dark?teal:'#fff') : done ? (dark?'#fff':teal) : subFg,
                border: active ? 'none' : done ? (dark?'1.5px solid rgba(255,255,255,0.55)':`1.5px solid ${hexA(teal,0.4)}`) : `1.5px solid ${dark?'rgba(255,255,255,0.4)':'#D8D5CE'}` }}>
                {done ? <I.check /> : i+1}
              </span>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:fg, display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
                  {title}
                  {done && <span style={{ fontSize:11, fontWeight:600, color: dark?'#FFD9BF':teal }}>✓ concluído</span>}
                </div>
                <div style={{ fontSize:12.5, color:subFg, marginTop:1 }}>{desc}</div>
              </div>
            </div>);
        })}
      </div>
    </div>);
}

/* ─────────  STEPPER (form — horizontal)  ───────── */
function Stepper({ teal }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <span style={{ width:28, height:28, borderRadius:'50%', display:'grid', placeItems:'center',
          background:hexA(teal,0.14), color:teal, border:`1.5px solid ${hexA(teal,0.4)}` }}>
          <I.check />
        </span>
        <span style={{ fontSize:14, fontWeight:500, color:'var(--muted)', whiteSpace:'nowrap' }}>Sua conta</span>
      </div>
      <span style={{ flex:1, height:2, background:`linear-gradient(90deg, ${hexA(teal,0.5)}, var(--line))`, borderRadius:2, minWidth:24 }}/>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <span style={{ width:28, height:28, borderRadius:'50%', display:'grid', placeItems:'center',
          fontSize:13, fontWeight:700, background:teal, color:'#fff',
          boxShadow:`0 4px 10px -4px ${hexA(teal,0.7)}` }}>2</span>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap' }}>Precificação</span>
      </div>
    </div>);
}

/* ─────────  CAMPO DE PRECIFICAÇÃO  ───────── */
function PriceField({ icon, question, explain, affix, affixSide, placeholder, dica, value, onChange, active, onFocus, onBlur, teal, inputMode }) {
  return (
    <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
      <span style={{ flexShrink:0, marginTop:2, width:38, height:38, borderRadius:12, display:'grid', placeItems:'center',
        background:hexA(teal,0.10), color:teal }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <label style={{ display:'block', fontSize:15.5, fontWeight:600, color:'var(--ink)', letterSpacing:'-0.01em' }}>
          {question}
        </label>
        <p style={{ margin:'4px 0 12px', fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>{explain}</p>

        <div style={{ display:'flex', alignItems:'stretch', height:54, borderRadius:'var(--r-input)', overflow:'hidden',
          border:`1.5px solid ${active ? teal : 'var(--line)'}`, background:'#fff',
          boxShadow: active ? `0 0 0 4px ${hexA(teal,0.12)}` : 'none', transition:'border-color .15s, box-shadow .15s' }}>
          {affixSide === 'left' && (
            <span style={{ display:'grid', placeItems:'center', padding:'0 16px', fontSize:16, fontWeight:600,
              color:'#6B6860', background:'#FAF8F5', borderRight:'1px solid var(--line)' }}>{affix}</span>
          )}
          <input type="text" inputMode={inputMode} placeholder={placeholder} value={value}
            onChange={onChange} onFocus={onFocus} onBlur={onBlur}
            style={{ flex:1, minWidth:0, border:'none', outline:'none', background:'transparent',
              padding:'0 16px', fontSize:18, fontWeight:600, color:'var(--ink)', fontFamily:'inherit' }} />
          {affixSide === 'right' && (
            <span style={{ display:'grid', placeItems:'center', padding:'0 18px', fontSize:17, fontWeight:600,
              color:'#6B6860', background:'#FAF8F5', borderLeft:'1px solid var(--line)' }}>{affix}</span>
          )}
        </div>

        <div style={{ display:'flex', gap:9, alignItems:'flex-start', marginTop:11,
          background:'var(--orange-soft)', border:'1px solid #FCE2CF', borderRadius:12, padding:'11px 13px' }}>
          <span style={{ flexShrink:0, color:'#EC7A2C', marginTop:1 }}><I.bulb /></span>
          <p style={{ margin:0, fontSize:12.7, lineHeight:1.55, color:'#8A5A33' }}>{dica}</p>
        </div>
      </div>
    </div>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brandPanel": "teal",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter",
  "decor": 70
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [hora, setHora] = useState('');
  const [margem, setMargem] = useState('');
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);

  const palette = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A', tealDeep:'#2A8377' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80', tealDeep:'#176A60' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' };

  const radii = {
    reto:{ card:12, input:6, btn:6 }, suave:{ card:24, input:10, btn:10 }, redondo:{ card:30, input:14, btn:14 },
  }[t.roundness] || { card:24, input:10, btn:10 };
  const decorVal = t.decor/100;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`);
    r.setProperty('--orange', palette.orange);
    r.setProperty('--teal', palette.teal);
    r.setProperty('--r-card', radii.card+'px');
    r.setProperty('--r-input', radii.input+'px');
    r.setProperty('--r-btn', radii.btn+'px');
  }, [t.font, t.balance, t.roundness]);

  function submit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1100);
  }
  const money = (raw) => raw.replace(/[^\d.,]/g, '');
  const pct = (raw) => raw.replace(/[^\d.,]/g, '');

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24 }}>
      <main className="login-card" style={{
        width:'min(1000px, 100%)', display:'grid', gridTemplateColumns:'1fr 1.15fr',
        background:'#fff', borderRadius:'var(--r-card)', overflow:'hidden',
        boxShadow:'0 20px 60px -28px rgba(31,122,111,0.28), 0 2px 8px rgba(0,0,0,0.06)',
        border:'1px solid #F0EEE9', animation:'fadeUp .5s ease both' }}>

        <div className="brand-col"><BrandPanel t={palette} brandPanel={t.brandPanel} decor={decorVal} /></div>

        <div style={{ padding:'42px 46px 38px' }}>
          <div className="mobile-logo" style={{ display:'none', alignItems:'center', gap:10, marginBottom:22 }}>
            <Logo size={34} /><Wordmark teal={palette.teal} size={18} />
          </div>

          <Stepper teal={palette.teal} />

          <h1 style={{ margin:0, fontSize:25, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)', lineHeight:1.25 }}>
            Configure como você quer precificar 💡
          </h1>
          <p style={{ margin:'8px 0 26px', fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>
            Você pode alterar isso a qualquer momento nas Configurações.
          </p>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <PriceField
              icon={<I.clock />} teal={palette.teal}
              question="Quanto vale a sua hora de trabalho?"
              explain="Este valor entra no cálculo de custo de mão de obra de cada produto."
              affix="R$" affixSide="left" placeholder="25,00" inputMode="decimal"
              dica="Exemplo: se você leva 2h para fazer um produto e sua hora vale R$ 25, o custo de mão de obra é R$ 50."
              value={hora} onChange={(e)=>setHora(money(e.target.value))}
              active={focus==='hora'} onFocus={()=>setFocus('hora')} onBlur={()=>setFocus(null)} />

            <PriceField
              icon={<I.trend />} teal={palette.teal}
              question="Qual é a sua margem de lucro padrão?"
              explain="Percentual adicionado ao custo total para formar seu preço de venda."
              affix="%" affixSide="right" placeholder="40" inputMode="numeric"
              dica="Você poderá ajustar a margem produto a produto quando necessário."
              value={margem} onChange={(e)=>setMargem(pct(e.target.value))}
              active={focus==='margem'} onFocus={()=>setFocus('margem')} onBlur={()=>setFocus(null)} />

            <button type="submit" disabled={loading} style={{
              height:54, marginTop:2, border:'none', borderRadius:'var(--r-btn)',
              background: loading?hexA(palette.orange,0.85):palette.orange, color:'#fff',
              fontSize:16, fontWeight:600, fontFamily:'inherit', cursor:loading?'default':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10, whiteSpace:'nowrap',
              boxShadow:`0 10px 22px -10px ${hexA(palette.orange,0.7)}`, transition:'transform .12s, filter .15s' }}
              onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.985)'}
              onMouseUp={(e)=>e.currentTarget.style.transform='none'}
              onMouseEnter={(e)=>{ if(!loading) e.currentTarget.style.filter='brightness(1.05)'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
              {loading ? <><Spinner/> Preparando tudo…</> : <>Começar a usar o sistema <span style={{ fontSize:19, marginTop:-1 }}>→</span></>}
            </button>
          </form>

          <p style={{ margin:'18px 0 0', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:6,
            fontSize:12.7, color:'var(--muted)', textAlign:'center' }}>
            <span style={{ color:palette.teal, display:'flex' }}><I.gear /></span>
            <span>Dá pra mudar tudo depois em <strong style={{ fontWeight:600, color:'#6B6860' }}>Configurações</strong>.</span>
          </p>
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="Painel de marca" />
        <TweakRadio label="Estilo" value={t.brandPanel}
          options={[{value:'teal',label:'Teal'},{value:'claro',label:'Claro'}]}
          onChange={(v)=>setTweak('brandPanel',v)} />
        <TweakSlider label="Intensidade decorativa" value={t.decor} min={0} max={100} unit="%" onChange={(v)=>setTweak('decor',v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal','equilibrado','mais laranja']} onChange={(v)=>setTweak('balance',v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto','suave','redondo']} onChange={(v)=>setTweak('roundness',v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter','Nunito','Plus Jakarta Sans']} onChange={(v)=>setTweak('font',v)} />
        <TweakSection label="Demonstração" />
        <TweakButton label={(hora||margem)?'Limpar valores':'Preencher exemplo'}
          onClick={()=>{ if(hora||margem){ setHora(''); setMargem(''); } else { setHora('25,00'); setMargem('40'); } }} />
      </TweaksPanel>
    </div>);
}

function Spinner() {
  return <span style={{ width:16, height:16, borderRadius:'50%', border:'2.4px solid rgba(255,255,255,0.45)', borderTopColor:'#fff', display:'inline-block', animation:'spin .7s linear infinite' }}/>;
}
function hexA(hex, a) {
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map((c)=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
