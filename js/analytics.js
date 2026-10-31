(function (global) {
  'use strict';

  function filterSessions(profile, scope) {
    const all = (profile && profile.sessions) || [];
    if (scope === 'overall') return all;
    return all.filter(s => s.mode === scope);
  }

  function computeRadar(sessions) {
    if (!sessions.length) return [0, 0, 0, 0, 0, 0];
    const wpmList = sessions.map(s => s.wpm || 0);
    const avgWpm = global.Stats.mean(wpmList);
    const speed = Math.min(100, (avgWpm / 100) * 100);
    const accList = sessions.map(s => s.accuracy || 0);
    const accuracy = global.Stats.mean(accList);
    const sd = global.Stats.stdev(wpmList);
    const cv = avgWpm > 0 ? sd / avgWpm : 1;
    const consistency = Math.max(0, Math.min(100, 100 - cv * 100));
    const xs = sessions.map((_, i) => i + 1);
    const sl = global.Stats.slope(xs, wpmList);
    const growth = Math.max(0, Math.min(100, 50 + sl * (50 / 3)));
    const agg = global.Stats.aggregateLetters(sessions);
    let lc = 0, lt = 0;
    Object.values(agg).forEach(v => { lc += v.correct; lt += v.total; });
    const precision = lt ? (lc / lt) * 100 : accuracy;
    const stamina = Math.min(100, (sessions.length / 20) * 100);
    return [speed, accuracy, consistency, growth, precision, stamina].map(v => Math.max(0, Math.min(100, v)));
  }

  function renderRadar(profile, scope) {
    const sessions = filterSessions(profile, scope);
    global.Charts.setRadarData(computeRadar(sessions), document.getElementById('radarEmpty'));
  }

  function renderLetters(profile, scope) {
    const sessions = filterSessions(profile, scope);
    const agg = global.Stats.aggregateLetters(sessions);
    const data = Object.keys(agg)
      .map(ch => ({ ch: ch.toUpperCase(), acc: agg[ch].total ? (agg[ch].correct / agg[ch].total) * 100 : 0, total: agg[ch].total }))
      .filter(d => d.total >= 1)
      .sort((a, b) => a.ch.localeCompare(b.ch));
    global.Charts.setLettersData(data, document.getElementById('letterEmpty'));
  }

  function renderWords(profile, scope) {
    const sessions = filterSessions(profile, scope);
    const agg = global.Stats.aggregateWords(sessions);
    const items = Object.keys(agg).map(w => ({
      word: w, acc: agg[w].total ? (agg[w].correct / agg[w].total) * 100 : 0, total: agg[w].total
    })).filter(i => i.total >= 2);
    const strong = items.slice().sort((a, b) => b.acc - a.acc || b.total - a.total).slice(0, 6);
    const weak = items.slice().sort((a, b) => a.acc - b.acc || b.total - a.total).slice(0, 6);
    renderList('strongWords', strong, v => v.acc >= 90 ? '#6fc39a' : '#7fb3e0');
    renderList('weakWords', weak, v => v.acc < 75 ? '#d98080' : '#7fb3e0');
  }

  function renderLettersLists(profile, scope) {
    const sessions = filterSessions(profile, scope);
    const agg = global.Stats.aggregateLetters(sessions);
    const items = Object.keys(agg).map(ch => ({
      word: ch.toUpperCase(), acc: agg[ch].total ? (agg[ch].correct / agg[ch].total) * 100 : 0, total: agg[ch].total
    })).filter(i => i.total >= 1);
    const strong = items.slice().sort((a, b) => b.acc - a.acc).slice(0, 6);
    const weak = items.slice().sort((a, b) => a.acc - b.acc).slice(0, 6);
    renderList('strongLetters', strong, v => v.acc >= 90 ? '#6fc39a' : '#7fb3e0');
    renderList('weakLetters', weak, v => v.acc < 75 ? '#d98080' : '#7fb3e0');
  }

  function renderList(elId, items, colorFn) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'empty-li'; li.textContent = 'No data yet';
      el.appendChild(li); return;
    }
    items.forEach(it => {
      const li = document.createElement('li');
      const token = document.createElement('span');
      token.className = 'token'; token.textContent = it.word;
      const meta = document.createElement('span');
      meta.className = 'meta';
      const bar = document.createElement('span');
      bar.className = 'mini-bar';
      const fill = document.createElement('i');
      fill.style.width = Math.max(2, Math.min(100, it.acc)) + '%';
      fill.style.background = colorFn(it);
      bar.appendChild(fill);
      const metric = document.createElement('span');
      metric.className = 'metric'; metric.textContent = it.acc.toFixed(0) + '%';
      meta.appendChild(bar); meta.appendChild(metric);
      li.appendChild(token); li.appendChild(meta);
      el.appendChild(li);
    });
  }

  function render(profile, scope) {
    renderRadar(profile, scope);
    renderLetters(profile, scope);
    renderWords(profile, scope);
    renderLettersLists(profile, scope);
    const hint = document.getElementById('analyticsHint');
    if (hint) {
      const sessions = filterSessions(profile, scope);
      const label = scope === 'overall' ? 'Overall' : ({ short: 'Short Burst', academic: 'Academic', code: 'Code' }[scope] || scope);
      hint.textContent = label + ' · ' + sessions.length + ' run' + (sessions.length === 1 ? '' : 's');
    }
  }

  global.Analytics = { render };
})(window);
