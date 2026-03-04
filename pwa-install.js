// ================================================================
// LUNAFLOW — PWA INSTALL OVERLAY
// Always shows install screen before the app loads.
// Supports: Chrome/Edge Desktop, Android Chrome, iOS Safari
// ================================================================

(function () {
  'use strict';

  const SKIP_KEY    = 'luna_install_skip';   // user pressed skip
  const DONE_KEY    = 'luna_install_done';   // user installed
  const SKIP_DAYS   = 3;                     // re-show after 3 days if skipped

  let deferredPrompt = null;   // Chrome/Edge: BeforeInstallPromptEvent
  let overlayEl      = null;

  // ── Detect environment ─────────────────────────────────────
  function isAlreadyInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || document.referrer.startsWith('android-app://');
  }

  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  function userSkippedRecently() {
    try {
      const t = localStorage.getItem(SKIP_KEY);
      if (!t) return false;
      return Date.now() - parseInt(t) < SKIP_DAYS * 86400000;
    } catch { return false; }
  }

  function markSkipped()   { try { localStorage.setItem(SKIP_KEY, Date.now()); } catch {} }
  function markInstalled() { try { localStorage.setItem(DONE_KEY, Date.now()); localStorage.removeItem(SKIP_KEY); } catch {} }

  // ── Remove overlay ──────────────────────────────────────────
  function closeOverlay() {
    if (!overlayEl) return;
    overlayEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    overlayEl.style.opacity    = '0';
    overlayEl.style.transform  = 'scale(1.04)';
    setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 420);
    document.body.style.overflow = '';
  }

  // ── Inject CSS ──────────────────────────────────────────────
  function addCSS() {
    if (document.getElementById('__luna_pwa_css')) return;
    const el = document.createElement('style');
    el.id = '__luna_pwa_css';
    el.textContent = `
/* ── LunaFlow PWA Install Overlay ── */
#__luna_overlay {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0c0014;
  overflow: hidden;
  animation: _luna_fadeIn 0.45s ease both;
}
#__luna_overlay::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 15% 15%, rgba(233,30,140,.28) 0%, transparent 65%),
    radial-gradient(ellipse 70% 70% at 85% 85%, rgba(123,45,139,.32) 0%, transparent 65%),
    radial-gradient(ellipse 55% 45% at 50%  0%, rgba(255,77,166,.14) 0%, transparent 60%);
}
@keyframes _luna_fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes _luna_slideUp { from{opacity:0;transform:translateY(36px) scale(.96)} to{opacity:1;transform:none} }
@keyframes _luna_pulse   {
  0%,100%{box-shadow:0 0 40px rgba(233,30,140,.35),0 0 80px rgba(233,30,140,.12)}
  50%    {box-shadow:0 0 70px rgba(233,30,140,.6), 0 0 140px rgba(233,30,140,.22)}
}
@keyframes _luna_spin    { to{transform:rotate(360deg)} }
@keyframes _luna_pop     {
  0%  {transform:scale(0) rotate(-20deg);opacity:0}
  65% {transform:scale(1.14) rotate(4deg);opacity:1}
  100%{transform:scale(1) rotate(0)}
}
@keyframes _luna_sheetUp { from{transform:translateY(110%)} to{transform:translateY(0)} }

/* Card (desktop / android) */
.__luna_card {
  position: relative; z-index: 1;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 30px;
  padding: 36px 28px 28px;
  max-width: 420px; width: 100%;
  backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
  box-shadow: 0 50px 100px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1);
  animation: _luna_slideUp .52s cubic-bezier(.22,.61,.36,1) .08s both;
  text-align: center;
}

/* Moon icon */
.__luna_moon {
  width: 96px; height: 96px; border-radius: 50%;
  background: linear-gradient(145deg,rgba(255,77,166,.28),rgba(123,45,139,.38));
  border: 1.5px solid rgba(255,77,166,.45);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 22px; position: relative;
  animation: _luna_pulse 3.5s ease-in-out infinite;
}
.__luna_moon::before {
  content: '';
  position: absolute; inset: 10px; border-radius: 50%;
  background: linear-gradient(145deg,rgba(233,30,140,.35),rgba(156,39,176,.45));
}
.__luna_moon_emoji { font-size: 42px; position: relative; z-index: 1; filter: drop-shadow(0 0 16px rgba(233,30,140,.95)); }

/* Text */
.__luna_app_name {
  font-size: 13px; font-weight: 700; letter-spacing: 2px;
  color: #ff88cc; text-transform: uppercase;
  background: rgba(233,30,140,.18); border: 1px solid rgba(233,30,140,.35);
  border-radius: 100px; padding: 5px 16px; display: inline-block; margin-bottom: 14px;
}
.__luna_title {
  font-size: 32px; font-weight: 800; color: #fff;
  line-height: 1.1; margin-bottom: 10px; letter-spacing: -.5px;
}
.__luna_title em { color: #ff77bb; font-style: italic; font-weight: 300; }
.__luna_desc {
  font-size: 14px; color: rgba(255,255,255,.6);
  line-height: 1.7; margin-bottom: 24px;
}

/* Benefits */
.__luna_benefits {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px; padding: 14px 16px; margin-bottom: 24px;
  text-align: left; display: flex; flex-direction: column; gap: 11px;
}
.__luna_benefit {
  display: flex; align-items: center; gap: 12px;
  font-size: 13px; color: rgba(255,255,255,.82); font-weight: 500;
}
.__luna_b_icon {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: rgba(233,30,140,.2); border: 1px solid rgba(233,30,140,.38);
  display: flex; align-items: center; justify-content: center; font-size: 15px;
}

/* Platform badge */
.__luna_platform {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,.4); margin-bottom: 18px;
  font-weight: 500;
}
.__luna_platform span {
  background: rgba(255,255,255,.08); border-radius: 6px; padding: 2px 8px; font-size: 11px;
}

/* Buttons */
.__luna_btn_install {
  width: 100%; padding: 17px 24px; border: none; border-radius: 100px;
  background: linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%);
  color: #fff; font-family: inherit; font-size: 16px; font-weight: 700;
  cursor: pointer; letter-spacing: .1px;
  box-shadow: 0 14px 40px rgba(233,30,140,.55);
  transition: all .25s; display: flex; align-items: center;
  justify-content: center; gap: 10px;
  margin-bottom: 10px; touch-action: manipulation;
}
.__luna_btn_install:hover  { transform: translateY(-3px); box-shadow: 0 20px 50px rgba(233,30,140,.65); }
.__luna_btn_install:active { transform: scale(.97); }
.__luna_btn_install:disabled { opacity: .55; cursor: not-allowed; transform: none; }

.__luna_btn_skip {
  width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,.15); border-radius: 100px;
  background: transparent; color: rgba(255,255,255,.45);
  font-family: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s; touch-action: manipulation;
}
.__luna_btn_skip:hover { color: rgba(255,255,255,.8); background: rgba(255,255,255,.06); }

.__luna_spinner {
  display: none; width: 18px; height: 18px;
  border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: _luna_spin .75s linear infinite; flex-shrink: 0;
}
.__luna_btn_label { transition: opacity .15s; }

/* Browser install hint */
.__luna_hint {
  margin-top: 16px; font-size: 12px; color: rgba(255,255,255,.35);
  display: none; line-height: 1.6;
}
.__luna_hint.show { display: block; }
.__luna_hint strong { color: rgba(255,255,255,.65); }

/* ── iOS bottom sheet ── */
#__luna_overlay.__luna_ios {
  align-items: flex-end; padding: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.__luna_sheet {
  position: relative; z-index: 1;
  background: #1e0a2e;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 28px 28px 0 0;
  padding: 24px 22px calc(32px + env(safe-area-inset-bottom, 0px));
  width: 100%; max-width: 560px; text-align: center;
  animation: _luna_sheetUp .44s cubic-bezier(.22,.61,.36,1) both;
  box-shadow: 0 -24px 70px rgba(0,0,0,.7);
}
.__luna_handle {
  width: 44px; height: 5px; border-radius: 100px;
  background: rgba(255,255,255,.2); margin: 0 auto 20px;
}
.__luna_sheet_moon {
  width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 14px;
  background: linear-gradient(145deg,rgba(255,77,166,.25),rgba(123,45,139,.35));
  border: 1.5px solid rgba(255,77,166,.45);
  display: flex; align-items: center; justify-content: center; font-size: 32px;
  box-shadow: 0 0 32px rgba(233,30,140,.35);
}
.__luna_sheet_title  { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 6px; }
.__luna_sheet_sub    { font-size: 13px; color: rgba(255,255,255,.5); line-height: 1.6; margin-bottom: 20px; }
.__luna_steps        {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
  border-radius: 18px; padding: 14px 16px; margin-bottom: 20px;
  display: flex; flex-direction: column; gap: 12px; text-align: left;
}
.__luna_step         { display: flex; align-items: center; gap: 13px; font-size: 14px; color: rgba(255,255,255,.8); }
.__luna_step_n       {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg,#e91e8c,#9c27b0); color: #fff;
  font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(233,30,140,.4);
}
.__luna_tag {
  display: inline-block; background: rgba(255,255,255,.13);
  border-radius: 6px; padding: 1px 7px; font-size: 12px; margin: 0 2px;
}

/* ── Success ── */
.__luna_success {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(160deg, #1a0a1e, #2d0a3a, #4a0e5c);
  font-family: 'DM Sans', sans-serif;
  animation: _luna_fadeIn .35s ease both;
  transition: opacity .4s;
}
.__luna_success_icon  { font-size: 80px; margin-bottom: 16px; animation: _luna_pop .6s cubic-bezier(.22,.61,.36,1) .1s both; filter: drop-shadow(0 0 24px rgba(233,30,140,.9)); }
.__luna_success_title { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; }
.__luna_success_sub   { font-size: 14px; color: rgba(255,255,255,.5); }

@media (max-width: 460px) {
  .__luna_card { padding: 28px 18px 22px; border-radius: 26px; }
  .__luna_title { font-size: 28px; }
}
    `;
    document.head.appendChild(el);
  }

  // ── Success flash ───────────────────────────────────────────
  function showSuccess() {
    addCSS();
    const el = document.createElement('div');
    el.className = '__luna_success';
    el.innerHTML = `
      <div class="__luna_success_icon">🌸</div>
      <div class="__luna_success_title">App Installed!</div>
      <div class="__luna_success_sub">LunaFlow is now on your device 🎉</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 420); }, 2400);
  }

  // ── MAIN OVERLAY (Chrome / Edge / Android) ──────────────────
  function showMainOverlay() {
    if (overlayEl) return;
    addCSS();

    const hasBrowserPrompt = !!deferredPrompt;
    const platform = isAndroid() ? 'Android' : 'Desktop';

    overlayEl = document.createElement('div');
    overlayEl.id = '__luna_overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Install LunaFlow App');

    overlayEl.innerHTML = `
      <div class="__luna_card">

        <div class="__luna_moon">
          <span class="__luna_moon_emoji">🌙</span>
        </div>

        <div class="__luna_app_name">✦ LunaFlow</div>

        <h1 class="__luna_title">Install the<br><em>full app</em></h1>

        <p class="__luna_desc">
          Get LunaFlow as a real installed app on your device —
          no browser needed, works offline, opens instantly.
        </p>

        <div class="__luna_benefits">
          <div class="__luna_benefit">
            <div class="__luna_b_icon">📱</div>
            <span>Opens in its own window, no browser</span>
          </div>
          <div class="__luna_benefit">
            <div class="__luna_b_icon">⚡</div>
            <span>Launches instantly from home screen / taskbar</span>
          </div>
          <div class="__luna_benefit">
            <div class="__luna_b_icon">📴</div>
            <span>Works fully offline — no internet needed</span>
          </div>
          <div class="__luna_benefit">
            <div class="__luna_b_icon">🔒</div>
            <span>All data stays privately on your device</span>
          </div>
        </div>

        <div class="__luna_platform">
          Detected: <span>${platform} · ${hasBrowserPrompt ? 'One-tap install ready ✓' : 'Use browser menu to install'}</span>
        </div>

        <button class="__luna_btn_install" id="__luna_install_btn" type="button">
          <div class="__luna_spinner" id="__luna_spinner"></div>
          <span class="__luna_btn_label" id="__luna_btn_label">📲 &nbsp;Install App — Free</span>
        </button>

        <button class="__luna_btn_skip" id="__luna_skip_btn" type="button">
          Not now — continue in browser
        </button>

        <div class="__luna_hint" id="__luna_hint">
          No one-tap install available on this browser.<br>
          <strong>Chrome/Edge:</strong> Click <strong>⊕ Install</strong> icon in the address bar above, or open <strong>⋮ Menu → Install app</strong>.
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlayEl);

    // ── Button handlers ──
    document.getElementById('__luna_install_btn').addEventListener('click', handleInstallClick);
    document.getElementById('__luna_skip_btn').addEventListener('click', () => {
      markSkipped();
      closeOverlay();
    });
  }

  async function handleInstallClick() {
    const btn    = document.getElementById('__luna_install_btn');
    const spin   = document.getElementById('__luna_spinner');
    const label  = document.getElementById('__luna_btn_label');
    const hint   = document.getElementById('__luna_hint');

    if (deferredPrompt) {
      // ✅ Chrome/Edge/Android — trigger native install prompt
      btn.disabled    = true;
      spin.style.display = 'block';
      label.style.opacity = '0';

      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;

        if (outcome === 'accepted') {
          // appinstalled event fires and handles cleanup
        } else {
          // User dismissed native dialog — re-enable
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

    } else {
      // ⚠️ No prompt captured — show manual instructions
      label.textContent = '⋮ Open browser menu → Install app';
      hint.classList.add('show');
    }
  }

  // ── iOS SHEET ───────────────────────────────────────────────
  function showIOSSheet() {
    if (overlayEl) return;
    addCSS();

    overlayEl = document.createElement('div');
    overlayEl.id = '__luna_overlay';
    overlayEl.className = '__luna_ios';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');

    overlayEl.innerHTML = `
      <div class="__luna_sheet">
        <div class="__luna_handle"></div>
        <div class="__luna_sheet_moon">🌙</div>
        <div class="__luna_sheet_title">Install LunaFlow</div>
        <p class="__luna_sheet_sub">Add to your home screen for the full app experience — no App Store needed.</p>

        <div class="__luna_steps">
          <div class="__luna_step">
            <div class="__luna_step_n">1</div>
            <span>Tap the <span class="__luna_tag">⎋ Share</span> button at the bottom of Safari</span>
          </div>
          <div class="__luna_step">
            <div class="__luna_step_n">2</div>
            <span>Scroll down and tap <span class="__luna_tag">＋ Add to Home Screen</span></span>
          </div>
          <div class="__luna_step">
            <div class="__luna_step_n">3</div>
            <span>Tap <span class="__luna_tag">Add</span> in the top-right corner</span>
          </div>
          <div class="__luna_step">
            <div class="__luna_step_n">4</div>
            <span>Open <strong style="color:#ff88cc">LunaFlow</strong> from your home screen 🎉</span>
          </div>
        </div>

        <button class="__luna_btn_install" id="__luna_ios_done" type="button" style="margin-bottom:10px">
          ✓ &nbsp;Done — I've Added It
        </button>
        <button class="__luna_btn_skip" id="__luna_ios_skip" type="button">
          Maybe Later
        </button>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlayEl);

    document.getElementById('__luna_ios_done').addEventListener('click', () => {
      markInstalled();
      closeOverlay();
      showSuccess();
    });
    document.getElementById('__luna_ios_skip').addEventListener('click', () => {
      markSkipped();
      closeOverlay();
    });
  }

  // ── DECIDE WHAT TO SHOW ─────────────────────────────────────
  function decide() {
    if (isAlreadyInstalled())   return; // running as PWA already
    if (userSkippedRecently())  return; // user said not now recently

    if (isIOS()) {
      showIOSSheet();
    } else {
      showMainOverlay(); // always show on desktop/android
    }
  }

  // ── EVENTS ──────────────────────────────────────────────────

  // 1. Capture Chrome/Edge install eligibility prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[LunaPWA] ✅ beforeinstallprompt captured');
    // If overlay already open, update the platform badge
    const p = document.querySelector('.__luna_platform span');
    if (p) p.textContent = 'One-tap install ready ✓';
  });

  // 2. App successfully installed via OS
  window.addEventListener('appinstalled', () => {
    console.log('[LunaPWA] ✅ appinstalled');
    markInstalled();
    closeOverlay();
    showSuccess();
    deferredPrompt = null;
  });

  // 3. Show overlay as soon as DOM is ready
  function init() {
    if (isAlreadyInstalled()) {
      console.log('[LunaPWA] Already running as standalone app');
      return;
    }
    decide();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[LunaPWA] loaded | standalone:', isAlreadyInstalled(), '| iOS:', isIOS());

})();
