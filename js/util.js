window.TL = window.TL || {};
(function (TL) {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(arr, r = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
  const fmtNum = (x, d = 2) => {
    const v = round(x, d);
    return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
  };
  function parseNumber(text) {
    if (text == null) return null;
    const s = String(text).replace(/\s+/g, ' ');
    const frac = s.match(/(-?\d+)\s*\/\s*(\d+)/);
    const num = s.match(/-?\d+(?:[.,]\d+)?/);
    if (frac && (!num || s.indexOf(frac[0]) <= s.indexOf(num[0]))) {
      const d = Number(frac[2]);
      if (d) return Number(frac[1]) / d;
    }
    return num ? Number(num[0].replace(',', '.')) : null;
  }
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const pct = (x) => (x == null || isNaN(x) ? '—' : Math.round(x) + '%');
  const mmss = (sec) => {
    sec = Math.max(0, Math.round(sec));
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  };
  const hhmm = (ms) => {
    const m = Math.max(0, Math.ceil(ms / 60000));
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ');
  const tokens = (s) => norm(s).split(/\s+/).filter((w) => w.length > 1);

  let toastTimer;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function modal({ title, body, actions }) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div>${body}</div><div class="actions"></div></div>`;
      const box = bg.querySelector('.actions');
      (actions || [{ label: 'Đóng', value: null }]).forEach((a) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (a.cls || '');
        b.textContent = a.label;
        b.onclick = () => { bg.remove(); resolve(a.value); };
        box.appendChild(b);
      });
      bg.addEventListener('click', (e) => { if (e.target === bg) { bg.remove(); resolve(null); } });
      document.body.appendChild(bg);
      box.lastChild && box.lastChild.focus();
    });
  }
  const confirmBox = (title, body, ok = 'Đồng ý') =>
    modal({ title, body: `<p class="muted">${body}</p>`, actions: [{ label: 'Huỷ', value: false, cls: 'ghost' }, { label: ok, value: true }] });

  TL.u = { esc, rng, randInt, pick, shuffle, round, fmtNum, parseNumber, uid, pct, mmss, hhmm, norm, tokens, toast, modal, confirmBox };
})(window.TL);
