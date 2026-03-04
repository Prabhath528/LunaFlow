// ================================================================
// LUNAFLOW — PWA INSTALL
// beforeinstallprompt fires → show overlay → tap button → native
// Android install sheet appears automatically. No fallback text.
// ================================================================
(function () {
  'use strict';

  const SKIP_KEY  = 'luna_skip';
  const SKIP_DAYS = 3;
  let deferredPrompt = null;
  let overlayEl      = null;

  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || navigator.standalone === true
        || document.referrer.startsWith('android-app://');
  }
  function isIOS() {
    return /iP(hone|ad|od)/i.test(navigator.userAgent) && !window.MSStream;
  }
  function skippedRecently() {
    try { const t = localStorage.getItem(SKIP_KEY);
      return !!(t && Date.now() - +t < SKIP_DAYS * 86400000); } catch { return false; }
  }
  function setSkipped()   { try { localStorage.setItem(SKIP_KEY, Date.now()); } catch {} }
  function clearSkipped() { try { localStorage.removeItem(SKIP_KEY); } catch {} }

  function closeOverlay() {
    if (!overlayEl) return;
    overlayEl.style.opacity = '0';
    overlayEl.style.transform = 'scale(1.04)';
    setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 380);
    document.body.style.overflow = '';
  }

  function showSuccess() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#1a0a1e,#2d0a3a,#4a0e5c);font-family:DM Sans,-apple-system,sans-serif;animation:_lfi .35s ease both;transition:opacity .4s';
    el.innerHTML = '<style>@keyframes _lfi{from{opacity:0}to{opacity:1}}@keyframes _lfp{0%{transform:scale(0) rotate(-20deg);opacity:0}65%{transform:scale(1.15) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}</style>'
      + '<div style="font-size:80px;margin-bottom:16px;animation:_lfp .6s cubic-bezier(.22,.61,.36,1) .1s both;filter:drop-shadow(0 0 24px rgba(233,30,140,.9))">🌸</div>'
      + '<div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:8px">App Installed!</div>'
      + '<div style="font-size:14px;color:rgba(255,255,255,.5)">LunaFlow is ready on your device 🎉</div>';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2500);
  }

  // ── INSTALL: fires native Android/Desktop dialog instantly ──
  async function doInstall() {
    if (!deferredPrompt) return;

    const btn  = document.getElementById('__lf_btn');
    const spin = document.getElementById('__lf_spin');
    const lbl  = document.getElementById('__lf_lbl');

    btn.disabled = true;
    spin.style.display = 'block';
    lbl.style.opacity  = '0';

    try {
      // This line opens the native Android "Add to Home Screen" bottom sheet
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (outcome === 'accepted') {
        clearSkipped();
        // appinstalled event fires next → closes overlay + shows success
      } else {
        // User tapped Cancel on the native dialog
        btn.disabled = false;
        spin.style.display = 'none';
        lbl.style.opacity  = '1';
      }
    } catch (e) {
      btn.disabled = false;
      spin.style.display = 'none';
      lbl.style.opacity  = '1';
    }
  }

  function showOverlay() {
    if (overlayEl || isInstalled()) return;
    overlayEl = document.createElement('div');
    overlayEl.id = '__lf_ov';
    overlayEl.innerHTML = `<style>
#__lf_ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;background:#0c0014;transition:opacity .38s,transform .38s;animation:_lf0 .4s ease both;overflow:hidden}
#__lf_ov::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 15% 15%,rgba(233,30,140,.28) 0%,transparent 65%),radial-gradient(ellipse 70% 70% at 85% 85%,rgba(123,45,139,.32) 0%,transparent 65%),radial-gradient(ellipse 55% 45% at 50% 0%,rgba(255,77,166,.14) 0%,transparent 60%)}
@keyframes _lf0{from{opacity:0}to{opacity:1}}
@keyframes _lf1{from{opacity:0;transform:translateY(36px) scale(.96)}to{opacity:1;transform:none}}
@keyframes _lf2{0%,100%{box-shadow:0 0 40px rgba(233,30,140,.35),0 0 80px rgba(233,30,140,.12)}50%{box-shadow:0 0 70px rgba(233,30,140,.6),0 0 140px rgba(233,30,140,.22)}}
@keyframes _lf3{to{transform:rotate(360deg)}}
#__lf_card{position:relative;z-index:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:30px;padding:38px 28px 28px;max-width:420px;width:100%;backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);box-shadow:0 50px 100px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.1);animation:_lf1 .52s cubic-bezier(.22,.61,.36,1) .08s both;text-align:center}
#__lf_moon{width:96px;height:96px;border-radius:50%;background:linear-gradient(145deg,rgba(255,77,166,.28),rgba(123,45,139,.38));border:1.5px solid rgba(255,77,166,.45);display:flex;align-items:center;justify-content:center;margin:0 auto 22px;position:relative;animation:_lf2 3.5s ease-in-out infinite}
#__lf_moon::before{content:'';position:absolute;inset:10px;border-radius:50%;background:linear-gradient(145deg,rgba(233,30,140,.35),rgba(156,39,176,.45))}
#__lf_moon span{font-size:42px;position:relative;z-index:1;filter:drop-shadow(0 0 16px rgba(233,30,140,.95))}
#__lf_badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:2px;color:#ff88cc;text-transform:uppercase;background:rgba(233,30,140,.18);border:1px solid rgba(233,30,140,.35);border-radius:100px;padding:5px 16px;margin-bottom:14px}
#__lf_ttl{font-size:32px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:10px;letter-spacing:-.5px}
#__lf_ttl em{color:#ff77bb;font-style:italic;font-weight:300}
#__lf_desc{font-size:14px;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:24px}
#__lf_benefits{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:14px 16px;margin-bottom:26px;text-align:left;display:flex;flex-direction:column;gap:11px}
.lf_b{display:flex;align-items:center;gap:12px;font-size:13px;color:rgba(255,255,255,.82);font-weight:500}
.lf_i{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:rgba(233,30,140,.2);border:1px solid rgba(233,30,140,.38);display:flex;align-items:center;justify-content:center;font-size:15px}
#__lf_btn{width:100%;padding:17px 24px;border:none;border-radius:100px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 14px 40px rgba(233,30,140,.55);transition:all .25s;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#__lf_btn:active{transform:scale(.97)}
#__lf_btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
#__lf_spin{display:none;width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:_lf3 .75s linear infinite;flex-shrink:0}
#__lf_lbl{transition:opacity .15s}
#__lf_skip{width:100%;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:100px;background:transparent;color:rgba(255,255,255,.45);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#__lf_skip:active{opacity:.6}
@media(max-width:460px){#__lf_card{padding:28px 18px 22px;border-radius:26px}#__lf_ttl{font-size:27px}}
</style>
<div id="__lf_card" role="dialog" aria-modal="true">
  <div id="__lf_moon"><span>🌙</span></div>
  <div id="__lf_badge">✦ LunaFlow</div>
  <h1 id="__lf_ttl">Install the<br><em>full app</em></h1>
  <p id="__lf_desc">Get LunaFlow as a real app — opens without a browser, works offline, launches instantly.</p>
  <div id="__lf_benefits">
    <div class="lf_b"><div class="lf_i">📱</div><span>Own window — no browser</span></div>
    <div class="lf_b"><div class="lf_i">⚡</div><span>Instant launch from home screen</span></div>
    <div class="lf_b"><div class="lf_i">📴</div><span>Works fully offline</span></div>
    <div class="lf_b"><div class="lf_i">🔒</div><span>Data stays on your device</span></div>
  </div>
  <button id="__lf_btn" type="button">
    <div id="__lf_spin"></div>
    <span id="__lf_lbl">📲  Install App</span>
  </button>
  <button id="__lf_skip" type="button">Not now</button>
</div>`;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlayEl);
    document.getElementById('__lf_btn').addEventListener('click', doInstall);
    document.getElementById('__lf_skip').addEventListener('click', () => { setSkipped(); closeOverlay(); });
  }

  // ── EVENTS ─────────────────────────────────────────────────

  // Chrome/Android fires this when ALL PWA criteria are met
  // (HTTPS + manifest with icons + SW registered + not already installed)
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[LunaPWA] ✅ Ready to install');
    if (!isInstalled() && !skippedRecently()) showOverlay();
  });

  window.addEventListener('appinstalled', () => {
    clearSkipped();
    closeOverlay();
    showSuccess();
    deferredPrompt = null;
  });

  // Show overlay only if prompt is already captured (fast path)
  // Otherwise beforeinstallprompt listener above handles it
  if (!isIOS() && !isInstalled() && !skippedRecently()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (deferredPrompt) showOverlay();
        // else wait for beforeinstallprompt event
      });
    } else {
      if (deferredPrompt) showOverlay();
    }
  }

})();
