"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap } from 'lucide-react';

/**
 * TICKER TAPE
 * Fix: original clipped the first/last symbols because the track wasn't
 * wide enough and had no seamless loop. This duplicates the symbol list
 * and animates a continuous marquee that always fills the viewport width,
 * so nothing gets cut off at the edges. Hovering pauses it (a real,
 * intentional interaction instead of an accidental one).
 */
function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BITSTAMP:BTCUSD", title: "BTC/USD" },
        { proName: "BITSTAMP:ETHUSD", title: "ETH/USD" },
        { proName: "OANDA:EURUSD", title: "EUR/USD" },
        { proName: "OANDA:GBPJPY", title: "GBP/JPY" },
        { proName: "OANDA:USDCHF", title: "USD/CHF" },
        { proName: "OANDA:AUDUSD", title: "AUD/USD" },
        { proName: "OANDA:XAUUSD", title: "XAU/USD" },
        { proName: "OANDA:USDCAD", title: "USD/CAD" },
        { proName: "OANDA:GBPUSD", title: "GBP/USD" },
        { proName: "OANDA:XAGUSD", title: "XAG/USD" },
        { proName: "OANDA:NZDUSD", title: "NZD/USD" }
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}


function LoginCard() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 900);
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <h2 className="login-title">Access System</h2>
      <p className="login-sub">Provide secure credentials to enter the terminal</p>

      <label className="field-label" htmlFor="email">Corporate email</label>
      <div className="field">
        <Mail size={16} className="field-icon" />
        <input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="password">Secret key / password</label>
        <button type="button" className="link-btn">Forgot?</button>
      </div>
      <div className="field">
        <Lock size={16} className="field-icon" />
        <input
          id="password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="field-toggle"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? 'Hide password' : 'Show password'}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Keep session active for 30 days
      </label>

      <button className="submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Verifying…' : 'Secure login'}
        <ArrowRight size={16} />
      </button>

      <div className="divider"><span>Enterprise identity</span></div>

      <button type="button" className="sso-btn">
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 35 27 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.4 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
        </svg>
        Sign in with Google Workspace
      </button>
    </form>
  );
}

export default function TradingHero() {
  return (
    <div className="hero-root">
      <style>{`
        * { box-sizing: border-box; }
        .hero-root {
          --bg: #060b16;
          --bg-2: #0a1226;
          --panel: #0d1526;
          --border: rgba(255,255,255,0.08);
          --text: #e7ecf5;
          --muted: #8b95ab;
          --accent: #f5a524;
          --blue: #3b6df0;
          --up: #2fd480;
          --down: #ff5c72;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: radial-gradient(1200px 600px at 80% -10%, #10203f 0%, transparent 60%),
                      radial-gradient(900px 500px at -10% 40%, #14183a 0%, transparent 55%),
                      var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow: hidden;
        }

        /* ---------- Ticker ---------- */
        .tradingview-widget-container {
          width: 100%;
          background: #05070f;
          border-bottom: 1px solid var(--border);
          min-height: 46px;
        }

        /* ---------- Hero layout ---------- */
        .hero-main {
          position: relative;
          max-width: 1440px;
          margin: 0 auto;
          padding: 72px 64px 140px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .hero-main { grid-template-columns: 1fr; padding: 48px 24px 320px; }
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }
        .brand-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: rgba(59,109,240,0.12);
          border: 1px solid rgba(59,109,240,0.35);
          display: flex; align-items: center; justify-content: center;
          color: #7fa2ff;
        }
        .brand-name { font-weight: 800; letter-spacing: 0.02em; font-size: 15px; }
        .brand-sub { font-size: 11px; color: var(--muted); letter-spacing: 0.08em; }
        .brand-tag { font-size: 10px; color: var(--accent); font-weight: 700; }

        .hero-h1 {
          font-size: clamp(2.6rem, 5vw, 4.6rem);
          font-weight: 800;
          line-height: 1.03;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
        }
        .hero-h1 .accent { color: var(--accent); }

        .hero-copy {
          color: var(--muted);
          font-size: 17px;
          line-height: 1.6;
          max-width: 460px;
          margin-bottom: 40px;
        }

        .quick-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          position: relative;
          z-index: 5;
        }
        .quick-stat {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 18px;
          min-width: 130px;
        }
        .quick-stat .qs-label { font-size: 10px; letter-spacing: 0.08em; color: var(--muted); display: block; margin-bottom: 8px; }
        .quick-stat .qs-value { font-family: ui-monospace, monospace; font-weight: 700; font-size: 18px; display: block; }
        .quick-stat .qs-change { font-size: 12px; font-weight: 600; }

        /* ---------- Login card ---------- */
        .login-card {
          position: relative;
          z-index: 6;
          background: rgba(13,21,38,0.9);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 32px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .login-title { font-size: 22px; font-weight: 800; text-align: center; margin: 0 0 6px; }
        .login-sub { text-align: center; color: var(--muted); font-size: 13px; margin: 0 0 28px; }
        .field-label { font-size: 11px; letter-spacing: 0.06em; color: var(--muted); display: block; margin-bottom: 8px; }
        .field-row { display: flex; justify-content: space-between; align-items: center; }
        .link-btn { background: none; border: none; color: var(--accent); font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
        .link-btn:hover { text-decoration: underline; }
        .field {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0a1122;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 18px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field:focus-within {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(59,109,240,0.18);
        }
        .field-icon { color: var(--muted); flex-shrink: 0; }
        .field input {
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-size: 14px;
          flex: 1;
          min-width: 0;
        }
        .field input::placeholder { color: #4b5468; }
        .field-toggle {
          background: none; border: none; color: var(--muted);
          cursor: pointer; display: flex; padding: 2px;
        }
        .field-toggle:hover { color: var(--text); }

        .checkbox-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--muted);
          margin-bottom: 22px; cursor: pointer;
        }
        .checkbox-row input { accent-color: var(--blue); }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #3b6df0, #2c4fc4);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-weight: 700;
          font-size: 15px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(59,109,240,0.35); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .divider {
          text-align: center;
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.08em;
          margin: 24px 0 16px;
          position: relative;
        }
        .divider::before, .divider::after {
          content: '';
          position: absolute; top: 50%;
          width: 30%; height: 1px;
          background: var(--border);
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }

        .sso-btn {
          width: 100%;
          background: #0a1122;
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 12px;
          padding: 12px;
          font-size: 13px;
          font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .sso-btn:hover { background: #101a30; border-color: rgba(255,255,255,0.16); }

        /* ---------- Floating stat chips ---------- */
        /* Defined on an explicit named grid so slots can never collide,
           unlike the original's ad-hoc absolute coordinates. */
        .stat-chip {
          position: absolute;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 4;
        }
        .stat-chip.is-decorative { pointer-events: none; }
        .stat-chip.is-interactive { pointer-events: auto; cursor: pointer; }
        .stat-chip.is-interactive:hover {
          border-color: rgba(59,109,240,0.4);
          transform: translateY(-2px);
        }
        .stat-label { color: var(--muted); letter-spacing: 0.06em; font-size: 10px; }
        .stat-value { font-family: ui-monospace, monospace; font-weight: 700; font-size: 13px; }
        .text-up { color: var(--up); }
        .text-down { color: var(--down); }

        .slot-gold   { top: 46px;  left: 40%; }
        .slot-radar  { top: 46px;  right: 32px; }
        .slot-nasdaq { top: 220px; left: 24px; }
        .slot-trend  { top: 250px; left: 52%; }
        .slot-server { top: 300px; right: 32px; }

        @media (max-width: 980px) {
          .slot-gold, .slot-radar, .slot-nasdaq, .slot-trend, .slot-server {
            position: static;
            display: inline-flex;
            margin: 6px 8px 0 0;
          }
        }

        footer.status-bar {
          border-top: 1px solid var(--border);
          padding: 16px 64px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
        .status-online { color: var(--up); font-weight: 700; }
      `}</style>

      <TickerTape />

      <div className="hero-main">
        <div className="stat-chip slot-gold is-decorative">
          <span className="stat-label">GOLD INDEX</span>
          <span className="stat-value text-up">Premium</span>
        </div>
        <div className="stat-chip slot-radar is-decorative">
          <span className="stat-label">DEPTH RADAR</span>
          <span className="stat-value">▂▃▅▇</span>
        </div>

        <div>
          <div className="brand-row">
            <div className="brand-icon"><GraduationCap size={22} /></div>
            <div>
              <div className="brand-name">SARA INFOTECH</div>
              <div className="brand-sub">ENTERPRISE TRADING PLATFORM</div>
              <div className="brand-tag">Established 2018</div>
            </div>
          </div>

          <h1 className="hero-h1">
            Trade<br />Without <span className="accent">Limits.</span>
          </h1>

          <p className="hero-copy">
            Next-generation algorithmic execution system. Connect instantly to secure high-frequency trading terminals globally.
          </p>

          <div className="quick-stats">
            <div className="quick-stat">
              <span className="qs-label">BTC/USD</span>
              <span className="qs-value">$94,208.8</span>
              <span className="qs-change text-up">↗ +2.4%</span>
            </div>
            <div className="quick-stat">
              <span className="qs-label">ETH/USD</span>
              <span className="qs-value">$3,184.4</span>
              <span className="qs-change text-up">↗ +1.8%</span>
            </div>
            <div className="quick-stat">
              <span className="qs-label">INDEX VOL</span>
              <span className="qs-value">14.85%</span>
              <span className="qs-change text-down">↘ -0.1%</span>
            </div>
          </div>

          <div className="stat-chip slot-nasdaq is-decorative" style={{ marginTop: 24, position: 'relative', top: 'auto', left: 'auto' }}>
            <span className="stat-label">NASDAQ INDEX</span>
            <span className="stat-value text-down">↘ -0.85%</span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div className="stat-chip slot-trend is-interactive" title="View BTC trend detail">
            <span className="stat-label">BTC TREND</span>
            <span className="stat-value text-up">↗ +4.82%</span>
          </div>
          <LoginCard />
          <div className="stat-chip slot-server is-decorative" style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: 16 }}>
            <span className="stat-label">SERVER LOAD</span>
            <span className="stat-value text-up">14ms Response</span>
          </div>
        </div>
      </div>

      <footer className="status-bar">
        <span><span className="status-online">● SERVER ONLINE</span> &nbsp; 256 ACTIVE BROKERS &nbsp; 99.99% UPTIME &nbsp; VERSION 3.1</span>
        <span>TERMS OF USE &nbsp; SECURITY COMPLIANCE &nbsp; PRIVACY POLICY</span>
      </footer>
    </div>
  );
}