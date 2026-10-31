(function (global) {
  'use strict';
  const PALETTE = {
    line: '#7fb3e0', lineFill: 'rgba(127, 179, 224, 0.15)',
    point: '#6ea8dc', grid: 'rgba(148, 163, 184, 0.08)',
    tick: '#7e8b9c', good: '#6fc39a', bad: '#d98080'
  };
  const commonScales = {
    x: { grid: { color: PALETTE.grid, drawTicks: false }, border: { display: false }, ticks: { color: PALETTE.tick, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 } },
    y: { grid: { color: PALETTE.grid, drawTicks: false }, border: { display: false }, ticks: { color: PALETTE.tick, font: { size: 11 }, padding: 8 }, beginAtZero: true }
  };
  const commonPlugins = {
    legend: { display: false },
    tooltip: { backgroundColor: '#2b323d', borderColor: '#3a4350', borderWidth: 1, titleColor: '#b9d6ef', bodyColor: '#d8dfe8', padding: 10, displayColors: false }
  };
  let live = null, run = null, radar = null, letters = null;

  function setEmpty(el, show) { if (el) el.style.display = show ? 'grid' : 'none'; }

  function initLive(ctx, emptyEl) {
    if (live) { live.destroy(); live = null; }
    if (typeof Chart === 'undefined') return;
    live = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ data: [], borderColor: PALETTE.line, backgroundColor: PALETTE.lineFill, borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { ...commonPlugins, tooltip: { ...commonPlugins.tooltip, callbacks: { label: it => it.parsed.y.toFixed(0) + ' WPM' } } },
        scales: {
          x: { ...commonScales.x, title: { display: true, text: 'Seconds', color: PALETTE.tick, font: { size: 10 } } },
          y: { ...commonScales.y, title: { display: true, text: 'WPM', color: PALETTE.tick, font: { size: 10 } } }
        }
      }
    });
    setEmpty(emptyEl, true);
  }

  function pushLive(elapsedSec, wpm) {
    if (!live) return;
    live.data.labels.push(elapsedSec.toFixed(1));
    live.data.datasets[0].data.push(wpm);
    live.update('none');
  }

  function resetLive() {
    if (!live) return;
    live.data.labels = [];
    live.data.datasets[0].data = [];
    live.update('none');
    setEmpty(document.getElementById('liveEmpty'), true);
  }

  function initRun(ctx, emptyEl) {
    if (run) { run.destroy(); run = null; }
    if (typeof Chart === 'undefined') return;
    run = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ data: [], borderColor: PALETTE.line, backgroundColor: PALETTE.lineFill, borderWidth: 2, pointBackgroundColor: PALETTE.point, pointBorderColor: '#a3c9ea', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, tension: 0.3, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { ...commonPlugins, tooltip: { ...commonPlugins.tooltip, callbacks: { label: it => it.parsed.y + ' WPM' } } }, scales: commonScales }
    });
    setEmpty(emptyEl, true);
  }

  function setRunData(points, emptyEl) {
    if (!run) return;
    run.data.labels = points.map(p => p.label);
    run.data.datasets[0].data = points.map(p => p.value);
    run.update();
    setEmpty(emptyEl, points.length === 0);
  }

  function initRadar(ctx, emptyEl) {
    if (radar) { radar.destroy(); radar = null; }
    if (typeof Chart === 'undefined') return;
    radar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Speed', 'Accuracy', 'Consistency', 'Growth', 'Precision', 'Stamina'],
        datasets: [{ data: [0,0,0,0,0,0], borderColor: PALETTE.line, backgroundColor: 'rgba(127, 179, 224, 0.2)', pointBackgroundColor: PALETTE.point, pointBorderColor: '#a3c9ea', pointRadius: 4, borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { ...commonPlugins, tooltip: { ...commonPlugins.tooltip, callbacks: { label: it => it.label + ': ' + Math.round(it.parsed.r) } } },
        scales: { r: { beginAtZero: true, min: 0, max: 100, grid: { color: PALETTE.grid }, angleLines: { color: PALETTE.grid }, pointLabels: { color: '#b9d6ef', font: { size: 12, weight: '600' } }, ticks: { display: false, stepSize: 20 } } }
      }
    });
    setEmpty(emptyEl, true);
  }

  function setRadarData(values, emptyEl) {
    if (!radar) return;
    radar.data.datasets[0].data = values;
    radar.update();
    setEmpty(emptyEl, values.every(v => v === 0));
  }

  function initLetters(ctx, emptyEl) {
    if (letters) { letters.destroy(); letters = null; }
    if (typeof Chart === 'undefined') return;
    letters = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: PALETTE.line, borderRadius: 4, maxBarThickness: 22 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { ...commonPlugins, tooltip: { ...commonPlugins.tooltip, callbacks: { label: it => it.parsed.y.toFixed(1) + '%' } } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: PALETTE.tick, font: { size: 10 }, autoSkip: false } },
          y: { ...commonScales.y, max: 100, title: { display: true, text: 'Accuracy %', color: PALETTE.tick, font: { size: 10 } } }
        }
      }
    });
    setEmpty(emptyEl, true);
  }

  function setLettersData(data, emptyEl) {
    if (!letters) return;
    letters.data.labels = data.map(d => d.ch);
    letters.data.datasets[0].data = data.map(d => d.acc);
    letters.data.datasets[0].backgroundColor = data.map(d => d.acc >= 90 ? PALETTE.good : (d.acc < 75 ? PALETTE.bad : PALETTE.line));
    letters.update();
    setEmpty(emptyEl, data.length === 0);
  }

  global.Charts = { initLive, pushLive, resetLive, initRun, setRunData, initRadar, setRadarData, initLetters, setLettersData };
})(window);