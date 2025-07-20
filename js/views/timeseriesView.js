export function initializeDashboard() { console.log("Placeholder: Inicializar Dashboard"); }

// dashboard.js
const DATA_BASE_PATH = './dashboard_data/'; // O la ruta donde sirvas los JSON

async function fetchData(fileName) {
    try {
        const response = await fetch(DATA_BASE_PATH + fileName);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${fileName}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

function getRandomColor() { // Simple color generator for charts
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r},${g},${b})`;
}

async function loadKPIs() {
    const kpis = await fetchData('kpis.json');
    if (kpis) {
        document.getElementById('kpi-total-articles').textContent = kpis.total_articulos;
        document.getElementById('kpi-figura-destacada').textContent = kpis.figura_destacada;
        document.getElementById('kpi-tema-emergente').textContent = kpis.tema_emergente;
    }
}

async function loadArticlesTimeChart() {
    const data = await fetchData('articles_over_time.json');
    if (data) {
        new Chart(document.getElementById('articlesTimeChart'), {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Artículos por Día',
                    data: data.map(item => item.count),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: { scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'DD MMM YYYY' } } } } // Necesitarás chartjs-adapter-date-fns o similar
        });
    }
}
// Nota: Para usar 'time' scale en Chart.js, necesitas un adaptador de fechas.
// npm install chartjs-adapter-date-fns date-fns
// import 'chartjs-adapter-date-fns'; (si usas un bundler) o incluir el script.
// Alternativamente, puedes tratar las fechas como categorías si el orden es correcto.


async function loadMentionsPoliticianTimeChart() {
    const data = await fetchData('mentions_politician_over_time.json');
    if (data && data.length > 0) {
        // Agrupar datos por político
        const mentionsByPolitician = data.reduce((acc, curr) => {
            if (!acc[curr.politico]) {
                acc[curr.politico] = [];
            }
            acc[curr.politico].push({ x: curr.date, y: curr.mentions });
            return acc;
        }, {});

        const datasets = Object.keys(mentionsByPolitician).map(politico => {
            // Ordenar por fecha para que la línea se dibuje correctamente
            const sortedData = mentionsByPolitician[politico].sort((a, b) => new Date(a.x) - new Date(b.x));
            return {
                label: politico,
                data: sortedData,
                borderColor: getRandomColor(),
                tension: 0.1,
                fill: false
            };
        });

        new Chart(document.getElementById('mentionsPoliticianTimeChart'), {
            type: 'line',
            data: {
                // Labels (fechas) se infieren de los datos x si usas time scale
                // Si no usas time scale, necesitarías una lista de todas las fechas únicas
                datasets: datasets
            },
            options: {
                scales: {
                    x: {
                        type: 'time', // Requiere adaptador de fechas
                        time: {
                            unit: 'day', // o 'week', 'month'
                            tooltipFormat: 'DD MMM YYYY',
                             parser: 'YYYY-MM-DD' // Asegúrate que el parser coincida con tu formato de fecha
                        },
                        title: { display: true, text: 'Fecha' }
                    },
                    y: { title: { display: true, text: 'Menciones' } }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}


async function loadPoliticianRankingChart() {
    const data = await fetchData('ranking_politicians.json');
    if (data) {
        new Chart(document.getElementById('politicianRankingChart'), {
            type: 'bar',
            data: {
                labels: data.map(item => item.politico),
                datasets: [{
                    label: 'Total Menciones',
                    data: data.map(item => item.menciones),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false } // Gráfico de barras horizontales
        });
    }
}

async function loadMainTopicsChart() {
    const data = await fetchData('temas_principales.json');
    if (data) {
        new Chart(document.getElementById('mainTopicsChart'), {
            type: 'bar', // O 'doughnut' / 'pie'
            data: {
                labels: data.map(item => item.tema),
                datasets: [{
                    label: 'Frecuencia del Tema',
                    data: data.map(item => item.frecuencia),
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }
}

async function loadCooccurrenceHeatmap() {
  try {
    const res = await fetch('cooccurrenceHeatmap.json'); 
    const raw = await res.json();

    const labels = raw.labels;
    const matrix = raw.matrix;

    const data = [];
    let maxVal = 0;

    for (let i = 0; i < labels.length; i++) {
      for (let j = 0; j < labels.length; j++) {
        const value = matrix[i][j];
        data.push({ x: j, y: i, v: value });
        if (value > maxVal) maxVal = value;
      }
    }

    const ctx = document.getElementById('cooccurrenceHeatmap').getContext('2d');

    new Chart(ctx, {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Coocurrencias entre políticos',
          data: data,
          backgroundColor: ctx => {
            const v = ctx.dataset.data[ctx.dataIndex].v;
            const alpha = v / maxVal;
            return `rgba(30, 144, 255, ${alpha})`; // azul con opacidad según valor
          },
          width: ({ chart }) => chart.chartArea.width / labels.length - 1,
          height: ({ chart }) => chart.chartArea.height / labels.length - 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            labels: labels,
            ticks: {
              color: '#ffffff',
              maxRotation: 90,
              minRotation: 45,
              autoSkip: false,
              font: { size: 10 }
            }
          },
          y: {
            type: 'category',
            labels: labels,
            offset: true,
            ticks: {
              color: '#ffffff',
              autoSkip: false,
              font: { size: 10 }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: ctx => {
                const x = labels[ctx[0].parsed.x];
                const y = labels[ctx[0].parsed.y];
                return `${y} / ${x}`;
              },
              label: ctx => `Coocurrencias: ${ctx.raw.v}`
            }
          },
          legend: {
            display: false
          }
        }
      }
    });

  } catch (error) {
    console.error("Error al cargar el heatmap de coocurrencia:", error);
  }
}

async function loadMediaPoliticiansChart() {
    const data = await fetchData('media_vs_politicians.json');
    if (data && data.length > 0) {
        // Este gráfico puede ser complejo: ¿Barras agrupadas? ¿Tabla?
        // Para barras agrupadas: Medios en eje X, series por político
        const medios = [...new Set(data.map(item => item.medio))];
        const politicos = [...new Set(data.map(item => item.politico))]; // O usar tu top_N_politicians

        const datasets = politicos.map(politico => {
            return {
                label: politico,
                data: medios.map(medio => {
                    const entry = data.find(d => d.medio === medio && d.politico === politico);
                    return entry ? entry.menciones : 0;
                }),
                backgroundColor: getRandomColor(),
            };
        });

        new Chart(document.getElementById('mediaPoliticiansChart'), {
            type: 'bar',
            data: {
                labels: medios,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Medio' } },
                    y: { title: { display: true, text: 'Menciones' }, beginAtZero: true }
                }
            }
        });
    }
}


// Cargar todos los datos y gráficos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadKPIs();
    loadArticlesTimeChart();
    loadMentionsPoliticianTimeChart();
    loadPoliticianRankingChart();
    loadMainTopicsChart();
    loadCooccurrenceHeatmap(); 
    loadMediaPoliticiansChart();
});