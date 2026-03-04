// ================================
// FORCED PWA INSTALLATION OVERLAY
// LunaFlow — Blocks app access until installation is completed
// ================================

class ForcedPWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.overlayElement = null;
    this.isBlocking = false;
    this._loaderAlreadyDone = false;
  }

  /**
   * Initialize the PWA install manager
   * Should be called as early as possible in the app lifecycle
   */
  init() {
    console.log('[PWA] Initializing forced install manager');

    this.checkIfInstalled();

    if (this.isInstalled) {
      console.log('[PWA] Already installed — skipping overlay');
      return;
    }

    if (this.hasUserDismissed()) {
      console.log('[PWA] User dismissed within 30 days — skipping');
      return;
    }

    if (this.isIOS()) {
      console.log('[PWA] iOS detected — showing add-to-home instructions');
      this._scheduleAfterLoader(() => this.showIOSBlockingOverlay());
      return;
    }

    // Android / Desktop: wait for the browser's install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this._scheduleAfterLoader(() => this.showBlockingOverlay());
    });

    // Successful install
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.hideBlockingOverlay();
      this.markUserInstalled();
      this.showSuccessMessage();
    });

    console.log('[PWA] Waiting for beforeinstallprompt…');
  }

  /**
   * Run callback only after index.html's loader is fully hidden.
   * Falls back to 5 s safety net if loaderDone never fires.
   */
  _scheduleAfterLoader(callback) {
    const SAFETY_MS = 5000;

    if (this._loaderAlreadyDone) {
      callback();
      return;
    }

    let fired = false;
    const run = () => {
      if (fired) return;
      fired = true;
      clearTimeout(safety);
      window.removeEventListener('loaderDone', run);
      callback();
    };

    const safety = setTimeout(() => {
      console.warn('[PWA] loaderDone never fired — using 5 s fallback');
      run();
    }, SAFETY_MS);

    window.addEventListener('loaderDone', run, { once: true });
    console.log('[PWA] Waiting for loaderDone…');
  }

  /** Returns true when running as an installed standalone PWA */
  checkIfInstalled() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator.standalone === true;
    this.isInstalled = standalone || iosStandalone;
    if (this.isInstalled) console.log('[PWA] Running in standalone mode');
  }

  /** Safari / iOS does not support beforeinstallprompt */
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /** True if dismissed within the last 30 days */
  hasUserDismissed() {
    const ts = localStorage.getItem('pwa-luna-dismissed');
    if (!ts) return false;
    const days = (Date.now() - parseInt(ts, 10)) / 86400000;
    return days < 30;
  }

  markUserInstalled() {
    localStorage.removeItem('pwa-luna-dismissed');
    localStorage.setItem('pwa-luna-installed', Date.now().toString());
  }

  markUserDismissed() {
    localStorage.setItem('pwa-luna-dismissed', Date.now().toString());
  }

  // ─────────────────────────────────────────────────────────────
  //  ANDROID / DESKTOP BLOCKING OVERLAY
  // ─────────────────────────────────────────────────────────────
  showBlockingOverlay() {
    if (this.isInstalled || this.isBlocking) return;
    console.log('[PWA] Showing install overlay');
    this.isBlocking = true;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'pwa-install-overlay';

    this.overlayElement.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        #pwa-install-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
          background: #0d0015;
          overflow: hidden;
          animation: pwaFadeIn .45s ease-out both;
        }

        /* Ambient mesh background */
        #pwa-install-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 20% 20%, rgba(233,30,140,.22) 0%, transparent 70%),
            radial-gradient(ellipse 60% 60% at 80% 80%, rgba(123,45,139,.3)  0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 60% 10%, rgba(255,77,166,.12) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Noise grain overlay */
        #pwa-install-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.035'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .pwa-card {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 32px;
          padding: 36px 28px 28px;
          max-width: 380px;
          width: 100%;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          animation: pwaSlideUp .55s cubic-bezier(.22,.61,.36,1) .1s both;
          box-shadow: 0 40px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.1);
        }

        @keyframes pwaFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pwaFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(.96) }
          to   { opacity: 1; transform: translateY(0)    scale(1)   }
        }

        /* Moon icon */
        .pwa-moon {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(255,77,166,.25), rgba(123,45,139,.35));
          border: 1.5px solid rgba(255,77,166,.4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          position: relative;
          animation: pwaMoonPulse 3.5s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(233,30,140,.25), 0 0 80px rgba(233,30,140,.1);
        }
        .pwa-moon::before {
          content: '';
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(233,30,140,.3), rgba(156,39,176,.4));
          border: 1px solid rgba(255,255,255,.1);
        }
        .pwa-moon-emoji {
          font-size: 36px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 12px rgba(233,30,140,.8));
        }
        @keyframes pwaMoonPulse {
          0%,100% { box-shadow: 0 0 40px rgba(233,30,140,.25), 0 0 80px rgba(233,30,140,.1) }
          50%      { box-shadow: 0 0 60px rgba(233,30,140,.45), 0 0 120px rgba(233,30,140,.2) }
        }

        /* Badge */
        .pwa-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(233,30,140,.18);
          border: 1px solid rgba(233,30,140,.35);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 10px;
          font-weight: 700;
          color: #ff88cc;
          letter-spacing: .8px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .pwa-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          letter-spacing: -.3px;
          margin-bottom: 8px;
        }
        .pwa-title em { color: #ff77bb; font-style: italic; }

        .pwa-desc {
          font-size: 14px;
          color: rgba(255,255,255,.6);
          line-height: 1.65;
          margin-bottom: 24px;
          font-weight: 400;
        }

        /* Benefits list */
        .pwa-benefits {
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .pwa-benefit {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: rgba(255,255,255,.78);
          font-weight: 500;
        }
        .pwa-benefit-dot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(233,30,140,.2);
          border: 1px solid rgba(233,30,140,.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        /* Buttons */
        .pwa-btn-install {
          width: 100%;
          padding: 16px 24px;
          border: none;
          border-radius: 100px;
          background: linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: .2px;
          box-shadow: 0 10px 32px rgba(233,30,140,.45);
          transition: all .25s;
          position: relative;
          overflow: hidden;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          touch-action: manipulation;
        }
        .pwa-btn-install::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: rgba(255,255,255,.15);
          transition: left .5s ease;
        }
        .pwa-btn-install:hover::before { left: 100%; }
        .pwa-btn-install:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(233,30,140,.55); }
        .pwa-btn-install:active { transform: scale(.97); }
        .pwa-btn-install:disabled { opacity: .6; cursor: not-allowed; }

        .pwa-btn-dismiss {
          width: 100%;
          padding: 14px 24px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 100px;
          background: transparent;
          color: rgba(255,255,255,.5);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          touch-action: manipulation;
        }
        .pwa-btn-dismiss:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.8); }

        /* Loading state */
        .pwa-spinner {
          display: none;
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: pwaSpin .75s linear infinite;
        }
        @keyframes pwaSpin { to { transform: rotate(360deg) } }

        .pwa-install-text { transition: opacity .2s; }

        @media (max-width: 420px) {
          .pwa-card { padding: 28px 20px 22px; border-radius: 26px; }
          .pwa-title { font-size: 26px; }
        }
      </style>

      <div class="pwa-card">
        <div class="pwa-moon">
          <span class="pwa-moon-emoji">🌙</span>
        </div>

        <div style="text-align:center">
          <div class="pwa-badge">✦ Install App</div>
          <h2 class="pwa-title">LunaFlow<br><em>Cycle Tracker</em></h2>
          <p class="pwa-desc">Install the app for the best experience — fast, private, and works offline.</p>
        </div>

        <div class="pwa-benefits">
          <div class="pwa-benefit"><div class="pwa-benefit-dot">⚡</div><span>Instant launch from home screen</span></div>
          <div class="pwa-benefit"><div class="pwa-benefit-dot">📴</div><span>Works fully offline</span></div>
          <div class="pwa-benefit"><div class="pwa-benefit-dot">🔒</div><span>All data stays on your device</span></div>
          <div class="pwa-benefit"><div class="pwa-benefit-dot">🔔</div><span>Cycle & ovulation reminders</span></div>
        </div>

        <button class="pwa-btn-install" id="pwaInstallBtn">
          <div class="pwa-spinner" id="pwaSpinner"></div>
          <span class="pwa-install-text" id="pwaInstallText">📲 Install Now</span>
        </button>
        <button class="pwa-btn-dismiss" id="pwaDismissBtn">Maybe Later</button>
      </div>
    `;

    document.body.appendChild(this.overlayElement);
    document.body.style.overflow = 'hidden';

    document.getElementById('pwaInstallBtn').addEventListener('click', () => this.handleInstall());
    document.getElementById('pwaDismissBtn').addEventListener('click', () => this.handleDismiss());
  }

  // ─────────────────────────────────────────────────────────────
  //  HANDLE INSTALL (Android / Desktop)
  // ─────────────────────────────────────────────────────────────
  async handleInstall() {
    if (!this.deferredPrompt) {
      alert('Installation not available on this browser. Please use Chrome, Edge, or Samsung Internet.');
      return;
    }

    const btn    = document.getElementById('pwaInstallBtn');
    const txt    = document.getElementById('pwaInstallText');
    const spin   = document.getElementById('pwaSpinner');

    btn.disabled   = true;
    txt.style.opacity = '0';
    spin.style.display = 'block';

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);

      if (outcome !== 'accepted') {
        btn.disabled = false;
        txt.style.opacity = '1';
        spin.style.display = 'none';
      }
      this.deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install error:', err);
      btn.disabled = false;
      txt.style.opacity = '1';
      spin.style.display = 'none';
    }
  }

  handleDismiss() {
    this.markUserDismissed();
    this.hideBlockingOverlay();
  }

  hideBlockingOverlay() {
    if (!this.overlayElement) return;
    this.overlayElement.style.animation = 'pwaFadeOut .35s ease-out forwards';
    setTimeout(() => {
      this.overlayElement?.remove();
      this.overlayElement = null;
      this.isBlocking = false;
      document.body.style.overflow = '';
    }, 360);
  }

  // ─────────────────────────────────────────────────────────────
  //  iOS OVERLAY (Add to Home Screen instructions)
  // ─────────────────────────────────────────────────────────────
  showIOSBlockingOverlay() {
    if (this.isInstalled || this.isBlocking) return;
    console.log('[PWA] Showing iOS instructions overlay');
    this.isBlocking = true;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'pwa-install-overlay';

    this.overlayElement.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        #pwa-install-overlay {
          position: fixed; inset: 0; z-index: 999999;
          display: flex; align-items: flex-end; justify-content: center;
          padding: 0 0 env(safe-area-inset-bottom, 20px);
          font-family: 'DM Sans', sans-serif;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: pwaFadeIn .35s ease-out both;
        }
        @keyframes pwaFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pwaFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pwaSheetUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }

        .pwa-ios-sheet {
          background: #1a0a24;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 32px 32px 0 0;
          padding: 32px 24px 36px;
          width: 100%; max-width: 520px;
          animation: pwaSheetUp .45s cubic-bezier(.22,.61,.36,1) both;
          box-shadow: 0 -20px 60px rgba(0,0,0,.6);
        }

        /* Handle */
        .pwa-sheet-handle {
          width: 44px; height: 5px;
          border-radius: 100px;
          background: rgba(255,255,255,.2);
          margin: 0 auto 24px;
        }

        .pwa-ios-moon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(255,77,166,.25), rgba(123,45,139,.35));
          border: 1.5px solid rgba(255,77,166,.4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          font-size: 30px;
          box-shadow: 0 0 30px rgba(233,30,140,.3);
        }

        .pwa-ios-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 700;
          color: #fff; text-align: center;
          margin-bottom: 6px;
        }
        .pwa-ios-subtitle {
          font-size: 13px; color: rgba(255,255,255,.55);
          text-align: center; line-height: 1.6;
          margin-bottom: 24px; font-weight: 400;
        }

        .pwa-ios-steps {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
          margin-bottom: 24px;
        }
        .pwa-ios-step {
          display: flex; align-items: center; gap: 14px;
          font-size: 14px; color: rgba(255,255,255,.8);
          line-height: 1.5; font-weight: 500;
        }
        .pwa-ios-step-num {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #e91e8c, #9c27b0);
          color: #fff; font-size: 15px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(233,30,140,.4);
        }
        .pwa-ios-step-icon {
          display: inline-block;
          background: rgba(255,255,255,.12);
          border-radius: 6px; padding: 1px 6px;
          font-size: 13px; color: #fff;
          margin: 0 3px;
        }

        .pwa-ios-confirm {
          width: 100%; padding: 16px;
          border: none; border-radius: 100px;
          background: linear-gradient(135deg, #e91e8c, #9c27b0);
          color: white; font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700; cursor: pointer;
          box-shadow: 0 10px 32px rgba(233,30,140,.4);
          margin-bottom: 10px; touch-action: manipulation;
          transition: all .2s;
        }
        .pwa-ios-confirm:active { transform: scale(.97); }

        .pwa-ios-dismiss {
          width: 100%; padding: 14px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 100px; background: transparent;
          color: rgba(255,255,255,.5); font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          touch-action: manipulation; transition: all .2s;
        }
        .pwa-ios-dismiss:hover { color: rgba(255,255,255,.8); background: rgba(255,255,255,.06); }
      </style>

      <div class="pwa-ios-sheet">
        <div class="pwa-sheet-handle"></div>
        <div class="pwa-ios-moon">🌙</div>
        <div class="pwa-ios-title">Add to Home Screen</div>
        <p class="pwa-ios-subtitle">Install LunaFlow in 4 easy steps for the best experience.</p>

        <div class="pwa-ios-steps">
          <div class="pwa-ios-step">
            <div class="pwa-ios-step-num">1</div>
            <span>Tap the <span class="pwa-ios-step-icon">⎋ Share</span> button at the bottom of Safari</span>
          </div>
          <div class="pwa-ios-step">
            <div class="pwa-ios-step-num">2</div>
            <span>Scroll down and tap <span class="pwa-ios-step-icon">＋ Add to Home Screen</span></span>
          </div>
          <div class="pwa-ios-step">
            <div class="pwa-ios-step-num">3</div>
            <span>Keep the name <strong style="color:#ff88cc">LunaFlow</strong> and tap <span class="pwa-ios-step-icon">Add</span></span>
          </div>
          <div class="pwa-ios-step">
            <div class="pwa-ios-step-num">4</div>
            <span>Open the LunaFlow icon from your home screen 🎉</span>
          </div>
        </div>

        <button class="pwa-ios-confirm" id="pwaIOSConfirmBtn">✓ I've Added It</button>
        <button class="pwa-ios-dismiss" id="pwaIOSDismissBtn">Maybe Later</button>
      </div>
    `;

    document.body.appendChild(this.overlayElement);
    document.body.style.overflow = 'hidden';

    document.getElementById('pwaIOSConfirmBtn').addEventListener('click', () => {
      this.markUserInstalled();
      this.hideBlockingOverlay();
      this.showSuccessMessage();
    });
    document.getElementById('pwaIOSDismissBtn').addEventListener('click', () => this.handleDismiss());
  }

  // ─────────────────────────────────────────────────────────────
  //  SUCCESS MESSAGE
  // ─────────────────────────────────────────────────────────────
  showSuccessMessage() {
    const el = document.createElement('div');
    el.innerHTML = `
      <style>
        #pwa-success-msg {
          position: fixed; inset: 0; z-index: 999999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: linear-gradient(170deg, #1a0a1e, #2d0a3a, #4a0e5c);
          font-family: 'DM Sans', sans-serif;
          animation: pwaSuccessIn .4s ease-out both;
        }
        @keyframes pwaSuccessIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pwaSuccessOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pwaCheckBounce {
          0%   { transform: scale(0) rotate(-20deg) }
          60%  { transform: scale(1.15) rotate(5deg) }
          100% { transform: scale(1) rotate(0) }
        }
        .pwa-success-icon {
          font-size: 72px;
          animation: pwaCheckBounce .6s cubic-bezier(.22,.61,.36,1) .1s both;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 20px rgba(233,30,140,.7));
        }
        .pwa-success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 700;
          color: #fff; margin-bottom: 8px;
        }
        .pwa-success-sub {
          font-size: 14px; color: rgba(255,255,255,.55);
          font-weight: 400;
        }
      </style>
      <div id="pwa-success-msg">
        <div class="pwa-success-icon">🌸</div>
        <div class="pwa-success-title">You're all set!</div>
        <div class="pwa-success-sub">LunaFlow is ready on your home screen</div>
      </div>
    `;
    document.body.appendChild(el);

    setTimeout(() => {
      el.querySelector('#pwa-success-msg').style.animation = 'pwaSuccessOut .4s ease-out forwards';
      setTimeout(() => el.remove(), 420);
    }, 2200);
  }
}

// ─────────────────────────────────────────────────────────────
//  BOOTSTRAP
// ─────────────────────────────────────────────────────────────

// If loaderDone fires before init() runs, record it immediately
window.addEventListener('loaderDone', () => {
  if (window.lunapwaManager) window.lunapwaManager._loaderAlreadyDone = true;
}, { once: true });

window.lunapwaManager = new ForcedPWAInstallManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.lunapwaManager.init());
} else {
  window.lunapwaManager.init();
}

console.log('[PWA] LunaFlow PWA Install Manager loaded');