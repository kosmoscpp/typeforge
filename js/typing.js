(function (global) {
  'use strict';
  const RUN_SECONDS = 60;
  const TICK_MS = 200;

  const state = {
    mode: 'short', text: '', index: 0, correctCount: 0,
    typed: [], started: false, running: false, finished: false,
    startTime: 0, timeLeft: RUN_SECONDS, timerId: null, liveTickId: null,
    finalWpm: 0, finalAccuracy: 0, liveSamples: [], lastLiveT: -1, enabled: true
  };

  const el = { display: null, wpm: null, acc: null, time: null, timeBar: null, badge: null, hint: null };
  let charEls = [];
  let onFinishCb = null, onTickCb = null;

  function init(domRefs, callbacks) {
    el.display = domRefs.display; el.wpm = domRefs.wpm; el.acc = domRefs.acc;
    el.time = domRefs.time; el.timeBar = domRefs.timeBar;
    el.badge = domRefs.badge; el.hint = domRefs.hint;
    onFinishCb = callbacks.onFinish || null;
    onTickCb = callbacks.onTick || null;
  }

  function setMode(mode) { state.mode = mode; }
  function setText(text) { state.text = text || ''; }
  function setEnabled(v) { state.enabled = !!v; }

  function setHint(msg) { if (el.hint) el.hint.textContent = msg; }

  function reset(newText) {
    stopTimer();
    if (typeof newText === 'string' && newText.length) state.text = newText;
    state.index = 0; state.correctCount = 0; state.typed = [];
    state.started = false; state.running = false; state.finished = false;
    state.startTime = 0; state.timeLeft = RUN_SECONDS;
    state.finalWpm = 0; state.finalAccuracy = 0;
    state.liveSamples = []; state.lastLiveT = -1;

    renderText(); renderStats(); renderTimer();
    setHint('Start typing to begin the 60-second test');
    if (el.badge) el.badge.textContent = global.WORDS.labels[state.mode] || state.mode;
    if (onTickCb) onTickCb({ reset: true });
  }

  function renderText() {
    el.display.innerHTML = ''; charEls = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < state.text.length; i++) {
      const span = document.createElement('span');
      span.className = 'ch'; span.textContent = state.text[i];
      frag.appendChild(span); charEls.push(span);
    }
    el.display.appendChild(frag);
    el.display.scrollTop = 0;
    if (charEls.length) charEls[0].classList.add('active');
  }

  function renderStats() {
    if (state.finished) {
      el.wpm.textContent = String(Math.round(state.finalWpm));
      el.acc.textContent = Math.round(state.finalAccuracy) + '%';
      return;
    }
    let w = 0;
    if (state.started) {
      const elapsed = Math.max((performance.now() - state.startTime), 1);
      w = global.Stats.wpm(state.correctCount, elapsed);
    }
    el.wpm.textContent = String(Math.round(w));
    if (state.typed.length === 0) el.acc.textContent = '\u2014';
    else {
      const correct = state.typed.filter(t => t.correct).length;
      el.acc.textContent = Math.round((correct / state.typed.length) * 100) + '%';
    }
  }

  function renderTimer() {
    el.time.textContent = state.timeLeft.toFixed(1);
    el.timeBar.style.width = Math.max(0, Math.min(100, (state.timeLeft / RUN_SECONDS) * 100)) + '%';
  }

  function currentWpm() {
    if (!state.started) return 0;
    const elapsed = Math.max((performance.now() - state.startTime), 1);
    return global.Stats.wpm(state.correctCount, elapsed);
  }

  function startTimer() {
    stopTimer();
    state.timerId = setInterval(() => {
      const elapsed = (performance.now() - state.startTime) / 1000;
      state.timeLeft = Math.max(0, RUN_SECONDS - elapsed);
      renderTimer(); renderStats();
      if (state.timeLeft <= 0) finish();
    }, 100);

    state.liveTickId = setInterval(() => {
      if (!state.running) return;
      const elapsed = (performance.now() - state.startTime) / 1000;
      if (elapsed - state.lastLiveT >= 0.4) {
        state.lastLiveT = elapsed;
        const w = currentWpm();
        state.liveSamples.push({ t: elapsed, wpm: w });
        if (onTickCb) onTickCb({ t: elapsed, wpm: w });
      }
    }, TICK_MS);
  }

  function stopTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (state.liveTickId) { clearInterval(state.liveTickId); state.liveTickId = null; }
  }

  function begin() {
    state.started = true; state.running = true;
    state.startTime = performance.now();
    setHint('Running — keep your eyes on the screen');
    startTimer();
  }

  function finish() {
    if (!state.running) return;
    stopTimer();
    state.running = false; state.finished = true; state.timeLeft = 0;
    const minutes = RUN_SECONDS / 60;
    state.finalWpm = (state.correctCount / 5) / minutes;
    const correct = state.typed.filter(t => t.correct).length;
    state.finalAccuracy = state.typed.length ? (correct / state.typed.length) * 100 : 0;
    renderTimer(); renderStats();
    setHint('Run complete — press any key to start the next 60s run');
    if (onFinishCb) onFinishCb(buildResult());
  }

  function ensureVisible() {
    if (!charEls.length) return;
    const idx = Math.min(state.index, charEls.length - 1);
    const node = charEls[idx]; if (!node) return;
    const lh = node.offsetHeight || 44;
    const viewH = el.display.clientHeight;
    const top = node.offsetTop;
    const target = Math.max(0, top - viewH / 2 + lh / 2);
    if (Math.abs(el.display.scrollTop - target) > lh / 2) el.display.scrollTop = target;
  }

  function typeChar(ch) {
    if (state.finished) reset();
    if (!state.started) begin();
    if (state.index >= state.text.length) return;
    const expected = state.text[state.index];
    const node = charEls[state.index];
    const correct = ch === expected;
    state.typed.push({ char: ch, expected, correct });
    if (correct) state.correctCount++;
    node.classList.remove('active');
    node.classList.add(correct ? 'correct' : 'incorrect');
    state.index++;
    if (state.index < charEls.length) charEls[state.index].classList.add('active');
    ensureVisible(); renderStats();
  }

  function backspace() {
    if (state.finished) return;
    if (state.index === 0) return;
    state.index--;
    const removed = state.typed.pop();
    if (removed && removed.correct) state.correctCount--;
    const node = charEls[state.index];
    node.classList.remove('correct', 'incorrect', 'active');
    if (charEls[state.index + 1]) charEls[state.index + 1].classList.remove('active');
    node.classList.add('active');
    ensureVisible(); renderStats();
  }

  function buildResult() {
    const letterStats = {}, wordStats = {};
    let curWord = [];
    function flushWord() {
      if (curWord.length < 2) { curWord = []; return; }
      let correct = 0;
      curWord.forEach(c => { if (c.correct) correct++; });
      const key = curWord.map(c => c.expected).join('').toLowerCase();
      if (!wordStats[key]) wordStats[key] = { correct: 0, total: 0 };
      wordStats[key].correct += correct;
      wordStats[key].total += curWord.length;
      curWord = [];
    }
    state.typed.forEach(t => {
      const exp = t.expected.toLowerCase();
      if (/[a-z0-9]/.test(exp)) {
        if (!letterStats[exp]) letterStats[exp] = { correct: 0, total: 0 };
        letterStats[exp].total++;
        if (t.correct) letterStats[exp].correct++;
      }
      if (exp === ' ') flushWord();
      else curWord.push({ expected: t.expected, correct: t.correct });
    });
    flushWord();
    return {
      id: 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      timestamp: formatTimestamp(new Date()),
      mode: state.mode,
      modeLabel: global.WORDS.labels[state.mode] || state.mode,
      wpm: Math.round(state.finalWpm * 10) / 10,
      accuracy: Math.round(state.finalAccuracy * 10) / 10,
      text: state.text,
      correctChars: state.correctCount,
      keystrokes: state.typed.length,
      correctKeystrokes: state.typed.filter(t => t.correct).length,
      durationSec: RUN_SECONDS, letterStats, wordStats,
      liveSamples: state.liveSamples.slice()
    };
  }

  function formatTimestamp(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function handleKeydown(e) {
    if (!state.enabled) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    global.Keyboard.highlight(e.code);
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); return; }
    if (e.key.length !== 1) return;
    e.preventDefault();
    typeChar(e.key);
  }

  global.Typing = { init, setMode, setText, setEnabled, reset, handleKeydown, state, getResult: buildResult };
})(window);