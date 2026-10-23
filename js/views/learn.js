(function (TL) {
  const { esc, toast } = TL.u;
  const S = () => TL.store;
  const sess = (TL.session.learn = {});

  TL.views.learn = {
    render({ id }) {
      const ch = S().chapter(id);
      if (!ch) return '<div class="page"><h1>Không tìm thấy chương</h1><a href="#/">Về trang chính</a></div>';
      const p = S().prog(id);
      const s = (sess[id] = sess[id] || { topic: (p.s1.focus[0] || ch.topics[0].id), quiz: null, answers: {}, result: null });
      const t = ch.topics.find((x) => x.id === s.topic) || ch.topics[0];
      const set = S().state.settings;
      const quiz = s.quiz
        ? `<section class="card col gap16" id="quiz">
            <h2>Quiz giai đoạn 1 · cần đạt ${set.quizPass}%</h2>
            ${s.quiz.map((q, i) => `<div class="col gap10"><div style="font-weight:600">${i + 1}. ${esc(q.prompt)}</div>${TL.ui.optionList(q, 'qz' + i, s.answers[i], !!s.result)}${s.result && q.explain ? `<div class="muted small">${esc(q.explain)}</div>` : ''}</div>`).join('')}
            ${s.result
              ? `<div class="feedback ${s.result.pass ? 'ok' : 'no'}">Đúng ${s.result.score}% · ${s.result.pass ? 'Đã qua giai đoạn 1' : 'Chưa đạt, đọc lại bài và thử lại'}</div>
                 <div class="row" style="gap:12px">${s.result.pass ? `<a class="btn" href="#/practice/${id}">Sang giai đoạn 2 · Luyện tập</a>` : ''}<button class="btn ghost" data-act="retry">Làm quiz khác</button></div>`
              : `<div><button class="btn" data-act="submit">Nộp quiz</button></div>`}
          </section>`
        : '';
      const chat = (p.s1.chat || []).map((m) => `<div class="msg ${m.r}">${esc(m.t)}</div>`).join('') || '<div class="ai-box empty">Hỏi bất cứ điều gì về chương này. Ở giai đoạn 1, AI không giới hạn lượt.</div>';
      return `<div class="topbar">
          <div><a class="back" href="#/ch/${id}">← Tiến độ</a><div class="muted small">${TL.ui.chLabel(ch)} · Giai đoạn 1 · Học</div><div class="t">${esc(ch.title)}</div></div>
          <div class="pill ok" style="padding:10px 16px">AI không giới hạn</div>
        </div>
        <div class="body">
          <section style="flex:2;min-width:420px" class="col gap20">
            <div class="card col gap16">
              <div class="tabs" role="tablist">${ch.topics.map((x) => `<button role="tab" data-topic="${x.id}" class="${x.id === t.id ? 'on' : ''}">${esc(x.title)}${p.s1.focus.includes(x.id) ? ' · cần ôn' : ''}</button>`).join('')}</div>
              <h2>${esc(t.title)}</h2>
              <div class="lesson">${esc(t.content)}</div>
              ${!s.quiz ? `<div class="row" style="gap:12px;align-items:center"><button class="btn" data-act="quiz">Làm quiz giai đoạn 1</button>${p.s1.passed ? `<span class="muted small">Đã qua · ${p.s1.best}%</span>` : ''}</div>` : ''}
            </div>
            ${quiz}
          </section>
          <aside class="card col gap14" style="flex:1;min-width:300px">
            <h2>Gia sư AI</h2>
            <p class="muted small">${TL.ai.online() ? 'Đang dùng mô hình trực tuyến.' : 'Bản offline: trả lời dựa trên nội dung bài giảng.'} Hỏi để hiểu, không phải để chép.</p>
            <div class="chat" id="chat">${chat}</div>
            <form class="chat-in" id="chatForm"><input id="chatIn" placeholder="Ví dụ: Trung vị khác trung bình thế nào?" aria-label="Câu hỏi cho AI" autocomplete="off"><button class="btn" type="submit">Hỏi</button></form>
          </aside>
        </div>`;
    },
    mount(root, { id }) {
      const ch = S().chapter(id); if (!ch) return;
      const p = S().prog(id); const s = sess[id];
      const chatEl = root.querySelector('#chat'); chatEl.scrollTop = chatEl.scrollHeight;
      root.querySelectorAll('[data-topic]').forEach((b) => b.onclick = () => { s.topic = b.dataset.topic; TL.app.render(); });
      root.querySelectorAll('input[type=radio]').forEach((r) => r.onchange = () => { s.answers[Number(r.name.slice(2))] = r.value; r.closest('.opts').querySelectorAll('.opt').forEach((o) => o.classList.toggle('sel', o.contains(r))); });
      const act = (name, fn) => { const b = root.querySelector(`[data-act=${name}]`); if (b) b.onclick = fn; };
      act('quiz', () => { s.quiz = TL.ui.stageQuestions(ch, 1); s.answers = {}; s.result = null; TL.app.render(); setTimeout(() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' }), 30); });
      act('retry', () => { s.quiz = TL.ui.stageQuestions(ch, 1); s.answers = {}; s.result = null; TL.app.render(); });
      act('submit', () => {
        if (Object.keys(s.answers).length < s.quiz.length) return toast('Bạn chưa trả lời hết các câu.');
        const right = s.quiz.filter((q, i) => TL.ui.isCorrect(q, s.answers[i])).length;
        const score = Math.round((right / s.quiz.length) * 100);
        const pass = score >= S().state.settings.quizPass;
        s.result = { score, pass };
        p.s1.best = Math.max(p.s1.best ?? 0, score);
        if (pass && !p.s1.passed) { p.s1.passed = true; p.s1.focus = []; }
        S().save(); TL.app.render();
      });
      root.querySelector('#chatForm').onsubmit = async (e) => {
        e.preventDefault();
        const inp = root.querySelector('#chatIn'); const q = inp.value.trim(); if (!q) return;
        p.s1.chat = (p.s1.chat || []).concat({ r: 'me', t: q }); p.s1.aiUsed++;
        inp.value = ''; S().save(); TL.app.render();
        const ans = await TL.ai.chat(ch, q);
        p.s1.chat = p.s1.chat.concat({ r: 'ai', t: ans }).slice(-30); S().save();
        if (location.hash.startsWith('#/learn/' + id)) { TL.app.render(); document.getElementById('chatIn')?.focus(); }
      };
    },
  };
})(window.TL);
