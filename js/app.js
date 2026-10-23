(function (TL) {
  const routes = [
    [/^$/, 'dashboard', []], [/^ch\/([^/]+)$/, 'dashboard', ['id']],
    [/^upload$/, 'upload', []], [/^review$/, 'review', []], [/^settings$/, 'settings', []],
    [/^learn\/([^/]+)$/, 'learn', ['id']], [/^practice\/([^/]+)$/, 'practice', ['id']], [/^test\/([^/]+)$/, 'test', ['id']],
    [/^result\/([^/]+)(?:\/([^/]+))?$/, 'result', ['id', 'aid']], [/^report\/([^/]+)(?:\/([^/]+))?$/, 'report', ['id', 'aid']],
  ];
  let current = null, currentKey = '';
  function resolve() {
    const path = location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
    for (const [re, name, keys] of routes) {
      const m = path.match(re);
      if (m) return { name, params: Object.fromEntries(keys.map((k, i) => [k, m[i + 1] && decodeURIComponent(m[i + 1])])), key: path };
    }
    return { name: 'dashboard', params: {}, key: '' };
  }
  function render() {
    const r = resolve();
    const view = TL.views[r.name];
    const root = document.getElementById('app');
    if (current && (current.view !== view || currentKey !== r.key) && current.view.unmount) current.view.unmount();
    const changed = currentKey !== r.key;
    const y = window.scrollY;
    root.innerHTML = view.render(r.params);
    if (changed) { root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter'); }
    if (view.mount) view.mount(root, r.params);
    current = { view }; currentKey = r.key;
    if (changed) window.scrollTo(0, 0); else window.scrollTo(0, y);
    const h1 = root.querySelector('h1, .t');
    document.title = (h1 ? h1.textContent.trim() + ' · ' : '') + 'Tự Lập';
  }
  TL.app = { render };
  TL.store.load();
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})(window.TL);
