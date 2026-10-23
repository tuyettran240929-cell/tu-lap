(function (TL) {
  const { esc, uid, shuffle } = TL.u;
  const S = () => TL.store;
  TL.views = TL.views || {};
  TL.session = TL.session || { practice: {}, quiz: {} };

  const chLabel = (ch) => `Chương ${S().chIndex(ch.id) + 1}`;
  const topicTitle = (ch, id) => (ch.topics.find((t) => t.id === id) || {}).title || 'Chủ đề';

  const ICONS = {
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5',
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', shieldCheck: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', check: 'M20 6 9 17l-5-5',
    sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', bot: 'M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M15 13v2M9 13v2',
    chart: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-8', arrow: 'M5 12h14M12 5l7 7-7 7', back: 'M19 12H5M12 19l-7-7 7-7',
    trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
    trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6', alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5', send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
    calc: 'M4 2h16v20H4zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01',
    pencil: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z', sigma: 'M18 7V4H6l6 8-6 8h12v-3', botOff: 'M2 2l20 20M12 8V4H8M8 8h12v8M20 20H4V8M9 13v2',
    leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6',
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;
  function overall() {
    const chs = S().state.course.chapters; if (!chs.length) return 0;
    return Math.round((chs.reduce((s, c) => s + Math.min(S().stageOf(c.id) - 1, 3), 0) / (chs.length * 3)) * 100);
  }

  function sidebar(activeId) {
    const st = S().state;
    const items = st.course.chapters.map((c, i) => {
      const un = S().unlocked(c.id);
      const stage = S().stageOf(c.id);
      const cls = !un ? 'locked' : stage === 4 ? 'done' : 'cur';
      const num = !un ? icon('lock') : stage === 4 ? icon('check') : i + 1;
      const tag = !un ? 'Khoá' : stage === 4 ? 'Hoàn thành' : ['', 'Học', 'Luyện tập', 'Kiểm tra'][stage];
      return `<a href="#/ch/${c.id}" class="${c.id === activeId ? 'on' : ''} ${cls}" data-ch="${c.id}"><span class="num">${num}</span><span class="lbl">${esc(c.title)}<br><span class="st">Chương ${i + 1} · ${tag}</span></span></a>`;
    }).join('');
    const pc = overall();
    return `<aside class="side">
      <a class="brand" href="#/"><span class="logo">${icon('leaf')}</span>Tự Lập</a>
      <div class="course-box"><b>${esc(st.course.title)}${st.course.source === 'demo' ? ' (mẫu)' : ''}</b>
        <div class="progressbar"><div style="width:${pc}%"></div></div><span class="xs muted">Hoàn thành ${pc}% khoá học</span></div>
      <div class="nav-h">Chương học</div>
      <nav class="nav" aria-label="Chương">${items}</nav>
      <div class="side-foot">
        <a class="btn ghost" href="#/upload">${icon('upload')} Tải bài giảng lên</a>
        <a class="link" href="#/settings">${icon('settings')} Cài đặt</a>
      </div>
    </aside>`;
  }
  const withSidebar = (activeId, inner) => `<div class="shell">${sidebar(activeId)}<main class="main">${inner}</main></div>`;

  function mcqFromGen(name) {
    const g = TL.data.gens[name](TL.u.rng(Date.now() ^ Math.floor(Math.random() * 1e9)));
    const q = TL.data.genToMcq(g);
    return { ...q, id: uid('g'), numAnswer: g.type === 'num' ? g.answer : null, source: 'gen', status: 'approved', verified: true };
  }
  function freshGen(name) {
    const g = TL.data.gens[name](TL.u.rng(Date.now() ^ Math.floor(Math.random() * 1e9)));
    return { ...g, id: uid('v'), source: 'gen' };
  }
  const shuffleOpts = (q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  };

  function stageQuestions(ch, stage, topics) {
    const ok = (q) => q.status === 'approved' && (!topics || !topics.length || topics.includes(q.topicId));
    const bank = ch.questions || [];
    if (stage === 1) {
      let qs = bank.filter((q) => ok(q) && q.stage === 1);
      if (qs.length < 3) qs = qs.concat(bank.filter((q) => ok(q) && q.stage !== 1 && !qs.includes(q)).slice(0, 3 - qs.length));
      return shuffle(qs).slice(0, 5).map(shuffleOpts);
    }
    if (stage === 2) {
      let qs = bank.filter((q) => ok(q) && q.stage === 2).map(shuffleOpts);
      const gens = (ch.gens || []).filter((g) => !topics || !topics.length || topics.includes(TL.data.gens[g](TL.u.rng(1)).topicId));
      const useGens = gens.length ? gens : ch.gens || [];
      for (let i = 0; qs.length < 8 && useGens.length && i < 8; i++) qs.push(mcqFromGen(useGens[i % useGens.length]));
      if (qs.length < 4 && topics && topics.length) return stageQuestions(ch, 2, null);
      return shuffle(qs).slice(0, 8);
    }
    const n = S().state.settings.testCount;
    if (ch.gens && ch.gens.length) {
      const order = shuffle(ch.gens);
      return Array.from({ length: n }, (_, i) => freshGen(order[i % order.length]));
    }
    return shuffle(bank.filter((q) => q.status === 'approved' && q.stage === 3 && q.verified)).slice(0, n).map(shuffleOpts);
  }

  function isCorrect(q, ans) {
    if (ans == null || ans === '') return false;
    if (q.type === 'mcq') return Number(ans) === q.answer;
    const n = TL.u.parseNumber(ans);
    return n != null && Math.abs(n - q.answer) <= (q.tol ?? 0.011) + 1e-9;
  }

  function optionList(q, name, selected, reveal) {
    return `<div class="opts" role="radiogroup">${q.options.map((o, i) => {
      let cls = 'opt';
      if (reveal) { if (i === q.answer) cls += ' right'; else if (String(selected) === String(i)) cls += ' wrong'; }
      else if (String(selected) === String(i)) cls += ' sel';
      return `<label class="${cls}"><input type="radio" name="${name}" value="${i}" ${String(selected) === String(i) ? 'checked' : ''} ${reveal ? 'disabled' : ''}> ${esc(o)}</label>`;
    }).join('')}</div>`;
  }

  const LABELS = [
    { key: 'clean', text: 'Sạch', bg: '#E4EEEA', pill: 'ok' },
    { key: 'review', text: 'Cần xem lại', bg: '#FBEFD9', pill: 'warn' },
    { key: 'bad', text: 'Không đảm bảo liêm chính', bg: '#F6D9D3', pill: 'bad' },
  ];
  const WEIGHT = { light: 2, medium: 12, strong: 24 };
  function riskOf(events) {
    const score = events.reduce((s, e) => s + (WEIGHT[e.level] || 0), 0);
    const label = score >= 60 ? 'bad' : score >= 25 ? 'review' : 'clean';
    return { score, label };
  }
  const labelInfo = (k) => LABELS.find((l) => l.key === k) || LABELS[0];
  const levelText = { light: 'Nhẹ', medium: 'Vừa', strong: 'Mạnh' };

  function cooldownLeft(id) { return Math.max(0, S().prog(id).s3.cooldownUntil - Date.now()); }

  TL.ui = { icon, overall, sidebar, withSidebar, chLabel, topicTitle, stageQuestions, isCorrect, optionList, riskOf, labelInfo, LABELS, levelText, cooldownLeft };
})(window.TL);
