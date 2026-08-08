import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens documentados no CLAUDE.md
        teal: {
          DEFAULT: '#2A9D8F',
          deep:    '#1E7268',
        },
        orange:  '#F97316',
        dark:    '#3A372F',
        line:    '#EFEDE8',
        app:     '#FAFAF8',   // bg do sistema (era bg no CLAUDE.md)
        azul:    '#3A6FA0',   // destaque de custo

        // Tokens não documentados mas usados 100+ vezes no código
        muted:   '#A29E96',   // cinza secundário (labels, placeholders)
        body:    '#5C594F',   // cinza texto (parágrafos, descrições)
        subtle:  '#7C786F',   // cinza intermediário
        faint:   '#B7B4AD',   // cinza muito claro (desabilitado)

        // Tons de linha/borda
        'line-soft': '#F1F0EC',  // hover de fundo, bordas suaves
        'line-deep': '#E9E7E2',  // hover mais forte

        // Danger
        danger: {
          DEFAULT: '#C0492B',
          deep:    '#B23A1E',
          bg:      '#FBEDE9',
          'bg-soft': '#FEF2F2',
        },

        // Success
        success: {
          DEFAULT: '#1F8A5B',
          bg:      '#E8F5EE',
        },

        // Warning
        warning: {
          DEFAULT: '#C8721F',
          bg:      '#FFF1E8',
          // #139 — consolida a família laranja/vermelho de aviso hardcoded
          // (#E05C3A, #A35A26, #D9603C, #EC7A2C), média ponderada por frequência —
          // não fica perto o bastante de `warning` nem `danger` pra reaproveitar (~20/255 de distância dos dois).
          alt: '#C65D31',
        },

        // #139 — famílias de hex hardcoded sem token, formalizadas (P-FE-CORRIGE-022)
        // Cinza-texto: consolida #A8A49C, #9A968E, #6B6860, #8A8780, #CFCBC3, #B0ACA4
        // (média ponderada por frequência — distinto de `muted`, que não cobre bem os tons mais escuros da família).
        dim: '#9A968E',
        // Quase-branco: consolida #FAF8F5, #FCFBF9, #FBFAF8, #F7F5F1, #F6F4F0, #F4F2EE, #FAF9F6
        // (valor mais frequente, coincide com a média ponderada).
        cream: '#FAF8F5',
      },
      borderRadius: {
        btn:   '10px',   // --r-btn
        input: '10px',   // --r-input
        card:  '16px',   // --r-card
      },
      spacing: {
        // #204 — ritmo vertical entre seções (mt/gap), documentado no CLAUDE.md
        section: '18px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                          to: { opacity: '1' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        fadeUp:      { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop:         { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        spin:        { to: { transform: 'rotate(360deg)' } },
        shake:       { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-4px)' }, '40%,80%': { transform: 'translateX(4px)' } },
        flash:       { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        slideInRight:{ from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        toastIn:     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        rowIn:       { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        floaty:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'fade-in':       'fadeIn .2s ease both',
        'scale-in':      'scaleIn .22s cubic-bezier(.34,1.3,.5,1) both',
        'fade-up':       'fadeUp .35s ease both',
        'pop':           'pop .14s ease both',
        'spin':          'spin 0.8s linear infinite',
        'shake':         'shake .45s ease',
        'flash':         'flash .6s ease',
        'slide-in-right':'slideInRight .28s cubic-bezier(.34,1.3,.5,1) both',
        'toast-in':      'toastIn .3s cubic-bezier(.34,1.3,.5,1) both',
        'row-in':        'rowIn .25s ease both',
        'floaty':        'floaty 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
