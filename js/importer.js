(function (TL) {
  const { uid, shuffle, norm } = TL.u;

  // ---- lecture text -> chapters/topics ----
  function parseLecture(text, fallbackTitle = 'Bài giảng') {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const chapters = [];
    let ch = null, tp = null;
    const isCh = (l) => /^#\s+/.test(l) || /^(chương|chapter|bài)\s+[\divxlc]+\b/i.test(l);
    const isTp = (l) => /^#{2,3}\s+/.test(l) || /^\d+\.\d+\.?\s+\S/.test(l);
    const clean = (l) => l.replace(/^#+\s*/, '').replace(/^(chương|chapter|bài)\s+[\divxlc]+\s*[:.\-–·]?\s*/i, '').trim() || l.replace(/^#+\s*/, '').trim();
    const newCh = (title) => { ch = { id: uid('c'), title, topics: [], questions: [], formulas: '' }; chapters.push(ch); tp = null; };
    const newTp = (title) => { if (!ch) newCh(fallbackTitle); tp = { id: uid('t'), title, content: '' }; ch.topics.push(tp); };
    lines.forEach((raw) => {
      const l = raw.trim();
      if (!l) { if (tp) tp.content += '\n'; return; }
      if (isCh(l)) newCh(clean(l));
      else if (isTp(l)) newTp(l.replace(/^#+\s*/, '').replace(/^\d+\.\d+\.?\s+/, ''));
      else { if (!tp) newTp(ch && ch.topics.length === 0 ? 'Tổng quan' : 'Nội dung'); tp.content += (tp.content && !tp.content.endsWith('\n') ? ' ' : '') + l; }
    });
    chapters.forEach((c) => {
      c.topics = c.topics.filter((t) => t.content.trim()).map((t) => ({ ...t, content: t.content.replace(/\n{3,}/g, '\n\n').trim() }));
      if (!c.topics.length) c.topics.push({ id: uid('t'), title: 'Tổng quan', content: '(Chưa có nội dung)' });
    });
    // No headings at all: split long text into ~3 chapters by paragraph
    if (chapters.length === 1 && chapters[0].topics.length === 1) {
      const paras = chapters[0].topics[0].content.split(/\n\s*\n/).filter((p) => p.trim());
      if (paras.length >= 4) {
        const per = Math.ceil(paras.length / Math.min(4, Math.ceil(paras.length / 2)));
        const out = [];
        for (let i = 0; i < paras.length; i += per) {
          const chunk = paras.slice(i, i + per);
          const title = chunk[0].split(/[.:!?]/)[0].slice(0, 50);
          out.push({ id: uid('c'), title, questions: [], formulas: '', topics: chunk.map((p, j) => ({ id: uid('t'), title: p.split(/[.:!?]/)[0].split(/\s+/).slice(0, 5).join(' ') || `Ý ${j + 1}`, content: p.trim() })) });
        }
        return out;
      }
    }
    return chapters;
  }

  // ---- CSV/JSON questions ----
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  const H = {
    chapter: ['chuong', 'chapter', 'chuong hoc'], topic: ['chu de', 'topic', 'chu_de'], prompt: ['cau hoi', 'question', 'cau_hoi', 'de bai'],
    answer: ['dap an', 'answer', 'dap_an'], explain: ['giai thich', 'explain', 'giai_thich'], hint: ['goi y', 'hint', 'goi_y'], stage: ['giai doan', 'stage', 'giai_doan'],
  };
  function rowsToQuestions(objs) {
    return objs.map((o) => {
      const get = (k) => { const key = Object.keys(o).find((x) => H[k].includes(norm(x).trim().replace(/\s+/g, ' ')) || H[k].includes(x.toLowerCase())); return key ? o[key] : undefined; };
      let options = o.options || o.lua_chon || ['a', 'b', 'c', 'd', 'e'].map((l) => o[l] ?? o[l.toUpperCase()]).filter((x) => x != null && String(x).trim() !== '');
      if (typeof options === 'string') options = options.split('|').map((s) => s.trim());
      let ans = get('answer');
      let idx = -1;
      if (typeof ans === 'number') idx = ans;
      else if (ans != null) {
        const a = String(ans).trim();
        if (/^[a-eA-E]$/.test(a)) idx = a.toUpperCase().charCodeAt(0) - 65;
        else if (/^\d+$/.test(a) && Number(a) < options.length) idx = Number(a);
        else idx = options.findIndex((x) => norm(x).trim() === norm(a).trim());
      }
      const prompt = get('prompt') || o.prompt;
      if (!prompt || options.length < 2 || idx < 0) return null;
      const stage = Number(get('stage')) || 0;
      return { id: uid('q'), chapterRef: get('chapter') || o.chapter, topicRef: get('topic') || o.topic, stage, type: 'mcq', prompt: String(prompt), options: options.map(String), answer: idx,
        explain: get('explain') || '', hint: get('hint') || '', keywords: [], source: 'teacher', status: 'approved', verified: true };
    }).filter(Boolean);
  }
  function parseQuestions(text) {
    text = String(text || '').trim();
    if (!text) return [];
    if (text[0] === '[' || text[0] === '{') {
      let j = JSON.parse(text); if (!Array.isArray(j)) j = j.questions || [j];
      return rowsToQuestions(j);
    }
    const rows = parseCSV(text);
    const head = rows.shift().map((h) => h.trim());
    return rowsToQuestions(rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))));
  }

  function attachQuestions(chapters, qs) {
    let rr = 0;
    qs.forEach((q, i) => {
      let ch = chapters.find((c) => q.chapterRef && (norm(c.title).includes(norm(q.chapterRef).trim()) || String(chapters.indexOf(c) + 1) === String(q.chapterRef).replace(/\D/g, '')));
      if (!ch) ch = chapters[i % chapters.length];
      const tp = ch.topics.find((t) => q.topicRef && norm(t.title).includes(norm(q.topicRef).trim())) || ch.topics[(ch.questions.length) % ch.topics.length];
      q.topicId = tp.id;
      if (!q.stage) q.stage = [1, 2, 2, 3][rr++ % 4];
      delete q.chapterRef; delete q.topicRef;
      ch.questions.push(q);
    });
  }

  // ---- mock "AI sinh câu hỏi" (offline): cloze questions from definition sentences + independent re-solve ----
  function generateQuestions(chapters, perChapter = 8) {
    const defs = [];
    chapters.forEach((ch) => ch.topics.forEach((t) => (t.content || '').split(/(?<=[.!?])\s+|\n+/).forEach((s) => {
      const m = s.trim().match(/^(.{3,60}?)\s+(là|được gọi là|bằng|gồm)\s+(.{8,}?)[.!?]?$/i);
      if (m) {
        const term = m[1].replace(/^(trong đó|ví dụ|khi đó|còn|với|nếu)[, ]+/i, '').trim();
        if (term.split(/\s+/).length <= 8) defs.push({ ch, t, term, verb: m[2], rest: m[3], s });
      }
    })));
    const allTerms = [...new Set(defs.map((d) => d.term))];
    let made = 0;
    chapters.forEach((ch) => {
      const mine = defs.filter((d) => d.ch === ch).slice(0, perChapter);
      let rr = 0;
      mine.forEach((d) => {
        const pool = shuffle(allTerms.filter((x) => norm(x) !== norm(d.term)));
        if (pool.length < 2) return;
        const distract = pool.slice(0, 3);
        const opts = shuffle([d.term, ...distract]);
        const ans = opts.indexOf(d.term);
        // independent re-solve: answer again from the source sentence only; ambiguous if a distractor also fits the context
        const ctx = norm(d.rest);
        const ambiguous = distract.some((x) => norm(x).trim().length > 2 && ctx.includes(norm(x).trim()));
        ch.questions.push({ id: uid('q'), topicId: d.t.id, stage: [1, 2, 3, 2][rr++ % 4], type: 'mcq',
          prompt: `Điền vào chỗ trống: “___ ${d.verb} ${d.rest}.”`, options: opts, answer: ans,
          explain: `Bài giảng (${d.t.title}): “${d.s.trim()}”`, hint: `Xem lại phần “${d.t.title}”.`, keywords: [norm(d.term).trim()],
          source: 'ai', status: ambiguous ? 'flagged' : 'pending', verified: !ambiguous });
        made++;
      });
    });
    return made;
  }

  // ---- minimal ZIP reader for .docx / .pptx (uses DecompressionStream) ----
  async function unzip(buf, want) {
    const dv = new DataView(buf); const u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Không đọc được tệp nén');
    const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const out = {}; const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + el + cl;
      if (!want(name)) continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = u8.subarray(start, start + csize);
      if (method === 0) out[name] = dec.decode(data);
      else out[name] = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    return out;
  }
  const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

  async function fileToText(file) {
    const name = file.name.toLowerCase();
    const base = file.name.replace(/\.[^.]+$/, '');
    if (name.endsWith('.docx')) {
      const files = await unzip(await file.arrayBuffer(), (n) => n === 'word/document.xml');
      const xml = files['word/document.xml'] || '';
      return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map((p) => {
        const txt = (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).map(xmlText).join('');
        const st = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
        if (/heading1|title|u1|^1$/i.test(st.replace(/\s/g, ''))) return '# ' + txt;
        if (/heading[23]|^[23]$/i.test(st.replace(/\s/g, ''))) return '## ' + txt;
        return txt;
      }).join('\n');
    }
    if (name.endsWith('.pptx')) {
      const files = await unzip(await file.arrayBuffer(), (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
      const slides = Object.keys(files).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
      return '# ' + base + '\n' + slides.map((k) => {
        const paras = (files[k].match(/<a:p[\s>][\s\S]*?<\/a:p>/g) || []).map((p) => (p.match(/<a:t[\s>][\s\S]*?<\/a:t>/g) || []).map(xmlText).join('')).filter(Boolean);
        return paras.length ? '## ' + paras[0] + '\n' + paras.slice(1).join('\n') : '';
      }).join('\n\n');
    }
    if (name.endsWith('.pdf')) {
      if (!window.pdfjsLib) {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = res; s.onerror = () => rej(new Error('Cần mạng để đọc PDF. Bạn có thể dán văn bản trực tiếp.')); document.head.appendChild(s); });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const c = await (await pdf.getPage(i)).getTextContent();
        pages.push(c.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
      }
      return pages.join('\n\n');
    }
    return await file.text();
  }

  TL.importer = { parseLecture, parseQuestions, attachQuestions, generateQuestions, fileToText };
})(window.TL);
