/* ══════════════════════════════════════════════════════════
   pwa.js — FLIP & MATCH  Progressive Web App Module
══════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY";

let swRegistration = null;
let waitingWorker = null;
let deferredInstall = null;
let fcmMessaging = null;

/* ════════════════════════════════════
   SERVICE WORKER
════════════════════════════════════ */
async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported.');
    return;
  }
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
    console.log('[PWA] SW registered. Scope:', swRegistration.scope);

    if (swRegistration.waiting) { waitingWorker = swRegistration.waiting; showUpdateToast(); }

    swRegistration.addEventListener('updatefound', () => {
      const installing = swRegistration.installing;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = installing; showUpdateToast();
        }
      });
    });

    navigator.serviceWorker.addEventListener('message', ({ data }) => {
      if (data?.type === 'SYNC_COMPLETE') pwaToast('☁️ ' + data.msg);
    });

    await navigator.serviceWorker.ready;
    initFirebasePush();
  } catch (err) {
    console.error('[PWA] SW registration failed:', err);
  }
}

function pwaApplyUpdate() {
  document.getElementById('updateToast').style.display = 'none';
  if (waitingWorker) { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); waitingWorker = null; }
  window.location.reload();
}
function showUpdateToast() {
  const el = document.getElementById('updateToast');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 9000);
}

/* ════════════════════════════════════
   FIREBASE PUSH
════════════════════════════════════ */
function initFirebasePush() {
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.info('[Firebase] Demo mode — add real credentials to enable push.');
    showNotifButton(); return;
  }
  const sdkApp = document.createElement('script');
  sdkApp.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js';
  sdkApp.onload = () => {
    const sdkMsg = document.createElement('script');
    sdkMsg.src = 'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js';
    sdkMsg.onload = () => {
      try {
        firebase.initializeApp(FIREBASE_CONFIG);
        fcmMessaging = firebase.messaging();
        fcmMessaging.onMessage(payload => {
          const n = payload.notification || {};
          pwaToast(`🔔 ${n.title || 'Notification'}: ${n.body || ''}`);
        });
        showNotifButton();
      } catch (e) { console.warn('[Firebase] Init error:', e.message); }
    };
    document.head.appendChild(sdkMsg);
  };
  document.head.appendChild(sdkApp);
}

function showNotifButton() {
  return; // Hidden as requested by the user
  if (!('Notification' in window)) return;
  const existing = document.getElementById('pwaNotifBtn');
  if (existing) return;
  const controls = document.querySelector('#titleScreen .title-content > div:last-child');
  if (!controls) return;

  const btn = document.createElement('button');
  btn.id = 'pwaNotifBtn';
  btn.className = 'btn-secondary';

  // Show correct label based on current permission state
  if (Notification.permission === 'granted') {
    btn.textContent = '🔔 Notifications On';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'default';
  } else if (Notification.permission === 'denied') {
    btn.textContent = '🔕 Notifications Blocked';
    btn.title = 'Notifications are blocked. Please enable them in your browser settings.';
    btn.onclick = () => pwaToast('🔕 Blocked — enable notifications in your browser/device settings.');
  } else {
    btn.textContent = '🔔 Notifications';
    btn.onclick = pwaRequestPermission;
  }

  controls.appendChild(btn);
}

// Centralized permission request for both Game UI and Technical Demo
async function pwaRequestPermission(mode = 'instant') {
  if (!('Notification' in window)) {
    pwaToast('❌ Notifications not supported.');
    return;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // 1. Setup Push Subscription
      await subscribeToPush();
      
      // 2. Demo Modes for Defense
      if (mode === 'delayed') {
        alert('⏳ Background alert scheduled! You have 5 seconds to minimize the browser or switch tabs...');
        setTimeout(() => {
          showLocalNotif('Flip & Match — 💀 Nilalang Alert!', 'An Aswang has been spotted nearby! Stay alert, warrior.');
        }, 5000);
      } else {
        pwaToast('🔔 Notifications enabled!');
        setTimeout(() => {
          showLocalNotif('FLIP & MATCH ⛧', 'Welcome! The creatures are waiting for you…');
        }, 1500);
      }
      
      scheduleReminder();
    } else {
      pwaToast('🔕 Notifications were not allowed.');
    }
    
    // Update the UI button if it exists
    updateNotifButtonUI(permission);
  } catch (e) {
    console.error('[PWA] Permission request error:', e);
  }
}

// Expose to window for index.html access
window.pwaRequestPermission = pwaRequestPermission;

// AUTOMATIC PROMPT: Ask for permission on the very first click in the app
document.addEventListener('click', function autoRequest() {
  if (Notification.permission === 'default') {
    console.log('[PWA] Requesting permission on first interaction...');
    pwaRequestPermission('instant');
  }
  // Remove listener after first execution
  document.removeEventListener('click', autoRequest);
}, { once: true });

// Helper to update button state
function updateNotifButtonUI(permission) {
  const btn = document.getElementById('pwaNotifBtn');
  if (!btn) return;
  
  if (permission === 'granted') {
    btn.textContent = '🔔 Notifications On';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'default';
  } else if (permission === 'denied') {
    btn.textContent = '🔕 Notifications Blocked';
    btn.onclick = () => pwaToast('🔕 Blocked — enable in browser settings.');
  }
}

async function subscribeToPush() {
  if (!swRegistration) return;
  try {
    if (fcmMessaging && VAPID_KEY !== 'YOUR_VAPID_PUBLIC_KEY') {
      const token = await fcmMessaging.getToken({ vapidKey: VAPID_KEY });
      localStorage.setItem('flipmatch_fcm_token', token);
    } else {
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: strToUint8(VAPID_KEY !== 'YOUR_VAPID_PUBLIC_KEY' ? VAPID_KEY : DEMO_VAPID),
      });
      localStorage.setItem('flipmatch_push_sub', JSON.stringify(sub.toJSON()));
    }
  } catch (e) { console.warn('[PWA] Push subscribe failed (expected in demo):', e.message); }
}

function showLocalNotif(title, body) {
  if (Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-72.png', vibrate: [200, 100, 200], tag: 'flipmatch-local', data: { url: window.location.href } };
  if (swRegistration) swRegistration.showNotification(title, opts);
  else new Notification(title, opts);
}

function scheduleReminder() {
  setTimeout(() => {
    if (!document.hasFocus()) showLocalNotif('FLIP & MATCH ⛧', 'The creatures are still waiting… Continue your battle!');
  }, 3600000);
}

/* ════════════════════════════════════
   INSTALL PROMPT
════════════════════════════════════ */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  showInstallBanner();
});

function showInstallBanner() {
  const b = document.getElementById('installBanner');
  if (!b) return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isIOS && !isStandalone) {
    const title = b.querySelector('strong');
    const desc = b.querySelector('span:not([style*="font-size:2rem"])');
    const btn = b.querySelector('button[onclick="pwaInstall()"]');
    if (title) title.textContent = "Install on iPhone / iPad";
    if (desc) desc.textContent = "Tap Share button then 'Add to Home Screen'";
    if (btn) btn.textContent = "How?";
  }
  b.style.display = 'flex';
}

// FORCE SHOW for testing (after 2 seconds)
setTimeout(showInstallBanner, 2000);

window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  const b = document.getElementById('installBanner'); if (b) b.style.display = 'none';
  pwaToast('🎉 FLIP & MATCH installed successfully!');
});

async function pwaInstall() {
  const b = document.getElementById('installBanner');
  if (!deferredInstall) {
    pwaToast('📱 Tap Share → "Add to Home Screen"');
    return;
  }
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  if (b) b.style.display = 'none';
}

function pwaDismissInstall() {
  const b = document.getElementById('installBanner'); if (b) b.style.display = 'none';
}

/* ════════════════════════════════════
   ONLINE / OFFLINE
════════════════════════════════════ */
let wasOffline = false;
function updateOnlineStatus() {
  const bar = document.getElementById('offlineBar');
  if (navigator.onLine) {
    if (bar) bar.style.display = 'none';
    if (wasOffline) {
      pwaToast('Back Online — Data Synced!');
      showOnlineSystemNotif();
      wasOffline = false;
    }
    if (swRegistration && 'sync' in swRegistration)
      swRegistration.sync.register('sync-game-progress').catch(() => { });
  } else {
    wasOffline = true;
    if (bar) {
      bar.style.display = 'block';
      setTimeout(() => {
        bar.style.display = 'none';
      }, 5000);
    }
    pwaToast('Offline — game still works!');
    showOfflineSystemNotif();
  }
}

function showOfflineSystemNotif() {
  if (Notification.permission === 'granted') {
    const title = 'Flip & Match — Offline';
    const opts = {
      body: 'Connection lost. Playing in Offline Mode—progress is saved locally.',
      icon: '/player.jpg',
      tag: 'network-status'
    };
    if (swRegistration && swRegistration.showNotification) swRegistration.showNotification(title, opts);
    else new Notification(title, opts);
  }
}

function showOnlineSystemNotif() {
  if (Notification.permission === 'granted') {
    const title = 'Flip & Match — Online';
    const opts = {
      body: 'Connection restored! Your battle archives are now syncing with the abyss...',
      icon: '/player.jpg',
      tag: 'network-status'
    };
    if (swRegistration && swRegistration.showNotification) swRegistration.showNotification(title, opts);
    else new Notification(title, opts);
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

/* ════════════════════════════════════
   DISPLAY MODE
════════════════════════════════════ */
function detectDisplayMode() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) {
    document.body.classList.add('pwa-standalone');
    const b = document.getElementById('installBanner'); if (b) b.style.display = 'none';
  }
  window.matchMedia('(display-mode: standalone)').addEventListener('change', e => {
    document.body.classList.toggle('pwa-standalone', e.matches);
  });
  return standalone;
}

/* ════════════════════════════════════
   WAKE LOCK
════════════════════════════════════ */
let wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
}
async function releaseWakeLock() {
  if (wakeLock) { await wakeLock.release(); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    if (typeof started !== 'undefined' && started && !isGameOver) acquireWakeLock();
  }
});

/* ════════════════════════════════════
   VIBRATION
════════════════════════════════════ */
function vibrate(pattern) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

/* ════════════════════════════════════
   NETWORK INFO
════════════════════════════════════ */
function checkNetwork() {
  if (!('connection' in navigator)) return;
  const c = navigator.connection;
  if (c.saveData || c.effectiveType === '2g' || c.effectiveType === 'slow-2g')
    pwaToast('Slow connection — game works offline too!');
}

// Also re-check whenever the connection type changes during gameplay
if ('connection' in navigator) {
  navigator.connection.addEventListener('change', checkNetwork);
}

/* ════════════════════════════════════
   HOOK INTO GAME
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const _startTimer = window.startTimer;
  window.startTimer = function () { _startTimer?.(); acquireWakeLock(); };

  const _stopTimer = window.stopTimer;
  window.stopTimer = function () { _stopTimer?.(); releaseWakeLock(); };

  const _doShake = window.doShake;
  window.doShake = function () { _doShake?.(); vibrate([50]); };

  if (typeof SFX !== 'undefined') {
    const _m = SFX.match; SFX.match = () => { _m(); vibrate([30, 20, 60]); };
    const _w = SFX.win; SFX.win = () => { _w(); vibrate([100, 50, 100, 50, 300]); };
    const _l = SFX.lose; SFX.lose = () => { _l(); vibrate([400, 100, 400]); };
  }
});

/* ════════════════════════════════════
   TOAST
════════════════════════════════════ */
function pwaToast(msg, duration = 3200) {
  const old = document.getElementById('pwaToastContainer'); if (old) old.remove();
  
  const container = document.createElement('div');
  container.id = 'pwaToastContainer';
  container.style.cssText = `
    position: fixed;
    bottom: calc(72px + env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1200;
    pointer-events: none;
  `;

  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    background: rgba(0,0,0,0.93);
    border: 1px solid rgba(139,0,0,0.5);
    border-radius: 8px;
    padding: 10px 20px;
    color: #e8d5b0;
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    text-align: center;
    white-space: nowrap;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: auto;
    animation: fadeInUp 0.3s ease both;
  `;

  container.appendChild(el);
  document.body.appendChild(container);
  
  setTimeout(() => {
    container.style.transition = 'opacity 0.3s';
    container.style.opacity = '0';
    setTimeout(() => container.remove(), 350);
  }, duration);
}

/* ════════════════════════════════════
   UTILITY
════════════════════════════════════ */
const DEMO_VAPID = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJkGCHgsHHFNJzwMISMzEe5lItA';

function strToUint8(b64) {
  try {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  } catch { return new Uint8Array(0); }
}

/* ════════════════════════════════════
   BOOT
════════════════════════════════════ */
(async function bootPWA() {
  detectDisplayMode();
  updateOnlineStatus();
  checkNetwork();
  await registerSW();
  console.log('[PWA] Boot complete');
})();