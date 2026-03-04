// ================================================================
// LUNAFLOW — AUTO PWA INSTALL
// One click = automatic install, no guides, no manual steps
// ================================================================

(function () {
  'use strict';

  const SKIP_KEY  = 'luna_skip';
  const SKIP_DAYS = 3;

  let deferredPrompt = null;  // holds the browser's install event
  let overlayEl      = null;

  // ── helpers ────────────────────────────────────────────────
  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || navigator.standalone === true
        || document.referrer.startsWith('android-app://');
  }

  function skippedRecently() {
    try {
      const t = localStorage.getItem(SKIP_KEY);
      return t && (Date.now() - +t) < SKIP_DAYS * 86_400_000;
    } catch { return false; }
  }

  function setSkipped()   { try { localStorage.setItem(SKIP_KEY, Date.now()); } catch {} }
  function clearSkipped() { try { localStorage.removeItem(SKIP_KEY); } catch {} }

  // ── remove overlay ─────────────────────────────────────────
  function close() {
    if (!overlayEl) return;
    overlayEl.style.opacity   = '0';
    overlayEl.style.transform = 'scale(1.04)';
    setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 380);
    document.body.style.overflow = '';
  }

  // ── success flash ──────────────────────────────────────────
  function showSuccess() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;inset:0;z-index:2147483647;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:linear-gradient(160deg,#1a0a1e,#2d0a3a,#4a0e5c);
      font-family:'DM Sans',-apple-system,sans-serif;
      animation:_lf_in .35s ease both;
    `;
    el.innerHTML = `
      <style>
        @keyframes _lf_in  { from{opacity:0} to{opacity:1} }
        @keyframes _lf_pop {
          0%{transform:scale(0) rotate(-20deg);opacity:0}
          65%{transform:scale(1.15) rotate(4deg);opacity:1}
          100%{transform:scale(1) rotate(0)}
        }
      </style>
      <div style="font-size:80px;margin-bottom:16px;animation:_lf_pop .6s cubic-bezier(.22,.61,.36,1) .1s both;filter:drop-shadow(0 0 24px rgba(233,30,140,.9))">🌸</div>
      <div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:8px">App Installed!</div>
      <div style="font-size:14px;color:rgba(255,255,255,.5)">LunaFlow is ready on your device 🎉</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 380); }, 2500);
  }

  // ── OVERLAY ────────────────────────────────────────────────
  function showOverlay() {
    if (overlayEl || isInstalled()) return;

    overlayEl = document.createElement('div');
    overlayEl.id = '__lf_overlay';

    overlayEl.innerHTML = `
      <style>
        #__lf_overlay {
          position:fixed;inset:0;z-index:2147483647;
          display:flex;align-items:center;justify-content:center;
          padding:20px;
          font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          background:#0c0014;
          transition:opacity .38s ease,transform .38s ease;
          animation:_lf_fadein .4s ease both;
          overflow:hidden;
        }
        #__lf_overlay::before {
          content:'';position:absolute;inset:0;pointer-events:none;
          background:
            radial-gradient(ellipse 80% 60% at 15% 15%,rgba(233,30,140,.28) 0%,transparent 65%),
            radial-gradient(ellipse 70% 70% at 85% 85%,rgba(123,45,139,.32) 0%,transparent 65%),
            radial-gradient(ellipse 55% 45% at 50%  0%,rgba(255,77,166,.14) 0%,transparent 60%);
        }
        @keyframes _lf_fadein  { from{opacity:0} to{opacity:1} }
        @keyframes _lf_slideup {
          from{opacity:0;transform:translateY(36px) scale(.96)}
          to  {opacity:1;transform:none}
        }
        @keyframes _lf_pulse {
          0%,100%{box-shadow:0 0 40px rgba(233,30,140,.35),0 0 80px rgba(233,30,140,.12)}
          50%    {box-shadow:0 0 70px rgba(233,30,140,.6), 0 0 140px rgba(233,30,140,.22)}
        }
        @keyframes _lf_spin { to{transform:rotate(360deg)} }

        #__lf_card {
          position:relative;z-index:1;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.12);
          border-radius:30px;
          padding:38px 28px 28px;
          max-width:420px;width:100%;
          backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);
          box-shadow:0 50px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.1);
          animation:_lf_slideup .52s cubic-bezier(.22,.61,.36,1) .08s both;
          text-align:center;
        }
        #__lf_moon {
          width:96px;height:96px;border-radius:50%;
          background:linear-gradient(145deg,rgba(255,77,166,.28),rgba(123,45,139,.38));
          border:1.5px solid rgba(255,77,166,.45);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 22px;position:relative;
          animation:_lf_pulse 3.5s ease-in-out infinite;
        }
        #__lf_moon::before {
          content:'';position:absolute;inset:10px;border-radius:50%;
          background:linear-gradient(145deg,rgba(233,30,140,.35),rgba(156,39,176,.45));
        }
        #__lf_moon span { font-size:42px;position:relative;z-index:1;filter:drop-shadow(0 0 16px rgba(233,30,140,.95)) }

        #__lf_badge {
          display:inline-block;font-size:10px;font-weight:700;letter-spacing:2px;
          color:#ff88cc;text-transform:uppercase;
          background:rgba(233,30,140,.18);border:1px solid rgba(233,30,140,.35);
          border-radius:100px;padding:5px 16px;margin-bottom:14px;
        }
        #__lf_title {
          font-size:32px;font-weight:800;color:#fff;
          line-height:1.1;margin-bottom:10px;letter-spacing:-.5px;
        }
        #__lf_title em { color:#ff77bb;font-style:italic;font-weight:300 }
        #__lf_desc {
          font-size:14px;color:rgba(255,255,255,.6);
          line-height:1.7;margin-bottom:24px;
        }
        #__lf_benefits {
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
          border-radius:18px;padding:14px 16px;margin-bottom:26px;
          text-align:left;display:flex;flex-direction:column;gap:11px;
        }
        .lf_benefit {
          display:flex;align-items:center;gap:12px;
          font-size:13px;color:rgba(255,255,255,.82);font-weight:500;
        }
        .lf_bicon {
          width:30px;height:30px;border-radius:50%;flex-shrink:0;
          background:rgba(233,30,140,.2);border:1px solid rgba(233,30,140,.38);
          display:flex;align-items:center;justify-content:center;font-size:15px;
        }

        #__lf_btn {
          width:100%;padding:17px 24px;border:none;border-radius:100px;
          background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);
          color:#fff;font-family:inherit;font-size:16px;font-weight:700;
          cursor:pointer;letter-spacing:.1px;
          box-shadow:0 14px 40px rgba(233,30,140,.55);
          transition:all .25s;display:flex;align-items:center;
          justify-content:center;gap:10px;
          margin-bottom:10px;touch-action:manipulation;
        }
        #__lf_btn:hover  { transform:translateY(-3px);box-shadow:0 20px 50px rgba(233,30,140,.65) }
        #__lf_btn:active { transform:scale(.97) }
        #__lf_btn:disabled { opacity:.55;cursor:not-allowed;transform:none }

        #__lf_spinner {
          display:none;width:18px;height:18px;
          border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;
          border-radius:50%;animation:_lf_spin .75s linear infinite;flex-shrink:0;
        }

        #__lf_skip {
          width:100%;padding:14px;
          border:1px solid rgba(255,255,255,.15);border-radius:100px;
          background:transparent;color:rgba(255,255,255,.45);
          font-family:inherit;font-size:13px;font-weight:600;
          cursor:pointer;transition:all .2s;touch-action:manipulation;
        }
        #__lf_skip:hover { color:rgba(255,255,255,.8);background:rgba(255,255,255,.06) }

        @media(max-width:460px){
          #__lf_card{padding:28px 18px 22px;border-radius:26px}
          #__lf_title{font-size:27px}
        }
      </style>

      <div id="__lf_card" role="dialog" aria-modal="true" aria-label="Install LunaFlow">

        <div id="__lf_moon"><span>🌙</span></div>

        <div id="__lf_badge">✦ LunaFlow</div>

        <h1 id="__lf_title">Install the<br><em>full app</em></h1>

        <p id="__lf_desc">
          Get LunaFlow as a real app on your device —
          opens without a browser, works offline, launches instantly.
        </p>

        <div id="__lf_benefits">
          <div class="lf_benefit"><div class="lf_bicon">📱</div><span>Opens in its own window — no browser</span></div>
          <div class="lf_benefit"><div class="lf_bicon">⚡</div><span>Instant launch from home screen / taskbar</span></div>
          <div class="lf_benefit"><div class="lf_bicon">📴</div><span>Works fully offline</span></div>
          <div class="lf_benefit"><div class="lf_bicon">🔒</div><span>All data stays on your device</span></div>
        </div>

        <button id="__lf_btn" type="button">
          <div id="__lf_spinner"></div>
          <span id="__lf_label">📲 &nbsp;Install App</span>
        </button>

        <button id="__lf_skip" type="button">Not now</button>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlayEl);

    document.getElementById('__lf_btn').addEventListener('click', doInstall);
    document.getElementById('__lf_skip').addEventListener('click', () => {
      setSkipped();
      close();
    });
  }

  // ── THE ACTUAL INSTALL ──────────────────────────────────────
  async function doInstall() {
    if (!deferredPrompt) return; // shouldn't happen, btn is hidden if no prompt

    const btn    = document.getElementById('__lf_btn');
    const spin   = document.getElementById('__lf_spinner');
    const label  = document.getElementById('__lf_label');

    // Show loading state
    btn.disabled        = true;
    spin.style.display  = 'block';
    label.style.opacity = '0';

    try {
      // 🚀 Trigger the NATIVE browser install dialog automatically
      deferredPrompt.prompt();

      // Wait for user's choice in the native dialog
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (outcome === 'accepted') {
        // Browser will fire 'appinstalled' — handled below
        clearSkipped();
      } else {
        // User cancelled the native dialog → re-enable button
        btn.disabled        = false;
        spin.style.display  = 'none';
        label.style.opacity = '1';
      }
    } catch (err) {
      console.warn('[LunaPWA]', err);
      btn.disabled        = false;
      spin.style.display  = 'none';
      label.style.opacity = '1';
    }
  }

  // ── CORE LOGIC ─────────────────────────────────────────────
  function init() {
    if (isInstalled())       return; // already a standalone app
    if (skippedRecently())   return; // user said not now

    // On non-iOS: show overlay immediately, install button works
    // when deferredPrompt is captured (Chrome fires it fast)
    if (!isIOS()) {
      showOverlay();
    }
  }

  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
  }

  // ── EVENT LISTENERS ────────────────────────────────────────

  // Capture Chrome/Edge/Android install eligibility event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();              // stop mini infobar
    deferredPrompt = e;
    console.log('[LunaPWA] ✅ Install prompt ready');

    // If overlay is open, make sure button is active
    const btn = document.getElementById('__lf_btn');
    if (btn) btn.disabled = false;

    // Show overlay if not yet shown
    if (!overlayEl && !isInstalled() && !skippedRecently()) {
      showOverlay();
    }
  });

  // After OS confirms install
  window.addEventListener('appinstalled', () => {
    console.log('[LunaPWA] ✅ Installed!');
    clearSkipped();
    close();
    showSuccess();
    deferredPrompt = null;
  });

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[LunaPWA] ready | standalone:', isInstalled());

})();
