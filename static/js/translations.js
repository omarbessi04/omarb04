// ── Google Charts ──────────────────────────────────────────────────────────────
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initCharts);

// ── DOM Ready ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateKPIs();
    updateSpotifyEmbed();
    initPopovers();
});

// ── Charts init ────────────────────────────────────────────────────────────────
function initCharts() {
    drawScatter();
    drawTimeSongBar();
    drawLearningCurve();
    drawBarChart();
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

        const barHeight = '4em';
        document.getElementById('container-of-progress-bar').style.height = barHeight;
        ['progress-completed', 'progress-inprogress', 'progress-remaining'].forEach(id => {
            document.getElementById(id).style.height = barHeight;
        });
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
    const el = document.getElementById(id);
    el.style.width = pct + '%';
    el.innerText = Math.round(pct) + '%';
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

// ── Popovers ───────────────────────────────────────────────────────────────────
function initPopovers() {
    const techContent = [
        '<p>— <strong>Google Sheets</strong>: primary data source for study times and metadata.</p>',
        '<p>— <strong>Spotify API</strong>: song names and track lengths.</p>',
        '<p>— <strong>Flask</strong> (Python), HTML / CSS, JavaScript.</p>',
    ].join('');

    new bootstrap.Popover(document.getElementById('btn-techstack'), {
        html: true,
        content: techContent,
        title: 'Tech Stack',
        trigger: 'focus',
        container: 'body',
        placement: 'bottom',
    });
}

// ── Scatter Chart: UCC vs Time ─────────────────────────────────────────────────
async function drawScatter() {
    try {
        const [timesRes, uccRes] = await Promise.all([
            fetch('/songs_and_times'),
            fetch('/get_ucc'),
        ]);
        const timesData = await timesRes.json();
        const uccData = await uccRes.json();

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
            backgroundColor: '#F5F0E8',
            hAxis: {
                title: 'Unique Character Count',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                title: 'Minutes Spent',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
            },
            legend: { position: 'none' },
            colors: ['#F4A01C'],
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
async function drawTimeSongBar() {
    try {
        const response = await fetch('/songs_and_times');
        const data = await response.json();

        const chartData = [['Song', 'Minutes Spent', { role: 'style' }]];
        data.forEach(([name, timeStr]) => {
            const mins = timeToMinutes(timeStr);
            if (mins > 0) chartData.push([name, mins, '#F4A01C']);
        });

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            backgroundColor: '#F5F0E8',
            hAxis: {
                title: 'Minutes Spent',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono', fontSize: 11 },
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
async function drawLearningCurve() {
    try {
        const response = await fetch('/get_UCCPC');
        const data = await response.json();

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
            backgroundColor: '#F5F0E8',
            hAxis: {
                title: 'Translation order',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                gridlines: { count: songNum - 1 },
                format: '#',
            },
            vAxis: {
                title: 'Min / Unique Char',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
            },
            legend: { position: 'none' },
            colors: ['#F4A01C'],
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
async function drawBarChart() {
    try {
        const response = await fetch('/get_UCCPC');
        const data = await response.json();

        const chartData = [['Song', 'Min / Unique Char', { role: 'style' }]];
        data.forEach(([name, val]) => {
            const value = parseFloat(val);
            if (!isNaN(value) && value > 0) {
                chartData.push([name, value, '#F4A01C']);
            }
        });

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            backgroundColor: '#F5F0E8',
            hAxis: {
                title: 'Min / Unique Character',
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
                titleTextStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono' },
            },
            vAxis: {
                textStyle: { color: '#1A1A1A', fontName: 'JetBrains Mono', fontSize: 11 },
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
