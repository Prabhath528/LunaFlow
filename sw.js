// ================================
// LUNAFLOW PWA INSTALL MANAGER
// Shows install screen BEFORE the app, like WhatsApp Web
// Works on Chrome Desktop, Android Chrome, Edge, Samsung Internet
// iOS Safari: shows Add to Home Screen instructions
// ================================

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────
  const DISMISSED_KEY  = 'luna_pwa_dismissed';
  const INSTALLED_KEY  = 'luna_pwa_installed';
  const DISMISS_DAYS   = 30;
  const OVERLAY_ID     = 'luna-pwa-overlay';

  // ── STATE ────────────────────────────────────────────────────
  let deferredPrompt  = null;
  let overlayMounted  = false;
  let _loaderDone     = false;

  // ── HELPERS ──────────────────────────────────────────────────
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  function isIOS() {
    return /iP(ad|hone|od)/.test(navigator.userAgent) && !window.MSStream;
  }

  function wasDismissedRecently() {
    try {
      const ts = localStorage.getItem(DISMISSED_KEY);
      if (!ts) return false;
      return (Date.now() - +ts) < DISMISS_DAYS * 86400000;
    } catch { return false; }
  }

  function markDismissed() {
    try { localStorage.setItem(DISMISSED_KEY, Date.now()); } catch {}
  }

  function markInstalled() {
    try {
      localStorage.removeItem(DISMISSED_KEY);
      localStorage.setItem(INSTALLED_KEY, Date.now());
    } catch {}
  }

  function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'scale(1.03)';
    setTimeout(() => el.remove(), 380);
    document.body.style.overflow = '';
    overlayMounted = false;
  }

  // ── INJECT STYLES ────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('luna-pwa-styles')) return;
    const s = document.createElement('style');
    s.id = 'luna-pwa-styles';
    s.textContent = `
      @keyframes lunaOverlayIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      @keyframes lunaCardIn {
        from { opacity:0; transform:translateY(32px) scale(.97); }
        to   { opacity:1; transform:translateY(0)    scale(1);   }
      }
      @keyframes lunaSheetIn {
        from { transform:translateY(100%); }
        to   { transform:translateY(0);    }
      }
      @keyframes lunaPulse {
        0%,100% { box-shadow:0 0 40px rgba(233,30,140,.35),0 0 80px rgba(233,30,140,.15); }
        50%      { box-shadow:0 0 65px rgba(233,30,140,.55),0 0 130px rgba(233,30,140,.25); }
      }
      @keyframes lunaSpin {
        to { transform:rotate(360deg); }
      }
      @keyframes lunaSuccessPop {
        0%   { transform:scale(0) rotate(-15deg); opacity:0; }
        60%  { transform:scale(1.18) rotate(4deg); opacity:1; }
        100% { transform:scale(1) rotate(0);       opacity:1; }
      }

      #luna-pwa-overlay {
        position:fixed; inset:0; z-index:2147483647;
        display:flex; align-items:center; justify-content:center;
        padding:20px;
        font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        background:#0d0015;
        overflow:hidden;
        transition:opacity .38s ease, transform .38s ease;
        animation:lunaOverlayIn .4s ease both;
      }

      /* Ambient blobs */
      #luna-pwa-overlay::before {
        content:'';
        position:absolute; inset:0; pointer-events:none;
        background:
          radial-gradient(ellipse 72% 55% at 18% 18%, rgba(233,30,140,.26) 0%, transparent 65%),
          radial-gradient(ellipse 65% 65% at 82% 82%, rgba(123,45,139,.32) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 55% 5%,  rgba(255,77,166,.13) 0%, transparent 60%);
      }

      /* ── DESKTOP CARD ── */
      .luna-card {
        position:relative; z-index:1;
        background:rgba(255,255,255,.045);
        border:1px solid rgba(255,255,255,.11);
        border-radius:32px;
        padding:40px 32px 32px;
        max-width:400px; width:100%;
        backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
        box-shadow:0 48px 96px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1);
        animation:lunaCardIn .5s cubic-bezier(.22,.61,.36,1) .05s both;
        text-align:center;
      }

      .luna-moon {
        width:92px; height:92px; border-radius:50%;
        background:linear-gradient(145deg,rgba(255,77,166,.28),rgba(123,45,139,.38));
        border:1.5px solid rgba(255,77,166,.45);
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 26px;
        animation:lunaPulse 3.6s ease-in-out infinite;
        position:relative;
      }
      .luna-moon::before {
        content:'';
        position:absolute; inset:10px; border-radius:50%;
        background:linear-gradient(145deg,rgba(233,30,140,.32),rgba(156,39,176,.42));
        border:1px solid rgba(255,255,255,.1);
      }
      .luna-moon-emoji { font-size:38px; position:relative; z-index:1;
        filter:drop-shadow(0 0 14px rgba(233,30,140,.9)); }

      .luna-badge {
        display:inline-flex; align-items:center; gap:5px;
        background:rgba(233,30,140,.18); border:1px solid rgba(233,30,140,.36);
        border-radius:100px; padding:5px 15px; margin-bottom:14px;
        font-size:10px; font-weight:700; color:#ff88cc;
        letter-spacing:.9px; text-transform:uppercase;
      }

      .luna-title {
        font-size:30px; font-weight:800; color:#fff;
        line-height:1.1; margin-bottom:8px; letter-spacing:-.4px;
      }
      .luna-title em { color:#ff77bb; font-style:italic; font-weight:300; }

      .luna-desc {
        font-size:14px; color:rgba(255,255,255,.58);
        line-height:1.7; margin-bottom:26px; font-weight:400;
      }

      .luna-benefits {
        background:rgba(255,255,255,.048);
        border:1px solid rgba(255,255,255,.09);
        border-radius:18px; padding:16px 18px;
        margin-bottom:26px; text-align:left;
        display:flex; flex-direction:column; gap:12px;
      }
      .luna-benefit {
        display:flex; align-items:center; gap:13px;
        font-size:13px; color:rgba(255,255,255,.8); font-weight:500;
      }
      .luna-benefit-icon {
        width:30px; height:30px; border-radius:50%; flex-shrink:0;
        background:rgba(233,30,140,.18); border:1px solid rgba(233,30,140,.35);
        display:flex; align-items:center; justify-content:center; font-size:15px;
      }

      .luna-btn-primary {
        width:100%; padding:16px 24px; border:none; border-radius:100px;
        background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);
        color:#fff; font-family:inherit; font-size:15px; font-weight:700;
        cursor:pointer; letter-spacing:.2px;
        box-shadow:0 12px 36px rgba(233,30,140,.5);
        transition:all .25s; display:flex; align-items:center;
        justify-content:center; gap:8px; margin-bottom:10px;
        touch-action:manipulation; position:relative; overflow:hidden;
      }
      .luna-btn-primary:hover { transform:translateY(-2px); box-shadow:0 16px 44px rgba(233,30,140,.6); }
      .luna-btn-primary:active { transform:scale(.97); }
      .luna-btn-primary:disabled { opacity:.55; cursor:not-allowed; }

      .luna-btn-secondary {
        width:100%; padding:14px 24px;
        border:1px solid rgba(255,255,255,.16); border-radius:100px;
        background:transparent; color:rgba(255,255,255,.5);
        font-family:inherit; font-size:14px; font-weight:600;
        cursor:pointer; transition:all .2s; touch-action:manipulation;
      }
      .luna-btn-secondary:hover {
        background:rgba(255,255,255,.07); color:rgba(255,255,255,.85);
        border-color:rgba(255,255,255,.28);
      }

      .luna-spinner {
        display:none; width:18px; height:18px;
        border:2.5px solid rgba(255,255,255,.3);
        border-top-color:#fff; border-radius:50%;
        animation:lunaSpin .7s linear infinite; flex-shrink:0;
      }
      .luna-btn-text { transition:opacity .15s; }

      /* ── iOS BOTTOM SHEET ── */
      #luna-pwa-overlay.luna-ios-mode {
        align-items:flex-end;
        background:rgba(0,0,0,.55);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        padding:0;
      }
      .luna-sheet {
        background:#1c0a28;
        border:1px solid rgba(255,255,255,.1);
        border-radius:28px 28px 0 0;
        padding:28px 24px calc(28px + env(safe-area-inset-bottom,0px));
        width:100%; max-width:540px;
        animation:lunaSheetIn .42s cubic-bezier(.22,.61,.36,1) both;
        box-shadow:0 -20px 60px rgba(0,0,0,.65);
        text-align:center;
      }
      .luna-sheet-handle {
        width:44px; height:5px; border-radius:100px;
        background:rgba(255,255,255,.2); margin:0 auto 22px;
      }
      .luna-sheet-moon {
        width:68px; height:68px; border-radius:50%; margin:0 auto 16px;
        background:linear-gradient(145deg,rgba(255,77,166,.25),rgba(123,45,139,.35));
        border:1.5px solid rgba(255,77,166,.4);
        display:flex; align-items:center; justify-content:center;
        font-size:28px; box-shadow:0 0 28px rgba(233,30,140,.3);
      }
      .luna-sheet-title {
        font-size:24px; font-weight:800; color:#fff; margin-bottom:6px;
      }
      .luna-sheet-sub {
        font-size:13px; color:rgba(255,255,255,.52);
        line-height:1.65; margin-bottom:22px;
      }
      .luna-steps {
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.09);
        border-radius:18px; padding:16px 18px;
        margin-bottom:22px;
        display:flex; flex-direction:column; gap:13px; text-align:left;
      }
      .luna-step {
        display:flex; align-items:center; gap:14px;
        font-size:14px; color:rgba(255,255,255,.82); font-weight:500; line-height:1.5;
      }
      .luna-step-num {
        width:32px; height:32px; border-radius:50%; flex-shrink:0;
        background:linear-gradient(135deg,#e91e8c,#9c27b0);
        color:#fff; font-size:14px; font-weight:800;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 12px rgba(233,30,140,.4);
      }
      .luna-step-tag {
        display:inline-block; background:rgba(255,255,255,.13);
        border-radius:6px; padding:1px 8px; font-size:13px; color:#fff; margin:0 2px;
      }

      /* ── SUCCESS ── */
      .luna-success-wrap {
        position:fixed; inset:0; z-index:2147483647;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        background:linear-gradient(170deg,#1a0a1e,#2d0a3a,#4a0e5c);
        font-family:'DM Sans',-apple-system,sans-serif;
        animation:lunaOverlayIn .35s ease both;
        transition:opacity .38s ease;
      }
      .luna-success-emoji {
        font-size:80px; margin-bottom:18px;
        animation:lunaSuccessPop .6s cubic-bezier(.22,.61,.36,1) .1s both;
        filter:drop-shadow(0 0 24px rgba(233,30,140,.8));
      }
      .luna-success-title { font-size:28px; font-weight:800; color:#fff; margin-bottom:8px; }
      .luna-success-sub   { font-size:14px; color:rgba(255,255,255,.52); }

      @media (max-width:440px) {
        .luna-card { padding:32px 20px 24px; border-radius:26px; }
        .luna-title { font-size:26px; }
      }
      @media (prefers-reduced-motion:reduce) {
        #luna-pwa-overlay, .luna-card, .luna-sheet, .luna-success-wrap { animation:none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── DESKTOP / ANDROID OVERLAY ────────────────────────────────
  function showInstallOverlay() {
    if (overlayMounted) return;
    overlayMounted = true;
    injectStyles();

    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.innerHTML = `
      <div class="luna-card" role="dialog" aria-modal="true" aria-labelledby="luna-h1">
        <div class="luna-moon"><span class="luna-moon-emoji">🌙</span></div>
        <div class="luna-badge">✦ Install App</div>
        <h1 class="luna-title" id="luna-h1">LunaFlow<br><em>Cycle Tracker</em></h1>
        <p class="luna-desc">
          Install the app for a faster, offline-ready experience —
          just like WhatsApp or any native app.
        </p>
        <div class="luna-benefits">
          <div class="luna-benefit"><div class="luna-benefit-icon">⚡</div><span>Instant launch from your home screen</span></div>
          <div class="luna-benefit"><div class="luna-benefit-icon">📴</div><span>Works fully offline — no internet needed</span></div>
          <div class="luna-benefit"><div class="luna-benefit-icon">🔒</div><span>All data stays privately on your device</span></div>
          <div class="luna-benefit"><div class="luna-benefit-icon">🔔</div><span>Cycle &amp; ovulation reminders</span></div>
        </div>
        <button class="luna-btn-primary" id="luna-install-btn">
          <div class="luna-spinner" id="luna-spinner"></div>
          <span class="luna-btn-text" id="luna-btn-text">📲 &nbsp;Install Now — It's Free</span>
        </button>
        <button class="luna-btn-secondary" id="luna-dismiss-btn">
          Continue in browser without installing
        </button>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(el);

    document.getElementById('luna-install-btn').onclick = handleInstall;
    document.getElementById('luna-dismiss-btn').onclick  = handleDismiss;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      alert('To install, click the install icon (⊕) in your browser address bar, or open the browser menu and choose "Install app".');
      return;
    }
    const btn  = document.getElementById('luna-install-btn');
    const spin = document.getElementById('luna-spinner');
    const txt  = document.getElementById('luna-btn-text');
    btn.disabled = true;
    spin.style.display = 'block';
    txt.style.opacity  = '0';
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome !== 'accepted') {
        btn.disabled = false;
        spin.style.display = 'none';
        txt.style.opacity  = '1';
      }
      // If accepted, appinstalled fires and handles cleanup
    } catch (err) {
      console.warn('[LunaPWA]', err);
      btn.disabled = false;
      spin.style.display = 'none';
      txt.style.opacity  = '1';
    }
  }

  function handleDismiss() {
    markDismissed();
    removeOverlay();
  }

  // ── iOS BOTTOM SHEET ─────────────────────────────────────────
  function showIOSSheet() {
    if (overlayMounted) return;
    overlayMounted = true;
    injectStyles();

    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.className = 'luna-ios-mode'; // triggers bottom-sheet layout via CSS
    el.innerHTML = `
      <div class="luna-sheet" role="dialog" aria-modal="true">
        <div class="luna-sheet-handle"></div>
        <div class="luna-sheet-moon">🌙</div>
        <div class="luna-sheet-title">Add to Home Screen</div>
        <p class="luna-sheet-sub">Install LunaFlow in 4 quick steps for the full app experience.</p>
        <div class="luna-steps">
          <div class="luna-step"><div class="luna-step-num">1</div><span>Tap the <span class="luna-step-tag">⎋ Share</span> button at the bottom of Safari</span></div>
          <div class="luna-step"><div class="luna-step-num">2</div><span>Scroll down and tap <span class="luna-step-tag">＋ Add to Home Screen</span></span></div>
          <div class="luna-step"><div class="luna-step-num">3</div><span>Keep the name <strong style="color:#ff88cc">LunaFlow</strong> then tap <span class="luna-step-tag">Add</span></span></div>
          <div class="luna-step"><div class="luna-step-num">4</div><span>Open LunaFlow from your home screen 🎉</span></div>
        </div>
        <button class="luna-btn-primary" id="luna-ios-confirm">✓ &nbsp;I've Added It — Open App</button>
        <button class="luna-btn-secondary" id="luna-ios-dismiss">Maybe Later</button>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(el);

    document.getElementById('luna-ios-confirm').onclick = () => { markInstalled(); removeOverlay(); showSuccess(); };
    document.getElementById('luna-ios-dismiss').onclick = () => { markDismissed(); removeOverlay(); };
  }

  // ── SUCCESS FLASH ─────────────────────────────────────────────
  function showSuccess() {
    injectStyles();
    const el = document.createElement('div');
    el.className = 'luna-success-wrap';
    el.innerHTML = `
      <div class="luna-success-emoji">🌸</div>
      <div class="luna-success-title">You're all set!</div>
      <div class="luna-success-sub">LunaFlow is ready on your home screen</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2200);
  }

  // ── CORE DECISION ────────────────────────────────────────────
  function maybeShow() {
    if (isStandalone())          return; // already installed
    if (wasDismissedRecently())  return; // user said "later"
    if (isIOS())  { showIOSSheet();      return; }
    if (deferredPrompt) showInstallOverlay();
  }

  function _scheduleAfterLoader(cb) {
    if (_loaderDone) { cb(); return; }
    let fired = false;
    const run = () => { if (fired) return; fired = true; clearTimeout(t); cb(); };
    const t   = setTimeout(run, 5000);
    window.addEventListener('loaderDone', run, { once: true });
  }

  // ── EVENT WIRING ─────────────────────────────────────────────

  // Record loaderDone ASAP
  window.addEventListener('loaderDone', () => { _loaderDone = true; }, { once: true });

  // Capture install eligibility
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[LunaPWA] beforeinstallprompt captured');
    // Show after loader (or immediately if no loader)
    _scheduleAfterLoader(maybeShow);
  });

  // After successful install via OS dialog
  window.addEventListener('appinstalled', () => {
    console.log('[LunaPWA] appinstalled event');
    markInstalled();
    removeOverlay();
    showSuccess();
    deferredPrompt = null;
  });

  // iOS: show after DOM ready (no beforeinstallprompt on iOS)
  if (isIOS() && !isStandalone() && !wasDismissedRecently()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(showIOSSheet, 500));
    } else {
      setTimeout(showIOSSheet, 500);
    }
  }

  console.log('[LunaPWA] Manager loaded | standalone:', isStandalone(), '| iOS:', isIOS());

})();
