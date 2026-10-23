(function (TL) {
  const { esc, uid, shuffle } = TL.u;
  const S = () => TL.store;
  TL.views = TL.views || {};
  TL.session = TL.session || { practice: {}, quiz: {} };

  const chLabel = (ch) => `Chương ${S().chIndex(ch.id) + 1}`;
  const topicTitle = (ch, id) => (ch.topics.find((t) => t.id === id) || {}).title || 'Chủ đề';

  function sidebar(activeId) {
    const st = S().state;
    const items = st.course.chapters.map((c, i) => {
      const un = S().unlocked(c.id);
      const stage = S().stageOf(c.id);
      const tag = !un ? 'Khoá' : stage === 4 ? 'Xong' : 'GĐ' + stage;
      return `<a href="#/ch/${c.id}" class="${c.id === activeId ? 'on' : ''} ${un ? '' : 'locked'}" data-ch="${c.id}"><span>Chương ${i + 1} · ${esc(c.title)}</span><span class="st">${tag}</span></a>`;
    }).join('');
    return `<aside class="side">
      <a class="brand" href="#/">Tự Lập</a>
      <div class="course-title">${esc(st.course.title)}${st.course.source === 'demo' ? ' (mẫu)' : ''}</div>
      <nav class="nav" aria-label="Chương">${items}</nav>
      <div class="side-foot">
        <a class="btn ghost" href="#/upload">Tải bài giảng lên</a>
        <a class="link" href="#/settings">Cài đặt</a>
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

  TL.ui = { sidebar, withSidebar, chLabel, topicTitle, stageQuestions, isCorrect, optionList, riskOf, labelInfo, LABELS, levelText, cooldownLeft };
})(window.TL);
