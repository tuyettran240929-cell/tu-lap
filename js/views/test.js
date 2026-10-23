(function (TL) {
  const { esc, mmss, toast, confirmBox, uid, hhmm } = TL.u;
  const S = () => TL.store;
  let T = null; // running test session
  let tick = null;

  const elapsed = () => (Date.now() - T.startedAt) / 1000;
  function log(level, text) {
    T.events.push({ t: elapsed(), level, text });
    const badge = document.getElementById('liveLabel');
    if (badge) { const r = TL.ui.riskOf(T.events); const L = TL.ui.labelInfo(r.label); badge.className = 'pill ' + L.pill; badge.textContent = L.text; }
  }
  function onHide() { if (T && T.hiddenAt == null) T.hiddenAt = Date.now(); }
  function onShow() {
    if (!T || T.hiddenAt == null) return;
    const d = (Date.now() - T.hiddenAt) / 1000; T.hiddenAt = null;
    if (d < 5) log('light', `Mất focus ${d.toFixed(1)} giây, chỉ ghi log`);
    else if (d < 60) log('medium', `Rời tab ${Math.round(d)} giây, cộng điểm rủi ro`);
    else log('strong', `Rời tab lâu (${mmss(d)}), cộng điểm rủi ro`);
  }
  const onVis = () => (document.hidden ? onHide() : onShow());
  const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
  function attach() { document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', onHide); window.addEventListener('focus', onShow); window.addEventListener('beforeunload', onBeforeUnload); }
  function detach() { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onHide); window.removeEventListener('focus', onShow); window.removeEventListener('beforeunload', onBeforeUnload); clearInterval(tick); }

  function begin(ch) {
    const qs = TL.ui.stageQuestions(ch, 3);
    if (!qs.length) return toast('Chưa có câu hỏi GĐ3 đã duyệt và giải lại khớp đáp án.');
    const now = Date.now();
    T = { chId: ch.id, qs, answers: qs.map(() => ''), i: 0, startedAt: now, endsAt: now + S().state.settings.testMinutes * 60000,
      events: [], timeOn: qs.map(() => 0), shownAt: now, hiddenAt: null, tool: null, scratch: '', calc: '', calcRes: '' };
    attach();
    TL.app.render();
  }
  function track() { if (T) { T.timeOn[T.i] += (Date.now() - T.shownAt) / 1000; T.shownAt = Date.now(); } }

  function finish() {
    if (!T) return;
    track(); onShow();
    const ch = S().chapter(T.chId); const p = S().prog(T.chId); const set = S().state.settings;
    const per = {};
    let right = 0;
    T.qs.forEach((q, i) => {
      const ok = TL.ui.isCorrect(q, T.answers[i]);
      if (ok) right++;
      (per[q.topicId] = per[q.topicId] || { n: 0, ok: 0 }).n++; if (ok) per[q.topicId].ok++;
      if (ok && q.hard && T.timeOn[i] < 10) T.events.push({ t: elapsed(), level: 'medium', text: `Câu ${i + 1} (khó) trả lời đúng rất nhanh (${Math.round(T.timeOn[i])} giây)` });
    });
    T.events.sort((a, b) => a.t - b.t);
    const score = Math.round((right / T.qs.length) * 100);
    const passed = score >= set.testPass;
    const weak = Object.keys(per).filter((k) => per[k].ok / per[k].n < 0.7);
    const risk = TL.ui.riskOf(T.events);
    const att = { id: uid('a'), startedAt: T.startedAt, endedAt: Date.now(), score, passed, weak, events: T.events, risk: risk.score, label: risk.label,
      questions: T.qs.map((q, i) => ({ prompt: q.prompt, answer: T.answers[i], correct: TL.ui.isCorrect(q, T.answers[i]), key: q.type === 'mcq' ? q.options[q.answer] : TL.u.fmtNum(q.answer, 4) + (q.unit || '') })) };
    p.s3.attempts.push(att);
    if (passed) p.s3.passed = true;
    else {
      p.s3.roundFails++;
      if (p.s3.roundFails >= 3) {
        att.backToS1 = true;
        p.s3.roundFails = 0; p.s3.cycles++; p.s3.cooldownUntil = 0;
        p.s1.passed = false; p.s1.focus = weak; p.s2.unlocked = false; p.s2.review = null;
      } else {
        p.s3.cooldownUntil = Date.now() + set.cooldownHours * 3600000;
        const prev = p.s2.review ? p.s2.review.quota : p.s2.quota;
        p.s2.review = { topics: weak, quota: Math.max(prev - 1, 0), used: 0, done: false };
        delete TL.session.practice[ch.id];
      }
    }
    att.attemptNo = p.s3.roundFails || (passed ? p.s3.roundFails + 1 : 3);
    S().save();
    detach(); T = null;
    location.hash = `#/result/${ch.id}/${att.id}`;
  }

  function calc(expr) {
    const e = expr.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([\d.]+)/g, 'sqrt($1)');
    if (!/^[\d+\-*/().\s]*(sqrt[\d+\-*/().\s]*)*$/.test(e)) return 'Biểu thức không hợp lệ';
    try { const v = Function('sqrt', '"use strict";return (' + e + ')')(Math.sqrt); return Number.isFinite(v) ? '= ' + TL.u.fmtNum(v, 6) : 'Lỗi'; } catch (_) { return 'Lỗi'; }
  }

  TL.views.test = {
    get active() { return T; },
    render({ id }) {
      const ch = S().chapter(id);
      if (!ch) return '<div class="page"><h1>Không tìm thấy chương</h1></div>';
      const p = S().prog(id); const set = S().state.settings;
      if (T && T.chId !== id) return `<div class="page"><h1>Bạn đang làm bài kiểm tra khác</h1><a class="btn" href="#/test/${T.chId}">Quay lại bài đang làm</a></div>`;
      if (!T) {
        let block = '';
        if (S().stageOf(id) < 3) block = `Cần đúng từ ${set.practiceUnlock}% ở giai đoạn 2 để mở bài kiểm tra.`;
        else if (p.s3.passed) block = 'Bạn đã qua giai đoạn 3 của chương này.';
        else if (TL.ui.cooldownLeft(id)) block = `Đề biến thể tiếp theo mở sau ${hhmm(TL.ui.cooldownLeft(id))}. Trong lúc chờ, hãy ôn phần yếu ở giai đoạn 2.`;
        return `<div class="dark"><div class="topbar"><div><a class="back" style="color:var(--dark-muted)" href="#/ch/${id}">← Tiến độ</a><div class="muted small">${TL.ui.chLabel(ch)} · Giai đoạn 3 · Kiểm tra có giám sát</div><div class="t">${esc(ch.title)}</div></div><span class="dpill">${TL.ui.icon('botOff')} AI đã tắt</span></div>
          <div class="body"><section class="paper" style="flex:1;max-width:760px">
            <h1>Trước khi bắt đầu</h1>
            <ul style="margin:0;padding-left:20px;line-height:1.9">
              <li>${set.testCount} câu · ${set.testMinutes} phút · cần đạt ${set.testPass}%. Đề là <b>biến thể</b>: số liệu và cách hỏi khác bài đã luyện.</li>
              <li>Không có AI. Được dùng máy tính, giấy nháp và bảng công thức trong trang.</li>
              <li>Hệ thống ghi nhận chuyển tab và dán. Dán vào ô trả lời bị chặn.</li>
              <li>Nhãn liêm chính chỉ để ghi chú, không hủy điểm. Bạn xem lại bằng chứng và khiếu nại được sau bài.</li>
            </ul>
            ${block ? `<div class="note">${block}</div><div class="row" style="gap:12px"><a class="btn" href="#/${p.s3.passed ? 'ch' : S().stageOf(id) < 3 || p.s2.review ? 'practice' : 'ch'}/${id}">${p.s3.passed ? 'Về tiến độ' : 'Ôn ở giai đoạn 2'}</a>${p.s3.attempts.length ? `<a class="btn ghost" href="#/result/${id}">Xem kết quả gần nhất</a>` : ''}</div>` : `<div><button class="btn" data-act="begin">Bắt đầu làm bài</button></div>`}
          </section></div></div>`;
      }
      const q = T.qs[T.i];
      const left = (T.endsAt - Date.now()) / 1000;
      const risk = TL.ui.riskOf(T.events); const L = TL.ui.labelInfo(risk.label);
      const answer = q.type === 'mcq'
        ? TL.ui.optionList(q, 'tq', T.answers[T.i] === '' ? null : T.answers[T.i], false)
        : `<label for="ans" style="font-weight:600">Câu trả lời của bạn</label>
           <textarea id="ans" rows="5" placeholder="Dán vào ô này bị chặn và được ghi lại. Ghi kết quả trước, có thể giải thích thêm sau.">${esc(T.answers[T.i])}</textarea>`;
      const formulas = ch.formulas ? esc(ch.formulas) : 'Giảng viên chưa thêm bảng công thức cho chương này.';
      const tool = T.tool === 'calc'
        ? `<div class="tool"><input id="calcIn" value="${esc(T.calc)}" placeholder="Ví dụ: (12+15+9)/3 hoặc √(2,5)" aria-label="Biểu thức"><div class="res" id="calcRes">${esc(T.calcRes)}</div></div>`
        : T.tool === 'scratch' ? `<div class="tool"><textarea id="scratch" rows="6" aria-label="Giấy nháp" placeholder="Nháp ở đây (không chấm điểm)">${esc(T.scratch)}</textarea></div>`
        : T.tool === 'formula' ? `<div class="tool formula">${formulas}</div>` : '';
      return `<div class="dark">
        <div class="topbar">
          <div><div class="muted small">${TL.ui.chLabel(ch)} · Giai đoạn 3 · Kiểm tra có giám sát</div><div class="t">Câu ${T.i + 1} / ${T.qs.length}</div></div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="dpill">${TL.ui.icon('botOff')} AI đã tắt</span><span class="timer ${left < 120 ? 'low' : ''}" id="timer" aria-label="Thời gian còn lại">${TL.ui.icon('clock')}<span id="timerTxt">${mmss(left)}</span></span></div>
        </div>
        <div class="body">
          <section class="paper" style="flex:2;min-width:420px">
            <p class="q-text">${esc(q.prompt)}</p>
            ${answer}
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <button class="btn plain" data-act="prev" ${T.i === 0 ? 'disabled' : ''}>Câu trước</button>
              ${T.i + 1 < T.qs.length ? '<button class="btn" data-act="next">Câu tiếp theo</button>' : '<button class="btn" data-act="finish">Nộp bài</button>'}
            </div>
          </section>
          <aside style="flex:1;min-width:300px" class="col gap16">
            <div class="dpanel"><h3>Câu hỏi</h3><div class="qdots">${T.qs.map((_, i) => `<button data-go="${i}" class="${i === T.i ? 'on' : T.answers[i] !== '' ? 'ans' : ''}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join('')}</div></div>
            <div class="dpanel">
              <h3>Công cụ trong trang</h3>
              <button class="dbtn ${T.tool === 'calc' ? 'on' : ''}" data-tool="calc">${TL.ui.icon('calc')} Máy tính</button>
              <button class="dbtn ${T.tool === 'scratch' ? 'on' : ''}" data-tool="scratch">${TL.ui.icon('pencil')} Giấy nháp</button>
              <button class="dbtn ${T.tool === 'formula' ? 'on' : ''}" data-tool="formula">${TL.ui.icon('sigma')} Bảng công thức</button>
              ${tool}
            </div>
            <div class="dpanel" style="gap:8px">
              <h3>Liêm chính</h3>
              <div style="display:flex;gap:8px;align-items:center"><span id="liveLabel" class="pill ${L.pill}">${L.text}</span><span class="muted small">Chỉ ghi chú, không hủy điểm</span></div>
              <p class="muted small" style="line-height:1.5">Đang ghi nhận chuyển tab và dán. Bạn xem lại được bằng chứng và khiếu nại sau bài.</p>
            </div>
          </aside>
        </div></div>`;
    },
    mount(root, { id }) {
      const ch = S().chapter(id); if (!ch) return;
      const b = root.querySelector('[data-act=begin]'); if (b) b.onclick = () => begin(ch);
      if (!T || T.chId !== id) return;
      attach();
      clearInterval(tick);
      tick = setInterval(() => {
        const left = (T.endsAt - Date.now()) / 1000;
        const el = document.getElementById('timer');
        if (el) { document.getElementById('timerTxt').textContent = mmss(left); el.classList.toggle('low', left < 120); }
        if (left <= 0) { toast('Hết giờ, bài đã được nộp tự động.'); finish(); }
      }, 500);
      const ans = root.querySelector('#ans');
      if (ans) {
        ans.oninput = () => { T.answers[T.i] = ans.value; root.querySelector(`[data-go="${T.i}"]`)?.classList.toggle('ans', !!ans.value); };
        ans.onpaste = (e) => { e.preventDefault(); const txt = (e.clipboardData || window.clipboardData)?.getData('text') || ''; log(txt.length > 40 ? 'strong' : 'medium', txt.length > 40 ? `Dán đoạn văn dài (${txt.length} ký tự) vào ô trả lời – đã chặn` : `Thử dán vào ô trả lời – đã chặn`); toast('Không thể dán vào ô trả lời.'); };
        ans.ondrop = (e) => { e.preventDefault(); log('medium', 'Kéo thả văn bản vào ô trả lời – đã chặn'); };
        ans.focus(); ans.setSelectionRange(ans.value.length, ans.value.length);
      }
      root.querySelectorAll('input[name=tq]').forEach((r) => r.onchange = () => { T.answers[T.i] = r.value; TL.app.render(); });
      const go = (i) => { track(); T.i = i; TL.app.render(); };
      const act = (n, fn) => { const x = root.querySelector(`[data-act=${n}]`); if (x) x.onclick = fn; };
      act('prev', () => go(T.i - 1));
      act('next', () => go(T.i + 1));
      act('finish', async () => {
        const blank = T.answers.filter((a) => a === '').length;
        if (await confirmBox('Nộp bài?', blank ? `Còn ${blank} câu chưa trả lời.` : 'Bạn không thể sửa sau khi nộp.', 'Nộp bài')) finish();
      });
      root.querySelectorAll('[data-go]').forEach((x) => x.onclick = () => go(Number(x.dataset.go)));
      root.querySelectorAll('[data-tool]').forEach((x) => x.onclick = () => { T.tool = T.tool === x.dataset.tool ? null : x.dataset.tool; TL.app.render(); });
      const ci = root.querySelector('#calcIn');
      if (ci) { ci.focus(); ci.oninput = () => { T.calc = ci.value; T.calcRes = ci.value.trim() ? calc(ci.value) : ''; root.querySelector('#calcRes').textContent = T.calcRes; }; }
      const sc = root.querySelector('#scratch'); if (sc) { sc.focus(); sc.oninput = () => { T.scratch = sc.value; }; }
    },
    unmount() {
      if (T) { track(); log('medium', 'Rời khỏi trang kiểm tra'); }
      detach();
    },
  };
})(window.TL);
