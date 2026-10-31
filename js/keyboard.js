(function (global) {
  'use strict';
  const LAYOUT = [
    ['`','1','2','3','4','5','6','7','8','9','0','-','=','backspace'],
    ['tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['capslock','a','s','d','f','g','h','j','k','l',';','\'','enter'],
    ['shift','z','x','c','v','b','n','m',',','.','/','shift'],
    ['control','alt','space','alt','control']
  ];
  const WIDTHS = { backspace:'k2', tab:'k15', capslock:'k175', enter:'k225', shift:'k225', control:'k125', alt:'k125', space:'kspace', '\\':'k15' };
  const LABELS = { backspace:'⌫', tab:'⇥', capslock:'⇪', enter:'↵', shift:'⇧', control:'ctrl', alt:'alt', space:'space' };
  const CODE_TO_KEY = {
    Minus:'-', Equal:'=', BracketLeft:'[', BracketRight:']', Backslash:'\\',
    Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/', Backquote:'`',
    Space:'space', Enter:'enter', Backspace:'backspace', Tab:'tab',
    ShiftLeft:'shift', ShiftRight:'shift',
    ControlLeft:'control', ControlRight:'control',
    AltLeft:'alt', AltRight:'alt',
    MetaLeft:'meta', MetaRight:'meta', CapsLock:'capslock'
  };
  const keyEls = new Map();

  function build(container) {
    container.innerHTML = '';
    LAYOUT.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(id => {
        const el = document.createElement('div');
        el.className = 'key ' + (WIDTHS[id] || '');
        el.dataset.key = id;
        el.textContent = LABELS[id] || id;
        rowEl.appendChild(el);
        if (!keyEls.has(id)) keyEls.set(id, []);
        keyEls.get(id).push(el);
      });
      container.appendChild(rowEl);
    });
  }

  function codeToKeyId(code) {
    if (!code) return null;
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    return CODE_TO_KEY[code] || null;
  }

  function highlight(code) {
    const id = codeToKeyId(code);
    if (!id) return;
    const els = keyEls.get(id);
    if (!els) return;
    els.forEach(el => {
      el.classList.add('active');
      if (el._t) clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('active'), 130);
    });
  }

  global.Keyboard = { build, highlight, codeToKeyId };
})(window);