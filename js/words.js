(function (global) {
  'use strict';
  const SHORT = "the and for are but not you all any can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use that with have this will your from they know want been good much some time very when come here just like make many more only over such take than them well were what work down find give most tell back call came each even feel help into life live long look need next open part play right seem show side soon sure talk turn used wait week went word year also after again about other first great house small still night three water where which write world".split(/\s+/).filter(Boolean);

  const ACADEMIC = "analysis approach concept context derived emphasis framework hypothesis implement indicate interpret methodology objective paradigm parameter perspective phenomenon principle procedure qualitative quantitative rationale research significant strategy structure subsequent synthesis theoretical validate variable abstract coherent correlate deduce empirical evaluate evidence function integrate logic matrix mechanism notion perceive postulate precise publish relevant resolve scope sequence survey theory thesis transition underlying verify cognition discourse dynamic element formulate inference intrinsic mediate offset prestige robust sector sustain".split(/\s+/).filter(Boolean);

  const CODE = [
    'const x = 42;', 'let arr = [1, 2, 3];', 'if (a > b) {', 'return arr.map(fn);',
    'function foo(a, b) {', 'class Node {', 'this.value = val;', 'obj[key] = value;',
    'const { a, b } = obj;', 'export default App;', 'await fetch(url);', 'console.log(x);',
    "import React from 'react';", 'arr.filter(x => x > 0);', 'while (i < 10) i++;',
    'if (!flag) return null;', 'const sum = a + b;', 'new Promise((res) => {',
    'let total = items.length;', 'for (let i = 0; i < n; i++) {',
    "document.querySelector('#app');", '<div class="card"></div>', "case 'value': break;",
    'const fn = (a) => a * 2;', 'try { run(); } catch (e) {', 'let i = 0;',
    'return this.items;', 'async function load() {', 'const cfg = JSON.parse(raw);',
    'export const PI = 3.14;', 'if (arr.length === 0) return;'
  ];

  const TARGET_LEN = 320;

  function shuffle(a) {
    const c = a.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  }

  function fromWords(list) {
    const out = []; let len = 0; let pool = shuffle(list); let i = 0;
    while (len < TARGET_LEN) {
      if (i >= pool.length) { pool = shuffle(list); i = 0; }
      const w = pool[i++]; out.push(w); len += w.length + 1;
    }
    return out.join(' ');
  }

  function fromCode() {
    const out = []; let len = 0; let pool = shuffle(CODE); let i = 0;
    while (len < TARGET_LEN) {
      if (i >= pool.length) { pool = shuffle(CODE); i = 0; }
      const s = pool[i++]; out.push(s); len += s.length + 1;
    }
    return out.join(' ');
  }

  function normalizeWhitespace(t) {
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  function generate(mode, customText) {
    if (mode === 'custom') return normalizeWhitespace(customText || '');
    if (mode === 'code') return fromCode();
    if (mode === 'academic') return fromWords(ACADEMIC);
    return fromWords(SHORT);
  }

  global.WORDS = {
    short: SHORT, academic: ACADEMIC, code: CODE,
    labels: { short: 'Short Words', academic: 'Academic Words', code: 'Code Mode', custom: 'Custom Text' },
    generate, normalizeWhitespace
  };
})(window);