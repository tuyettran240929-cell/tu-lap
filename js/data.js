(function (TL) {
  const { randInt, pick, shuffle, round, fmtNum } = TL.u;

  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const mean = (a) => sum(a) / a.length;
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const pvar = (a) => { const m = mean(a); return mean(a.map((x) => (x - m) ** 2)); };
  const list = (a) => a.join('; ');
  const uniqOpts = (answer, ds) => {
    const out = [answer];
    ds.forEach((d) => { if (out.length < 4 && !out.includes(d)) out.push(d); });
    let k = 1;
    while (out.length < 4) { const v = String(Number(String(answer).replace(',', '.')) + k++).replace('.', ','); if (!out.includes(v)) out.push(v); }
    return out;
  };

  // Each generator returns a fresh "đề biến thể": different numbers on every call.
  const gens = {
    datatype(r) {
      const items = [
        ['Màu mắt của học sinh trong lớp', 0], ['Nơi sinh của nhân viên', 0], ['Hãng điện thoại đang dùng', 0], ['Xếp loại hạnh kiểm (Tốt, Khá, ...)', 0],
        ['Số anh chị em ruột', 1], ['Số tin nhắn nhận trong ngày', 1], ['Số lỗi chính tả trong bài', 1],
        ['Chiều cao (cm)', 2], ['Thời gian chạy 100 m (giây)', 2], ['Cân nặng của trẻ sơ sinh (kg)', 2],
      ];
      const [label, ans] = pick(r, items);
      return { topicId: 't1_1', type: 'mcq', prompt: `Biến “${label}” thuộc loại dữ liệu nào?`, options: ['Định tính', 'Định lượng rời rạc', 'Định lượng liên tục'], answer: ans,
        hint: 'Hỏi bản thân: giá trị có phải là con số không? Nếu là số, có đếm được từng đơn vị không?',
        explain: 'Định tính: phân loại. Định lượng rời rạc: đếm được. Định lượng liên tục: đo được, nhận mọi giá trị trong một khoảng.', keywords: ['dinh tinh', 'dem', 'do'] };
    },
    freq(r) {
      const vals = [randInt(r, 1, 3), randInt(r, 4, 6), randInt(r, 7, 9)];
      const n = randInt(r, 10, 13);
      const data = Array.from({ length: n }, () => pick(r, vals));
      const x = pick(r, data);
      const c = data.filter((v) => v === x).length;
      return { topicId: 't1_2', type: 'num', prompt: `Điểm kiểm tra của ${n} bạn: ${list(data)}. Tần số của giá trị ${x} là bao nhiêu?`, answer: c, tol: 0.01,
        distractors: [String(c + 1), String(c - 1 || c + 2), String(n - c)],
        hint: 'Tần số là số lần giá trị xuất hiện. Đếm cẩn thận, có thể gạch từng số đã đếm.',
        explain: `Giá trị ${x} xuất hiện ${c} lần nên tần số là ${c}.`, keywords: ['dem', 'xuat hien'] };
    },
    relfreq(r) {
      const n = pick(r, [20, 25, 40, 50]);
      const c = randInt(r, 2, Math.floor(n / 2));
      const ans = round((c / n) * 100, 1);
      return { topicId: 't1_2', type: 'num', prompt: `Khảo sát ${n} sinh viên, có ${c} bạn chọn đi học bằng xe buýt. Tần số tương đối (%) của lựa chọn “xe buýt” là bao nhiêu?`, answer: ans, tol: 0.06, unit: '%',
        distractors: [fmtNum(c / n, 2), fmtNum(ans + 5, 1), String(c)],
        hint: 'Tần số tương đối = tần số / cỡ mẫu, sau đó đổi sang phần trăm.',
        explain: `${c} / ${n} = ${fmtNum(c / n, 3)} → ${fmtNum(ans, 1)}%.`, keywords: ['chia', 'co mau', 'phan tram'] };
    },
    mean(r) {
      const n = randInt(r, 5, 7);
      const data = Array.from({ length: n }, () => randInt(r, 2, 20));
      const ans = round(mean(data));
      return { topicId: 't2_1', type: 'num', prompt: `Tính trung bình của dãy số liệu: ${list(data)} (làm tròn 2 chữ số thập phân).`, answer: ans, tol: 0.011,
        distractors: [fmtNum(median(data)), String(sum(data)), fmtNum(mean(data.slice(0, -1)))],
        hint: 'Trung bình = tổng các giá trị chia cho số giá trị. Bạn đã đếm đủ số giá trị chưa?',
        explain: `Tổng = ${sum(data)}, có ${n} giá trị → ${sum(data)} / ${n} = ${fmtNum(ans)}.`, keywords: ['tong', 'chia'] };
    },
    median(r) {
      const n = pick(r, [6, 7, 8, 9]);
      const data = shuffle(Array.from({ length: n }, () => randInt(r, 1, 30)), r);
      const ans = median(data);
      const raw = n % 2 ? data[(n - 1) / 2] : (data[n / 2 - 1] + data[n / 2]) / 2;
      return { topicId: 't2_2', type: 'num', prompt: `Tìm trung vị của dãy: ${list(data)}.`, answer: ans, tol: 0.011, hard: n % 2 === 0,
        distractors: [fmtNum(raw), fmtNum(mean(data)), String(Math.max(...data) - Math.min(...data))],
        hint: 'Bước đầu tiên với trung vị luôn là sắp xếp. Số giá trị chẵn hay lẻ?',
        explain: `Sắp xếp: ${list(data.slice().sort((a, b) => a - b))}. ${n % 2 ? 'n lẻ nên lấy giá trị chính giữa' : 'n chẵn nên lấy trung bình hai giá trị giữa'} → ${fmtNum(ans)}.`, keywords: ['sap xep', 'giua'] };
    },
    mode(r) {
      const base = shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], r).slice(0, 5);
      const m = base[0];
      const data = shuffle([m, m, m, base[1], base[1], base[2], base[3], base[4]], r);
      return { topicId: 't2_3', type: 'num', prompt: `Mốt của dãy số liệu sau là bao nhiêu: ${list(data)}?`, answer: m, tol: 0.01,
        distractors: [String(base[1]), String(Math.max(...data)), fmtNum(mean(data))],
        hint: 'Mốt là giá trị xuất hiện nhiều lần nhất. Thử lập bảng tần số nhanh.',
        explain: `${m} xuất hiện 3 lần, nhiều nhất → mốt = ${m}.`, keywords: ['nhieu nhat', 'tan so'] };
    },
    range(r) {
      const n = randInt(r, 6, 8);
      const data = Array.from({ length: n }, () => randInt(r, 3, 45));
      const ans = Math.max(...data) - Math.min(...data);
      return { topicId: 't3_1', type: 'num', prompt: `Nhiệt độ (°C) ghi nhận trong ${n} ngày: ${list(data)}. Khoảng biến thiên là bao nhiêu?`, answer: ans, tol: 0.01,
        distractors: [String(Math.max(...data)), String(ans + 1), fmtNum(mean(data))],
        hint: 'Khoảng biến thiên chỉ cần hai giá trị đặc biệt của dãy.',
        explain: `Lớn nhất ${Math.max(...data)}, nhỏ nhất ${Math.min(...data)} → ${ans}.`, keywords: ['lon nhat', 'nho nhat', 'tru'] };
    },
    variance(r) {
      const n = pick(r, [4, 5]);
      let data;
      do { data = Array.from({ length: n }, () => randInt(r, 1, 12)); } while (!Number.isInteger(mean(data) * 2));
      const ans = round(pvar(data));
      return { topicId: 't3_2', type: 'num', prompt: `Coi dãy ${list(data)} là toàn bộ tổng thể. Tính phương sai σ² (làm tròn 2 chữ số thập phân).`, answer: ans, tol: 0.011, hard: true,
        distractors: [fmtNum((pvar(data) * n) / (n - 1)), fmtNum(Math.sqrt(pvar(data))), fmtNum(pvar(data) * n)],
        hint: 'Ba bước: tính trung bình, bình phương độ lệch từng giá trị, rồi lấy trung bình các bình phương. Tổng thể thì chia cho n.',
        explain: `Trung bình = ${fmtNum(mean(data))}. Trung bình của bình phương độ lệch = ${fmtNum(ans)}.`, keywords: ['trung binh', 'binh phuong', 'do lech'] };
    },
    std(r) {
      const n = pick(r, [4, 5]);
      const data = Array.from({ length: n }, () => randInt(r, 1, 15));
      const ans = round(Math.sqrt(pvar(data)));
      return { topicId: 't3_3', type: 'num', prompt: `Tính độ lệch chuẩn tổng thể σ của dãy: ${list(data)} (làm tròn 2 chữ số thập phân).`, answer: ans, tol: 0.011, hard: true,
        distractors: [fmtNum(pvar(data)), fmtNum(Math.sqrt((pvar(data) * n) / (n - 1))), fmtNum(ans + 1)],
        hint: 'Độ lệch chuẩn là căn bậc hai của phương sai. Tính phương sai trước.',
        explain: `σ² = ${fmtNum(pvar(data))} → σ = √σ² ≈ ${fmtNum(ans)}.`, keywords: ['can', 'phuong sai'] };
    },
    dice(r) {
      const s = randInt(r, 3, 11);
      const ways = 6 - Math.abs(7 - s);
      const ans = round(ways / 36, 4);
      return { topicId: 't4_1', type: 'num', prompt: `Gieo đồng thời hai con xúc xắc cân đối. Xác suất để tổng số chấm bằng ${s} là bao nhiêu? (ghi phân số hoặc số thập phân)`, answer: ans, tol: 0.006, hard: true,
        distractors: [`${ways}/36`.replace(/^/, ''), `1/${s}`, `${ways}/12`, `1/11`],
        mcqAnswerLabel: `${ways}/36`,
        hint: 'Có bao nhiêu kết quả đồng khả năng khi gieo hai xúc xắc? Liệt kê các cặp (a, b) cho tổng mong muốn.',
        explain: `Có 36 kết quả. Số cặp có tổng ${s} là ${ways} → P = ${ways}/36 ≈ ${fmtNum(ans, 3)}.`, keywords: ['36', 'cap', 'ket qua'] };
    },
    balls(r) {
      const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 0, 4);
      const tot = a + b + c;
      const ans = round(a / tot, 4);
      return { topicId: 't4_1', type: 'num', prompt: `Một hộp có ${a} bi đỏ, ${b} bi xanh${c ? ` và ${c} bi vàng` : ''}. Lấy ngẫu nhiên 1 bi. Xác suất lấy được bi đỏ là bao nhiêu?`, answer: ans, tol: 0.006,
        distractors: [`${a}/${b}`, `1/${tot}`, `${b}/${tot}`], mcqAnswerLabel: `${a}/${tot}`,
        hint: 'Xác suất cổ điển = số kết quả thuận lợi / tổng số kết quả có thể.',
        explain: `Thuận lợi: ${a}, tổng: ${tot} → P = ${a}/${tot} ≈ ${fmtNum(ans, 3)}.`, keywords: ['thuan loi', 'tong'] };
    },
    complement(r) {
      const p = randInt(r, 5, 95) / 100;
      const ans = round(1 - p, 2);
      return { topicId: 't4_2', type: 'num', prompt: `Xác suất trời mưa ngày mai là ${fmtNum(p)}. Xác suất ngày mai không mưa là bao nhiêu?`, answer: ans, tol: 0.006,
        distractors: [fmtNum(p), fmtNum(p / 2), '1'],
        hint: 'Hai biến cố “mưa” và “không mưa” có quan hệ gì? Tổng xác suất của chúng bằng bao nhiêu?',
        explain: `P(không A) = 1 − P(A) = 1 − ${fmtNum(p)} = ${fmtNum(ans)}.`, keywords: ['doi', '1 tru', 'bu'] };
    },
  };

  function genToMcq(g) {
    if (g.type === 'mcq') return g;
    const ansLabel = g.mcqAnswerLabel || fmtNum(g.answer, g.unit === '%' ? 1 : 2) + (g.unit || '');
    const opts = uniqOpts(ansLabel, g.distractors.map((d) => d + (g.unit && !String(d).includes('/') ? g.unit : '')));
    const order = shuffle(opts.map((o, i) => i));
    return { ...g, type: 'mcq', options: order.map((i) => opts[i]), answer: order.indexOf(0) };
  }

  const mcq = (id, topicId, stage, prompt, options, answer, explain, hint, keywords = []) =>
    ({ id, topicId, stage, type: 'mcq', prompt, options, answer, explain, hint, keywords, source: 'demo', status: 'approved', verified: true });

  function demoCourse() {
    return {
      id: 'demo-thongke',
      title: 'Thống kê mô tả cơ bản',
      source: 'demo',
      chapters: [
        {
          id: 'c1', title: 'Dữ liệu và cách tổ chức', gens: ['datatype', 'freq', 'relfreq'],
          formulas: 'Tần số tương đối = tần số / n × 100%\nTổng các tần số = n\nTổng tần số tương đối = 100%',
          topics: [
            { id: 't1_1', title: 'Loại dữ liệu', content: 'Dữ liệu định tính là dữ liệu mô tả đặc điểm hoặc phân loại, ví dụ màu sắc, giới tính hay nơi sinh. Với dữ liệu định tính ta chỉ đếm số lần xuất hiện của mỗi nhóm, không cộng trừ được.\n\nDữ liệu định lượng là dữ liệu biểu diễn bằng con số có ý nghĩa đo lường, ví dụ chiều cao hay điểm thi.\n\nDữ liệu định lượng rời rạc nhận các giá trị đếm được, như số con trong một gia đình. Dữ liệu định lượng liên tục có thể nhận mọi giá trị trong một khoảng, như cân nặng hay thời gian.' },
            { id: 't1_2', title: 'Bảng tần số', content: 'Tần số của một giá trị là số lần giá trị đó xuất hiện trong mẫu.\n\nTần số tương đối bằng tần số chia cho cỡ mẫu n, thường viết dưới dạng phần trăm.\n\nTổng các tần số bằng cỡ mẫu n, còn tổng các tần số tương đối bằng 100%. Bảng tần số giúp nhìn nhanh giá trị nào phổ biến và phát hiện giá trị bất thường.' },
          ],
          questions: [
            mcq('q1a', 't1_1', 1, '“Nhóm máu” (A, B, AB, O) là loại dữ liệu gì?', ['Định tính', 'Định lượng rời rạc', 'Định lượng liên tục', 'Không phải dữ liệu'], 0, 'Nhóm máu là phân loại, không phải con số đo lường.'),
            mcq('q1b', 't1_2', 1, 'Tần số của một giá trị là gì?', ['Số lần giá trị đó xuất hiện', 'Giá trị lớn nhất', 'Tổng các giá trị', 'Giá trị chia cho n'], 0, 'Định nghĩa: số lần xuất hiện.'),
            mcq('q1c', 't1_2', 1, 'Tổng các tần số tương đối trong một bảng tần số bằng bao nhiêu?', ['100%', 'n', '1/n', 'Tuỳ dữ liệu'], 0, 'Các phần cộng lại thành toàn bộ mẫu: 100%.'),
            mcq('q1d', 't1_1', 2, 'Biến nào sau đây là định lượng liên tục?', ['Thời gian hoàn thành bài thi', 'Số bạn trong nhóm', 'Môn học yêu thích', 'Số tầng của toà nhà'], 0, 'Thời gian có thể nhận mọi giá trị trong một khoảng.', 'Biến nào có thể nhận giá trị như 12,37?', ['thoi gian', 'khoang']),
            mcq('q1e', 't1_1', 2, 'Vì sao không nên tính trung bình cho dữ liệu “mã tỉnh”?', ['Vì mã tỉnh là nhãn phân loại, phép cộng không có ý nghĩa', 'Vì mã tỉnh quá lớn', 'Vì mã tỉnh luôn là số chẵn', 'Vì phải dùng trung vị'], 0, 'Mã chỉ là nhãn, là dữ liệu định tính dù viết bằng số.', 'Con số ở đây có đo lường gì không?', ['nhan', 'phan loai', 'dinh tinh']),
            mcq('q1f', 't1_2', 2, 'Cỡ mẫu n = 40, giá trị X có tần số tương đối 25%. Tần số của X là?', ['10', '25', '4', '15'], 0, '25% × 40 = 10.', 'Đảo ngược công thức tần số tương đối.', ['40', 'nhan']),
            mcq('q1g', 't1_2', 2, 'Bảng tần số KHÔNG giúp trực tiếp việc nào?', ['Chứng minh quan hệ nhân quả', 'Thấy giá trị phổ biến', 'Phát hiện giá trị bất thường', 'Tính tần số tương đối'], 0, 'Bảng tần số chỉ mô tả phân bố, không chứng minh nhân quả.', 'Bảng tần số mô tả hay giải thích?', ['mo ta', 'nhan qua']),
          ],
        },
        {
          id: 'c2', title: 'Đo xu hướng trung tâm', gens: ['mean', 'median', 'mode'],
          formulas: 'Trung bình: x̄ = (x₁ + … + xₙ) / n\nTrung vị: sắp xếp; n lẻ lấy giá trị giữa, n chẵn lấy TB hai giá trị giữa\nMốt: giá trị có tần số lớn nhất',
          topics: [
            { id: 't2_1', title: 'Trung bình', content: 'Trung bình cộng bằng tổng các giá trị chia cho số giá trị.\n\nTrung bình dùng hết thông tin trong dữ liệu nhưng nhạy với giá trị ngoại lai: một giá trị quá lớn có thể kéo trung bình lên đáng kể.' },
            { id: 't2_2', title: 'Trung vị', content: 'Trung vị là giá trị đứng giữa khi dãy đã được sắp xếp tăng dần.\n\nNếu số giá trị n lẻ, trung vị là giá trị ở vị trí (n + 1) / 2. Nếu n chẵn, trung vị là trung bình của hai giá trị ở giữa.\n\nTrung vị ít bị ảnh hưởng bởi giá trị ngoại lai, nên thường dùng cho thu nhập hay giá nhà.' },
            { id: 't2_3', title: 'Mốt', content: 'Mốt là giá trị xuất hiện nhiều lần nhất trong dãy.\n\nMột dãy có thể có nhiều mốt hoặc không có mốt. Mốt dùng được cả cho dữ liệu định tính, ví dụ màu áo được chọn nhiều nhất.' },
          ],
          questions: [
            mcq('q2a', 't2_2', 1, 'Bước đầu tiên khi tìm trung vị là gì?', ['Sắp xếp dãy số', 'Tính tổng', 'Tìm giá trị lớn nhất', 'Đếm giá trị lặp lại'], 0, 'Trung vị là giá trị đứng giữa dãy đã sắp xếp.'),
            mcq('q2b', 't2_1', 1, 'Đại lượng nào nhạy nhất với giá trị ngoại lai?', ['Trung bình', 'Trung vị', 'Mốt', 'Cả ba như nhau'], 0, 'Trung bình dùng mọi giá trị nên bị kéo bởi ngoại lai.'),
            mcq('q2c', 't2_3', 1, 'Đại lượng nào dùng được cho dữ liệu định tính?', ['Mốt', 'Trung bình', 'Trung vị', 'Phương sai'], 0, 'Chỉ cần đếm tần số nên mốt dùng được cho dữ liệu định tính.'),
            mcq('q2d', 't2_2', 2, 'Thu nhập của 5 người: 8, 9, 10, 11, 120 (triệu). Đại lượng nào mô tả “người điển hình” tốt hơn?', ['Trung vị', 'Trung bình', 'Tổng', 'Khoảng biến thiên'], 0, '120 là ngoại lai; trung vị = 10 phản ánh tốt hơn trung bình = 31,6.', 'Có giá trị nào bất thường không?', ['ngoai lai', 'trung vi']),
            mcq('q2e', 't2_3', 2, 'Dãy 2, 4, 6, 8 có mốt là?', ['Không có mốt', '5', '2', '8'], 0, 'Mỗi giá trị xuất hiện một lần nên không có mốt.', 'Có giá trị nào lặp lại không?', ['lap', 'khong co']),
            mcq('q2f', 't2_1', 2, 'Thêm giá trị bằng đúng trung bình vào dãy thì trung bình mới sẽ?', ['Không đổi', 'Tăng', 'Giảm', 'Không xác định'], 0, 'Tổng tăng x̄, n tăng 1 → (n·x̄ + x̄)/(n + 1) = x̄.', 'Thử với một ví dụ nhỏ như 2, 4.', ['khong doi', 'tong']),
          ],
        },
        {
          id: 'c3', title: 'Đo độ phân tán', gens: ['range', 'variance', 'std'],
          formulas: 'Khoảng biến thiên R = max − min\nPhương sai tổng thể σ² = Σ(xᵢ − x̄)² / n\nPhương sai mẫu s² = Σ(xᵢ − x̄)² / (n − 1)\nĐộ lệch chuẩn σ = √σ²',
          topics: [
            { id: 't3_1', title: 'Khoảng biến thiên', content: 'Khoảng biến thiên bằng giá trị lớn nhất trừ giá trị nhỏ nhất.\n\nKhoảng biến thiên dễ tính nhưng chỉ dùng hai giá trị nên rất nhạy với ngoại lai.' },
            { id: 't3_2', title: 'Phương sai', content: 'Phương sai đo mức độ các giá trị phân tán quanh trung bình.\n\nPhương sai tổng thể bằng trung bình của bình phương độ lệch so với trung bình, tức chia cho n. Với mẫu, ta chia cho n − 1 để ước lượng không chệch.\n\nĐơn vị của phương sai là bình phương đơn vị của dữ liệu.' },
            { id: 't3_3', title: 'Độ lệch chuẩn', content: 'Độ lệch chuẩn là căn bậc hai của phương sai.\n\nĐộ lệch chuẩn có cùng đơn vị với dữ liệu nên dễ diễn giải hơn phương sai. Độ lệch chuẩn bằng 0 khi mọi giá trị bằng nhau.' },
          ],
          questions: [
            mcq('q3a', 't3_1', 1, 'Khoảng biến thiên được tính bằng?', ['Lớn nhất − nhỏ nhất', 'Trung bình − trung vị', 'Tổng / n', 'Căn của phương sai'], 0, 'R = max − min.'),
            mcq('q3b', 't3_3', 1, 'Độ lệch chuẩn liên hệ với phương sai thế nào?', ['Là căn bậc hai của phương sai', 'Là bình phương của phương sai', 'Bằng phương sai chia n', 'Không liên quan'], 0, 'σ = √σ².'),
            mcq('q3c', 't3_2', 1, 'Phương sai mẫu chia cho?', ['n − 1', 'n', 'n + 1', '2n'], 0, 'Chia n − 1 để ước lượng không chệch.'),
            mcq('q3d', 't3_3', 2, 'Dãy 5, 5, 5, 5 có độ lệch chuẩn bằng?', ['0', '5', '1', '25'], 0, 'Không có độ lệch nào so với trung bình.', 'Các giá trị lệch khỏi trung bình bao nhiêu?', ['bang nhau', '0']),
            mcq('q3e', 't3_2', 2, 'Dữ liệu đo bằng cm thì phương sai có đơn vị?', ['cm²', 'cm', 'Không có đơn vị', '%'], 0, 'Phương sai là trung bình của bình phương độ lệch.', 'Nhớ lại có bước nào bình phương không?', ['binh phuong']),
            mcq('q3f', 't3_1', 2, 'Cộng thêm 10 vào mọi giá trị, khoảng biến thiên sẽ?', ['Không đổi', 'Tăng 10', 'Tăng 20', 'Giảm 10'], 0, 'max và min cùng tăng 10 nên hiệu không đổi.', 'Viết (max + 10) − (min + 10).', ['khong doi', 'hieu']),
          ],
        },
        {
          id: 'c4', title: 'Xác suất cơ bản', gens: ['balls', 'complement', 'dice'],
          formulas: 'Xác suất cổ điển: P(A) = số kết quả thuận lợi / số kết quả có thể\nBiến cố đối: P(Ā) = 1 − P(A)\n0 ≤ P(A) ≤ 1',
          topics: [
            { id: 't4_1', title: 'Xác suất cổ điển', content: 'Khi các kết quả đồng khả năng, xác suất của biến cố A bằng số kết quả thuận lợi cho A chia cho tổng số kết quả có thể.\n\nGieo hai con xúc xắc có 6 × 6 = 36 kết quả đồng khả năng.\n\nXác suất luôn nằm trong đoạn từ 0 đến 1.' },
            { id: 't4_2', title: 'Biến cố đối', content: 'Biến cố đối của A là biến cố “A không xảy ra”, ký hiệu Ā.\n\nXác suất của biến cố đối bằng 1 trừ xác suất của A. Nhiều bài toán “ít nhất một lần” giải nhanh hơn bằng biến cố đối.' },
          ],
          questions: [
            mcq('q4a', 't4_1', 1, 'Gieo hai con xúc xắc có bao nhiêu kết quả đồng khả năng?', ['36', '12', '11', '6'], 0, '6 × 6 = 36.'),
            mcq('q4b', 't4_2', 1, 'P(A) = 0,3 thì P(Ā) bằng?', ['0,7', '0,3', '1,3', '0'], 0, '1 − 0,3 = 0,7.'),
            mcq('q4c', 't4_1', 1, 'Giá trị nào KHÔNG thể là một xác suất?', ['1,2', '0', '0,5', '1'], 0, 'Xác suất nằm trong [0; 1].'),
            mcq('q4d', 't4_2', 2, 'Tung đồng xu 3 lần. Cách nhanh nhất tính P(ít nhất 1 mặt sấp)?', ['1 − P(không có mặt sấp nào)', 'Cộng P từng lần', 'Nhân 3 với 1/2', 'Liệt kê không cần thiết'], 0, 'Biến cố đối “không lần nào sấp” có P = 1/8 → 7/8.', 'Từ khoá “ít nhất” gợi ý điều gì?', ['bien co doi', 'it nhat']),
            mcq('q4e', 't4_1', 2, 'Rút 1 lá từ bộ 52 lá. Xác suất rút được lá cơ?', ['1/4', '1/13', '1/52', '1/2'], 0, '13 lá cơ / 52 = 1/4.', 'Bộ bài có mấy chất, mỗi chất mấy lá?', ['13', '52']),
            mcq('q4f', 't4_1', 2, 'Vì sao “tổng hai xúc xắc” 2…12 không đồng khả năng?', ['Vì số cặp (a, b) cho mỗi tổng khác nhau', 'Vì xúc xắc không cân đối', 'Vì có 11 giá trị', 'Thực ra chúng đồng khả năng'], 0, 'Tổng 7 có 6 cặp, tổng 2 chỉ có 1 cặp.', 'Đếm số cặp cho tổng 2 và tổng 7.', ['cap', 'khac nhau']),
          ],
        },
      ],
    };
  }

  TL.data = { gens, genToMcq, demoCourse };
})(window.TL);
