// ================================================================
// LUNAFLOW — PWA INSTALL
// Waits for beforeinstallprompt, then fires it on button click.
// No manual instructions ever shown.
// ================================================================
(function () {
  'use strict';

  const SKIP_KEY  = 'lf_skip';
  const SKIP_DAYS = 3;

  let installPrompt = null; // the BeforeInstallPromptEvent
  let overlayEl     = null;

  // ── checks ────────────────────────────────────────────────
  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || navigator.standalone === true
        || document.referrer.startsWith('android-app://');
  }
  function isIOS() {
    return /iP(hone|ad|od)/i.test(navigator.userAgent) && !window.MSStream;
  }
  function skippedRecently() {
    try {
      const t = localStorage.getItem(SKIP_KEY);
      return !!(t && Date.now() - +t < SKIP_DAYS * 864e5);
    } catch { return false; }
  }
  function setSkipped()   { try { localStorage.setItem(SKIP_KEY, Date.now()); } catch {} }
  function clearSkipped() { try { localStorage.removeItem(SKIP_KEY); } catch {} }

  // ── close ─────────────────────────────────────────────────
  function close() {
    if (!overlayEl) return;
    overlayEl.style.opacity   = '0';
    overlayEl.style.transform = 'scale(1.04)';
    setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 360);
    document.body.style.overflow = '';
  }

  // ── success ───────────────────────────────────────────────
  function showSuccess() {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#1a0a1e,#2d0a3a,#4a0e5c);font-family:DM Sans,-apple-system,sans-serif;animation:lf_in .35s ease both;transition:opacity .4s';
    d.innerHTML = '<style>@keyframes lf_in{from{opacity:0}to{opacity:1}}@keyframes lf_pop{0%{transform:scale(0) rotate(-20deg);opacity:0}65%{transform:scale(1.15) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}</style><div style="font-size:80px;margin-bottom:16px;animation:lf_pop .6s cubic-bezier(.22,.61,.36,1) .1s both;filter:drop-shadow(0 0 24px rgba(233,30,140,.9))">🌸</div><div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:8px">App Installed!</div><div style="font-size:14px;color:rgba(255,255,255,.5)">LunaFlow is ready on your device 🎉</div>';
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 2600);
  }

  // ── button state helpers ──────────────────────────────────
  function setLoading(on) {
    const btn  = document.getElementById('lf_btn');
    const spin = document.getElementById('lf_spin');
    const lbl  = document.getElementById('lf_lbl');
    if (!btn) return;
    btn.disabled = on;
    if (spin) spin.style.display = on ? 'block' : 'none';
    if (lbl)  lbl.style.opacity  = on ? '0'     : '1';
  }

  // Shows a pulsing "waiting" state while prompt loads
  function setWaiting(on) {
    const lbl = document.getElementById('lf_lbl');
    const btn = document.getElementById('lf_btn');
    if (!btn) return;
    btn.disabled = false; // always tappable
    if (on) {
      if (lbl) lbl.textContent = '⏳  Preparing install…';
      btn.style.opacity = '0.8';
    } else {
      if (lbl) lbl.textContent = '📲  Install App';
      btn.style.opacity = '1';
    }
  }

  // ── THE INSTALL ───────────────────────────────────────────
  async function doInstall() {
    // If prompt already captured → fire immediately
    if (installPrompt) {
      firePrompt();
      return;
    }

    // Prompt not yet captured → show waiting, then fire when ready
    setWaiting(true);

    // Wait (no timeout — keep waiting until Chrome is ready)
    await new Promise(resolve => {
      window.addEventListener('lf_prompt_ready', resolve, { once: true });
    });

    setWaiting(false);
    firePrompt();
  }

  async function firePrompt() {
    if (!installPrompt) return;
    setLoading(true);

    try {
      // 🚀 This fires the native Android/Desktop install dialog
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;

      if (outcome === 'accepted') {
        clearSkipped();
        // appinstalled event will close overlay + show success
      } else {
        // User tapped Cancel → let them try again
        setLoading(false);
      }
    } catch (e) {
      console.warn('[LunaPWA]', e);
      setLoading(false);
    }
  }

  // ── OVERLAY HTML + CSS ────────────────────────────────────
  function buildOverlay() {
    if (overlayEl || isInstalled()) return;

    const el = document.createElement('div');
    el.id = 'lf_overlay';
    el.innerHTML = `
<style>
#lf_overlay{
  position:fixed;inset:0;z-index:2147483647;
  display:flex;align-items:center;justify-content:center;padding:20px;
  font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  background:#0c0014;
  overflow:hidden;
  animation:lfo_in .4s ease both;
  transition:opacity .36s ease,transform .36s ease;
}
#lf_overlay::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(ellipse 80% 60% at 15% 15%,rgba(233,30,140,.28) 0%,transparent 65%),
    radial-gradient(ellipse 70% 70% at 85% 85%,rgba(123,45,139,.32) 0%,transparent 65%),
    radial-gradient(ellipse 55% 45% at 50%  0%,rgba(255,77,166,.14) 0%,transparent 60%);
}
@keyframes lfo_in {from{opacity:0}to{opacity:1}}
@keyframes lfc_in {from{opacity:0;transform:translateY(36px) scale(.96)}to{opacity:1;transform:none}}
@keyframes lf_pu  {0%,100%{box-shadow:0 0 40px rgba(233,30,140,.35),0 0 80px rgba(233,30,140,.12)}50%{box-shadow:0 0 70px rgba(233,30,140,.6),0 0 140px rgba(233,30,140,.22)}}
@keyframes lf_sp  {to{transform:rotate(360deg)}}

#lf_card{
  position:relative;z-index:1;text-align:center;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.12);
  border-radius:30px;padding:38px 28px 28px;
  max-width:420px;width:100%;
  backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);
  box-shadow:0 50px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.1);
  animation:lfc_in .52s cubic-bezier(.22,.61,.36,1) .08s both;
}
#lf_moon{
  width:96px;height:96px;border-radius:50%;
  background:linear-gradient(145deg,rgba(255,77,166,.28),rgba(123,45,139,.38));
  border:1.5px solid rgba(255,77,166,.45);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 22px;position:relative;
  animation:lf_pu 3.5s ease-in-out infinite;
}
#lf_moon::before{content:'';position:absolute;inset:10px;border-radius:50%;background:linear-gradient(145deg,rgba(233,30,140,.35),rgba(156,39,176,.45))}
#lf_moon span{font-size:42px;position:relative;z-index:1;filter:drop-shadow(0 0 16px rgba(233,30,140,.95))}

#lf_badge{
  display:inline-block;font-size:10px;font-weight:700;letter-spacing:2px;
  color:#ff88cc;text-transform:uppercase;
  background:rgba(233,30,140,.18);border:1px solid rgba(233,30,140,.35);
  border-radius:100px;padding:5px 16px;margin-bottom:14px;
}
#lf_title{font-size:32px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;letter-spacing:-.5px}
#lf_title em{color:#ff77bb;font-style:italic;font-weight:300}
#lf_desc{font-size:14px;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:24px}

#lf_benefits{
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  border-radius:18px;padding:14px 16px;margin-bottom:26px;
  text-align:left;display:flex;flex-direction:column;gap:11px;
}
.lf_b{display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,.82);font-weight:500}
.lf_i{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:rgba(233,30,140,.2);border:1px solid rgba(233,30,140,.38);display:flex;align-items:center;justify-content:center;font-size:15px}

#lf_btn{
  width:100%;padding:17px 24px;border:none;border-radius:100px;
  background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);
  color:#fff;font-family:inherit;font-size:16px;font-weight:700;
  cursor:pointer;box-shadow:0 14px 40px rgba(233,30,140,.55);
  transition:all .25s;display:flex;align-items:center;justify-content:center;gap:10px;
  margin-bottom:10px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
}
#lf_btn:not(:disabled):hover{transform:translateY(-3px);box-shadow:0 20px 50px rgba(233,30,140,.65)}
#lf_btn:not(:disabled):active{transform:scale(.97)}
#lf_btn:disabled{cursor:not-allowed}

#lf_spin{display:none;width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:lf_sp .75s linear infinite;flex-shrink:0}
#lf_lbl{transition:opacity .15s}

#lf_skip{
  width:100%;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:100px;
  background:transparent;color:rgba(255,255,255,.45);
  font-family:inherit;font-size:13px;font-weight:600;
  cursor:pointer;transition:all .2s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
}
#lf_skip:hover{color:rgba(255,255,255,.8);background:rgba(255,255,255,.06)}

@media(max-width:460px){#lf_card{padding:28px 18px 22px;border-radius:26px}#lf_title{font-size:27px}}
</style>

<div id="lf_card" role="dialog" aria-modal="true" aria-label="Install LunaFlow">
  <div id="lf_moon"><span>🌙</span></div>
  <div id="lf_badge">✦ LunaFlow</div>
  <h1 id="lf_title">Install the<br><em>full app</em></h1>
  <p id="lf_desc">Get LunaFlow as a real app — opens without a browser, works offline, launches instantly from your home screen.</p>
  <div id="lf_benefits">
    <div class="lf_b"><div class="lf_i">📱</div><span>Own window — no browser chrome</span></div>
    <div class="lf_b"><div class="lf_i">⚡</div><span>Instant launch from home screen / taskbar</span></div>
    <div class="lf_b"><div class="lf_i">📴</div><span>Works fully offline</span></div>
    <div class="lf_b"><div class="lf_i">🔒</div><span>All data stays on your device</span></div>
  </div>
  <button id="lf_btn" type="button">
    <div id="lf_spin"></div>
    <span id="lf_lbl">📲  Install App</span>
  </button>
  <button id="lf_skip" type="button">Not now</button>
</div>`;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(el);
    overlayEl = el;

    document.getElementById('lf_btn').addEventListener('click', doInstall);
    document.getElementById('lf_skip').addEventListener('click', () => {
      setSkipped(); close();
    });
  }

  // ── EVENTS ────────────────────────────────────────────────

  // Chrome/Edge/Android: capture the install event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    console.log('[LunaPWA] ✅ prompt ready');
    // Signal any waiting doInstall()
    window.dispatchEvent(new Event('lf_prompt_ready'));
    // Show overlay if not yet shown
    if (!overlayEl && !isInstalled() && !skippedRecently()) {
      buildOverlay();
    }
  });

  // OS confirmed install
  window.addEventListener('appinstalled', () => {
    console.log('[LunaPWA] ✅ installed');
    clearSkipped(); close(); showSuccess();
    installPrompt = null;
  });

  // Init on DOM ready
  function init() {
    if (isInstalled() || skippedRecently() || isIOS()) return;
    // Show overlay immediately — button waits for prompt if needed
    buildOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();