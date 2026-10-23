(function (TL) {
  const { esc, toast, confirmBox } = TL.u;
  const S = () => TL.store;
  const F = [
    ['quizPass', 'Ngưỡng qua quiz GĐ1 (%)', 'number'], ['practiceUnlock', 'Ngưỡng mở GĐ3 từ GĐ2 (%)', 'number'],
    ['testPass', 'Ngưỡng qua GĐ3 (%)', 'number'], ['cooldownHours', 'Thời gian chờ trước khi thi lại (giờ)', 'number', 'Mặc định 24. Tự học có thể đặt vài giờ; đặt 0 để thử nhanh.'],
    ['testMinutes', 'Thời gian làm bài GĐ3 (phút)', 'number'], ['testCount', 'Số câu bài kiểm tra GĐ3', 'number'],
  ];
  TL.views.settings = {
    render() {
      const s = S().state.settings;
      return TL.ui.withSidebar(null, `
        <header><h1 style="margin:0 0 6px">Cài đặt</h1><p class="muted">Áp dụng cho khoá học trên trình duyệt này.</p></header>
        <section class="card col gap16"><h2>Quy tắc học</h2>
          <div class="grid2">${F.map(([k, l, t, h]) => `<div class="field"><label for="s_${k}">${l}</label><input id="s_${k}" data-k="${k}" type="${t}" min="0" step="any" value="${esc(s[k])}">${h ? `<span class="hint">${h}</span>` : ''}</div>`).join('')}</div>
          <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="s_unlockAll" ${s.unlockAll ? 'checked' : ''}> Mở khoá tất cả chương (chế độ xem thử cho giảng viên)</label>
        </section>
        <section class="card col gap16"><h2>Gia sư AI</h2>
          <p class="muted small">Mặc định dùng gia sư offline dựa trên nội dung bài giảng. Nhập OpenAI API key để dùng mô hình thật (key chỉ lưu trên trình duyệt này).</p>
          <div class="grid2"><div class="field"><label for="s_apiKey">OpenAI API key</label><input id="s_apiKey" data-k="apiKey" type="password" value="${esc(s.apiKey)}" placeholder="sk-..." autocomplete="off"></div>
          <div class="field"><label for="s_model">Mô hình</label><input id="s_model" data-k="model" value="${esc(s.model)}"></div></div>
        </section>
        <div><button class="btn" data-act="save">Lưu cài đặt</button></div>
        <section class="card col gap14"><h2>Dữ liệu</h2>
          <div class="row" style="gap:12px">
            <button class="btn ghost" data-act="skip">Bỏ qua thời gian chờ hiện tại</button>
            <button class="btn ghost" data-act="demo">Dùng khoá mẫu “Thống kê mô tả cơ bản”</button>
            <button class="btn danger" data-act="reset">Xoá toàn bộ tiến độ</button>
          </div>
        </section>`);
    },
    mount(root) {
      const st = S().state;
      const act = (n, fn) => { root.querySelector(`[data-act=${n}]`).onclick = fn; };
      act('save', () => {
        root.querySelectorAll('[data-k]').forEach((i) => { st.settings[i.dataset.k] = i.type === 'number' ? Math.max(0, Number(i.value) || 0) : i.value.trim(); });
        st.settings.testCount = Math.max(1, Math.round(st.settings.testCount));
        st.settings.testMinutes = Math.max(1, st.settings.testMinutes);
        st.settings.unlockAll = root.querySelector('#s_unlockAll').checked;
        S().save(); toast('Đã lưu cài đặt.'); TL.app.render();
      });
      act('skip', () => { Object.values(st.progress).forEach((p) => { p.s3.cooldownUntil = 0; }); S().save(); toast('Đã mở đề biến thể cho các chương đang chờ.'); });
      act('demo', async () => { if (await confirmBox('Dùng khoá mẫu?', 'Khoá học hiện tại và tiến độ sẽ được thay bằng khoá mẫu.', 'Dùng khoá mẫu')) { S().replaceCourse(TL.data.demoCourse()); location.hash = '#/'; } });
      act('reset', async () => { if (await confirmBox('Xoá toàn bộ tiến độ?', 'Điểm, lượt AI đã dùng và báo cáo liêm chính sẽ bị xoá. Khoá học được giữ nguyên.', 'Xoá')) { S().resetProgress(); TL.session.practice = {}; location.hash = '#/'; TL.app.render(); } });
    },
  };
})(window.TL);
