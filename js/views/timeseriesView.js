export function initializeDashboard() { console.log("Inicializando todos los gráficos del dashboard..."); }

const DATA_BASE_PATH = './dashboard_data/';

async function fetchData(fileName) {
    try {
        const response = await fetch(DATA_BASE_PATH + fileName);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${fileName}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${fileName}:`, error);
        return null;
    }
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r},${g},${b})`;
}

// Colores consistentes para sentimiento
const POSITIVE_COLOR = 'rgba(75, 192, 192, 0.7)';
const NEGATIVE_COLOR = 'rgba(255, 99, 132, 0.7)';
const NEUTRAL_COLOR = 'rgba(201, 203, 207, 0.7)';

async function loadKPIs() {
    const kpis = await fetchData('kpis.json');
    if (kpis) {
        document.getElementById('kpi-total-articles').textContent = kpis.total_articulos || '0';
        document.getElementById('kpi-figura-destacada').textContent = kpis.figura_destacada || 'N/A';
        document.getElementById('kpi-tema-emergente').textContent = kpis.tema_emergente || 'N/A';
    }
}

async function loadPoliticianRankingChart() {
    const data = await fetchData('ranking_politicians.json');
    const chartElement = document.getElementById('politicianRankingChart');
    if (data && chartElement) {
        new Chart(chartElement, {
            type: 'bar',
            data: {
                labels: data.map(item => item.politico),
                datasets: [{
                    label: 'Total Menciones',
                    data: data.map(item => item.menciones),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }
}

async function loadSentimentPoliticianChart() {
    const data = await fetchData('sentiment_per_politician.json');
    const chartElement = document.getElementById('sentimentPoliticianChart');
    if (data && data.length > 0 && chartElement) {
        new Chart(chartElement, {
            type: 'bar',
            data: {
                labels: data.map(item => item.politico),
                datasets: [
                    { label: 'Negativo', data: data.map(item => item.sentimientos.negativo), backgroundColor: NEGATIVE_COLOR },
                    { label: 'Neutral', data: data.map(item => item.sentimientos.neutral), backgroundColor: NEUTRAL_COLOR },
                    { label: 'Positivo', data: data.map(item => item.sentimientos.positivo), backgroundColor: POSITIVE_COLOR }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });
    }
}

async function loadAverageSentimentChart() {
    const data = await fetchData('average_sentiment_politician.json');
    const chartElement = document.getElementById('averageSentimentChart');
    if (data && data.length > 0 && chartElement) {
        new Chart(chartElement, {
            type: 'bar',
            data: {
                labels: data.map(item => item.politico),
                datasets: [{
                    label: 'Sentimiento Promedio',
                    data: data.map(item => item.sentimiento_promedio),
                    backgroundColor: (context) => {
                        const value = context.raw;
                        return value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
                    }
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Promedio (Negativo < 0 < Positivo)' },
                        min: -1,
                        max: 1
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

async function loadArticlesTimeChart() {
    const data = await fetchData('articles_over_time.json');
    const chartElement = document.getElementById('articlesTimeChart');
    if(data && data.length > 0 && chartElement) new Chart(chartElement, { type: 'line', data: { labels: data.map(item => item.date), datasets: [{ label: 'Artículos por Día', data: data.map(item => item.count), borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd-MM-yyyy', parser: 'yyyy-MM-dd' } } } } });
}

async function loadMainTopicsChart() {
    const data = await fetchData('temas_principales.json');
    const chartElement = document.getElementById('mainTopicsChart');
    if(data && data.length > 0 && chartElement) new Chart(chartElement, { type: 'bar', data: { labels: data.map(item => item.tema), datasets: [{ label: 'Frecuencia', data: data.map(item => item.frecuencia), backgroundColor: 'rgba(255, 159, 64, 0.6)' }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false } });
}

async function loadMentionsPoliticianTimeChart() {
    const data = await fetchData('mentions_politician_over_time.json');
    const chartElement = document.getElementById('mentionsPoliticianTimeChart');
    if (data && data.length > 0 && chartElement) {
        const mentionsByPolitician = data.reduce((acc, curr) => { (acc[curr.politico] = acc[curr.politico] || []).push({ x: curr.date, y: curr.mentions }); return acc; }, {});
        const datasets = Object.keys(mentionsByPolitician).map(politico => ({ label: politico, data: mentionsByPolitician[politico].sort((a, b) => new Date(a.x) - new Date(b.x)), borderColor: getRandomColor(), tension: 0.1, fill: false }));
        new Chart(chartElement, { type: 'line', data: { datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd-MM-yyyy', parser: 'yyyy-MM-dd' }, title: { display: true, text: 'Fecha' } }, y: { title: { display: true, text: 'Menciones' }, beginAtZero: true } } } });
    }
}

async function loadCooccurrenceHeatmap() {
    const raw = await fetchData('cooccurrence_heatmap.json');
    const chartElement = document.getElementById('cooccurrenceHeatmap');
    if (raw && raw.labels && raw.matrix && chartElement) {
        const { labels, matrix } = raw; let maxVal = 0;
        const data = matrix.flatMap((row, i) => row.map((val, j) => { if (val > maxVal) maxVal = val; return { x: j, y: i, v: val }; }));
        maxVal = maxVal > 0 ? maxVal : 1;
        new Chart(chartElement.getContext('2d'), { type: 'matrix', data: { datasets: [{ label: 'Coocurrencias', data, backgroundColor: ctx => `rgba(30, 144, 255, ${ctx.dataset.data[ctx.dataIndex].v / maxVal})`, width: ({ chart }) => (chart.chartArea || {}).width / labels.length - 1, height: ({ chart }) => (chart.chartArea || {}).height / labels.length - 1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'category', labels, ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 } }, y: { type: 'category', labels, offset: true, ticks: { autoSkip: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: ctx => `${labels[ctx[0].parsed.y]} / ${labels[ctx[0].parsed.x]}`, label: ctx => `Coocurrencias: ${ctx.raw.v}` } } } } });
    }
}

async function loadMediaPoliticiansChart() {
    const data = await fetchData('media_vs_politicians.json');
    const chartElement = document.getElementById('mediaPoliticiansChart');
    if (data && data.length > 0 && chartElement) {
        const medios = [...new Set(data.map(item => item.medio))];
        const politicos = [...new Set(data.map(item => item.politico))];
        const datasets = politicos.map(politico => ({ label: politico, data: medios.map(medio => data.find(d => d.medio === medio && d.politico === politico)?.menciones || 0), backgroundColor: getRandomColor() }));
        new Chart(chartElement, { type: 'bar', data: { labels: medios, datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, title: { display: true, text: 'Medio' } }, y: { stacked: true, title: { display: true, text: 'Menciones' }, beginAtZero: true } } } });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadKPIs();
    loadPoliticianRankingChart();
    loadSentimentPoliticianChart();
    loadAverageSentimentChart();
    loadMainTopicsChart();
    loadArticlesTimeChart();
    loadMentionsPoliticianTimeChart();
    loadCooccurrenceHeatmap();
    loadMediaPoliticiansChart();
});