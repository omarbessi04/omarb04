// ── Google Charts ──────────────────────────────────────────────────────────────
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initCharts);

// ── DOM Ready ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateKPIs();
    updateSpotifyEmbed();
    initTechPopover();
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

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('number', 'Unique Characters');
        dataTable.addColumn('number', 'Minutes Spent');
        dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

        timesData.forEach(([name, timeStr]) => {
            if (!(name in uccMap)) return;
            const mins = timeToMinutes(timeStr);
            if (mins <= 0) return;
            const ucc = uccMap[name];
            const tooltip = `
                <div style="padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;">
                    <strong>${name}</strong><br/>
                    UCC: ${ucc}<br/>
                    Time: ${mins.toFixed(1)} min
                </div>`;
            dataTable.addRow([ucc, mins, tooltip]);
        });

        const options = {
            backgroundColor: '#efe7d6',
            hAxis: {
                title: 'Unique Character Count',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                title: 'Minutes Spent',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
            },
            legend: { position: 'none' },
            colors: ['#a8632c'],
            pointSize: 9,
            tooltip: { isHtml: true },
            chartArea: { left: 65, right: 20, top: 15, bottom: 55 },
        };

        const chart = new google.visualization.ScatterChart(
            document.getElementById('scatter-chart')
        );
        chart.draw(dataTable, options);
    } catch (err) {
        console.error('Error drawing scatter chart:', err);
    }
}

// ── Bar Chart: Time per Song ───────────────────────────────────────────────────
function drawTimeSongBar(data) {
    try {
        const chartData = [['Song', 'Minutes Spent', { role: 'style' }]];
        data.forEach(([name, timeStr]) => {
            const mins = timeToMinutes(timeStr);
            if (mins > 0) chartData.push([name, mins, '#a8632c']);
        });

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            backgroundColor: '#efe7d6',
            hAxis: {
                title: 'Minutes Spent',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono', fontSize: 11 },
            },
            legend: { position: 'none' },
            chartArea: { left: 175, right: 15, top: 10, bottom: 45 },
        };

        const chart = new google.visualization.BarChart(
            document.getElementById('time-song-chart')
        );
        chart.draw(dataTable, options);
    } catch (err) {
        console.error('Error drawing time per song chart:', err);
    }
}

// ── Line Chart: Learning Curve ─────────────────────────────────────────────────
function drawLearningCurve(data) {
    try {
        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('number', 'Song #');
        dataTable.addColumn('number', 'Min / Unique Char');
        dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

        let songNum = 1;
        data.forEach(([name, val]) => {
            const value = parseFloat(val);
            if (isNaN(value) || value <= 0) return;
            const tooltip = `
                <div style="padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;">
                    <strong>#${songNum}: ${name}</strong><br/>
                    ${value.toFixed(3)} min / char
                </div>`;
            dataTable.addRow([songNum, value, tooltip]);
            songNum++;
        });

        const options = {
            backgroundColor: '#efe7d6',
            hAxis: {
                title: 'Translation order',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                gridlines: { count: songNum - 1 },
                format: '#',
            },
            vAxis: {
                title: 'Min / Unique Char',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
            },
            legend: { position: 'none' },
            colors: ['#a8632c'],
            lineWidth: 2,
            pointSize: 6,
            curveType: 'function',
            tooltip: { isHtml: true },
            chartArea: { left: 70, right: 20, top: 15, bottom: 55 },
        };

        const chart = new google.visualization.LineChart(
            document.getElementById('learning-curve-chart')
        );
        chart.draw(dataTable, options);
    } catch (err) {
        console.error('Error drawing learning curve:', err);
    }
}

// ── Bar Chart: Efficiency (Time / UCC) ────────────────────────────────────────
function drawBarChart(data) {
    try {
        const chartData = [['Song', 'Min / Unique Char', { role: 'style' }]];
        data.forEach(([name, val]) => {
            const value = parseFloat(val);
            if (!isNaN(value) && value > 0) {
                chartData.push([name, value, '#a8632c']);
            }
        });

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            backgroundColor: '#efe7d6',
            hAxis: {
                title: 'Min / Unique Character',
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#211d16', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                textStyle: { color: '#211d16', fontName: 'JetBrains Mono', fontSize: 11 },
            },
            legend: { position: 'none' },
            chartArea: { left: 195, right: 20, top: 10, bottom: 45 },
        };

        const chart = new google.visualization.BarChart(
            document.getElementById('bar-chart')
        );
        chart.draw(dataTable, options);
    } catch (err) {
        console.error('Error drawing efficiency chart:', err);
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeToMinutes(timeStr) {
    const [h, m, s] = timeStr.split(':').map(Number);
    return h * 60 + m + s / 60;
}
