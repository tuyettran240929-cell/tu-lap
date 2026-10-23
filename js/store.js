(function (TL) {
  const KEY = 'tulap.v1';
  const DEFAULT_SETTINGS = {
    quizPass: 70, practiceUnlock: 75, testPass: 70, cooldownHours: 24,
    testMinutes: 15, testCount: 6, unlockAll: false, apiKey: '', model: 'gpt-4o-mini',
  };
  let state;

  function fresh(course) {
    return { v: 1, settings: { ...DEFAULT_SETTINGS }, course: course || TL.data.demoCourse(), progress: {} };
  }
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.v !== 1 || !state.course) state = fresh();
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
    return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn(e); } }

  const chIndex = (id) => state.course.chapters.findIndex((c) => c.id === id);
  const chapter = (id) => state.course.chapters.find((c) => c.id === id);
  const baseQuota = (idx) => Math.max(5 - idx, 1);

  function prog(id) {
    if (!state.progress[id]) {
      state.progress[id] = {
        s1: { passed: false, best: null, aiUsed: 0, focus: [], chat: [] },
        s2: { aiUsed: 0, quota: baseQuota(chIndex(id)), runs: [], best: null, unlocked: false, review: null },
        s3: { attempts: [], passed: false, cooldownUntil: 0, roundFails: 0, cycles: 0 },
      };
    }
    return state.progress[id];
  }

  function unlocked(id) {
    const i = chIndex(id);
    if (i <= 0 || state.settings.unlockAll) return true;
    return prog(state.course.chapters[i - 1].id).s3.passed;
  }

  // 1 = học, 2 = luyện tập, 3 = kiểm tra, 4 = hoàn thành
  function stageOf(id) {
    const p = prog(id);
    if (p.s3.passed) return 4;
    if (!p.s1.passed) return 1;
    if (!p.s2.unlocked) return 2;
    return 3;
  }

  function aiLeft(id) {
    const p = prog(id).s2;
    if (p.review && !p.review.done) return Math.max(p.review.quota - p.review.used, 0);
    return Math.max(p.quota - p.aiUsed, 0);
  }
  function useAi(id) {
    const p = prog(id).s2;
    if (aiLeft(id) <= 0) return false;
    if (p.review && !p.review.done) p.review.used++; else p.aiUsed++;
    save();
    return true;
  }
  const aiUsedTotal = (id) => { const p = prog(id).s2; return p.aiUsed + (p.reviewUsedTotal || 0) + (p.review && !p.review.done ? p.review.used : 0); };

  function currentChapterId() {
    const chs = state.course.chapters;
    const c = chs.find((c) => !prog(c.id).s3.passed && unlocked(c.id));
    return (c || chs[chs.length - 1] || {}).id;
  }

  function replaceCourse(course) { const s = state.settings; state = fresh(course); state.settings = s; save(); }
  function resetProgress() { state.progress = {}; save(); }

  TL.store = {
    load, save, get state() { return state; }, chapter, chIndex, prog, unlocked, stageOf,
    aiLeft, useAi, aiUsedTotal, baseQuota, currentChapterId, replaceCourse, resetProgress, DEFAULT_SETTINGS,
  };
})(window.TL);
