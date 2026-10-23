(function (TL) {
  const { esc, toast, uid, confirmBox } = TL.u;
  const S = () => TL.store;
  const draft = () => S().state.draft;
  let lectureText = '', questionText = '', dragTopic = null;

  async function analyze() {
    if (!lectureText.trim()) return toast('Hãy chọn tệp hoặc dán nội dung bài giảng.');
    const chapters = TL.importer.parseLecture(lectureText, S().state.draftName || 'Bài giảng');
    let teacher = [];
    if (questionText.trim()) {
      try { teacher = TL.importer.parseQuestions(questionText); } catch (e) { toast('Không đọc được câu hỏi: ' + e.message); }
    }
    TL.importer.attachQuestions(chapters, teacher);
    const need = chapters.filter((c) => c.questions.length < 6);
    const made = need.length ? TL.importer.generateQuestions(need) : 0;
    S().state.draft = { title: S().state.draftName || chapters[0]?.title || 'Khoá học mới', chapters, teacherCount: teacher.length, aiCount: made };
    S().save();
    toast(`Đã tách ${chapters.length} chương · ${teacher.length} câu của bạn · ${made} câu AI sinh cần duyệt.`);
    TL.app.render();
  }

  function counts(chs) {
    let pending = 0, flagged = 0, ready = 0;
    chs.forEach((c) => c.questions.forEach((q) => { if (q.status === 'pending') pending++; else if (q.status === 'flagged') flagged++; else if (q.status === 'approved') ready++; }));
    return { pending, flagged, ready };
  }

  TL.views.upload = {
    render() {
      const d = draft();
      const c = d ? counts(d.chapters) : null;
      const structure = d
        ? `<div class="field"><label for="ctitle">Tên khoá học</label><input id="ctitle" value="${esc(d.title)}"></div>
          ${d.chapters.map((ch, ci) => `<div class="chap" data-chap="${ci}">
            <div style="display:flex;gap:8px;align-items:center"><span style="font-weight:600;white-space:nowrap">Chương ${ci + 1} ·</span><input class="title" data-title="${ci}" value="${esc(ch.title)}" aria-label="Tên chương ${ci + 1}">
            <button class="btn sm muted" data-delchap="${ci}" title="Xoá chương" aria-label="Xoá chương">✕</button></div>
            <div class="chips">${ch.topics.map((t) => `<span class="chip" draggable="true" data-topic="${t.id}" title="${esc(t.content.slice(0, 160))}">${esc(t.title)}</span>`).join('') || '<span class="muted small">Kéo chủ đề vào đây</span>'}</div>
          </div>`).join('')}
          <div><button class="btn sm ghost" data-act="addchap">+ Thêm chương</button></div>
          <div class="chap" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div><div style="font-weight:600">Câu hỏi AI sinh ra · cần duyệt</div><div class="muted small">${c.pending} câu chờ duyệt, ${c.flagged} câu bị gắn cờ do đáp án không khớp · ${c.ready} câu sẵn sàng</div></div>
            <a class="btn warn" href="#/review">Duyệt ngay</a>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><button class="btn muted" data-act="discard">Huỷ bản nháp</button><button class="btn" data-act="confirm">Xác nhận và bắt đầu học</button></div>`
        : `<p class="muted">Tải bài giảng lên để xem cấu trúc chương và chủ đề đề xuất. Tiêu đề dạng <code># Chương</code> và <code>## Chủ đề</code> (hoặc “Chương 1…”, “1.1 …”) sẽ được nhận diện tự động.</p>
           <div class="note ok">Muốn xem thử ngay? <a href="#" data-act="sample">Dán bài giảng mẫu</a> hoặc dùng khoá mẫu “Thống kê mô tả cơ bản” trong <a href="#/settings">Cài đặt</a>.</div>`;
      return `<div class="page">
        <header><a class="back" href="#/">← Tiến độ</a><div class="muted small">Bước 1/2 · Nhập nội dung</div><h1 style="margin-top:4px">Tải bài giảng và câu hỏi</h1></header>
        <div class="row">
          <section class="col gap16" style="flex:1;min-width:360px">
            <div class="drop" data-drop="lecture">
              <div class="dicon">${TL.ui.icon('file')}</div><div style="font-weight:600;margin-bottom:6px">Bài giảng</div>
              <div class="muted small" style="margin-bottom:14px">PDF, PPTX, DOCX hoặc văn bản (.txt, .md)</div>
              <label class="btn">${TL.ui.icon('upload')} Chọn tệp<input type="file" id="fLecture" accept=".pdf,.pptx,.docx,.txt,.md" hidden></label>
              <div class="small" id="lecName" style="margin-top:8px">${esc(S().state.draftName || '')}</div>
              <textarea id="tLecture" rows="5" placeholder="…hoặc dán nội dung bài giảng vào đây">${esc(lectureText)}</textarea>
            </div>
            <div class="drop" data-drop="questions">
              <div class="dicon">${TL.ui.icon('sparkles')}</div><div style="font-weight:600;margin-bottom:6px">Câu hỏi (không bắt buộc)</div>
              <div class="muted small" style="margin-bottom:14px">CSV, JSON hoặc dán trực tiếp. Cột: chuong, chu_de, cau_hoi, A, B, C, D, dap_an, giai_thich</div>
              <label class="btn ghost">Chọn tệp hoặc dán<input type="file" id="fQuestions" accept=".csv,.json,.txt" hidden></label>
              <textarea id="tQuestions" rows="3" placeholder="chuong,cau_hoi,A,B,C,D,dap_an">${esc(questionText)}</textarea>
            </div>
            <button class="btn" data-act="analyze">Phân tích nội dung</button>
            <p class="note">Nếu thiếu câu hỏi, AI sẽ sinh thêm từ bài giảng. Câu do AI sinh được đánh dấu để bạn duyệt. Câu dùng cho giai đoạn 3 còn phải được giải lại độc lập, đáp án khớp mới được dùng.</p>
          </section>
          <section class="card col gap14" style="flex:1.4;min-width:440px">
            <h2>Cấu trúc đề xuất${d ? ' · kéo thả để chỉnh' : ''}</h2>
            ${structure}
          </section>
        </div></div>`;
    },
    mount(root) {
      const st = S().state;
      const tl = root.querySelector('#tLecture'), tq = root.querySelector('#tQuestions');
      tl.oninput = () => { lectureText = tl.value; };
      tq.oninput = () => { questionText = tq.value; };
      const readFile = async (file, kind) => {
        try {
          const text = await TL.importer.fileToText(file);
          if (kind === 'lecture') { lectureText = text; st.draftName = file.name.replace(/\.[^.]+$/, ''); }
          else questionText = text;
          TL.app.render(); toast(`Đã đọc “${file.name}”. Bấm “Phân tích nội dung”.`);
        } catch (e) { toast(e.message || 'Không đọc được tệp'); }
      };
      root.querySelector('#fLecture').onchange = (e) => e.target.files[0] && readFile(e.target.files[0], 'lecture');
      root.querySelector('#fQuestions').onchange = (e) => e.target.files[0] && readFile(e.target.files[0], 'questions');
      root.querySelectorAll('[data-drop]').forEach((z) => {
        z.ondragover = (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); z.classList.add('over'); } };
        z.ondragleave = () => z.classList.remove('over');
        z.ondrop = (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); z.classList.remove('over'); readFile(e.dataTransfer.files[0], z.dataset.drop); };
      });
      const act = (n, fn) => root.querySelectorAll(`[data-act=${n}]`).forEach((b) => b.onclick = (e) => { e.preventDefault(); fn(); });
      act('analyze', analyze);
      act('sample', () => { lectureText = SAMPLE; st.draftName = 'Nhập môn Kinh tế vi mô'; TL.app.render(); });
      const d = draft(); if (!d) return;
      root.querySelector('#ctitle').oninput = (e) => { d.title = e.target.value; S().save(); };
      root.querySelectorAll('[data-title]').forEach((i) => i.oninput = () => { d.chapters[i.dataset.title].title = i.value; S().save(); });
      root.querySelectorAll('[data-delchap]').forEach((b) => b.onclick = () => {
        const i = Number(b.dataset.delchap); if (d.chapters.length < 2) return toast('Cần ít nhất 1 chương.');
        const [gone] = d.chapters.splice(i, 1); const tgt = d.chapters[Math.max(0, i - 1)];
        tgt.topics.push(...gone.topics); tgt.questions.push(...gone.questions); S().save(); TL.app.render();
      });
      act('addchap', () => { d.chapters.push({ id: uid('c'), title: 'Chương mới', topics: [], questions: [], formulas: '' }); S().save(); TL.app.render(); });
      act('discard', async () => { if (await confirmBox('Huỷ bản nháp?', 'Cấu trúc và câu hỏi vừa tạo sẽ bị xoá.', 'Huỷ bản nháp')) { st.draft = null; S().save(); TL.app.render(); } });
      act('confirm', async () => {
        const chs = d.chapters.filter((c) => c.topics.length);
        if (!chs.length) return toast('Chưa có chủ đề nào.');
        const c = counts(chs);
        const msg = `${chs.length} chương, ${c.ready} câu hỏi sẵn sàng${c.pending + c.flagged ? `, ${c.pending + c.flagged} câu chưa duyệt sẽ không được dùng` : ''}. Khoá học hiện tại và tiến độ sẽ được thay thế.`;
        if (!(await confirmBox('Bắt đầu khoá học mới?', msg, 'Bắt đầu học'))) return;
        S().replaceCourse({ id: uid('course'), title: d.title, source: 'upload', chapters: chs });
        location.hash = '#/';
      });
      root.querySelectorAll('.chip').forEach((chip) => {
        chip.ondragstart = (e) => { dragTopic = chip.dataset.topic; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragTopic); };
        chip.ondragend = () => chip.classList.remove('dragging');
      });
      root.querySelectorAll('[data-chap]').forEach((box) => {
        box.ondragover = (e) => { if (dragTopic) { e.preventDefault(); box.classList.add('over'); } };
        box.ondragleave = () => box.classList.remove('over');
        box.ondrop = (e) => {
          e.preventDefault(); box.classList.remove('over'); if (!dragTopic) return;
          const to = d.chapters[box.dataset.chap];
          const from = d.chapters.find((c) => c.topics.some((t) => t.id === dragTopic));
          if (from && from !== to) {
            const t = from.topics.splice(from.topics.findIndex((x) => x.id === dragTopic), 1)[0];
            to.topics.push(t);
            const moved = from.questions.filter((q) => q.topicId === t.id);
            from.questions = from.questions.filter((q) => q.topicId !== t.id); to.questions.push(...moved);
            S().save();
          }
          dragTopic = null; TL.app.render();
        };
      });
    },
  };

  TL.views.review = {
    render() {
      const d = draft();
      const chs = d ? d.chapters : S().state.course.chapters;
      const items = chs.map((ch, ci) => {
        const qs = ch.questions.filter((q) => q.source === 'ai' || q.source === 'teacher');
        if (!qs.length) return '';
        return `<h2 style="margin-top:8px">Chương ${ci + 1} · ${esc(ch.title)}</h2>` + qs.map((q) => {
          const st = q.status === 'approved' ? '<span class="pill ok">Đã duyệt</span>' : q.status === 'rejected' ? '<span class="pill">Đã loại</span>' : q.status === 'flagged' ? '<span class="pill bad">Gắn cờ: giải lại không khớp</span>' : '<span class="pill warn">Chờ duyệt</span>';
          return `<div class="qrow" data-q="${q.id}">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div class="small muted">${q.source === 'ai' ? 'AI sinh' : 'Giảng viên'} · ${esc(TL.ui.topicTitle(ch, q.topicId))}</div>${st}</div>
            <div style="font-weight:600">${esc(q.prompt)}</div>
            <ol type="A">${q.options.map((o, i) => `<li class="${i === q.answer ? 'ans' : ''}">${esc(o)}</li>`).join('')}</ol>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <label class="small">Đáp án <select data-ans>${q.options.map((_, i) => `<option value="${i}" ${i === q.answer ? 'selected' : ''}>${'ABCDE'[i]}</option>`).join('')}</select></label>
              <label class="small">Dùng cho <select data-stage><option value="1" ${q.stage === 1 ? 'selected' : ''}>GĐ1 · Học</option><option value="2" ${q.stage === 2 ? 'selected' : ''}>GĐ2 · Luyện tập</option><option value="3" ${q.stage === 3 ? 'selected' : ''} ${q.verified ? '' : 'disabled'}>GĐ3 · Kiểm tra${q.verified ? '' : ' (cần khớp đáp án)'}</option></select></label>
              <span style="flex:1"></span>
              ${q.status !== 'approved' ? '<button class="btn sm" data-ok>Duyệt</button>' : ''}${q.status !== 'rejected' ? '<button class="btn sm danger" data-no>Loại</button>' : ''}
            </div></div>`;
        }).join('');
      }).join('');
      return `<div class="page">
        <header style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
          <div><a class="back" href="#/upload">← Nhập nội dung</a><div class="muted small">Bước 2/2 · Duyệt câu hỏi${d ? '' : ' · khoá học hiện tại'}</div><h1 style="margin-top:4px">Duyệt câu hỏi</h1></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" data-act="all">Duyệt tất cả câu chờ</button><a class="btn" href="#/upload">Xong</a></div>
        </header>
        <p class="note" style="max-width:820px">Sửa đáp án nếu AI sai. Câu bị gắn cờ (giải lại độc lập ra đáp án khác hoặc mơ hồ) vẫn dùng được cho GĐ1–2 sau khi bạn duyệt, nhưng không được dùng cho GĐ3.</p>
        <div class="col gap14" style="max-width:900px">${items || '<p class="muted">Chưa có câu hỏi nào để duyệt.</p>'}</div></div>`;
    },
    mount(root) {
      const d = draft();
      const chs = d ? d.chapters : S().state.course.chapters;
      const find = (id) => { for (const c of chs) { const q = c.questions.find((x) => x.id === id); if (q) return q; } };
      root.querySelectorAll('[data-q]').forEach((row) => {
        const q = find(row.dataset.q);
        const ok = row.querySelector('[data-ok]'), no = row.querySelector('[data-no]');
        if (ok) ok.onclick = () => { q.status = 'approved'; S().save(); TL.app.render(); };
        if (no) no.onclick = () => { q.status = 'rejected'; S().save(); TL.app.render(); };
        row.querySelector('[data-ans]').onchange = (e) => { q.answer = Number(e.target.value); q.verified = q.source === 'teacher' || q.verified; if (q.status === 'flagged') { q.status = 'approved'; q.verified = true; } S().save(); TL.app.render(); };
        row.querySelector('[data-stage]').onchange = (e) => { q.stage = Number(e.target.value); S().save(); };
      });
      root.querySelector('[data-act=all]').onclick = () => { let n = 0; chs.forEach((c) => c.questions.forEach((q) => { if (q.status === 'pending') { q.status = 'approved'; n++; } })); S().save(); toast(`Đã duyệt ${n} câu.`); TL.app.render(); };
    },
  };

  const SAMPLE = `# Chương 1: Cung và cầu
## Cầu
Cầu là số lượng hàng hoá mà người mua sẵn sàng và có khả năng mua ở mỗi mức giá. Luật cầu cho biết khi giá tăng thì lượng cầu giảm, nếu các yếu tố khác không đổi.
Đường cầu là đường biểu diễn quan hệ giữa giá và lượng cầu, thường dốc xuống.
## Cung
Cung là số lượng hàng hoá mà người bán sẵn sàng và có khả năng bán ở mỗi mức giá. Luật cung cho biết khi giá tăng thì lượng cung tăng.
Đường cung là đường biểu diễn quan hệ giữa giá và lượng cung, thường dốc lên.

# Chương 2: Cân bằng thị trường
## Điểm cân bằng
Giá cân bằng là mức giá tại đó lượng cung bằng lượng cầu. Dư thừa là tình trạng lượng cung lớn hơn lượng cầu, thường đẩy giá xuống.
Thiếu hụt là tình trạng lượng cầu lớn hơn lượng cung, thường đẩy giá lên.
## Can thiệp của chính phủ
Giá trần là mức giá tối đa do chính phủ quy định, thường gây thiếu hụt. Giá sàn là mức giá tối thiểu do chính phủ quy định, thường gây dư thừa.

# Chương 3: Độ co giãn
## Co giãn của cầu theo giá
Độ co giãn của cầu theo giá là phần trăm thay đổi lượng cầu chia cho phần trăm thay đổi của giá. Hàng thiết yếu là hàng có cầu ít co giãn theo giá.
Hàng xa xỉ là hàng có cầu co giãn mạnh theo giá.
## Doanh thu
Tổng doanh thu bằng giá nhân với lượng bán. Khi cầu co giãn, giảm giá làm tăng tổng doanh thu.`;
})(window.TL);
