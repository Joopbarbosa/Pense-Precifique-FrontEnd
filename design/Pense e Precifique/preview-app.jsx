/* preview-app.jsx — Tela 7 · Preview do Orçamento (PDF) · Pense & Precifique */
const { useState, useEffect } = React;

/* ─────────  LOGO / WORDMARK  ───────── */
function Logo({ size = 40 }) {
  return <img src="logo.png" width={size} height={size} alt="Pense & Precifique"
  style={{ display: 'block', objectFit: 'contain', transform: 'translateX(3%)' }} />;
}
function Wordmark({ teal = '#2A9D8F', size = 15.5 }) {
  return (
    <span style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.01em', lineHeight: 1.05 }}>
      <span style={{ color: teal }}>Pense</span><span style={{ color: '#F97316', margin: '0 1px' }}>&amp;</span><span style={{ color: '#3A372F' }}>Precifique</span>
    </span>);
}

/* ─────────  ÍCONES  ───────── */
const sw = { strokeWidth: 1.7, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = {
  grid: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></svg>,
  users: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="9" cy="8" r="3.3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2M17.5 19a5.4 5.4 0 0 0-2.3-4.4" /></svg>,
  doc: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M13 3.5V9h5" /><path d="M8.5 13.5h7M8.5 16.5h5" /></svg>,
  box: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6L12 3.2Z" /><path d="M4 7.6 12 12l8-4.4M12 12v8.8" /></svg>,
  cube: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" /><path d="M3.5 7 12 11.4 20.5 7M12 11.4V21.2" /></svg>,
  factory: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M3.5 20.5V10l5 3V10l5 3V8.5l5 2.5v9.5z" /><path d="M3.5 20.5h17" /></svg>,
  gear: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.4 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.4a1.7 1.7 0 0 0 1-1.6V2.7a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.4a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2" /></svg>,
  logout: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5" /><path d="M16 12H9.5M16 12l-2.6-2.6M16 12l-2.6 2.6" /></svg>,
  back: (p) => <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M11 6.5 5.5 12 11 17.5M5.5 12H19" /></svg>,
  download: (p) => <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></svg>,
  send: (p) => <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M20 4 3.5 11l6.5 2.5M20 4l-6 16-4-6.5M20 4 10 13.5" /></svg>,
  arrow: (p) => <svg viewBox="0 0 24 24" width="17" height="17" {...sw} {...p}><path d="M5 12h13M13 6.5 18.5 12 13 17.5" /></svg>,
  chevron: (p) => <svg viewBox="0 0 24 24" width="15" height="15" {...sw} {...p}><path d="m9 6 6 6-6 6" /></svg>,
  phone: (p) => <svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><path d="M6.5 4.5h3l1.2 3.2-1.7 1.3a11 11 0 0 0 4.7 4.7l1.3-1.7 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z" /></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" width="13" height="13" {...sw} {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 5.5L20 7" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="16" height="16" {...sw} {...p}><path d="m5 12.5 4.2 4.2L19 7" strokeWidth="2.2" /></svg>,
  menu: (p) => <svg viewBox="0 0 24 24" width="24" height="24" {...sw} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width="22" height="22" {...sw} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  bell: (p) => <svg viewBox="0 0 24 24" width="20" height="20" {...sw} {...p}><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6Z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></svg>,
  draft: (p) => <svg viewBox="0 0 24 24" width="14" height="14" {...sw} {...p}><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="M13.5 6.5 17.5 10.5" /></svg>,
  wallet: (p) => <svg viewBox="0 0 24 24" width="18" height="18" {...sw} {...p}><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1.5 1.5 0 0 1 1.5 1.5V9M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-2.5M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5V12" /><path d="M20 12h-3.2a1.8 1.8 0 0 0 0 3.6H20V12Z" /></svg>
};

/* ─────────  SIDEBAR  ───────── */
const NAV = [
{ id: 'dashboard', label: 'Dashboard', icon: I.grid, href: 'Dashboard.html' },
{ id: 'clientes', label: 'Clientes', icon: I.users, href: 'Clientes.html' },
{ id: 'orcamentos', label: 'Orçamentos', icon: I.doc, href: '#' },
{ id: 'insumos', label: 'Insumos', icon: I.box, href: '#' },
{ id: 'produtos', label: 'Produtos', icon: I.cube, href: '#' },
{ id: 'producao', label: 'Produção', icon: I.factory, href: '#' },
{ id: 'config', label: 'Configurações', icon: I.gear, href: '#' }];

function Sidebar({ teal, active, open, onClose }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--line)' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, background: '#fff', border: '1px solid #EFEDE8', borderRadius: 13, boxShadow: '0 2px 7px rgba(0,0,0,0.07)' }}><Logo size={32} /></span>
        <div style={{ lineHeight: 1.15 }}>
          <Wordmark teal={teal} size={15.5} />
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>Para artesãs</div>
        </div>
        <button onClick={onClose} aria-label="Fechar menu" className="drawer-close" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}><I.x /></button>
      </div>
      <nav style={{ flex: 1, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
        {NAV.map((it) => {const on = it.id === active;return (
            <a key={it.id} href={it.href} onClick={(e) => {if (it.href === '#') e.preventDefault();onClose();}}
            style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 13px', borderRadius: 11, textDecoration: 'none',
              fontSize: 14.5, fontWeight: on ? 600 : 500, color: on ? 'var(--orange)' : '#5C594F',
              background: on ? 'var(--orange-soft)' : 'transparent', boxShadow: on ? 'inset 3px 0 0 var(--orange)' : 'none', transition: 'background .14s' }}
            onMouseEnter={(e) => {if (!on) e.currentTarget.style.background = '#FAF8F5';}}
            onMouseLeave={(e) => {if (!on) e.currentTarget.style.background = 'transparent';}}>
            <span style={{ display: 'flex', color: on ? 'var(--orange)' : '#A29E96' }}><it.icon /></span>{it.label}
          </a>);})}
      </nav>
      <div style={{ padding: '12px 14px 18px', borderTop: '1px solid var(--line)' }}>
        <a href="Login.html" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 13px', borderRadius: 11, textDecoration: 'none', fontSize: 14.5, fontWeight: 500, color: '#7C786F' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#FAF8F5'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{ display: 'flex', color: '#A29E96' }}><I.logout /></span> Sair
        </a>
      </div>
    </aside>);
}

/* ─────────  HELPERS  ───────── */
function hexA(hex, a) {
  const h = hex.replace('#', '');const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

/* logo do documento (cabeçalho do PDF) */
function DocLogo({ teal, orange, size = 54 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: size, height: size, flexShrink: 0 }}>
      <img src="logo.png" width={size} height={size} alt="" style={{ objectFit: 'contain' }} />
    </span>);
}

/* ─────────  BADGE STATUS  ───────── */
const STATUS = {
  rascunho: { label: 'Rascunho', bg: '#F1F0EC', fg: '#7C786F', dot: '#A8A49C', icon: I.draft },
  enviado: { label: 'Enviado', bg: '#EAF1FB', fg: '#2A6FB0', dot: '#3A86CE', icon: I.send },
  aprovado: { label: 'Aprovado', bg: '#E8F5EE', fg: '#1F8A5B', dot: '#34A56F', icon: I.check }
};
function StatusBadge({ status }) {
  const s = STATUS[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 13px', borderRadius: 999,
      background: s.bg, color: s.fg, fontSize: 13, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />{s.label}
    </span>);
}

/* ─────────  DOCUMENTO A4  ───────── */
const ITENS = [
{ nome: 'Kit Convite Casamento', custom: 'Laminação fosca', qtd: 3, unit: 53, total: 159 },
{ nome: 'Etiqueta personalizada', custom: '—', qtd: 10, unit: 4.5, total: 45 }];

const BRL = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Documento({ teal, orange, status, sinal }) {
  const sinalValor = 91.8,restante = 91.8;
  return (
    <div className="a4" style={{ animation: 'fadeUp .4s ease both' }}>
      {/* cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: `2px solid ${hexA(teal, 0.25)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DocLogo teal={teal} orange={orange} size={56} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Pense &amp; Crie Studio</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, fontSize: 12, color: '#7C786F' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ color: teal, display: 'flex' }}><I.mail /></span>penseecrie@email.com</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ color: teal, display: 'flex' }}><I.phone /></span>(11) 98888-1234</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: teal }}>Orçamento</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>#0042</div>
        </div>
      </div>

      {/* meta + cliente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '22px 0', borderBottom: '1px solid #F0EEE9' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 8 }}>Datas</div>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div>Emissão: <strong style={{ fontWeight: 600 }}>04/06/2026</strong></div>
            <div>Validade: <strong style={{ fontWeight: 600 }}>11/06/2026</strong></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 8 }}>Cliente</div>
          <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Mariana Costa</div>
            <div style={{ color: '#7C786F' }}>(11) 99999-0000</div>
          </div>
        </div>
      </div>

      {/* tabela */}
      <table className="a4-table" style={{ marginTop: 22 }}>
        <thead>
          <tr>
            <th>Produto</th><th>Customizações</th>
            <th className="num">Qtd</th><th className="num">Valor unit.</th><th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {ITENS.map((it, i) =>
          <tr key={i}>
              <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{it.nome}</td>
              <td style={{ color: it.custom === '—' ? '#C0BCB4' : '#5C594F' }}>{it.custom}</td>
              <td className="num">{it.qtd}</td>
              <td className="num">{BRL(it.unit)}</td>
              <td className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{BRL(it.total)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* condições de pagamento (quando sinal ativo) */}
      {sinal &&
      <div style={{ marginTop: 24, padding: '16px 18px', borderRadius: 12, border: `1.5px solid ${hexA(teal, 0.4)}`, background: hexA(teal, 0.05) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: '#fff', color: teal, border: `1px solid ${hexA(teal, 0.25)}` }}><I.wallet width="16" height="16" /></span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Entrada solicitada</div>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#5C594F', lineHeight: 1.55 }}>Para iniciar a produção, solicitamos o pagamento de 50% do valor total.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: `1px solid ${hexA(teal, 0.2)}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: teal }}>Valor do sinal</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: teal, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(sinalValor)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 13px', borderRadius: 9, background: '#fff', border: '1px solid #F0EEE9' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B0ACA4' }}>Restante na entrega</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{BRL(restante)}</div>
            </div>
          </div>
        </div>
      }

      {/* totais */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <div style={{ width: 'min(320px, 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '7px 10px' }}>
            <span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{BRL(204)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#5C594F', padding: '7px 10px' }}>
            <span>Desconto (10%)</span><span style={{ color: '#C0492B', fontVariantNumeric: 'tabular-nums' }}>− {BRL(20.4)}</span>
          </div>
          {sinal &&
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', padding: '8px 12px', borderRadius: 9, background: hexA(teal, 0.07), border: `1px dashed ${hexA(teal, 0.4)}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: teal }}><I.wallet width="14" height="14" /> Sinal solicitado (50%)</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: teal, fontVariantNumeric: 'tabular-nums' }}>{BRL(sinalValor)}</span>
            </div>
          }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, padding: '12px 14px', borderRadius: 10, background: 'var(--orange-soft)', border: `1px solid ${hexA(orange, 0.25)}` }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>Total</span>
            <span style={{ fontSize: 21, fontWeight: 700, color: orange, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{BRL(183.6)}</span>
          </div>
          {sinal &&
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5C594F', padding: '9px 10px 0' }}>
              <span>Restante após sinal</span><span style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{BRL(restante)}</span>
            </div>
          }
        </div>
      </div>

      {/* observações */}
      <div style={{ marginTop: 26, padding: '16px 18px', borderRadius: 10, background: '#FBFAF8', border: '1px solid #F0EEE9' }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0ACA4', marginBottom: 6 }}>Observações</div>
        <div style={{ fontSize: 13, color: '#3A372F', lineHeight: 1.6 }}>Prazo de entrega: 10 dias úteis após aprovação{sinal ? ' e recebimento do sinal' : ''}.</div>
      </div>

      {/* rodapé */}
      <div style={{ marginTop: 'auto', paddingTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18, borderTop: '1px solid #F0EEE9', fontSize: 12, color: '#9A968E' }}>
          <span style={{ display: 'flex', color: teal }}><I.doc width="15" height="15" /></span>
          Este orçamento é válido até <strong style={{ fontWeight: 600, color: '#6B6860', margin: '0 3px' }}>11/06/2026</strong>.
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Gerado com <Wordmark teal={teal} size={11.5} />
          </span>
        </div>
        {/* cláusula de cancelamento */}
        <p style={{ margin: '14px 0 0', fontSize: 10.5, lineHeight: 1.55, color: '#B0ACA4' }}>
          Em caso de cancelamento após aprovação, poderá ser cobrado uma taxa de 50% do valor total (
          <span style={{ fontWeight: 600, color: '#9A968E' }}>{BRL(91.8)}</span>) referente aos materiais e tempo já investidos na produção.
        </p>
      </div>
    </div>);
}

/* ─────────  BOTÕES DA BARRA  ───────── */
function ActionBtn({ children, variant, teal, orange, onClick }) {
  const base = { height: 44, padding: '0 18px', borderRadius: 'var(--r-btn)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'filter .15s, background .15s, transform .12s' };
  const styles = {
    ghost: { ...base, border: '1.5px solid var(--line)', background: '#fff', color: '#5C594F' },
    teal: { ...base, border: 'none', background: teal, color: '#fff', boxShadow: `0 8px 18px -8px ${hexA(teal, 0.7)}` },
    orange: { ...base, border: 'none', background: orange, color: '#fff', boxShadow: `0 8px 18px -8px ${hexA(orange, 0.7)}` }
  };
  return (
    <button onClick={onClick} style={styles[variant]}
    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
    onMouseEnter={(e) => {if (variant === 'ghost') e.currentTarget.style.background = '#FAF8F5';else e.currentTarget.style.filter = 'brightness(1.05)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = 'none';e.currentTarget.style.filter = 'none';if (variant === 'ghost') e.currentTarget.style.background = '#fff';}}>
      {children}
    </button>);
}

/* ─────────  APP  ───────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "status": "rascunho",
  "sinal": "ativo",
  "balance": "equilibrado",
  "roundness": "suave",
  "font": "Inter"
} /*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState(t.status);

  const palette = {
    equilibrado: { orange: '#F97316', teal: '#2A9D8F' },
    'mais laranja': { orange: '#F97316', teal: '#3FA89A' },
    'mais teal': { orange: '#F4853A', teal: '#1F8E80' }
  }[t.balance] || { orange: '#F97316', teal: '#2A9D8F' };
  const radii = { reto: { card: 12, btn: 6 }, suave: { card: 16, btn: 10 }, redondo: { card: 22, btn: 14 } }[t.roundness] || { card: 16, btn: 10 };
  const teal = palette.teal,orange = palette.orange;

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--font', `'${t.font}'`);r.setProperty('--orange', orange);r.setProperty('--teal', teal);
    r.setProperty('--r-card', radii.card + 'px');r.setProperty('--r-btn', radii.btn + 'px');
  }, [t.font, t.balance, t.roundness]);
  useEffect(() => {setStatus(t.status);}, [t.status]);

  const enviado = status === 'enviado' || status === 'aprovado';

  return (
    <div className="app-shell">
      <div className={'scrim' + (sidebarOpen ? ' show' : '')} onClick={() => setSidebarOpen(false)} />
      <Sidebar teal={teal} active="orcamentos" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-area">
        <div className="mobile-topbar">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', display: 'flex', padding: 4 }}><I.menu /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo size={26} /><Wordmark teal={teal} size={14} /></div>
          <button aria-label="Notificações" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}><I.bell /></button>
        </div>

        {/* BARRA DE AÇÕES */}
        <div style={{ background: '#fff', borderBottom: '1px solid var(--line)', padding: '14px 28px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              {/* breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={(e) => e.currentTarget.style.color = teal} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}>Orçamentos</a>
                <span style={{ display: 'flex', color: '#CFCBC3' }}><I.chevron /></span>
                <span style={{ color: '#5C594F', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#0042 — Mariana Costa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Preview do orçamento</h1>
                <StatusBadge status={status} />
              </div>
            </div>

            {/* botões */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!enviado &&
              <a href="Criar-Orcamento.html" style={{ textDecoration: 'none' }}>
                  <ActionBtn variant="ghost" teal={teal} orange={orange}><I.back /> Editar orçamento</ActionBtn>
                </a>
              }
              <ActionBtn variant="teal" teal={teal} orange={orange}><I.download /> Baixar PDF</ActionBtn>
              {!enviado ?
              <ActionBtn variant="orange" teal={teal} orange={orange} onClick={() => setStatus('enviado')}><I.send /> Marcar como Enviado <I.arrow /></ActionBtn> :

              <ActionBtn variant="orange" teal={teal} orange={orange} onClick={() => setStatus('aprovado')}><I.check /> Marcar como Aprovado <I.arrow /></ActionBtn>
              }
            </div>
          </div>
        </div>

        {/* DOCUMENTO */}
        <div className="doc-scroll">
          <div className="doc-wrap">
            <Documento teal={teal} orange={orange} status={status} sinal={t.sinal === 'ativo'} />
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Estado do orçamento" />
        <TweakRadio label="Status" value={t.status}
        options={[{ value: 'rascunho', label: 'Rascunho' }, { value: 'enviado', label: 'Enviado' }, { value: 'aprovado', label: 'Aprovado' }]}
        onChange={(v) => setTweak('status', v)} />
        <TweakRadio label="Entrada (sinal)" value={t.sinal}
        options={[{ value: 'ativo', label: 'Com sinal' }, { value: 'inativo', label: 'Sem sinal' }]}
        onChange={(v) => setTweak('sinal', v)} />
        <TweakSection label="Cor & forma" />
        <TweakRadio label="Equilíbrio de cor" value={t.balance} options={['mais teal', 'equilibrado', 'mais laranja']} onChange={(v) => setTweak('balance', v)} />
        <TweakRadio label="Cantos" value={t.roundness} options={['reto', 'suave', 'redondo']} onChange={(v) => setTweak('roundness', v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Fonte" value={t.font} options={['Inter', 'Nunito', 'Plus Jakarta Sans']} onChange={(v) => setTweak('font', v)} />
      </TweaksPanel>
    </div>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);