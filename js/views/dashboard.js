(function (TL) {
  const { esc, pct, hhmm, round } = TL.u;
  const S = () => TL.store;

  function metrics() {
    const chs = S().state.course.chapters;
    let firstTry = 0, tried = 0, gaps = [], ai = [];
    chs.forEach((c) => {
      const p = S().prog(c.id);
      if (p.s3.attempts.length) {
        tried++;
        if (p.s3.attempts[0].passed) firstTry++;
        if (p.s2.best != null) gaps.push(p.s2.best - p.s3.attempts[p.s3.attempts.length - 1].score);
      }
      if (p.s1.passed || p.s2.aiUsed) ai.push(S().aiUsedTotal(c.id));
    });
    const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
    return {
      firstTry: tried ? pct((firstTry / tried) * 100) : '—',
      gap: gaps.length ? (avg(gaps) > 0 ? '+' : '') + round(avg(gaps), 1) + ' điểm' : '—',
      ai: ai.length ? round(avg(ai), 1) + ' lượt' : '—',
    };
  }

  function bars() {
    const chs = S().state.course.chapters;
    return chs.map((c, i) => {
      const p = S().prog(c.id);
      const started = p.s1.passed;
      const used = S().aiUsedTotal(c.id);
      const quota = p.s2.quota;
      const max = 5;
      const h = (v) => Math.min(120, Math.round((v / max) * 120));
      return `<div class="b" title="Chương ${i + 1}: đã dùng ${used}/${quota} lượt">
        <div class="stack">
          ${started ? `<div class="quota" style="bottom:${h(quota)}px"></div><div class="bar" style="height:${h(used)}px"></div>` : `<div class="bar q" style="height:${h(quota)}px"></div>`}
        </div>
        <span class="small">Ch.${i + 1} · ${started ? used + '/' : ''}${quota}</span></div>`;
    }).join('');
  }

  function stageCards(ch) {
    const p = S().prog(ch.id);
    const st = S().stageOf(ch.id);
    const set = S().state.settings;
    const left = S().aiLeft(ch.id);
    const un = S().unlocked(ch.id);
    const card = (cls, title, sub, foot) => `<div class="stage ${cls}"><div style="font-weight:600">${title}</div><div class="muted small" style="margin:4px 0 10px">${sub}</div>${foot}</div>`;
    const lastAtt = p.s3.attempts[p.s3.attempts.length - 1];
    const c1 = st > 1
      ? card('done', '1. Học', 'AI không giới hạn', `<div class="s" style="color:var(--accent)">Đã qua · quiz đạt ${p.s1.best}%</div><a class="small" href="#/learn/${ch.id}">Xem lại bài giảng</a>`)
      : card('cur', '1. Học', 'AI không giới hạn', `${p.s1.focus.length ? `<div class="small" style="color:var(--warn)">Ôn lại: ${p.s1.focus.map((t) => esc(TL.ui.topicTitle(ch, t))).join(', ')}</div>` : ''}<a class="s" href="#/learn/${ch.id}">${p.s1.best != null ? 'Tiếp tục học' : 'Bắt đầu học'}</a>`);
    const review = p.s2.review && !p.s2.review.done;
    const c2 = st < 2
      ? card('lock', '2. Luyện tập', `AI tối đa ${p.s2.quota} lượt`, `<div class="small">Mở khi quiz GĐ1 đạt từ ${set.quizPass}%</div>`)
      : st === 2 || review
        ? card('cur', '2. Luyện tập', `AI còn ${left}/${review ? p.s2.review.quota : p.s2.quota} lượt`, `<a class="s" href="#/practice/${ch.id}">${review ? 'Ôn phần yếu' : p.s2.runs.length ? 'Tiếp tục luyện tập' : 'Bắt đầu luyện tập'}</a>`)
        : card('done', '2. Luyện tập', `AI đã dùng ${S().aiUsedTotal(ch.id)}/${p.s2.quota} lượt`, `<div class="s" style="color:var(--accent)">Đã qua · đúng ${p.s2.best}%</div><a class="small" href="#/practice/${ch.id}">Luyện thêm</a>`);
    let c3;
    if (st < 3) c3 = card('lock', '3. Kiểm tra', 'Không dùng AI', `<div class="small">Mở khi đúng từ ${set.practiceUnlock}% ở giai đoạn 2</div>`);
    else if (st === 4) c3 = card('done', '3. Kiểm tra', 'Không dùng AI', `<div class="s" style="color:var(--accent)">Đã qua · ${lastAtt.score}%</div><a class="small" href="#/report/${ch.id}">Báo cáo liêm chính</a>`);
    else {
      const cd = TL.ui.cooldownLeft(ch.id);
      c3 = card('cur', '3. Kiểm tra', `Không dùng AI · ${set.testMinutes} phút`, `${cd ? `<div class="s" style="color:var(--warn)">Thi lại sau <span data-cd="${ch.id}">${hhmm(cd)}</span></div>` : `<a class="s" href="#/test/${ch.id}">${p.s3.attempts.length ? 'Làm đề biến thể' : 'Vào kiểm tra'}</a>`}${lastAtt ? `<a class="small" href="#/result/${ch.id}">Kết quả lần ${p.s3.attempts.length}</a>` : ''}`);
    }
    return `<section class="card">
      <h2 style="margin:0 0 16px">${TL.ui.chLabel(ch)} · ${esc(ch.title)}${un ? '' : ' <span class="pill" style="margin-left:8px">Chưa mở</span>'}</h2>
      ${un ? `<div class="stages">${c1}${c2}${c3}</div>` : `<p class="muted">Hoàn thành giai đoạn 3 của chương trước để mở chương này.</p>`}
    </section>`;
  }

  let timer;
  TL.views.dashboard = {
    render({ id }) {
      const chId = id || S().currentChapterId();
      const ch = S().chapter(chId) || S().state.course.chapters[0];
      if (!ch) return TL.ui.withSidebar(null, '<h1>Chưa có khoá học</h1><a class="btn" href="#/upload">Tải bài giảng lên</a>');
      const m = metrics();
      const fresh = !Object.values(S().state.progress).some((p) => p.s1.best != null);
      return TL.ui.withSidebar(ch.id, `
        <header><h1 style="margin:0 0 6px">Tiến độ của bạn</h1><p class="muted">Mục tiêu: càng về sau càng ít cần AI.</p></header>
        ${fresh ? `<div class="note ok">Mỗi chương có 3 giai đoạn: <b>Học</b> với AI không giới hạn → <b>Luyện tập</b> với số lượt AI giảm dần theo chương → <b>Kiểm tra</b> không có AI. Bắt đầu từ ${TL.ui.chLabel(ch)} bên dưới.</div>` : ''}
        <section class="metrics">
          <div class="card"><div class="muted small">Qua giai đoạn 3 ngay lần đầu</div><div class="big" style="margin-top:8px">${m.firstTry}</div></div>
          <div class="card"><div class="muted small">Chênh lệch điểm GĐ2 – GĐ3</div><div class="big" style="margin-top:8px">${m.gap}</div></div>
          <div class="card"><div class="muted small">Lượt AI trung bình mỗi chương</div><div class="big" style="margin-top:8px">${m.ai}</div></div>
        </section>
        <section class="card">
          <h2 style="margin:0 0 4px">Lượt AI đã dùng theo chương</h2>
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 20px"><p class="muted small">Giai đoạn 2: giảm dần từ 5 xuống 1 lượt.</p>
          <div class="legend"><span><i style="background:var(--warn)"></i>Đã dùng</span><span><i style="border-top:2px dashed var(--grey);height:0"></i>Hạn mức</span><span><i style="background:var(--line)"></i>Chưa bắt đầu</span></div></div>
          <div class="bars">${bars()}</div>
        </section>
        ${stageCards(ch)}`);
    },
    mount(root) {
      clearInterval(timer);
      timer = setInterval(() => root.querySelectorAll('[data-cd]').forEach((el) => {
        const left = TL.ui.cooldownLeft(el.dataset.cd);
        if (!left) TL.app.render(); else el.textContent = hhmm(left);
      }), 15000);
      root.querySelectorAll('.nav a.locked').forEach((a) => a.addEventListener('click', () => TL.u.toast('Chương này mở khi bạn qua giai đoạn 3 của chương trước.')));
    },
    unmount() { clearInterval(timer); },
  };
})(window.TL);
