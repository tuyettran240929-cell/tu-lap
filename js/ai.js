(function (TL) {
  const { tokens, parseNumber, shuffle } = TL.u;

  function sentencesOf(ch) {
    const out = [];
    ch.topics.forEach((t) => (t.content || '').split(/(?<=[.!?])\s+|\n+/).forEach((s) => { s = s.trim(); if (s.length > 12) out.push({ s, topic: t }); }));
    return out;
  }
  function retrieve(ch, query, k = 2) {
    const q = new Set(tokens(query));
    return sentencesOf(ch)
      .map((x) => ({ ...x, score: tokens(x.s).filter((w) => q.has(w)).length + (tokens(x.topic.title).some((w) => q.has(w)) ? 1 : 0) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  }

  async function callLLM(system, user) {
    const { apiKey, model } = TL.store.state.settings;
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model || 'gpt-4o-mini', temperature: 0.4, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      return j.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.warn('LLM lỗi, dùng gia sư offline', e);
      return null;
    }
  }
  const lessonText = (ch) => ch.topics.map((t) => `## ${t.title}\n${t.content}`).join('\n\n').slice(0, 6000);
  const answerText = (q) => (q.type === 'mcq' ? q.options[q.answer] : String(q.answer));

  async function chat(ch, question) {
    const llm = await callLLM(
      `Bạn là gia sư tiếng Việt cho chương "${ch.title}". Giải thích ngắn gọn, dựa trên bài giảng dưới đây, kết thúc bằng một câu hỏi để người học tự kiểm tra.\n\n${lessonText(ch)}`, question);
    if (llm) return llm;
    const hits = retrieve(ch, question);
    if (!hits.length) {
      const topics = ch.topics.map((t) => t.title).join(', ');
      return `Mình chưa tìm thấy đoạn nào trong bài giảng khớp với câu hỏi. Chương này gồm: ${topics}. Bạn thử hỏi cụ thể hơn, ví dụ “${ch.topics[0]?.title} là gì?”`;
    }
    const t = hits[0].topic.title;
    return `Theo bài giảng (${t}):\n` + hits.map((h) => '• ' + h.s).join('\n') + `\n\nTự kiểm tra: bạn có thể giải thích lại “${t}” bằng lời của mình và cho một ví dụ không?`;
  }

  async function hint(ch, q) {
    const llm = await callLLM('Bạn là gia sư. Đưa MỘT gợi ý ngắn (tối đa 2 câu) giúp người học tự giải. TUYỆT ĐỐI không nêu đáp án, không nêu kết quả số.', `Câu hỏi: ${q.prompt}${q.options ? '\nLựa chọn: ' + q.options.join(' | ') : ''}`);
    if (llm) return llm;
    if (q.hint) return q.hint;
    const hits = retrieve(ch, q.prompt, 1);
    return hits.length ? `Đọc lại ý này trong bài giảng: “${hits[0].s.slice(0, 80)}…”` : 'Gạch chân từ khoá trong đề và nhớ lại định nghĩa tương ứng.';
  }

  async function explain(ch, q) {
    const llm = await callLLM('Bạn là gia sư. Giải thích ngắn gọn vì sao đáp án đúng là đúng, từng bước.', `Câu hỏi: ${q.prompt}\nĐáp án đúng: ${answerText(q)}`);
    if (llm) return llm;
    return `Đáp án đúng: ${answerText(q)}.\n${q.explain || ''}`.trim();
  }

  async function checkReasoning(ch, q, text) {
    const llm = await callLLM('Bạn là gia sư. Nhận xét lập luận của người học: chỉ ra bước đúng, bước còn thiếu hoặc sai. KHÔNG nêu đáp án đúng. Tối đa 4 câu.', `Câu hỏi: ${q.prompt}\nĐáp án đúng (chỉ để bạn đối chiếu, không được tiết lộ): ${answerText(q)}\nLập luận của người học: ${text}`);
    if (llm) return llm;
    const t = tokens(text).join(' ');
    const kws = (q.keywords || []).filter((k) => t.includes(k));
    const n = parseNumber(text);
    const target = q.numAnswer ?? (q.type === 'num' ? q.answer : null);
    const parts = [];
    if (kws.length) parts.push(`Bạn đã nhắc tới ý quan trọng (${kws.join(', ')}) – hướng đi hợp lý.`);
    else parts.push('Lập luận chưa nêu rõ khái niệm then chốt của câu này.');
    if (target != null && n != null) parts.push(Math.abs(n - target) <= (q.tol || 0.011) ? 'Kết quả trung gian của bạn có vẻ nhất quán. Kiểm tra lại đơn vị và cách làm tròn.' : 'Có thể một bước tính chưa đúng – thử làm lại chậm từng bước.');
    if (text.trim().split(/\s+/).length < 8) parts.push('Thử viết đủ các bước: bạn bắt đầu từ đâu, dùng công thức nào, vì sao.');
    parts.push('Gợi ý: ' + (q.hint || 'đối chiếu với định nghĩa trong bài giảng.'));
    return parts.join('\n');
  }

  TL.ai = { chat, hint, explain, checkReasoning, retrieve, sentencesOf, online: () => !!TL.store.state.settings.apiKey, _shuffle: shuffle };
})(window.TL);
