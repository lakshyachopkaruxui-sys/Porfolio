/* Normal mode owns this preference; Play keeps its independent environment. */
(() => {
  const key = 'lakshya-normal-theme';
  const root = document.documentElement;
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'slate') theme = 'slate'; } catch {}
  function apply(value) {
    theme = value;
    root.dataset.normalTheme = value;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = value === 'slate' ? '#202833' : '#f2f4f7';
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    if (!header) return;
    const existing = header.querySelector('[data-header-theme-toggle]');
    const button = existing || document.createElement('button');
    button.type = 'button';
    button.className = 'normal-theme-toggle';
    const buttons = [button, ...document.querySelectorAll('[data-normal-theme-toggle]')];
    const sync = () => buttons.forEach(control => {
      control.textContent = theme === 'slate' ? 'Light mode' : 'Slate mode';
      control.setAttribute('aria-label', theme === 'slate' ? 'Switch to light theme' : 'Switch to slate dark theme');
    });
    sync();
    buttons.forEach(control => control.addEventListener('click', () => {
      apply(theme === 'slate' ? 'light' : 'slate');
      try { localStorage.setItem(key, theme); } catch {}
      sync();
    }));
    const mode = header.querySelector('.mode-selector');
    if (mode && !existing) {
      const controls = document.createElement('div');
      controls.className = 'header-preferences';
      mode.before(controls);
      controls.append(mode, button);
    } else if (!existing) header.append(button);
    addEventListener('storage', event => {
      if (event.key !== key) return;
      apply(event.newValue === 'slate' ? 'slate' : 'light');
      sync();
    });
  }, {once: true});
})();
