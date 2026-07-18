(() => {
  'use strict';

  let deferredInstallPrompt = null;

  function createInstallButton() {
    if (document.getElementById('pwaInstallBtn')) return;

    const button = document.createElement('button');
    button.id = 'pwaInstallBtn';
    button.type = 'button';
    button.textContent = '⬇ ติดตั้งแอป';
    button.setAttribute('aria-label', 'ติดตั้งระบบสารสนเทศผลการเรียน');
    Object.assign(button.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: '9999',
      height: '48px',
      padding: '0 18px',
      border: '0',
      borderRadius: '16px',
      background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
      color: '#fff',
      fontFamily: "'Kanit',sans-serif",
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 12px 28px rgba(18,38,63,.22)'
    });

    button.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } finally {
        deferredInstallPrompt = null;
        button.remove();
      }
    });

    document.body.appendChild(button);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    createInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('pwaInstallBtn')?.remove();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', {
          scope: './'
        });

        // ตรวจหา service worker เวอร์ชันใหม่เมื่อเปิดแอป
        registration.update().catch(() => {});
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    });
  }
})();
