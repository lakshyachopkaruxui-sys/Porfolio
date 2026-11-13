(() => {
  'use strict';
  if (window.__lakshyaSimpleAnalytics) return;
  window.__lakshyaSimpleAnalytics = true;

  // Aggregate actions only. No cookies, storage, visitor identifier, URL, input
  // text or contact value is sent. Optional telemetry never blocks navigation.
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const projects = new Set(['connectaid','giggles','pixel-mania','syringe','workplace-mode','jan-aushadhi','tear']);
  const delivered = new WeakSet();
  const pending = new Map();
  function send(kind, item) {
    try {
      if (document.prerendering) { pending.set(kind + ':' + item, [kind,item]); return; }
      const body = JSON.stringify({id: crypto.randomUUID(), kind, item});
      if (navigator.sendBeacon?.('/api/events', new Blob([body], {type:'application/json'}))) return;
      void fetch('/api/events', {method:'POST', headers:{'Content-Type':'application/json'},
        body, keepalive:true, credentials:'same-origin', cache:'no-store'}).catch(() => {});
    } catch { /* Blocked analytics must not affect the portfolio. */ }
  }
  document.addEventListener('prerenderingchange', () => {
    for (const [kind,item] of pending.values()) send(kind,item);
    pending.clear();
  }, {once:true});
  document.addEventListener('portfolio:project-open', event => {
    if (delivered.has(event) || !projects.has(event.detail?.id)) return;
    delivered.add(event);
    send('project_open', event.detail.id);
  });
  document.addEventListener('click', event => {
    if (!event.isTrusted || event.button > 0) return;
    const copy = event.target.closest?.('button.resume-copy-button');
    const label = copy?.getAttribute?.('aria-label') || '';
    if (/^(Copy email address|Email copied\.)/.test(label)) { send('contact_click','email'); return; }
    if (/^(Copy phone number|Phone number copied\.)/.test(label)) { send('contact_click','phone'); return; }
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (link.hasAttribute('download') && url.origin === location.origin &&
        /\/Lakshya-Chopkar-(?:Product|UX)-Designer-Resume\.pdf$/i.test(url.pathname)) {
      send('resume_download', 'resume');
    } else if (url.protocol === 'mailto:') send('contact_click', 'email');
    else if (url.protocol === 'tel:') send('contact_click', 'phone');
    else if (/(^|\.)linkedin\.com$/i.test(url.hostname) && /^\/in\/lakshyachopkar\/?$/i.test(url.pathname)) send('contact_click', 'linkedin');
    else if (/(^|\.)behance\.net$/i.test(url.hostname) && /^\/lakshyachopkaruiux\/?$/i.test(url.pathname)) send('contact_click', 'behance');
  }, true);

  // The native summary fallback uses hash navigation instead of a modal reader.
  if (/\/bicycle-world\/(?:dist\/)?projects(?:\.html)?\/?$/.test(location.pathname)) {
    let current = null;
    function summaryOpen() {
      const id = [...projects].find(id => location.hash === '#project-' + id || location.hash.startsWith('#project-' + id + '-section-'));
      if (id && id !== current && document.getElementById('project-' + id)) send('project_open',id);
      current = id || null;
    }
    window.addEventListener('hashchange',summaryOpen);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',summaryOpen,{once:true});
    else summaryOpen();
  }
})();
