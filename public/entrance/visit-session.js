(() => {
  'use strict';

  // Reserve a browser-session key before sending. Another page can reuse it
  // even if the first page navigates before receiving the server's cookie.
  const reservation = '__Host-lakshya_visit_key';
  const tabKey = 'lakshya-visit-key';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let pending = false;
  let recorded = false;

  function reserve() {
    const prefix = reservation + '=';
    let shared;
    try {
      shared = document.cookie.split(';').map(value => value.trim())
        .find(value => value.startsWith(prefix))?.slice(prefix.length);
    } catch {}
    if (uuid.test(shared || '')) return shared;

    let previous;
    try { previous = sessionStorage.getItem(tabKey); } catch {}
    const key = uuid.test(previous || '') ? previous : crypto.randomUUID();
    let saved = false;
    try {
      document.cookie = prefix + key + '; Path=/; Secure; SameSite=Lax';
      saved = document.cookie.split(';').some(value => value.trim() === prefix + key);
    } catch {}
    try {
      sessionStorage.setItem(tabKey, key);
      saved = true;
    } catch {}
    return saved ? key : null;
  }

  async function register() {
    if (recorded || pending) return;
    pending = true;
    try {
      const key = navigator.locks
        ? await navigator.locks.request('lakshya-visitor-session', reserve)
        : reserve();
      if (!key) return;
      const response = await fetch('/api/visit', {
        method: 'POST', headers: {'X-Visit-Key': key}, credentials: 'same-origin',
        cache: 'no-store', keepalive: true
      });
      if (response.status !== 200) return;
      const {number} = await response.json();
      if (!Number.isSafeInteger(number) || number < 1) return;
      recorded = true;
      const guest = document.getElementById('guest');
      if (!guest) return;
      const digits = document.createElement('strong');
      digits.textContent = number.toLocaleString();
      guest.replaceChildren('You’re visitor number ', digits, '.');
      guest.hidden = false;
    } catch {
      // Offline navigation stays usable. Reuse the same reservation on retry.
    } finally {
      pending = false;
    }
  }

  if (document.prerendering) {
    document.addEventListener('prerenderingchange', register, {once:true});
  } else {
    register();
  }
  window.addEventListener('pageshow', () => { if (!document.prerendering) register(); });
  window.addEventListener('online', () => { if (!document.prerendering) register(); });
})();
