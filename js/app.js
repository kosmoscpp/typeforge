(function (global) {
  'use strict';

  let profile = null;
  let pendingCustomText = '';
  const dom = {};

  function $(id) { return document.getElementById(id); }

  /* =====================================================================
     BOOT
     ===================================================================== */
  function boot() {
    dom.textDisplay = $('textDisplay');
    dom.wpm = $('wpm'); dom.acc = $('acc'); dom.time = $('time'); dom.timeBar = $('timeBar');
    dom.runs = $('runs'); dom.modeBadge = $('modeBadge'); dom.hint = $('statusHint');
    dom.historyBody = $('historyBody');
    dom.profileModal = $('profileModal'); dom.profileNameInput = $('profileNameInput');
    dom.profileSelect = $('profileSelect'); dom.profileNote = $('profileNote');
    dom.profileChip = $('profileChip'); dom.profileName = $('profileName');
    dom.customModal = $('customModal'); dom.customTextarea = $('customTextarea');
    dom.fileInput = $('fileInput');
    dom.liveEmpty = $('liveEmpty'); dom.runEmpty = $('runEmpty');
    dom.keyboard = $('keyboard');

    global.Keyboard.build(dom.keyboard);
    global.Charts.initLive($('liveChart'), dom.liveEmpty);
    global.Charts.initRun($('runChart'), dom.runEmpty);
    global.Charts.initRadar($('radarChart'), $('radarEmpty'));
    global.Charts.initLetters($('letterChart'), $('letterEmpty'));

    global.Typing.init({
      display: dom.textDisplay, wpm: dom.wpm, acc: dom.acc,
      time: dom.time, timeBar: dom.timeBar,
      badge: dom.modeBadge, hint: dom.hint
    }, { onFinish: handleRunFinish, onTick: handleLiveTick });

    global.Typing.setEnabled(false);
    wireEvents();
    refreshProfileList();

    const active = global.Storage.getActiveName();
    if (active) {
      const p = global.Storage.loadProfile(active);
      if (p) { activateProfile(p); return; }
    }
    openProfileModal();
  }

  /* =====================================================================
     EVENT WIRING
     ===================================================================== */
  function wireEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
        $('viewPractice').classList.toggle('hidden', view !== 'practice');
        $('viewAnalytics').classList.toggle('hidden', view !== 'analytics');
        if (view === 'analytics' && profile) {
          const activeScope = document.querySelector('#analyticsTabs .mode-btn.active');
          global.Analytics.render(profile, activeScope ? activeScope.dataset.scope : 'overall');
        }
      });
    });

    document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === 'custom') { openCustomModal(); return; }
        document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        setMode(mode);
      });
    });

    document.querySelectorAll('#analyticsTabs .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#analyticsTabs .mode-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        if (profile) global.Analytics.render(profile, btn.dataset.scope);
      });
    });

    $('restartBtn').addEventListener('click', () => {
      global.Typing.reset();
      global.Charts.resetLive();
    });

    $('exportBtn').addEventListener('click', () => { if (profile) global.Storage.exportCsvFile(profile); });
    $('exportCsvBtn').addEventListener('click', () => { if (profile) global.Storage.exportCsvFile(profile); });
    $('saveJsonBtn').addEventListener('click', () => {
      if (profile) { global.Storage.saveProfile(profile); global.Storage.exportJsonFile(profile); }
    });
    $('switchProfileBtn').addEventListener('click', openProfileModal);

    $('continueBtn').addEventListener('click', handleContinue);
    $('loadFilesBtn').addEventListener('click', () => dom.fileInput.click());
    $('scanFolderBtn').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.webkitdirectory = true;
      inp.multiple = true;
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', () => { handleFiles(inp.files); document.body.removeChild(inp); });
      inp.click();
    });
    dom.fileInput.addEventListener('change', () => handleFiles(dom.fileInput.files));

    dom.profileSelect.addEventListener('change', () => {
      const val = dom.profileSelect.value;
      if (val === '__new__') {
        dom.profileNameInput.value = '';
        dom.profileNameInput.focus();
        dom.profileNote.textContent = '';
      } else if (val) {
        dom.profileNameInput.value = val;
        const p = global.Storage.loadProfile(val);
        if (p) dom.profileNote.textContent = 'Loaded save · ' + p.sessions.length + ' run' + (p.sessions.length === 1 ? '' : 's');
      }
    });

    dom.profileNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleContinue(); }
    });

    $('customCancel').addEventListener('click', closeCustomModal);
    $('customUse').addEventListener('click', useCustomText);

    dom.customModal.addEventListener('click', e => { if (e.target === dom.customModal) closeCustomModal(); });
    dom.profileModal.addEventListener('click', e => { if (e.target === dom.profileModal && profile) closeProfileModal(); });

    document.addEventListener('keydown', e => {
      if (dom.profileModal.classList.contains('open')) return;
      if (dom.customModal.classList.contains('open')) return;
      global.Typing.handleKeydown(e);
    });

    dom.textDisplay.addEventListener('mousedown', e => e.preventDefault());
  }

  /* =====================================================================
     PROFILE HANDLING
     ===================================================================== */
  function activateProfile(p) {
    profile = p;
    global.Storage.setActiveName(p.name);
    global.Storage.saveProfile(p);
    dom.profileName.textContent = p.name;
    dom.runs.textContent = String(p.sessions.length);
    renderHistory();
    renderRunChart();
    closeProfileModal();
    global.Typing.setEnabled(true);

    // Ensure practice text exists if profile was fresh
    if (!global.Typing.state.text) {
      setMode(global.Typing.state.mode || 'short');
    } else {
      global.Typing.reset();
    }
    global.Charts.resetLive();
    dom.textDisplay.focus();
  }

  function closeProfileModal() {
    dom.profileModal.classList.remove('open');
    global.Typing.setEnabled(!dom.customModal.classList.contains('open'));
  }

  function handleContinue() {
    let name = dom.profileNameInput.value.trim();
    if (!name) {
      // If a save is selected in dropdown, use that
      const sel = dom.profileSelect.value;
      if (sel && sel !== '__new__') name = sel;
    }
    if (!name) {
      dom.profileNote.textContent = 'Please enter a name or pick an existing save.';
      return;
    }
    name = name.replace(/[<>\/\\]/g, '').slice(0, 40);

    let p = global.Storage.loadProfile(name);
    if (!p) {
      p = global.Storage.emptyProfile(name);
      dom.profileNote.textContent = 'Created new profile: ' + name;
    } else {
      dom.profileNote.textContent = 'Resumed ' + name + ' · ' + p.sessions.length + ' run(s)';
    }
    activateProfile(p);
  }

  async function handleFiles(fileList) {
    if (!fileList || !fileList.length) return;
    let loaded = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!/\.(csv|json)$/i.test(file.name)) continue;
      const parsed = await global.Storage.importFile(file);
      if (!parsed) continue;
      loaded++;
      const p = parsed.profile;
      // Merge into existing profile if same name
      const existing = global.Storage.loadProfile(p.name);
      if (existing) {
        if (parsed.type === 'json' && parsed.profile.sessions) {
          const seen = new Set(existing.sessions.map(s => s.id || s.timestamp + '|' + s.text.slice(0, 20)));
          parsed.profile.sessions.forEach(s => {
            const key = s.id || s.timestamp + '|' + (s.text || '').slice(0, 20);
            if (!seen.has(key)) existing.sessions.push(s);
          });
        } else if (parsed.type === 'csv' && parsed.profile.sessions) {
          existing.sessions.push(...parsed.profile.sessions);
        }
        existing.updatedAt = new Date().toISOString();
        global.Storage.saveProfile(existing);
        dom.profileNote.textContent = 'Merged ' + file.name + ' into ' + existing.name;
      } else {
        global.Storage.saveProfile(p);
        dom.profileNote.textContent = 'Imported ' + file.name + ' as ' + p.name;
      }
    }
    if (!loaded) {
      dom.profileNote.textContent = 'No valid .csv or .json saves found in selection.';
    }
    refreshProfileList();
  }

  function refreshProfileList() {
    const list = global.Storage.listProfiles();
    dom.profileSelect.innerHTML = '';
    const optNew = document.createElement('option');
    optNew.value = '__new__'; optNew.textContent = '— New profile —';
    dom.profileSelect.appendChild(optNew);
    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name + ' (' + p.sessions + ' run' + (p.sessions === 1 ? '' : 's') + ')';
      dom.profileSelect.appendChild(opt);
    });
    const active = global.Storage.getActiveName();
    if (active) dom.profileSelect.value = active;
  }

  /* =====================================================================
     MODE / CUSTOM TEXT
     ===================================================================== */
  function setMode(mode) {
    global.Typing.setMode(mode);
    global.Typing.setText(global.WORDS.generate(mode, ''));
    global.Typing.reset();
    global.Charts.resetLive();
    dom.modeBadge.textContent = global.WORDS.labels[mode] || mode;
  }

  function openCustomModal() {
    // Keep visual tab state on current mode unless user confirms
    document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === global.Typing.state.mode);
    });
    dom.customTextarea.value = pendingCustomText || global.Typing.state.text || '';
    dom.customModal.classList.add('open');
    global.Typing.setEnabled(false);
    setTimeout(() => { dom.customTextarea.focus(); dom.customTextarea.select(); }, 30);
  }

  function closeCustomModal() {
    dom.customModal.classList.remove('open');
    global.Typing.setEnabled(!dom.profileModal.classList.contains('open'));
  }

  function useCustomText() {
    const raw = dom.customTextarea.value;
    const text = global.WORDS.normalizeWhitespace(raw);
    if (text.length < 10) { alert('Please enter at least 10 characters of text.'); return; }
    pendingCustomText = raw;

    document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
      const on = b.dataset.mode === 'custom';
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    global.Typing.setMode('custom');
    global.Typing.setText(text);
    global.Typing.reset();
    global.Charts.resetLive();
    dom.modeBadge.textContent = 'Custom Text';
    closeCustomModal();
    dom.textDisplay.focus();
  }

  /* =====================================================================
     RUN LIFECYCLE HOOKS
     ===================================================================== */
  function handleLiveTick(data) {
    if (data.reset) { global.Charts.resetLive(); return; }
    global.Charts.pushLive(data.t, data.wpm);
    if (dom.liveEmpty) dom.liveEmpty.style.display = 'none';
  }

  function handleRunFinish(result) {
    if (!profile) return;
    profile.sessions.push(result);
    global.Storage.saveProfile(profile);
    dom.runs.textContent = String(profile.sessions.length);
    renderHistory();
    renderRunChart();
    // If analytics visible, refresh it live
    if (!$('viewAnalytics').classList.contains('hidden')) {
      const activeScope = document.querySelector('#analyticsTabs .mode-btn.active');
      global.Analytics.render(profile, activeScope ? activeScope.dataset.scope : 'overall');
    }
  }

  /* =====================================================================
     RENDERING: RUN CHART + HISTORY
     ===================================================================== */
  function renderRunChart() {
    if (!profile) return;
    const points = profile.sessions.map((s, i) => ({ label: 'Run ' + (i + 1), value: s.wpm }));
    global.Charts.setRunData(points, dom.runEmpty);
  }

  function renderHistory() {
    dom.historyBody.innerHTML = '';
    if (!profile || !profile.sessions.length) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      const tdEl = document.createElement('td');
      tdEl.colSpan = 6;
      tdEl.textContent = 'No runs yet — finish a 60-second test to log it here.';
      tr.appendChild(tdEl);
      dom.historyBody.appendChild(tr);
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = profile.sessions.length - 1; i >= 0; i--) {
      const s = profile.sessions[i];
      const tr = document.createElement('tr');
      tr.appendChild(td(String(i + 1), 'num'));
      tr.appendChild(td(s.timestamp, 'ts'));

      const tdMode = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = s.modeLabel || s.mode;
      tdMode.appendChild(tag);
      tr.appendChild(tdMode);

      tr.appendChild(td(s.wpm, 'num strong'));
      tr.appendChild(td(s.accuracy + '%', 'num'));

      const tdText = td(s.text, 'txt');
      tdText.title = s.text;
      tr.appendChild(tdText);
      frag.appendChild(tr);
    }
    dom.historyBody.appendChild(frag);
  }

  function td(text, cls) {
    const el = document.createElement('td');
    if (cls) el.className = cls;
    el.textContent = String(text == null ? '' : text);
    return el;
  }

  /* =====================================================================
     GO
     ===================================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);