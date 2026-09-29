import SpeedTest from '@cloudflare/speedtest';

// Same ramp-up as speed.cloudflare.com, minus packet loss (needs a TURN
// server) and capped at the worker's 100 MB maximum response size.
const MEASUREMENTS = [
  { type: 'latency', numPackets: 1 },
  { type: 'download', bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: 'latency', numPackets: 20 },
  { type: 'download', bytes: 1e5, count: 9 },
  { type: 'download', bytes: 1e6, count: 8 },
  { type: 'upload', bytes: 1e5, count: 8 },
  { type: 'upload', bytes: 1e6, count: 6 },
  { type: 'download', bytes: 1e7, count: 6 },
  { type: 'upload', bytes: 1e7, count: 4 },
  { type: 'download', bytes: 2.5e7, count: 4 },
  { type: 'upload', bytes: 2.5e7, count: 4 },
  { type: 'download', bytes: 1e8, count: 5 },
  { type: 'upload', bytes: 5e7, count: 3 },
  { type: 'upload', bytes: 1e8, count: 3 }
];

const engine = new SpeedTest({
  autoStart: false,
  downloadApiUrl: `${location.origin}/down`,
  uploadApiUrl: `${location.origin}/up`,
  // Keep results local: never report them to Cloudflare
  logMeasurementApiUrl: null,
  logAimApiUrl: null,
  measurements: MEASUREMENTS
});

const $ = id => document.getElementById(id);

const PHASES = {
  latency: 'Measuring latency…',
  download: 'Measuring download…',
  upload: 'Measuring upload…'
};

const SCORES = [
  ['streaming', 'Video streaming'],
  ['gaming', 'Online gaming'],
  ['rtc', 'Video chatting']
];

const safe = fn => {
  try {
    return fn();
  } catch (e) {
    return undefined;
  }
};

const fmtSpeed = bps => {
  if (!bps) return ['–', 'Mbps'];
  if (bps >= 1e9) return [(bps / 1e9).toFixed(2), 'Gbps'];
  const mbps = bps / 1e6;
  return [mbps.toFixed(mbps < 10 ? 2 : mbps < 100 ? 1 : 0), 'Mbps'];
};
const fmtMbps = mbps =>
  mbps.toLocaleString(undefined, { maximumFractionDigits: mbps < 10 ? 2 : mbps < 100 ? 1 : 0 });
const fmtMs = ms => (typeof ms !== 'number' || isNaN(ms) ? '–' : ms < 10 ? ms.toFixed(1) : Math.round(ms).toString());
const fmtBytes = b => (b >= 1e6 ? `${b / 1e6} MB` : `${b / 1e3} kB`);
const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const niceMax = max => {
  if (!(max > 0)) return { max: 1, step: 0.25 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw);
  return { max: step * Math.ceil(max / step), step };
};

// Horizontal dot-strip chart: one row per category, one dot per measurement
function dotStrip(el, { title, unit, rows, marker, fmt, tableHead }) {
  const hasData = rows.some(r => r.points.length);
  if (!hasData) {
    el.innerHTML = `<h2>${esc(title)}</h2><div class="empty">No measurements yet</div>`;
    return;
  }

  const W = 480;
  const L = 132;
  const R = 16;
  const T = marker ? 22 : 8;
  const rowH = 34;
  const B = 30;
  const H = T + rows.length * rowH + B;
  const { max, step } = niceMax(Math.max(...rows.flatMap(r => r.points.map(p => p.v))));
  const x = v => L + (v / max) * (W - L - R);

  let svg = '';
  for (let t = 0; t <= max + step / 2; t += step) {
    svg += `<line x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${T + rows.length * rowH}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${x(t)}" y="${T + rows.length * rowH + 16}" text-anchor="middle" font-size="11" fill="var(--text-muted)" style="font-variant-numeric: tabular-nums">${fmt(t)}</text>`;
  }
  svg += `<text x="${W - R}" y="${H - 1}" text-anchor="end" font-size="11" fill="var(--text-muted)">${esc(unit)}</text>`;
  svg += `<line x1="${L}" x2="${L}" y1="${T}" y2="${T + rows.length * rowH}" stroke="var(--axis)" stroke-width="1"/>`;

  rows.forEach((row, i) => {
    const cy = T + i * rowH + rowH / 2;
    svg += `<circle cx="10" cy="${cy}" r="4" fill="${row.color}"/>`;
    svg += `<text x="20" y="${cy + 4}" font-size="12" fill="var(--text-secondary)">${esc(row.label)}</text>`;
    row.points.forEach((p, j) => {
      const dy = ((j % 3) - 1) * 6;
      svg += `<circle cx="${x(p.v)}" cy="${cy + dy}" r="4" fill="${row.color}" stroke="var(--surface)" stroke-width="2"/>`;
    });
    if (row.median !== undefined) {
      svg += `<line x1="${x(row.median)}" x2="${x(row.median)}" y1="${cy - 12}" y2="${cy + 12}" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round"/>`;
    }
  });

  if (marker) {
    const mx = x(marker.v);
    svg += `<line x1="${mx}" x2="${mx}" y1="${T - 4}" y2="${T + rows.length * rowH}" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round"/>`;
    const anchor = mx > W - 120 ? 'end' : mx < L + 60 ? 'start' : 'middle';
    svg += `<text x="${mx}" y="${T - 8}" text-anchor="${anchor}" font-size="12" font-weight="600" fill="var(--text-primary)">${esc(marker.label)}</text>`;
  }

  // Invisible, larger hit targets on top so small dots are easy to hover
  rows.forEach((row, i) => {
    const cy = T + i * rowH + rowH / 2;
    row.points.forEach((p, j) => {
      const dy = ((j % 3) - 1) * 6;
      svg += `<circle cx="${x(p.v)}" cy="${cy + dy}" r="9" fill="transparent" data-tip="${esc(p.tip)}"/>`;
    });
  });

  const tableRows = rows
    .flatMap(row => row.points.map(p => `<tr><td>${esc(row.label)}</td>${p.cells.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`))
    .join('');

  el.innerHTML = `
    <h2>${esc(title)}</h2>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${svg}</svg>
    <details>
      <summary>View data table</summary>
      <table><thead><tr>${tableHead.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
    </details>`;
}

function bandwidthChart(el, { title, color, points, result }) {
  const bySize = new Map();
  points.forEach(p => {
    if (!bySize.has(p.bytes)) bySize.set(p.bytes, []);
    bySize.get(p.bytes).push(p);
  });
  const rows = [...bySize.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bytes, pts]) => ({
      label: fmtBytes(bytes),
      color,
      points: pts
        .filter(p => p.bps)
        .map(p => ({
          v: p.bps / 1e6,
          tip: `${fmtBytes(bytes)} request · ${fmtMbps(p.bps / 1e6)} Mbps · ${Math.round(p.duration)} ms`,
          cells: [fmtMbps(p.bps / 1e6), Math.round(p.duration)]
        }))
    }));
  const [rv, ru] = fmtSpeed(result);
  dotStrip(el, {
    title,
    unit: 'Mbps',
    rows,
    fmt: v => v.toLocaleString(),
    marker: result ? { v: result / 1e6, label: `Result ${rv} ${ru}` } : undefined,
    tableHead: ['Request size', 'Speed (Mbps)', 'Duration (ms)']
  });
}

const median = arr => {
  if (!arr.length) return undefined;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function latencyChart(el, r) {
  const series = [
    ['Idle', 'var(--idle)', safe(() => r.getUnloadedLatencyPoints())],
    ['During download', 'var(--download)', safe(() => r.getDownLoadedLatencyPoints())],
    ['During upload', 'var(--upload)', safe(() => r.getUpLoadedLatencyPoints())]
  ].map(([label, color, pts]) => [label, color, (pts || []).filter(v => typeof v === 'number')]);
  dotStrip(el, {
    title: 'Latency measurements',
    unit: 'ms',
    rows: series.map(([label, color, pts]) => ({
      label,
      color,
      median: median(pts),
      points: pts.map(v => ({ v, tip: `${label} · ${fmtMs(v)} ms`, cells: [fmtMs(v)] }))
    })),
    fmt: v => v.toLocaleString(),
    tableHead: ['Condition', 'Latency (ms)']
  });
}

function render() {
  try {
    renderResults(engine.results);
  } catch (e) {
    console.error(e);
  }
}

function renderResults(r) {

  const down = safe(() => r.getDownloadBandwidth());
  const up = safe(() => r.getUploadBandwidth());
  const [dv, du] = fmtSpeed(down);
  const [uv, uu] = fmtSpeed(up);
  $('down').textContent = dv;
  $('down-unit').textContent = du;
  $('up').textContent = uv;
  $('up-unit').textContent = uu;
  $('latency').textContent = fmtMs(safe(() => r.getUnloadedLatency()));
  $('jitter').textContent = fmtMs(safe(() => r.getUnloadedJitter()));

  // Loaded latency only exists once requests were long enough to load the link
  const loaded = (points, value) => ((safe(points) || []).length ? safe(value) : undefined);
  const ld = loaded(() => r.getDownLoadedLatencyPoints(), () => r.getDownLoadedLatency());
  const lu = loaded(() => r.getUpLoadedLatencyPoints(), () => r.getUpLoadedLatency());
  $('latency-sub').textContent =
    typeof ld === 'number' || typeof lu === 'number'
      ? `Loaded: ${fmtMs(ld)} ms down · ${fmtMs(lu)} ms up`
      : '';

  const scores = engine.isFinished ? safe(() => r.getScores()) || {} : {};
  $('scores').innerHTML = SCORES.map(([key, name]) => {
    const s = scores[key];
    const grade = s ? s.classificationName[0].toUpperCase() + s.classificationName.slice(1) : '–';
    const on = s ? s.classificationIdx + 1 : 0;
    const meter = [0, 1, 2, 3, 4].map(i => `<span class="${i < on ? 'on' : ''}"></span>`).join('');
    return `<div class="score"><div class="name">${name}</div><div class="grade">${grade}</div><div class="meter" aria-hidden="true">${meter}</div></div>`;
  }).join('');

  bandwidthChart($('chart-down'), {
    title: 'Download measurements',
    color: 'var(--download)',
    points: safe(() => r.getDownloadBandwidthPoints()) || [],
    result: down
  });
  bandwidthChart($('chart-up'), {
    title: 'Upload measurements',
    color: 'var(--upload)',
    points: safe(() => r.getUploadBandwidthPoints()) || [],
    result: up
  });
  latencyChart($('chart-latency'), r);
}

engine.onResultsChange = ({ type }) => {
  if (engine.isRunning) $('status').textContent = PHASES[type] || 'Measuring…';
  render();
};

engine.onRunningChange = running => {
  $('pause').hidden = engine.isFinished;
  $('pause').textContent = running ? 'Pause' : 'Resume';
  if (!running && !engine.isFinished) $('status').textContent = 'Paused';
};

engine.onFinish = () => {
  $('status').textContent = 'Done';
  $('start').textContent = 'Run again';
  $('pause').hidden = true;
  render();
};

engine.onError = e => {
  $('status').textContent = `Error: ${e}`;
};

let started = false;
$('start').addEventListener('click', () => {
  $('status').textContent = 'Starting…';
  $('pause').hidden = false;
  $('pause').textContent = 'Pause';
  $('start').textContent = 'Restart';
  if (started) {
    engine.restart();
  } else {
    started = true;
    engine.play();
  }
  render();
});

$('pause').addEventListener('click', () => (engine.isRunning ? engine.pause() : engine.play()));

// Tooltips for chart dots
const tooltip = $('tooltip');
document.addEventListener('mouseover', e => {
  const tip = e.target.getAttribute && e.target.getAttribute('data-tip');
  if (!tip) return;
  tooltip.textContent = tip;
  tooltip.style.display = 'block';
});
document.addEventListener('mousemove', e => {
  if (tooltip.style.display !== 'block') return;
  const x = Math.min(e.clientX + 12, window.innerWidth - tooltip.offsetWidth - 8);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${e.clientY + 14}px`;
});
document.addEventListener('mouseout', e => {
  if (e.target.getAttribute && e.target.getAttribute('data-tip')) tooltip.style.display = 'none';
});

$('server').textContent = location.host;
render();
