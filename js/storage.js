(function (global) {
  'use strict';
  const KEY_PREFIX = 'typeforge.profile.';
  const ACTIVE_KEY = 'typeforge.active';

  function listProfiles() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) {
        try {
          const p = JSON.parse(localStorage.getItem(k));
          if (p && p.name) {
            out.push({ name: p.name, updatedAt: p.updatedAt || '', sessions: Array.isArray(p.sessions) ? p.sessions.length : 0 });
          }
        } catch (e) {}
      }
    }
    out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return out;
  }

  function loadProfile(name) {
    try { const raw = localStorage.getItem(KEY_PREFIX + name); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function saveProfile(profile) {
    if (!profile || !profile.name) return false;
    profile.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY_PREFIX + profile.name, JSON.stringify(profile)); return true; }
    catch (e) { return false; }
  }

  function getActiveName() { return localStorage.getItem(ACTIVE_KEY) || ''; }
  function setActiveName(name) {
    if (name) localStorage.setItem(ACTIVE_KEY, name); else localStorage.removeItem(ACTIVE_KEY);
  }

  function emptyProfile(name) {
    return { name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sessions: [] };
  }

  function csvEscape(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

  function sessionsToCsv(sessions) {
    const rows = [];
    rows.push(['Timestamp', 'PracticeMode', 'Speed_WPM', 'Accuracy', 'typed_words'].map(csvEscape).join(','));
    (sessions || []).forEach(s => {
      rows.push([s.timestamp, s.modeLabel || s.mode, s.wpm, s.accuracy, s.text].map(csvEscape).join(','));
    });
    return '\uFEFF' + rows.join('\r\n');
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function stamp(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function exportCsvFile(profile) {
    download('typeforge-' + profile.name + '-' + stamp(new Date()) + '.csv',
      sessionsToCsv(profile.sessions || []), 'text/csv;charset=utf-8;');
  }

  function exportJsonFile(profile) {
    download('typeforge-' + profile.name + '-' + stamp(new Date()) + '.json',
      JSON.stringify(profile, null, 2), 'application/json');
  }

  function parseCsv(text) {
    const rows = []; let row = []; let field = ''; let inQ = false; let i = 0;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++;
      } else {
        if (c === '"') { inQ = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        field += c; i++;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function importCsv(text, fallbackName) {
    const rows = parseCsv(text);
    if (!rows.length) return null;
    const h = rows[0].map(s => s.trim().toLowerCase());
    const idx = { ts: h.indexOf('timestamp'), mode: h.indexOf('practicemode'), wpm: h.indexOf('speed_wpm'), acc: h.indexOf('accuracy'), text: h.indexOf('typed_words') };
    if (idx.ts < 0 || idx.wpm < 0) return null;
    const modeMap = { 'short words': 'short', 'academic words': 'academic', 'code mode': 'code', 'custom text': 'custom' };
    const sessions = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[idx.ts]) continue;
      const modeLabel = row[idx.mode] || 'Short Words';
      sessions.push({
        id: 'import-' + r + '-' + Date.now(),
        timestamp: row[idx.ts],
        mode: modeMap[String(modeLabel).toLowerCase()] || 'short',
        modeLabel,
        wpm: parseFloat(row[idx.wpm]) || 0,
        accuracy: parseFloat(row[idx.acc]) || 0,
        text: row[idx.text] || '',
        correctChars: 0, keystrokes: 0, correctKeystrokes: 0,
        durationSec: 60, letterStats: {}, wordStats: {}
      });
    }
    return { name: fallbackName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sessions };
  }

  function importJson(text) {
    try {
      const p = JSON.parse(text);
      if (!p || !p.name) return null;
      if (!Array.isArray(p.sessions)) p.sessions = [];
      return p;
    } catch (e) { return null; }
  }

  function importFile(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result; const name = file.name || '';
        if (/\.json$/i.test(name)) {
          const p = importJson(text);
          resolve(p ? { type: 'json', profile: p } : null);
        } else if (/\.csv$/i.test(name)) {
          const fb = name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9 _-]/g, ' ').trim() || 'Imported';
          const p = importCsv(text, fb);
          resolve(p ? { type: 'csv', profile: p } : null);
        } else resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  }

  global.Storage = {
    listProfiles, loadProfile, saveProfile, getActiveName, setActiveName,
    emptyProfile, exportCsvFile, exportJsonFile, importFile
  };
})(window);