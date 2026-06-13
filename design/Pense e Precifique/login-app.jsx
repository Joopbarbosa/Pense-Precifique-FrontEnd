/* login-app.jsx — Tela de Login · Pense & Precifique */
const { useState, useRef, useEffect } = React;

/* ─────────────────────────  LOGO  ───────────────────────── */
// Logo oficial Pense & Precifique (imagem fornecida, fundo removido)
function Logo({ size = 44 }) {
  return (
    <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
         style={{ display: 'block', objectFit: 'contain', transform: 'translateX(4%)' }} />);

}

function Wordmark({ teal = '#2A9D8F', size = 21 }) {
  return (
    <span style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1 }}>
      <span style={{ color: teal }}>Pense</span>
      <span style={{ color: '#F97316', margin: '0 2px' }}>&amp;</span>
      <span style={{ color: '#3A372F' }}>Precifique</span>
    </span>);

}

/* ─────────────────────────  ÍCONES  ───────────────────────── */
const I = {
  mail: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>,
  eyeoff: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M9.5 5.9A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.8 3.4M6.2 7.3A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  alert: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><circle cx="12" cy="16.3" r="1.05" fill="currentColor" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...p}><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
};

/* ─────────────────────────  DECORATIVO  ───────────────────────── */
// Trilha de pontilhados (constelação) reaproveitando o DNA da logo
function DotTrail({ color, opacity = 1 }) {
  const dots = [
  [12, 22, 3], [22, 14, 2], [30, 26, 2.4], [40, 10, 1.6], [50, 30, 3],
  [62, 18, 2], [74, 28, 2.6], [84, 14, 1.8], [92, 32, 2.2],
  [18, 70, 2.4], [30, 80, 3], [44, 74, 1.8], [58, 84, 2.4], [70, 76, 2],
  [82, 86, 2.8], [90, 70, 1.6], [8, 50, 2], [96, 52, 2.4]];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
    style={{ ...{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }, opacity: "0" }}>
      {dots.map(([x, y, r], i) =>
      <circle key={i} cx={x} cy={y} r={r * 0.4} fill={color} opacity={0.5 + i % 3 * 0.18} />
      )}
    </svg>);

}

/* ─────────────────────────  PAINEL DE MARCA  ───────────────────────── */
function BrandPanel({ t, brandPanel, decor }) {
  const teal = t.teal,orange = t.orange;
  const dark = brandPanel === 'teal';

  const tealBg = {
    background: `linear-gradient(150deg, ${teal} 0%, ${t.tealDeep} 78%, #15665C 100%)`
  };
  const lightBg = { background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF7F1 60%, #F1FBF9 100%)' };

  const fg = dark ? '#FFFFFF' : '#3A372F';
  const subFg = dark ? 'rgba(255,255,255,0.82)' : '#7C786F';
  const blobTeal = dark ? 'rgba(255,255,255,0.10)' : 'rgba(42,157,143,0.12)';
  const blobOrange = dark ? 'rgba(249,115,22,0.30)' : 'rgba(249,115,22,0.14)';
  const dotColor = orange;

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', padding: '46px 44px', width: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      ...(dark ? tealBg : lightBg)
    }}>
      {/* formas orgânicas */}
      <div style={{ position: 'absolute', inset: 0, opacity: decor }}>
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '46% 54% 60% 40% / 50% 44% 56% 50%',
          background: blobTeal, top: -90, right: -70, animation: 'floaty 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '60% 40% 45% 55% / 55% 50% 50% 45%',
          background: blobOrange, bottom: -60, left: -50, animation: 'floaty 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0 }}>
          <DotTrail color={dotColor} opacity={dark ? 0.9 : 0.8} />
        </div>
      </div>

      {/* logo */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          display: 'grid', placeItems: 'center', width: 56, height: 56,
          background: '#FFFFFF',
          border: dark ? '1px solid rgba(255,255,255,0.45)' : '1px solid #EFEDE8',
          borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
        }}>
          <Logo size={38} />
        </span>
        {dark ?
        <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', color: '#fff' }}>
              Pense<span style={{ color: '#FFD9BF', margin: '0 2px' }}>&amp;</span>Precifique
            </span> :
        <Wordmark teal={teal} size={20} />}
      </div>

      {/* claim central */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.18, fontWeight: 700,
          letterSpacing: '-0.02em', color: fg }}>
          Precifique com confiança.<br />Venda com valor.
        </h2>
        <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.6, color: subFg }}>Sua plataforma para calcular preços justos, montar orçamentos e cuidar com o carinho que seu negócio merece.


        </p>
      </div>

      {/* rodapé / selo */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: subFg }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%',
          background: dark ? 'rgba(255,255,255,0.16)' : 'rgba(42,157,143,0.12)',
          color: dark ? '#EAFBF7' : teal }}>
          <I.check />
        </span>
        Feito por e para artesãs
      </div>
    </div>);

}

/* ─────────────────────────  CAMPO  ───────────────────────── */
function Field({ icon, label, error, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#5C594F', marginBottom: 7 }}>
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: error ? '#E0613F' : 'var(--muted)', display: 'flex', pointerEvents: 'none' }}>
          {icon}
        </span>
        {children}
      </div>
    </label>);

}

/* ─────────────────────────  APP  ───────────────────────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brandPanel": "teal",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter",
  "decor": 70
} /*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [touched, setTouched] = useState({});
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const errorRef = useRef(null);

  // paleta derivada do balanço de cores
  const balance = {
    equilibrado: { orange: '#F97316', teal: '#2A9D8F', tealDeep: '#1F7A6F' },
    'mais laranja': { orange: '#F97316', teal: '#3FA89A', tealDeep: '#2A8377' },
    'mais teal': { orange: '#F4853A', teal: '#1F8E80', tealDeep: '#176A60' }
  }[t.balance] || { orange: '#F97316', teal: '#2A9D8F', tealDeep: '#1F7A6F' };

  const radii = {
    reto: { card: 12, input: 6, btn: 6 },
    suave: { card: 24, input: 10, btn: 10 },
    redondo: { card: 30, input: 14, btn: 14 }
  }[t.roundness] || { card: 24, input: 10, btn: 10 };

  const decorVal = t.decor / 100;
  const palette = { orange: balance.orange, teal: balance.teal, tealDeep: balance.tealDeep };

  useEffect(() => {
    document.documentElement.style.setProperty('--font', `'${t.font}'`);
    document.documentElement.style.setProperty('--orange', palette.orange);
    document.documentElement.style.setProperty('--teal', palette.teal);
    document.documentElement.style.setProperty('--r-card', radii.card + 'px');
    document.documentElement.style.setProperty('--r-input', radii.input + 'px');
    document.documentElement.style.setProperty('--r-btn', radii.btn + 'px');
  }, [t.font, t.balance, t.roundness]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailErr = touched.email && email.trim() === '' ? 'Informe seu e-mail.' :
  touched.email && !emailValid ? 'E-mail inválido.' : '';
  const pwdErr = touched.pwd && pwd === '' ? 'Informe sua senha.' : '';

  function submit(e) {
    e.preventDefault();
    setTouched({ email: true, pwd: true });
    setAuthError(false);
    if (!emailValid || pwd === '') return;
    setLoading(true);
    // mock de autenticação — demonstra o estado de erro
    setTimeout(() => {
      setLoading(false);
      setAuthError(true);
      requestAnimationFrame(() => errorRef.current && errorRef.current.focus());
    }, 950);
  }

  const inputStyle = (active, hasErr) => ({
    width: '100%', height: 48, padding: '0 44px 0 40px',
    border: `1.5px solid ${hasErr ? '#F2B8A6' : active ? palette.teal : 'var(--line)'}`,
    borderRadius: 'var(--r-input)', fontSize: 15, color: 'var(--ink)',
    background: hasErr ? '#FFFBFA' : '#FFFFFF', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
    boxShadow: active ? `0 0 0 4px ${hexA(palette.teal, 0.12)}` : 'none'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <main style={{
        width: 'min(960px, 100%)',
        display: 'grid', gridTemplateColumns: 'var(--cols, 1fr 1fr)',
        background: '#FFFFFF', borderRadius: 'var(--r-card)', overflow: 'hidden',
        boxShadow: '0 20px 60px -28px rgba(31,122,111,0.28), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #F0EEE9',
        animation: 'fadeUp .5s ease both'
      }} className="login-card">

        {/* brand */}
        <div className="brand-col">
          <BrandPanel t={palette} brandPanel={t.brandPanel} decor={decorVal} />
        </div>

        {/* form */}
        <div style={{ padding: '46px 46px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* logo topo (somente mobile) */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <Logo size={34} />
            <Wordmark teal={palette.teal} size={18} />
          </div>

          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Bem-vinda de volta <span style={{ display: 'inline-block', transformOrigin: '70% 70%', animation: 'floaty 3s ease-in-out infinite' }}>👋</span>
          </h1>
          <p style={{ margin: '8px 0 26px', fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            Entre para continuar cuidando dos seus preços e orçamentos.
          </p>

          {/* erro de autenticação */}
          {authError &&
          <div ref={errorRef} tabIndex={-1} role="alert"
          style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: '#FEF3F0', border: '1.5px solid #F6C6B7',
            color: '#C0492B', borderRadius: 'var(--r-input)', padding: '12px 14px',
            marginBottom: 18, fontSize: 13.5, lineHeight: 1.45, outline: 'none',
            opacity: 1, animation: 'shake .45s ease'
          }}>
              <span style={{ color: '#D9603C', flexShrink: 0, marginTop: 1 }}><I.alert /></span>
              <span><strong style={{ fontWeight: 600 }}>E-mail ou senha incorretos.</strong> Tente novamente.</span>
            </div>
          }

          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field icon={<I.mail />} label="E-mail" error={!!emailErr}>
              <input
                type="email" inputMode="email" autoComplete="email"
                placeholder="seuemail@email.com" value={email}
                onChange={(e) => {setEmail(e.target.value);if (authError) setAuthError(false);}}
                onFocus={() => setFocusField('email')}
                onBlur={() => {setFocusField(null);setTouched((s) => ({ ...s, email: true }));}}
                style={inputStyle(focusField === 'email', !!emailErr)} />
              
              {emailErr && <FieldHint>{emailErr}</FieldHint>}
            </Field>

            <Field icon={<I.lock />} label="Senha" error={!!pwdErr}>
              <input
                type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                placeholder="Sua senha" value={pwd}
                onChange={(e) => {setPwd(e.target.value);if (authError) setAuthError(false);}}
                onFocus={() => setFocusField('pwd')}
                onBlur={() => {setFocusField(null);setTouched((s) => ({ ...s, pwd: true }));}}
                style={inputStyle(focusField === 'pwd', !!pwdErr)} />
              
              <button type="button" onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, display: 'grid', placeItems: 'center',
                border: 'none', background: 'transparent', color: 'var(--muted)',
                cursor: 'pointer', borderRadius: 8
              }}>
                {showPwd ? <I.eyeoff /> : <I.eye />}
              </button>
              {pwdErr && <FieldHint>{pwdErr}</FieldHint>}
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
              <a href="#" onClick={(e) => e.preventDefault()}
              style={{ fontSize: 13.5, fontWeight: 500, color: palette.teal, textDecoration: 'none' }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Esqueci minha senha
              </a>
            </div>

            <button type="submit" disabled={loading}
            style={{
              height: 50, marginTop: 4, border: 'none', borderRadius: 'var(--r-btn)',
              background: loading ? hexA(palette.orange, 0.85) : palette.orange,
              color: '#fff', fontSize: 15.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              boxShadow: `0 8px 18px -8px ${hexA(palette.orange, 0.7)}`,
              transition: 'transform .12s, filter .15s, box-shadow .15s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
            onMouseLeave={(e) => {e.currentTarget.style.transform = 'none';e.currentTarget.style.filter = 'none';}}
            onMouseEnter={(e) => {if (!loading) e.currentTarget.style.filter = 'brightness(1.05)';}}>
              {loading ?
              <><Spinner /> Entrando…</> :
              <>Entrar <span style={{ fontSize: 18, marginTop: -1 }}>→</span></>}
            </button>
          </form>

          {/* divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0 18px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 12.5, color: '#B7B4AD', fontWeight: 500 }}>ou</span>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
            Não tem conta?{' '}
            <a href="Cadastro.html"
            style={{ color: palette.orange, fontWeight: 600, textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
              Cadastre-se
            </a>
          </p>
        </div>
      </main>

      {/* TWEAKS */}
      <TweaksPanel>
        <TweakSection label="Painel de marca" />
        <TweakRadio label="Estilo" value={t.brandPanel}
        options={[{ value: 'teal', label: 'Teal' }, { value: 'claro', label: 'Claro' }]}
        onChange={(v) => setTweak('brandPanel', v)} />
        <TweakSlider label="Intensidade decorativa" value={t.decor} min={0} max={100} unit="%"
        onChange={(v) => setTweak('decor', v)} />

        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance}
        options={['mais teal', 'equilibrado', 'mais laranja']}
        onChange={(v) => setTweak('balance', v)} />
        <TweakRadio label="Cantos" value={t.roundness}
        options={['reto', 'suave', 'redondo']}
        onChange={(v) => setTweak('roundness', v)} />

        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font}
        options={['Inter', 'Nunito', 'Plus Jakarta Sans']}
        onChange={(v) => setTweak('font', v)} />

        <TweakSection label="Demonstração" />
        <TweakButton label={authError ? 'Ocultar erro' : 'Mostrar estado de erro'}
        onClick={() => setAuthError((v) => !v)} />
      </TweaksPanel>
    </div>);

}

function FieldHint({ children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6,
      fontSize: 12.5, color: '#C0492B', animation: 'fadeUp .2s ease both' }}>
      <I.alert /> {children}
    </span>);

}

function Spinner() {
  return (
    <span style={{ width: 16, height: 16, borderRadius: '50%',
      border: '2.4px solid rgba(255,255,255,0.45)', borderTopColor: '#fff',
      display: 'inline-block', animation: 'spin .7s linear infinite' }} />);

}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);