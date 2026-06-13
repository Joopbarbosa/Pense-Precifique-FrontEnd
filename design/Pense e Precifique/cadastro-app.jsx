/* cadastro-app.jsx — Tela de Cadastro (Etapa 1) · Pense & Precifique */
const { useState, useRef, useEffect } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 44 }) {
  return (
    <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
         style={{ display: 'block', objectFit: 'contain', transform: 'translateX(4%)' }} />);
}
function Wordmark({ teal = '#2A9D8F', size = 21, dark = false }) {
  if (dark) return (
    <span style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', color: '#fff' }}>
      Pense<span style={{ color: '#FFD9BF', margin: '0 2px' }}>&amp;</span>Precifique
    </span>);
  return (
    <span style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1 }}>
      <span style={{ color: teal }}>Pense</span>
      <span style={{ color: '#F97316', margin: '0 2px' }}>&amp;</span>
      <span style={{ color: '#3A372F' }}>Precifique</span>
    </span>);
}

/* ─────────  ÍCONES  ───────── */
const I = {
  user: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  store: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M4 9.5 5.2 5h13.6L20 9.5M4 9.5V19h16V9.5M4 9.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 19v-4.5h5V19" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>,
  eyeoff: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M9.5 5.9A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.8 3.4M6.2 7.3A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  alert: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><circle cx="12" cy="16.3" r="1.05" fill="currentColor"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...p}><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...p}><path d="M4 8.5h3l1.3-2h7.4L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="13.5" r="3.2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...p}><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
};

/* ─────────  DECORATIVO  ───────── */
function DotTrail({ color }) {
  const dots = [[12,22,3],[22,14,2],[30,26,2.4],[40,10,1.6],[50,30,3],[62,18,2],[74,28,2.6],[84,14,1.8],[92,32,2.2],[18,70,2.4],[30,80,3],[44,74,1.8],[58,84,2.4],[70,76,2],[82,86,2.8],[90,70,1.6],[8,50,2],[96,52,2.4]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {dots.map(([x,y,r],i) => <circle key={i} cx={x} cy={y} r={r*0.4} fill={color} opacity={0.5 + (i%3)*0.18} />)}
    </svg>);
}

/* ─────────  PAINEL DE MARCA  ───────── */
function BrandPanel({ t, brandPanel, decor }) {
  const { teal, orange, tealDeep } = t;
  const dark = brandPanel === 'teal';
  const fg = dark ? '#FFFFFF' : '#3A372F';
  const subFg = dark ? 'rgba(255,255,255,0.82)' : '#7C786F';
  const bg = dark
    ? { background: `linear-gradient(150deg, ${teal} 0%, ${tealDeep} 78%, #15665C 100%)` }
    : { background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF7F1 60%, #F1FBF9 100%)' };

  const journey = [
    ['Sua conta', 'Conte sobre você e seu ateliê', true],
    ['Precificação', 'Configure custos e margem', false],
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
          Bem-vinda! Vamos<br/>começar essa jornada.
        </h2>
        <p style={{ margin:'14px 0 0', fontSize:15, lineHeight:1.6, color:subFg }}>
          Em poucos passos você terá uma precificação justa para vender com tranquilidade e valorizar o seu trabalho.
        </p>
      </div>

      {/* mini jornada (espelha o stepper) */}
      <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:14 }}>
        {journey.map(([title, desc, active], i) => (
          <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', opacity: active?1:0.7 }}>
            <span style={{ flexShrink:0, width:30, height:30, borderRadius:'50%', display:'grid', placeItems:'center',
              fontSize:13, fontWeight:700,
              background: active ? (dark?'#fff':teal) : 'transparent',
              color: active ? (dark?teal:'#fff') : subFg,
              border: active ? 'none' : `1.5px solid ${dark?'rgba(255,255,255,0.4)':'#D8D5CE'}` }}>
              {i+1}
            </span>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:fg }}>{title}</div>
              <div style={{ fontSize:12.5, color:subFg, marginTop:1 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>);
}

/* ─────────  STEPPER (form)  ───────── */
function Stepper({ teal }) {
  const Step = ({ n, label, active }) => (
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      <span style={{ width:28, height:28, borderRadius:'50%', display:'grid', placeItems:'center',
        fontSize:13, fontWeight:700,
        background: active ? teal : '#fff',
        color: active ? '#fff' : '#B7B4AD',
        border: active ? 'none' : '1.5px solid var(--line)',
        boxShadow: active ? `0 4px 10px -4px ${hexA(teal,0.6)}` : 'none' }}>{n}</span>
      <span style={{ fontSize:14, fontWeight: active?600:500, color: active?'var(--ink)':'var(--muted)', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
      <Step n="1" label="Sua conta" active />
      <span style={{ flex:1, height:2, background:'var(--line)', borderRadius:2, minWidth:24 }}/>
      <Step n="2" label="Precificação" active={false} />
    </div>);
}

/* ─────────  CAMPO  ───────── */
function Field({ icon, label, error, hint, children }) {
  return (
    <label style={{ display:'block' }}>
      <span style={{ display:'block', fontSize:13.5, fontWeight:600, color:'#5C594F', marginBottom:7 }}>{label}</span>
      <div style={{ position:'relative' }}>
        {icon && <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
          color: error?'#E0613F':'var(--muted)', display:'flex', pointerEvents:'none' }}>{icon}</span>}
        {children}
      </div>
      {error && <FieldHint>{error}</FieldHint>}
      {!error && hint && <span style={{ display:'block', marginTop:6, fontSize:12, color:'var(--muted)' }}>{hint}</span>}
    </label>);
}
function FieldHint({ children }) {
  return (
    <span style={{ display:'flex', alignItems:'center', gap:5, marginTop:6, fontSize:12.5, color:'#C0492B', animation:'fadeUp .2s ease both' }}>
      <I.alert /> {children}
    </span>);
}

/* ─────────  FORÇA DA SENHA  ───────── */
function passwordScore(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}
function StrengthMeter({ pwd, teal }) {
  if (!pwd) return null;
  const score = passwordScore(pwd);
  const levels = [
    { label:'Muito fraca', color:'#E0613F' },
    { label:'Fraca', color:'#F2913C' },
    { label:'Razoável', color:'#E8B23A' },
    { label:'Boa', color:'#7FB84F' },
    { label:'Forte', color:teal },
  ];
  const cur = levels[score];
  return (
    <div style={{ marginTop:9, animation:'fadeUp .2s ease both' }}>
      <div style={{ display:'flex', gap:5 }}>
        {[0,1,2,3].map(i => (
          <span key={i} style={{ flex:1, height:5, borderRadius:3,
            background: i < score ? cur.color : 'var(--line)', transition:'background .2s' }}/>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12 }}>
        <span style={{ color:'var(--muted)' }}>{pwd.length < 8 ? 'Use no mínimo 8 caracteres' : 'Boa combinação ajuda na segurança'}</span>
        <span style={{ color:cur.color, fontWeight:600 }}>{cur.label}</span>
      </div>
    </div>);
}

/* ─────────  UPLOAD DE LOGO  ───────── */
function LogoUpload({ preview, onPick, onRemove, teal }) {
  const inputRef = useRef(null);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16,
      border: preview ? '1.5px solid var(--line)' : '1.6px dashed #D4D0C8',
      background: preview ? '#fff' : '#FCFBF9',
      borderRadius:14, padding:14, transition:'all .15s' }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => onPick(r.result); r.readAsDataURL(f); } e.target.value=''; }} />
      {preview ? (
        <div style={{ position:'relative', flexShrink:0 }}>
          <img src={preview} alt="Logo" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover',
            border:`2px solid ${hexA(teal,0.35)}`, animation:'pop .25s ease both' }} />
          <button type="button" onClick={onRemove} aria-label="Remover logo"
            style={{ position:'absolute', top:-5, right:-5, width:24, height:24, borderRadius:'50%',
              background:'#fff', border:'1px solid var(--line)', boxShadow:'0 2px 6px rgba(0,0,0,0.12)',
              color:'#C0492B', display:'grid', placeItems:'center', cursor:'pointer' }}>
            <I.x />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current.click()}
          style={{ flexShrink:0, width:72, height:72, borderRadius:'50%', border:`1.6px dashed ${hexA(teal,0.5)}`,
            background: hexA(teal,0.06), color:teal, display:'grid', placeItems:'center', cursor:'pointer' }}>
          <I.camera />
        </button>
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>
          {preview ? 'Logo adicionada ✨' : 'Adicione a logo da sua empresa'}
        </div>
        <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>
          {preview ? 'Vai aparecer nos seus orçamentos.' : 'Opcional · PNG ou JPG, formato quadrado'}
        </div>
        <button type="button" onClick={() => inputRef.current.click()}
          style={{ marginTop:8, fontSize:13, fontWeight:600, color:teal, background:'none', border:'none',
            padding:0, cursor:'pointer' }}>
          {preview ? 'Trocar imagem' : 'Escolher arquivo'}
        </button>
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

const USED_EMAILS = ['ana@atelier.com', 'contato@atelier.com'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [f, setF] = useState({ nome:'', empresa:'', email:'', pwd:'', pwd2:'' });
  const [touched, setTouched] = useState({});
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [preview, setPreview] = useState(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState(null);

  const balance = {
    equilibrado: { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' },
    'mais laranja': { orange:'#F97316', teal:'#3FA89A', tealDeep:'#2A8377' },
    'mais teal': { orange:'#F4853A', teal:'#1F8E80', tealDeep:'#176A60' },
  }[t.balance] || { orange:'#F97316', teal:'#2A9D8F', tealDeep:'#1F7A6F' };
  const palette = balance;

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

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); if (k==='email') setEmailTaken(false); };
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim());
  const errs = {
    nome: touched.nome && !f.nome.trim() ? 'Como podemos te chamar?' : '',
    empresa: touched.empresa && !f.empresa.trim() ? 'Informe o nome do seu ateliê.' : '',
    email: emailTaken ? 'Este e-mail já está em uso. Faça login ou use outro e-mail.'
          : touched.email && !f.email.trim() ? 'Informe seu e-mail.'
          : touched.email && !emailValid ? 'E-mail inválido.' : '',
    pwd: touched.pwd && f.pwd.length < 8 ? 'A senha precisa de no mínimo 8 caracteres.' : '',
    pwd2: touched.pwd2 && f.pwd2 !== f.pwd ? 'As senhas não coincidem.' : '',
  };

  function submit(e) {
    e.preventDefault();
    setTouched({ nome:true, empresa:true, email:true, pwd:true, pwd2:true });
    const valid = f.nome.trim() && f.empresa.trim() && emailValid && f.pwd.length>=8 && f.pwd2===f.pwd;
    if (!valid) return;
    if (USED_EMAILS.includes(f.email.trim().toLowerCase())) { setEmailTaken(true); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1000);
  }

  const inputStyle = (active, hasErr) => ({
    width:'100%', height:48, padding:'0 44px 0 40px',
    border:`1.5px solid ${hasErr?'#F2B8A6':active?palette.teal:'var(--line)'}`,
    borderRadius:'var(--r-input)', fontSize:15, color:'var(--ink)',
    background: hasErr?'#FFFBFA':'#fff', outline:'none', fontFamily:'inherit',
    transition:'border-color .15s, box-shadow .15s',
    boxShadow: active?`0 0 0 4px ${hexA(palette.teal,0.12)}`:'none',
  });
  const bind = (k) => ({
    value:f[k], onChange:set(k),
    onFocus:() => setFocus(k),
    onBlur:() => { setFocus(null); setTouched((s)=>({...s,[k]:true})); },
  });

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

          {done ? (
            <SuccessNote teal={palette.teal} nome={f.nome} />
          ) : (
          <React.Fragment>
            <h1 style={{ margin:0, fontSize:25, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>
              Vamos criar sua conta!
            </h1>
            <p style={{ margin:'8px 0 24px', fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>
              Leva menos de 2 minutos. Você poderá ajustar tudo depois.
            </p>

            <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="two-col">
                <Field icon={<I.user/>} label="Seu nome" error={errs.nome}>
                  <input type="text" placeholder="Ana Lima" autoComplete="name" {...bind('nome')} style={inputStyle(focus==='nome', !!errs.nome)} />
                </Field>
                <Field icon={<I.store/>} label="Nome da sua empresa" error={errs.empresa}>
                  <input type="text" placeholder="Ateliê da Ana" {...bind('empresa')} style={inputStyle(focus==='empresa', !!errs.empresa)} />
                </Field>
              </div>

              <Field icon={<I.mail/>} label="E-mail" error={errs.email}>
                <input type="email" inputMode="email" placeholder="ana@atelier.com" autoComplete="email" {...bind('email')} style={inputStyle(focus==='email', !!errs.email)} />
                {emailTaken && (
                  <span style={{ display:'inline-flex', marginTop:8 }}>
                    <a href="Login.html" style={{ fontSize:12.5, fontWeight:600, color:palette.teal, textDecoration:'none' }}>→ Ir para o login</a>
                  </span>
                )}
              </Field>

              <div className="two-col">
                <Field icon={<I.lock/>} label="Senha" error={errs.pwd}>
                  <input type={show1?'text':'password'} placeholder="Mínimo 8 caracteres" autoComplete="new-password" {...bind('pwd')} style={inputStyle(focus==='pwd', !!errs.pwd)} />
                  <PwdToggle on={show1} set={setShow1} />
                </Field>
                <Field icon={<I.lock/>} label="Confirmar senha" error={errs.pwd2}>
                  <input type={show2?'text':'password'} placeholder="Repita a senha" autoComplete="new-password" {...bind('pwd2')} style={inputStyle(focus==='pwd2', !!errs.pwd2)} />
                  <PwdToggle on={show2} set={setShow2} />
                </Field>
              </div>
              <StrengthMeter pwd={f.pwd} teal={palette.teal} />

              <LogoUpload preview={preview} onPick={setPreview} onRemove={() => setPreview(null)} teal={palette.teal} />

              <button type="submit" disabled={loading} style={{
                height:50, marginTop:4, border:'none', borderRadius:'var(--r-btn)',
                background: loading?hexA(palette.orange,0.85):palette.orange, color:'#fff',
                fontSize:15.5, fontWeight:600, fontFamily:'inherit', cursor:loading?'default':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:9,
                boxShadow:`0 8px 18px -8px ${hexA(palette.orange,0.7)}`, transition:'transform .12s, filter .15s' }}
                onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.985)'}
                onMouseUp={(e)=>e.currentTarget.style.transform='none'}
                onMouseEnter={(e)=>{ if(!loading) e.currentTarget.style.filter='brightness(1.05)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.filter='none'; }}>
                {loading ? <><Spinner/> Criando sua conta…</> : <>Próximo <span style={{ fontSize:18, marginTop:-1 }}>→</span></>}
              </button>
            </form>

            <p style={{ margin:'20px 0 0', textAlign:'center', fontSize:14, color:'var(--muted)' }}>
              Já tem conta?{' '}
              <a href="Login.html" style={{ color:palette.orange, fontWeight:600, textDecoration:'none' }}
                onMouseOver={(e)=>e.currentTarget.style.textDecoration='underline'}
                onMouseOut={(e)=>e.currentTarget.style.textDecoration='none'}>Faça login</a>
            </p>
          </React.Fragment>
          )}
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
        <TweakButton label={emailTaken?'Limpar erro de e-mail':'Demonstrar e-mail em uso'}
          onClick={()=>{ setEmailTaken((v)=>!v); if(!emailTaken){ setF((s)=>({...s, email:'ana@atelier.com'})); } }} />
        <TweakButton label={preview?'Remover logo de exemplo':'Carregar logo de exemplo'} secondary
          onClick={()=> preview ? setPreview(null) : setPreview('logo.png')} />
      </TweaksPanel>
    </div>);
}

function PwdToggle({ on, set }) {
  return (
    <button type="button" onClick={()=>set((v)=>!v)} aria-label={on?'Ocultar senha':'Mostrar senha'}
      style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:32, height:32,
        display:'grid', placeItems:'center', border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', borderRadius:8 }}>
      {on ? <I.eyeoff/> : <I.eye/>}
    </button>);
}

function SuccessNote({ teal, nome }) {
  return (
    <div style={{ textAlign:'center', padding:'30px 0 10px', animation:'fadeUp .4s ease both' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto', display:'grid', placeItems:'center',
        background:hexA(teal,0.12), color:teal, animation:'pop .35s ease both' }}>
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none"><path d="m4 12.5 5 5L20 6.5" stroke={teal} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 style={{ margin:'18px 0 6px', fontSize:22, fontWeight:700, color:'var(--ink)' }}>
        Conta criada{nome?`, ${nome.split(' ')[0]}`:''}! 🎉
      </h2>
      <p style={{ margin:0, fontSize:14.5, color:'var(--muted)', lineHeight:1.55 }}>
        Agora vamos para a <strong style={{ color:teal }}>Etapa 2 — Precificação</strong> para configurar seus custos.
      </p>
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
