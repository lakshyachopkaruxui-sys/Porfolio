(() => {
  'use strict';

  // Reserve a browser-session key before sending. Another page can reuse it
  // even if the first page navigates before receiving the server's cookie.
  const reservation = '__Host-lakshya_visit_key';
  const tabKey = 'lakshya-visit-key';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let pending = false;
  let recorded = false;
  let lastRefresh = 0;
  let displayedTotal = -1;

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

  function paint(total) {
    if (!Number.isSafeInteger(total) || total < 0 || total < displayedTotal) return false;
    displayedTotal = total;
    const guest = document.getElementById('guest');
    if (!guest) return true;
    const digits = document.createElement('strong');
    digits.textContent = total.toLocaleString();
    guest.replaceChildren(digits, total === 1 ? ' visit so far.' : ' visits so far.');
    guest.hidden = false;
    return true;
  }

  async function register(force = false) {
    if (pending || document.prerendering || document.hidden) return;
    if (recorded && !force && Date.now() - lastRefresh < 30000) return;
    pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const key = !recorded ? (navigator.locks
        ? await navigator.locks.request('lakshya-visitor-session', reserve)
        : reserve()) : null;
      if (!recorded && !key) return;
      const response = await fetch('/api/visit', {
        method: recorded ? 'GET' : 'POST',
        headers: key ? {'X-Visit-Key': key} : {},
        credentials: 'same-origin', cache: 'no-store',
        keepalive: !recorded, signal: controller.signal
      });
      if (response.status !== 200) return;
      const result = await response.json();
      if (!paint(result.total)) return;
      recorded = true;
      lastRefresh = Date.now();
    } catch {
      // Never substitute an invented or locally cached number on failure.
      // A retry reuses the same reservation, so registration stays idempotent.
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }

  if (document.prerendering) {
    document.addEventListener('prerenderingchange', register, {once:true});
  } else {
    register();
  }
  window.addEventListener('pageshow', () => register(true));
  window.addEventListener('online', () => register(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) register(true); });
  setInterval(() => {
    const guest = document.getElementById('guest');
    if (guest && guest.getClientRects().length) register();
  }, 30000);
})();
