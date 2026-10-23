(function (TL) {
  const { esc, toast } = TL.u;
  const S = () => TL.store;
  const sess = TL.session.practice;

  function start(ch) {
    const p = S().prog(ch.id);
    const review = p.s2.review && !p.s2.review.done ? p.s2.review : null;
    sess[ch.id] = { qs: TL.ui.stageQuestions(ch, 2, review ? review.topics : null), i: 0, sel: null, submitted: false, answers: [], ai: '', reasoning: false, review: !!review, done: null, busy: false };
  }

  TL.views.practice = {
    render({ id }) {
      const ch = S().chapter(id);
      if (!ch) return '<div class="page"><h1>Không tìm thấy chương</h1></div>';
      const p = S().prog(id);
      if (!p.s1.passed) return `<div class="page"><a class="back" href="#/ch/${id}">← Tiến độ</a><h1>Giai đoạn 2 chưa mở</h1><p class="muted">Hãy qua quiz giai đoạn 1 trước.</p><div><a class="btn" href="#/learn/${id}">Về giai đoạn 1</a></div></div>`;
      if (!sess[id] || !sess[id].qs.length) start(ch);
      const s = sess[id];
      const set = S().state.settings;
      const left = S().aiLeft(id);
      const quota = s.review ? p.s2.review.quota : p.s2.quota;
      const head = `<div class="topbar">
          <div><a class="back" href="#/ch/${id}">← Tiến độ</a><div class="muted small">${TL.ui.chLabel(ch)} · Giai đoạn 2 · ${s.review ? 'Ôn phần yếu' : 'Luyện tập'}</div><div class="t">${s.done ? 'Kết quả luyện tập' : `Câu ${s.i + 1} / ${s.qs.length}`}</div></div>
          <div class="pill warn" style="padding:10px 16px">${TL.ui.icon('bot')} Còn ${left}/${quota} lượt AI</div>
        </div>`;
      if (!s.qs.length) return head + '<div class="body"><p>Chưa có câu hỏi luyện tập đã duyệt cho chương này.</p></div>';
      if (s.done) {
        const pass = s.done.score >= set.practiceUnlock;
        return head + `<div class="body"><section class="card col gap16" style="flex:1;max-width:720px">
          <div class="muted small">Tỉ lệ đúng</div><div style="font-size:48px;font-weight:700">${s.done.score}%</div>
          <div class="progressbar"><div style="width:${s.done.score}%;background:${pass ? 'var(--accent)' : 'var(--warn)'}"></div></div>
          <p class="muted">${s.review ? 'Ôn tập xong.' : pass ? `Đạt ngưỡng ${set.practiceUnlock}%, giai đoạn 3 đã mở.` : `Cần đúng từ ${set.practiceUnlock}% để mở giai đoạn 3. Lượt AI không được cộng lại, hãy thử tự làm nhiều hơn.`} Bạn đã dùng ${s.done.ai} lượt AI trong lượt luyện này.</p>
          <div class="row" style="gap:12px">${pass || S().prog(id).s2.unlocked ? `<a class="btn" href="#/test/${id}">Sang giai đoạn 3 · Kiểm tra</a>` : ''}<button class="btn ghost" data-act="again">Luyện lại với câu mới</button></div>
        </section></div>`;
      }
      const q = s.qs[s.i];
      const right = s.submitted && TL.ui.isCorrect(q, s.sel);
      const dis = (cond) => (left <= 0 || s.busy || cond ? 'disabled' : '');
      return head + `<div class="body">
        <section class="card col gap20" style="flex:2;min-width:420px;padding:32px">
          <div class="muted small">${esc(TL.ui.topicTitle(ch, q.topicId))}${q.source === 'gen' ? ' · số liệu sinh ngẫu nhiên' : ''}</div>
          <p class="q-text">${esc(q.prompt)}</p>
          ${TL.ui.optionList(q, 'pq', s.sel, s.submitted)}
          ${s.submitted ? `<div class="feedback ${right ? 'ok' : 'no'}">${right ? 'Chính xác!' : 'Chưa đúng. Đáp án đúng được tô xanh.'}</div>` : ''}
          <div>${s.submitted ? `<button class="btn" data-act="next">${s.i + 1 < s.qs.length ? 'Câu tiếp theo' : 'Xem kết quả'}</button>` : `<button class="btn" data-act="submit" ${s.sel == null ? 'disabled' : ''}>Nộp câu trả lời</button>`}</div>
        </section>
        <aside class="card col gap14" style="flex:1;min-width:300px">
          <h2 style="display:flex;gap:10px;align-items:center"><span class="ichip warm" style="width:34px;height:34px">${TL.ui.icon('bot')}</span>Gia sư AI (có giới hạn)</h2>
          <p class="muted small">Mỗi lần dùng trừ 1 lượt cho cả chương. Chỉ nhờ khi thật cần.</p>
          <button class="btn ghost left" data-act="hint" ${dis(s.submitted)}>Gợi ý (không đưa đáp án)</button>
          <button class="btn ${s.submitted ? 'ghost' : 'muted'} left" data-act="explain" ${dis(!s.submitted)}>Giải thích${s.submitted ? '' : ' · mở sau khi trả lời'}</button>
          <button class="btn ghost left" data-act="reason" ${dis(false)}>Kiểm tra lập luận của tôi</button>
          ${s.reasoning ? `<form id="reasonForm" class="col gap10"><label for="rs" class="small" style="font-weight:600">Viết cách bạn suy nghĩ</label><textarea id="rs" rows="4" style="padding:12px;border:1px solid var(--grey);border-radius:8px;resize:vertical" placeholder="Ví dụ: Mình sắp xếp dãy rồi lấy..."></textarea><button class="btn" type="submit" ${dis(false)}>Gửi (trừ 1 lượt)</button></form>` : ''}
          <div class="ai-box ${s.ai ? '' : 'empty'}" aria-live="polite">${s.busy ? 'Đang nghĩ…' : esc(s.ai) || (left > 0 ? 'Gợi ý của AI hiện ở đây, không nêu đáp án.' : 'Hết lượt AI cho chương này. Bạn tự làm được!')}</div>
        </aside>
      </div>`;
    },
    mount(root, { id }) {
      const ch = S().chapter(id); const s = sess[id]; if (!ch || !s) return;
      const p = S().prog(id);
      root.querySelectorAll('input[name=pq]').forEach((r) => r.onchange = () => { s.sel = r.value; TL.app.render(); });
      const act = (name, fn) => { const b = root.querySelector(`[data-act=${name}]`); if (b) b.onclick = fn; };
      const q = s.qs[s.i];
      const ask = async (fn) => {
        if (!S().useAi(id)) return toast('Hết lượt AI.');
        s.aiCount = (s.aiCount || 0) + 1;
        s.busy = true; TL.app.render();
        s.ai = await fn(); s.busy = false; TL.app.render();
      };
      act('submit', () => { s.submitted = true; s.answers[s.i] = TL.ui.isCorrect(q, s.sel); TL.app.render(); });
      act('next', () => {
        if (s.i + 1 < s.qs.length) { s.i++; s.sel = null; s.submitted = false; s.ai = ''; s.reasoning = false; return TL.app.render(); }
        const score = Math.round((s.answers.filter(Boolean).length / s.qs.length) * 100);
        s.done = { score, ai: s.aiCount || 0 };
        p.s2.runs.push({ score, at: Date.now(), review: s.review });
        if (s.review) { p.s2.reviewUsedTotal = (p.s2.reviewUsedTotal || 0) + p.s2.review.used; p.s2.review.done = true; }
        else {
          p.s2.best = Math.max(p.s2.best ?? 0, score);
          if (score >= S().state.settings.practiceUnlock) p.s2.unlocked = true;
        }
        S().save(); TL.app.render();
      });
      act('again', () => { start(ch); TL.app.render(); });
      act('hint', () => ask(() => TL.ai.hint(ch, q)));
      act('explain', () => ask(() => TL.ai.explain(ch, q)));
      act('reason', () => { s.reasoning = !s.reasoning; TL.app.render(); root.querySelector('#rs')?.focus(); });
      const f = root.querySelector('#reasonForm');
      if (f) f.onsubmit = (e) => { e.preventDefault(); const t = f.querySelector('#rs').value.trim(); if (!t) return toast('Hãy viết lập luận trước.'); s.reasoning = false; ask(() => TL.ai.checkReasoning(ch, q, t)); };
    },
  };
})(window.TL);
