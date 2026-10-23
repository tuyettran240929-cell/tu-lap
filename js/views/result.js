(function (TL) {
  const { esc, hhmm, mmss, toast } = TL.u;
  const S = () => TL.store;
  let timer;
  const findAtt = (p, aid) => (aid ? p.s3.attempts.find((a) => a.id === aid) : p.s3.attempts[p.s3.attempts.length - 1]);

  TL.views.result = {
    render({ id, aid }) {
      const ch = S().chapter(id); if (!ch) return '<div class="page"><h1>Không tìm thấy chương</h1></div>';
      const p = S().prog(id); const att = findAtt(p, aid); const set = S().state.settings;
      if (!att) return `<div class="page"><a class="back" href="#/ch/${id}">← Tiến độ</a><h1>Chưa có kết quả</h1></div>`;
      const n = p.s3.attempts.indexOf(att) + 1;
      const isLatest = n === p.s3.attempts.length;
      const L = TL.ui.labelInfo(att.label);
      const weak = att.weak.length ? att.weak.map((t) => `<li>${esc(TL.ui.topicTitle(ch, t))}</li>`).join('') : '<li>Không có chủ đề dưới 70%</li>';
      const scoreCard = `<section class="card col gap14" style="flex:1;min-width:360px;padding:28px">
          <div class="muted small">Điểm của bạn</div>
          <div style="font-size:48px;font-weight:700">${att.score}%</div>
          <div class="muted">Ngưỡng qua: ${set.testPass}% (cấu hình được)</div>
          <div class="progressbar"><div style="width:${att.score}%;background:${att.passed ? 'var(--accent)' : 'var(--warn)'}"></div></div>
          <h3 style="margin-top:12px">${att.passed ? 'Chủ đề nên củng cố' : 'Phần còn yếu'}</h3>
          <ul style="margin:0;padding-left:20px;line-height:1.8">${weak}</ul>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><span class="pill ${L.pill}">${L.text}</span><a class="small" href="#/report/${id}/${att.id}">Xem báo cáo liêm chính</a></div>
          <details class="small"><summary style="cursor:pointer">Xem lại từng câu</summary><ol style="padding-left:20px;line-height:1.6">${att.questions.map((q) => `<li style="margin:8px 0">${esc(q.prompt)}<br><span style="color:${q.correct ? 'var(--accent)' : 'var(--bad)'}">Bạn: ${esc(q.answer === '' ? '(bỏ trống)' : isNaN(q.answer) || q.answer.length > 2 ? q.answer : q.answer)}</span> · Đáp án: ${esc(q.key)}</li>`).join('')}</ol></details>
        </section>`;
      let header, next;
      if (att.passed) {
        const idx = S().chIndex(id); const nextCh = S().state.course.chapters[idx + 1];
        header = `<div class="muted small">${TL.ui.chLabel(ch)} · Kết quả giai đoạn 3</div><h1>Đạt! Bạn đã tự làm được mà không cần AI</h1>`;
        next = `<section class="col gap14" style="flex:1.3;min-width:440px"><h2>Bước tiếp theo</h2>
          <div class="card col gap6" style="border-color:var(--accent);padding:20px"><div style="font-weight:600">${nextCh ? `Mở ${TL.ui.chLabel(nextCh)} · ${esc(nextCh.title)}` : 'Bạn đã hoàn thành toàn bộ khoá học'}</div>
          <div class="muted small">${nextCh ? `Giai đoạn 2 của chương mới chỉ còn ${S().baseQuota(idx + 1)} lượt AI.` : 'Xem lại tiến độ và mức dùng AI của bạn.'}</div>
          <div><a class="btn" style="margin-top:8px" href="${nextCh ? '#/learn/' + nextCh.id : '#/'}">${nextCh ? 'Học chương tiếp theo' : 'Về trang tiến độ'}</a></div></div></section>`;
      } else if (att.backToS1) {
        header = `<div class="muted small">${TL.ui.chLabel(ch)} · Kết quả giai đoạn 3 · Lần 3/3</div><h1>Quay lại giai đoạn 1 cho phần còn yếu</h1>`;
        next = `<section class="col gap14" style="flex:1.3;min-width:440px"><h2>Bước tiếp theo</h2>
          <div class="card col gap6" style="border-color:var(--accent);padding:20px"><div style="font-weight:600">Học lại các chủ đề yếu với AI không giới hạn</div><div class="muted small">Sau đó qua quiz GĐ1 và luyện tập lại. Hệ thống không khóa vĩnh viễn, để bạn không bị kẹt.</div>
          <div><a class="btn" style="margin-top:8px" href="#/learn/${id}">Về giai đoạn 1</a></div></div></section>`;
      } else {
        const cd = TL.ui.cooldownLeft(id);
        const rv = p.s2.review;
        header = `<div class="muted small">${TL.ui.chLabel(ch)} · Kết quả giai đoạn 3 · Lần ${att.attemptNo}/3</div><h1>Chưa đạt lần này, bạn vẫn đi tiếp được</h1>`;
        next = `<section class="col gap14" style="flex:1.3;min-width:440px"><h2>Bước tiếp theo</h2>
          <div class="card col gap6" style="border-color:var(--accent);padding:20px"><div style="font-weight:600">1. Ôn phần yếu ở giai đoạn 2</div>
            <div class="muted small">${rv && isLatest ? (rv.done ? 'Đã ôn xong. Có thể ôn thêm (không còn lượt AI mới).' : `Ít lượt AI hơn lần trước: còn ${S().aiLeft(id)} lượt.`) : 'Ôn ở giai đoạn 2.'}</div>
            <div><a class="btn" style="margin-top:8px" href="#/practice/${id}">Bắt đầu ôn</a></div></div>
          <div class="card col gap6" style="padding:20px"><div style="font-weight:600">2. Làm đề biến thể khác</div>
            <div class="muted small">Mở sau khoảng chờ, mặc định 24 giờ (hiện tại: ${set.cooldownHours} giờ). Với tự học có thể chỉnh trong Cài đặt.</div>
            ${isLatest ? (cd ? `<div style="font-weight:600;color:var(--warn)" class="small">Còn <span id="cd">${hhmm(cd)}</span></div>` : `<div><a class="btn ghost" style="margin-top:8px" href="#/test/${id}">Làm đề biến thể</a></div>`) : ''}</div>
          <div class="card muted small" style="border-style:dashed;border-color:var(--grey);padding:20px;line-height:1.5">Trượt lần 3: quay lại giai đoạn 1 cho các chủ đề yếu. Hệ thống không khóa vĩnh viễn, để bạn không bị kẹt.</div>
        </section>`;
      }
      return `<div class="page"><header><a class="back" href="#/ch/${id}">← Tiến độ</a>${header}</header><div class="row">${scoreCard}${next}</div></div>`;
    },
    mount(root, { id }) {
      clearInterval(timer);
      timer = setInterval(() => { const el = root.querySelector('#cd'); if (!el) return; const l = TL.ui.cooldownLeft(id); if (!l) TL.app.render(); else el.textContent = hhmm(l); }, 10000);
    },
    unmount() { clearInterval(timer); },
  };

  TL.views.report = {
    render({ id, aid }) {
      const ch = S().chapter(id); if (!ch) return '<div class="page"><h1>Không tìm thấy chương</h1></div>';
      const p = S().prog(id); const att = findAtt(p, aid);
      if (!att) return `<div class="page"><a class="back" href="#/ch/${id}">← Tiến độ</a><h1>Chưa có bài kiểm tra nào</h1></div>`;
      const L = TL.ui.labelInfo(att.label);
      const ev = att.events.length
        ? att.events.map((e) => `<div class="tl"><span class="time">${mmss(e.t)}</span><span class="tag ${e.level}">${TL.ui.levelText[e.level]}</span><span class="txt">${esc(e.text)}</span></div>`).join('')
        : '<div class="tl"><span class="txt muted">Không ghi nhận sự kiện nào trong bài.</span></div>';
      const others = p.s3.attempts.length > 1 ? `<div class="small muted">Lần làm: ${p.s3.attempts.map((a, i) => a.id === att.id ? `<b>${i + 1}</b>` : `<a href="#/report/${id}/${a.id}">${i + 1}</a>`).join(' · ')}</div>` : '';
      const canRetake = !p.s3.passed && S().stageOf(id) === 3;
      return `<div class="page">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div><a class="back" href="#/result/${id}/${att.id}">← Kết quả</a><div class="muted small">${TL.ui.chLabel(ch)} · Bài kiểm tra lần ${p.s3.attempts.indexOf(att) + 1} · ${new Date(att.endedAt).toLocaleString('vi-VN')}</div><h1>Báo cáo liêm chính</h1></div>
          <div class="pill ${L.pill}" style="padding:10px 18px;font-weight:700">${L.text}</div>
        </header>
        <p class="muted" style="max-width:720px;line-height:1.6">Nhãn chỉ để ghi chú, không hủy điểm và không chặn tiến độ. Nhãn được tính từ nhiều tín hiệu cộng lại, không phải từ một sự kiện đơn lẻ.</p>
        ${others}
        <div class="row">
          <section class="card col" style="flex:1.6;min-width:480px;gap:4px"><h2 style="margin:0 0 12px">Dòng thời gian sự kiện</h2>${ev}
            <p class="muted xs" style="margin-top:12px">Trọng số: Nhẹ 2 · Vừa 12 · Mạnh 24 điểm. Sạch &lt; 25 · Cần xem lại 25–59 · Không đảm bảo ≥ 60.</p></section>
          <aside class="col gap16" style="flex:1;min-width:300px">
            <div class="card" style="padding:20px"><div class="muted small">Điểm rủi ro tổng hợp</div><div class="big" style="margin:6px 0">${att.risk}</div>
              <div class="labels">${TL.ui.LABELS.map((l) => `<span class="${l.key === att.label ? 'on' : ''}" style="background:${l.bg}">${l.text}</span>`).join('')}</div></div>
            <div class="card col gap14" style="padding:20px">
              <div style="font-weight:600">Cảnh báo chưa đúng?</div>
              ${att.appeal ? `<div class="note ok">Đã gửi khiếu nại lúc ${new Date(att.appeal.at).toLocaleString('vi-VN')}:<br>“${esc(att.appeal.text)}”</div>` : `
              <label for="kn" class="muted small">Cho mình biết chuyện gì đã xảy ra (ví dụ mất mạng, thông báo hệ thống)</label>
              <textarea id="kn" rows="3" style="padding:12px;border:1px solid var(--grey);border-radius:8px;resize:vertical"></textarea>
              <button class="btn" data-act="appeal">Gửi khiếu nại</button>`}
              ${canRetake ? `<button class="btn ghost" data-act="retake">Làm lại bài kiểm tra</button>` : ''}
            </div>
          </aside>
        </div></div>`;
    },
    mount(root, { id, aid }) {
      const p = S().prog(id); const att = findAtt(p, aid);
      const a = root.querySelector('[data-act=appeal]');
      if (a) a.onclick = () => { const t = root.querySelector('#kn').value.trim(); if (!t) return toast('Hãy mô tả ngắn chuyện đã xảy ra.'); att.appeal = { text: t, at: Date.now() }; S().save(); toast('Đã gửi khiếu nại. Giảng viên sẽ xem lại.'); TL.app.render(); };
      const r = root.querySelector('[data-act=retake]');
      if (r) r.onclick = () => { const cd = TL.ui.cooldownLeft(id); if (cd) { toast(`Đề biến thể mở sau ${hhmm(cd)}.`); location.hash = `#/result/${id}`; } else location.hash = `#/test/${id}`; };
    },
  };
})(window.TL);
