// ── DOM Ready ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateKPIs();
    updateSpotifyEmbed();
    initTechPopover();
    initCharts();
});

// ── Charts init ────────────────────────────────────────────────────────────────
async function initCharts() {
    try {
        const [timesRes, uccRes, uccpcRes] = await Promise.all([
            fetch('/songs_and_times'),
            fetch('/get_ucc'),
            fetch('/get_UCCPC'),
        ]);
        const [timesData, uccData, uccpcData] = await Promise.all([
            timesRes.json(),
            uccRes.json(),
            uccpcRes.json(),
        ]);

        drawScatter(timesData, uccData);
        drawTimeSongBar(timesData);
        drawLearningCurve(uccpcData);
        drawBarChart(uccpcData);
    } catch (err) {
        console.error('Error loading chart data:', err);
    }
}

// ── KPIs + Progress Bar ────────────────────────────────────────────────────────
async function updateKPIs() {
    try {
        const [progressRes, studyRes, uccpcRes] = await Promise.all([
            fetch('/translation_progress'),
            fetch('/get_total_study'),
            fetch('/get_UCCPC'),
        ]);
        const progress = await progressRes.json();
        const study = await studyRes.json();
        const uccpc = await uccpcRes.json();

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

        // KPI: songs done
        document.getElementById('kpi-songs').innerText = `${progress.completed}/${total}`;

        // KPI: study time
        document.getElementById('kpi-time').innerText = `${study.hours}h ${study.minutes}m`;

        // KPI: avg + best efficiency
        const values = uccpc
            .map(([name, val]) => ({ name, value: parseFloat(val) }))
            .filter(d => !isNaN(d.value) && d.value > 0);

        if (values.length > 0) {
            const avg = values.reduce((sum, d) => sum + d.value, 0) / values.length;
            document.getElementById('kpi-avg-eff').innerText = avg.toFixed(2);

            const best = values.reduce((min, d) => d.value < min.value ? d : min, values[0]);
            document.getElementById('kpi-best-eff').innerText = best.value.toFixed(2);
        }
    } catch (err) {
        console.error('Error updating KPIs:', err);
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
        const response = await fetch('/get_current_song_id');
        const data = await response.json();
        if (data.song_id) {
            document.getElementById('spotify-embed').src =
                `https://open.spotify.com/embed/track/${data.song_id}?utm_source=generator&theme=0`;
        }
    } catch (err) {
        console.error('Error fetching current song:', err);
    }
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
                tooltip: `${name} — UCC ${uccMap[name]}, ${mins.toFixed(1)} min`,
            });
        });

        renderScatterSvg(document.getElementById('scatter-chart'), points, 'Unique Character Count', 'Minutes Spent');
    } catch (err) {
        console.error('Error drawing scatter chart:', err);
    }
}

// ── Bar Chart: Time per Song ───────────────────────────────────────────────────
function drawTimeSongBar(data) {
    try {
        const items = data
            .map(([name, timeStr]) => ({ label: name, value: timeToMinutes(timeStr) }))
            .filter(d => d.value > 0);
        renderBarList(document.getElementById('time-song-chart'), items, { decimals: 0 });
    } catch (err) {
        console.error('Error drawing time per song chart:', err);
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
    }
}

// ── Bar Chart: Efficiency (Time / UCC) ────────────────────────────────────────
function drawBarChart(data) {
    try {
        const items = data
            .map(([name, val]) => ({ label: name, value: parseFloat(val) }))
            .filter(d => !isNaN(d.value) && d.value > 0);
        renderBarList(document.getElementById('bar-chart'), items, { decimals: 2 });
    } catch (err) {
        console.error('Error drawing efficiency chart:', err);
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

function renderScatterSvg(container, points, xLabel, yLabel) {
    if (!container) return;
    if (!points.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }

    const W = 520, H = 220;
    const padL = 44, padR = 14, padT = 12, padB = 40;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxX = niceMax(Math.max(...points.map((p) => p.x)));
    const maxY = niceMax(Math.max(...points.map((p) => p.y)));
    const xScale = (v) => padL + (v / maxX) * plotW;
    const yScale = (v) => padT + plotH - (v / maxY) * plotH;

    let gridSvg = '';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const v = (maxY / gridLines) * i;
        const y = yScale(v);
        gridSvg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-gridline"/>`;
        gridSvg += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis-label">${Math.round(v)}</text>`;
    }

    const pointsSvg = points.map((p) => (
        `<circle cx="${xScale(p.x).toFixed(1)}" cy="${yScale(p.y).toFixed(1)}" r="4.5" class="chart-point"><title>${escapeHtml(p.tooltip)}</title></circle>`
    )).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${escapeHtml(xLabel)} vs ${escapeHtml(yLabel)} scatter plot">
            ${gridSvg}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" class="chart-axis-line"/>
            <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" class="chart-axis-line"/>
            ${pointsSvg}
            <text x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle" class="chart-axis-title">${escapeHtml(xLabel)}</text>
            <text x="12" y="${padT + plotH / 2}" text-anchor="middle" class="chart-axis-title" transform="rotate(-90 12 ${padT + plotH / 2})">${escapeHtml(yLabel)}</text>
        </svg>`;
}

function renderLearningCurveSvg(container, points) {
    if (!container) return;
    if (!points.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }

    const W = 480, H = 220;
    const padL = 44, padR = 14, padT = 12, padB = 40;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxY = niceMax(Math.max(...points.map((p) => p.value)));
    const n = points.length;
    const xScale = (i) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
    const yScale = (v) => padT + plotH - (v / maxY) * plotH;

    let gridSvg = '';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const v = (maxY / gridLines) * i;
        const y = yScale(v);
        gridSvg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-gridline"/>`;
        gridSvg += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="chart-axis-label">${v.toFixed(1)}</text>`;
    }

    const coords = points.map((p, i) => `${xScale(i).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(' ');
    const circles = points.map((p, i) => (
        `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(p.value).toFixed(1)}" r="3.5" class="chart-point-solid"><title>${escapeHtml(`#${i + 1}: ${p.name} — ${p.value.toFixed(3)} min/char`)}</title></circle>`
    )).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Efficiency over translation order">
            ${gridSvg}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" class="chart-axis-line"/>
            <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" class="chart-axis-line"/>
            <polyline points="${coords}" class="chart-line"/>
            ${circles}
            <text x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle" class="chart-axis-title">Translation order</text>
            <text x="12" y="${padT + plotH / 2}" text-anchor="middle" class="chart-axis-title" transform="rotate(-90 12 ${padT + plotH / 2})">Min / Unique Char</text>
        </svg>`;
}

function renderBarList(container, items, opts) {
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<p class="chart-empty">No data yet.</p>';
        return;
    }
    const decimals = opts && opts.decimals != null ? opts.decimals : 1;
    const max = Math.max(...items.map((d) => d.value), 1);
    container.innerHTML = items.map((d) => `
        <div class="chart-bar-row">
            <span class="chart-bar-label" title="${escapeHtml(d.label)}">${escapeHtml(d.label)}</span>
            <span class="chart-bar-track"><span class="chart-bar-fill" style="width:${Math.max(2, (d.value / max) * 100)}%"></span></span>
            <span class="chart-bar-value">${d.value.toFixed(decimals)}</span>
        </div>
    `).join('');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeToMinutes(timeStr) {
    const [h, m, s] = timeStr.split(':').map(Number);
    return h * 60 + m + s / 60;
}
