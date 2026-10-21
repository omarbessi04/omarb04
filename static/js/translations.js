// ── DOM Ready ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAboutToggle();
    initTechPopover();
    updateKPIs();
    updateSpotifyEmbed();
    initCharts();
    initKanjiExplorer();
});

// ── Fetch helper ───────────────────────────────────────────────────────────────
// Memoized so the KPI pass and the chart pass can each ask for the endpoints
// they need without the page fetching the same URL twice.
const _jsonCache = new Map();

function getJSON(url) {
    if (!_jsonCache.has(url)) {
        _jsonCache.set(url, fetch(url).then((res) => {
            if (!res.ok) throw new Error(`${url} responded ${res.status}`);
            return res.json();
        }));
    }
    return _jsonCache.get(url);
}

// ── Loading / error helpers ───────────────────────────────────────────────────
function clearLoading(...ids) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('is-loading');
    });
}

function showChartError(container, message) {
    if (!container) return;
    container.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'chart-error';
    p.textContent = message;
    container.appendChild(p);
}

// ── Charts init ────────────────────────────────────────────────────────────────
async function initCharts() {
    const containers = [
        document.getElementById('scatter-chart'),
        document.getElementById('time-song-chart'),
        document.getElementById('learning-curve-chart'),
        document.getElementById('bar-chart'),
    ];

    try {
        const [timesData, uccData, uccpcData] = await Promise.all([
            getJSON('/songs_and_times'),
            getJSON('/get_ucc'),
            getJSON('/get_UCCPC'),
        ]);

        drawScatter(timesData, uccData);
        drawTimeSongBar(timesData);
        drawLearningCurve(uccpcData);
        drawBarChart(uccpcData);
    } catch (err) {
        console.error('Error loading chart data:', err);
        containers.forEach((c) => showChartError(c, "Couldn't load this chart. Try refreshing."));
    }
}

// ── KPIs + Progress Bar ────────────────────────────────────────────────────────
const KPI_IDS = ['kpi-songs', 'kpi-time', 'kpi-avg-eff', 'kpi-best-eff'];

async function updateKPIs() {
    try {
        const [progress, study, uccpc] = await Promise.all([
            getJSON('/translation_progress'),
            getJSON('/get_total_study'),
            getJSON('/get_UCCPC'),
        ]);

        clearLoading(...KPI_IDS);

        // Progress bar
        const total = progress.completed + progress.inProgress + progress.remaining;
        const completedPct = (progress.completed / total) * 100;
        const inProgressPct = (progress.inProgress / total) * 100;
        const remainingPct = (progress.remaining / total) * 100;

        setBar('progress-completed', completedPct);
        setBar('progress-inprogress', inProgressPct);
        setBar('progress-remaining', remainingPct);

        setPct('legend-pct-completed', completedPct);
        setPct('legend-pct-inprogress', inProgressPct);
        setPct('legend-pct-remaining', remainingPct);

        // Nothing in progress while the project is on hiatus; drop the 0% entry.
        if (!progress.inProgress) {
            const legend = document.getElementById('legend-pct-inprogress');
            if (legend) legend.parentElement.hidden = true;
        }

        // KPI: songs done
        document.getElementById('kpi-songs').textContent = `${progress.completed}/${total}`;

        // KPI: study time
        document.getElementById('kpi-time').textContent = `${study.hours}h ${study.minutes}m`;

        // KPI: avg + best efficiency
        const values = uccpc
            .map(([name, val]) => ({ name, value: parseFloat(val) }))
            .filter(d => !isNaN(d.value) && d.value > 0);

        if (values.length > 0) {
            const avg = values.reduce((sum, d) => sum + d.value, 0) / values.length;
            document.getElementById('kpi-avg-eff').textContent = avg.toFixed(2);

            const best = values.reduce((min, d) => d.value < min.value ? d : min, values[0]);
            document.getElementById('kpi-best-eff').textContent = best.value.toFixed(2);
        }
    } catch (err) {
        console.error('Error updating KPIs:', err);
        clearLoading(...KPI_IDS);
        KPI_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '—';
                el.classList.add('kpi-value-error');
                el.title = "Couldn't load this figure";
            }
        });
        const legend = document.querySelector('.progress-legend');
        if (legend) {
            legend.insertAdjacentHTML(
                'beforeend',
                '<span class="chart-error">Live data unavailable right now.</span>'
            );
        }
    }
}

function setBar(id, pct) {
    document.getElementById(id).style.width = pct + '%';
}

function setPct(id, pct) {
    const el = document.getElementById(id);
    if (el) el.textContent = Math.round(pct) + '%';
}

// ── Spotify Embed ──────────────────────────────────────────────────────────────
async function updateSpotifyEmbed() {
    try {
        const data = await getJSON('/get_current_song_id');
        // song_id is null when nothing is in progress or queued — in that case
        // the markup's default embed stays put.
        if (data.song_id) {
            document.getElementById('spotify-embed').src =
                `https://open.spotify.com/embed/track/${data.song_id}?utm_source=generator&theme=0`;
        }
        if (data.status === 'Working On It') {
            document.getElementById('spotify-label').textContent = 'Currently translating';
        }
    } catch (err) {
        console.error('Error fetching current song:', err);
    }
}

// ── About toggle ───────────────────────────────────────────────────────────────
function initAboutToggle() {
    const toggle = document.getElementById('about-toggle');
    const label = document.getElementById('about-toggle-label');
    const panel = document.getElementById('about-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
        label.textContent = open ? 'Read more about this project' : 'Hide the details';
    });
}

// ── Tech popover ───────────────────────────────────────────────────────────────
function initTechPopover() {
    const btn = document.getElementById('btn-techstack');
    const popover = document.getElementById('tech-popover');
    if (!btn || !popover) return;

    function close() {
        popover.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = btn.getAttribute('aria-expanded') === 'true';
        if (open) {
            close();
        } else {
            popover.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        }
    });

    document.addEventListener('click', (e) => {
        if (!popover.hidden && !popover.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
// Native SVG <title> tooltips have a long hover delay, can't be styled, and are
// invisible on touch devices. This is a small positioned element driven by
// pointer *and* tap events so the charts work on a phone.
const Tooltip = (() => {
    let el = null;

    function node() {
        if (!el) {
            el = document.createElement('div');
            el.className = 'chart-tooltip';
            el.setAttribute('role', 'status');
            el.hidden = true;
            document.body.appendChild(el);
        }
        return el;
    }

    function show(html, x, y) {
        const tip = node();
        tip.innerHTML = html;
        tip.hidden = false;

        // Keep the tooltip inside the viewport.
        const rect = tip.getBoundingClientRect();
        const pad = 8;
        let left = x - rect.width / 2;
        left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
        let top = y - rect.height - 12;
        if (top < pad) top = y + 16;

        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function hide() {
        if (el) el.hidden = true;
    }

    return { show, hide };
})();

// Wire tooltip behaviour onto every [data-tip] element inside a container.
function bindTooltips(container) {
    if (!container) return;

    const targets = container.querySelectorAll('[data-tip]');
    targets.forEach((target) => {
        function showFor(e) {
            const rect = target.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top;
            Tooltip.show(target.dataset.tip, x, y);
            if (e) e.stopPropagation();
        }

        target.addEventListener('pointerenter', showFor);
        target.addEventListener('pointerleave', () => Tooltip.hide());
        // Tap: pointerenter doesn't fire reliably on touch, so click carries it.
        target.addEventListener('click', showFor);
    });

    document.addEventListener('click', () => Tooltip.hide());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') Tooltip.hide();
    });
    window.addEventListener('scroll', () => Tooltip.hide(), { passive: true });
}

// ── Scatter Chart: UCC vs Time ─────────────────────────────────────────────────
function drawScatter(timesData, uccData) {
    try {
        const uccMap = {};
        uccData.forEach(([name, val]) => {
            const ucc = parseFloat(val);
            if (!isNaN(ucc) && ucc > 0) uccMap[name] = ucc;
        });

        const points = [];
        timesData.forEach(([name, timeStr]) => {
            if (!(name in uccMap)) return;
            const mins = timeToMinutes(timeStr);
            if (mins <= 0) return;
            points.push({
                name,
                x: uccMap[name],
                y: mins,
            });
        });

        renderScatterSvg(document.getElementById('scatter-chart'), points, 'Unique Character Count', 'Minutes Spent');
    } catch (err) {
        console.error('Error drawing scatter chart:', err);
        showChartError(document.getElementById('scatter-chart'), "Couldn't draw this chart.");
    }
}

// ── Bar Chart: Time per Song ───────────────────────────────────────────────────
function drawTimeSongBar(data) {
    try {
        const items = data
            .map(([name, timeStr]) => ({ label: name, value: timeToMinutes(timeStr) }))
            .filter(d => d.value > 0);
        renderBarList(document.getElementById('time-song-chart'), items, {
            decimals: 0,
            unit: 'minutes',
            valueHeading: 'Minutes',
        });
    } catch (err) {
        console.error('Error drawing time per song chart:', err);
        showChartError(document.getElementById('time-song-chart'), "Couldn't draw this chart.");
    }
}

// ── Line Chart: Learning Curve ─────────────────────────────────────────────────
function drawLearningCurve(data) {
    try {
        const points = data
            .map(([name, val]) => ({ name, value: parseFloat(val) }))
            .filter(d => !isNaN(d.value) && d.value > 0);
        renderLearningCurveSvg(document.getElementById('learning-curve-chart'), points);
    } catch (err) {
        console.error('Error drawing learning curve:', err);
        showChartError(document.getElementById('learning-curve-chart'), "Couldn't draw this chart.");
    }
}

// ── Bar Chart: Efficiency (Time / UCC) ────────────────────────────────────────
function drawBarChart(data) {
    try {
        const items = data
            .map(([name, val]) => ({ label: name, value: parseFloat(val) }))
            .filter(d => !isNaN(d.value) && d.value > 0);
        renderBarList(document.getElementById('bar-chart'), items, {
            decimals: 2,
            unit: 'min/char',
            valueHeading: 'Minutes per unique character',
        });
    } catch (err) {
        console.error('Error drawing efficiency chart:', err);
        showChartError(document.getElementById('bar-chart'), "Couldn't draw this chart.");
    }
}

// ── Lightweight chart rendering (no external charting library) ────────────────
function niceMax(value) {
    if (!value || value <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const residual = value / magnitude;
    let niceResidual;
    if (residual > 5) niceResidual = 10;
    else if (residual > 2) niceResidual = 5;
    else if (residual > 1) niceResidual = 2;
    else niceResidual = 1;
    return niceResidual * magnitude;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// Song titles are Japanese; tagging them keeps screen readers from reading them
// with an English voice.
function songLabel(name) {
    return `<span lang="ja">${escapeHtml(name)}</span>`;
}

// A visually-hidden table so the data behind each chart is available to screen
// readers, which get nothing useful out of the SVG itself.
function dataTable(caption, columns, rows) {
    const head = columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join('');
    const body = rows.map((cells) => {
        const tds = cells.map((cell, i) => (
            i === 0
                ? `<th scope="row" lang="ja">${escapeHtml(cell)}</th>`
                : `<td>${escapeHtml(cell)}</td>`
        )).join('');
        return `<tr>${tds}</tr>`;
    }).join('');

    // The wrapper does the hiding: a <table> ignores the 1px box and overflow
    // clip, and on a phone its full width stretched the page sideways.
    return `<div class="sr-only"><table><caption>${escapeHtml(caption)}</caption>`
        + `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderScatterSvg(container, points, xLabel, yLabel) {
    if (!container) return;
    if (!points.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }

    const W = 520, H = 220;
    const padL = 44, padR = 14, padT = 12, padB = 46;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxX = niceMax(Math.max(...points.map((p) => p.x)));
    const maxY = niceMax(Math.max(...points.map((p) => p.y)));
    const xScale = (v) => padL + (v / maxX) * plotW;
    const yScale = (v) => padT + plotH - (v / maxY) * plotH;

    const ticks = 4;

    let gridSvg = '';
    for (let i = 0; i <= ticks; i++) {
        const v = (maxY / ticks) * i;
        const y = yScale(v);
        gridSvg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-gridline"/>`;
        gridSvg += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis-label">${Math.round(v)}</text>`;
    }

    // X ticks — without these you can't read a value off the horizontal axis.
    let xTicksSvg = '';
    for (let i = 0; i <= ticks; i++) {
        const v = (maxX / ticks) * i;
        const x = xScale(v);
        xTicksSvg += `<line x1="${x.toFixed(1)}" y1="${padT + plotH}" x2="${x.toFixed(1)}" y2="${padT + plotH + 4}" class="chart-axis-line"/>`;
        xTicksSvg += `<text x="${x.toFixed(1)}" y="${padT + plotH + 15}" text-anchor="middle" class="chart-axis-label">${Math.round(v)}</text>`;
    }

    const pointsSvg = points.map((p) => {
        const tip = `${songLabel(p.name)}<span class="chart-tooltip-meta">${p.x} unique chars · ${p.y.toFixed(1)} min</span>`;
        return `<circle cx="${xScale(p.x).toFixed(1)}" cy="${yScale(p.y).toFixed(1)}" r="6" class="chart-point" data-tip="${escapeHtml(tip)}"/>`;
    }).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" aria-hidden="true" focusable="false">
            ${gridSvg}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" class="chart-axis-line"/>
            <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" class="chart-axis-line"/>
            ${xTicksSvg}
            ${pointsSvg}
            <text x="${padL + plotW / 2}" y="${H - 4}" text-anchor="middle" class="chart-axis-title">${escapeHtml(xLabel)}</text>
            <text x="12" y="${padT + plotH / 2}" text-anchor="middle" class="chart-axis-title" transform="rotate(-90 12 ${padT + plotH / 2})">${escapeHtml(yLabel)}</text>
        </svg>
        ${dataTable(
            `${xLabel} vs ${yLabel}, per song`,
            ['Song', xLabel, yLabel],
            points.map((p) => [p.name, String(p.x), p.y.toFixed(1)])
        )}`;

    bindTooltips(container);
}

function renderLearningCurveSvg(container, points) {
    if (!container) return;
    if (!points.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }

    const W = 480, H = 220;
    const padL = 44, padR = 14, padT = 12, padB = 46;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxY = niceMax(Math.max(...points.map((p) => p.value)));
    const n = points.length;
    const xScale = (i) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
    const yScale = (v) => padT + plotH - (v / maxY) * plotH;

    const ticks = 4;

    let gridSvg = '';
    for (let i = 0; i <= ticks; i++) {
        const v = (maxY / ticks) * i;
        const y = yScale(v);
        gridSvg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-gridline"/>`;
        gridSvg += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis-label">${v.toFixed(1)}</text>`;
    }

    // X ticks mark translation order (1-based).
    let xTicksSvg = '';
    const step = Math.max(1, Math.round(n / 6));
    for (let i = 0; i < n; i += step) {
        const x = xScale(i);
        xTicksSvg += `<line x1="${x.toFixed(1)}" y1="${padT + plotH}" x2="${x.toFixed(1)}" y2="${padT + plotH + 4}" class="chart-axis-line"/>`;
        xTicksSvg += `<text x="${x.toFixed(1)}" y="${padT + plotH + 15}" text-anchor="middle" class="chart-axis-label">${i + 1}</text>`;
    }

    const coords = points.map((p, i) => `${xScale(i).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(' ');
    const circles = points.map((p, i) => {
        const tip = `${songLabel(p.name)}<span class="chart-tooltip-meta">#${i + 1} · ${p.value.toFixed(2)} min/char</span>`;
        return `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(p.value).toFixed(1)}" r="5.5" class="chart-point-solid" data-tip="${escapeHtml(tip)}"/>`;
    }).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" aria-hidden="true" focusable="false">
            ${gridSvg}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" class="chart-axis-line"/>
            <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" class="chart-axis-line"/>
            ${xTicksSvg}
            <polyline points="${coords}" class="chart-line"/>
            ${circles}
            <text x="${padL + plotW / 2}" y="${H - 4}" text-anchor="middle" class="chart-axis-title">Translation order</text>
            <text x="12" y="${padT + plotH / 2}" text-anchor="middle" class="chart-axis-title" transform="rotate(-90 12 ${padT + plotH / 2})">Min / Unique Char</text>
        </svg>
        ${dataTable(
            'Translation efficiency by order completed',
            ['Song', 'Order', 'Minutes per unique character'],
            points.map((p, i) => [p.name, String(i + 1), p.value.toFixed(2)])
        )}`;

    bindTooltips(container);
}

function renderBarList(container, items, opts) {
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }
    const decimals = opts && opts.decimals != null ? opts.decimals : 1;
    const unit = (opts && opts.unit) || '';
    const valueHeading = (opts && opts.valueHeading) || 'Value';
    const max = Math.max(...items.map((d) => d.value), 1);

    const rows = items.map((d) => {
        const tip = `${songLabel(d.label)}<span class="chart-tooltip-meta">${d.value.toFixed(decimals)} ${escapeHtml(unit)}</span>`;
        return `
        <div class="chart-bar-row" data-tip="${escapeHtml(tip)}">
            <span class="chart-bar-label" lang="ja">${escapeHtml(d.label)}</span>
            <span class="chart-bar-track"><span class="chart-bar-fill" style="width:${Math.max(2, (d.value / max) * 100)}%"></span></span>
            <span class="chart-bar-value">${d.value.toFixed(decimals)}</span>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="chart-bars-inner" aria-hidden="true">${rows}</div>`
        + dataTable(valueHeading + ' per song', ['Song', valueHeading], items.map((d) => [d.label, d.value.toFixed(decimals)]));

    bindTooltips(container);
}

// ── Kanji explorer ─────────────────────────────────────────────────────────────
// Pick any mix of JLPT levels; each song's bar shows what share of its kanji
// (by occurrence) those levels cover. Data is precomputed by akfg/kanji.py.
const KX_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1', 'none'];

async function initKanjiExplorer() {
    const container = document.getElementById('kanji-explorer');
    const buttons = document.querySelectorAll('.kx-level');
    if (!container) return;

    let songs;
    try {
        songs = await getJSON('/kanji_levels');
    } catch (err) {
        console.error('Error loading kanji levels:', err);
        clearLoading('kx-coverage');
        document.getElementById('kx-coverage').textContent = '—';
        showChartError(container, "Couldn't load the kanji data. Try refreshing.");
        return;
    }

    clearLoading('kx-coverage');
    if (!songs.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }

    const open = new Set();

    function known() {
        return new Set([...buttons]
            .filter((b) => b.getAttribute('aria-pressed') === 'true')
            .map((b) => b.dataset.level));
    }

    function render() {
        const knownLevels = known();
        const rows = songs.map((song) => {
            const total = KX_LEVELS.reduce((sum, l) => sum + song.levels[l].count, 0);
            const covered = KX_LEVELS
                .filter((l) => knownLevels.has(l))
                .reduce((sum, l) => sum + song.levels[l].count, 0);
            return { song, total, covered, pct: total ? covered / total : 0 };
        }).sort((a, b) => b.pct - a.pct || a.song.order - b.song.order);

        const allTotal = rows.reduce((sum, r) => sum + r.total, 0);
        const allCovered = rows.reduce((sum, r) => sum + r.covered, 0);
        document.getElementById('kx-coverage').textContent =
            `${Math.round((allCovered / allTotal) * 100)}%`;
        document.getElementById('kx-summary-text').innerHTML = knownLevels.size
            ? `of the kanji across all ${rows.length} translated songs. Easiest for you: ${songLabel(rows[0].song.name)} at ${Math.round(rows[0].pct * 100)}%.`
            : 'Pick a level above to start.';

        container.innerHTML = rows.map(({ song, total, pct }) => {
            const segments = KX_LEVELS
                .filter((l) => song.levels[l].count)
                .map((l) => {
                    const cls = knownLevels.has(l) ? 'kx-seg is-known' : 'kx-seg';
                    return `<span class="${cls}" style="flex-grow:${song.levels[l].count}"></span>`;
                }).join('');

            const detail = KX_LEVELS
                .filter((l) => song.levels[l].kanji)
                .map((l) => {
                    const lvl = song.levels[l];
                    const name = l === 'none' ? 'No level' : l;
                    const state = knownLevels.has(l) ? 'is-known' : '';
                    return `<div class="kx-detail-level ${state}">
                        <span class="kx-detail-name">${name}</span>
                        <span class="kx-detail-meta">${lvl.kanji.length} kanji · ${lvl.count}×</span>
                        <span class="kx-detail-kanji" lang="ja">${escapeHtml(lvl.kanji)}</span>
                    </div>`;
                }).join('');

            const isOpen = open.has(song.name);
            return `<div class="kx-song">
                <button type="button" class="kx-row" aria-expanded="${isOpen}" data-song="${escapeHtml(song.name)}">
                    <span class="chart-bar-label" lang="ja">${escapeHtml(song.name)}</span>
                    <span class="kx-bar" aria-hidden="true">${segments}</span>
                    <span class="chart-bar-value">${Math.round(pct * 100)}%</span>
                    <span class="sr-only">of ${total} kanji</span>
                </button>
                <div class="kx-detail"${isOpen ? '' : ' hidden'}>${detail}</div>
            </div>`;
        }).join('');
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const pressed = button.getAttribute('aria-pressed') === 'true';
            button.setAttribute('aria-pressed', String(!pressed));
            render();
        });
    });

    container.addEventListener('click', (e) => {
        const row = e.target.closest('.kx-row');
        if (!row) return;
        const name = row.dataset.song;
        const isOpen = row.getAttribute('aria-expanded') === 'true';
        if (isOpen) open.delete(name); else open.add(name);
        row.setAttribute('aria-expanded', String(!isOpen));
        row.nextElementSibling.hidden = isOpen;
    });

    render();
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeToMinutes(timeStr) {
    const [h, m, s] = timeStr.split(':').map(Number);
    return h * 60 + m + s / 60;
}
