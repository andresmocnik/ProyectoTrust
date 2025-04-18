// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos ---
    const articlesContainer = document.getElementById('articles-container');
    const tooltipPopup = document.getElementById('tooltip-popup');
    const tooltipImg = document.getElementById('tooltip-img');
    const tooltipDesc = document.getElementById('tooltip-desc');
    // Elementos de la Vista Series Temporales
    const timeSeriesView = document.getElementById('timeseries-view');
    const politicianCheckboxesContainer = document.getElementById('politician-checkboxes');
    const politicianSearchFilter = document.getElementById('politician-search-filter');
    // const topPoliticiansSelect = document.getElementById('top-politicians-select'); // ELIMINADO
    // const updateChartsBtn = document.getElementById('update-charts-btn'); // ELIMINADO
    const chartsContainer = document.getElementById('charts-container');
    const chartsPlaceholder = document.getElementById('charts-placeholder');

    // Controles de búsqueda/filtro (Vista Noticias)
    const articleSearchInput = document.getElementById('article-search-input');
    const articleSearchBtn = document.getElementById('article-search-btn');
    const politicianSelect = document.getElementById('politician-select');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    // Botones de ordenación (Vista Noticias)
    const sortNewestBtn = document.getElementById('sort-newest-btn');
    const sortOldestBtn = document.getElementById('sort-oldest-btn');
    // Sidebar y sus controles
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    // Botones de navegación de la Sidebar
    const navButtons = document.querySelectorAll('.sidebar-nav .nav-button');
    // Contenedor principal y Body
    const pageContent = document.getElementById('page-content');
    const body = document.body;
    // Contenedores de Vistas Principales
    const newsFeedView = document.getElementById('news-feed-view');
    const graphView = document.getElementById('graph-view');
    // Contenedor del grafo
    const graphNetworkContainer = document.getElementById('mynetwork');

    // --- Variables Globales / Estado ---
    let allArticles = [];
    let graphInitialized = false;
    let currentView = 'news';
    let timeSeriesDataProcessed = false;
    let processedTimeSeriesData = {};
    let allTimeSeriesLabels = [];
    let politicianTotalMentions = {};
    let activeChartInstances = {};
    let visiblePoliticians = [];

    // --- Información para los Tooltips (personData) ---
    const personData = {
         // ... (Tu diccionario de datos para tooltips) ...
         "Javier Milei": { /*...*/ },
         "Lionel Messi": { /*...*/ },
         "Ricardo Zielinski": { /*...*/ },
         "Guillermo Coria": { /*...*/ },
         "Diego Carballo": { /*...*/ },
         "Martín Llaryora": { /*...*/ },
         "Juan Schiaretti": {
             name: "Juan Schiaretti",
             img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Juan_Schiaretti_%28cropped%29.jpg/440px-Juan_Schiaretti_%28cropped%29.jpg",
             desc: "Político argentino, miembro del Partido Justicialista, que desempeñó como Gobernador de la Provincia de Córdoba durante tres períodos no consecutivos (2007-2011, 2015-2019 y 2019-2023)."
         },
          "Alberto Fernández": {
              name: "Alberto Fernández",
              img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Alberto_Fernandez_en_2019.jpg/440px-Alberto_Fernandez_en_2019.jpg",
              desc: "Abogado y político argentino, Presidente de la Nación Argentina entre 2019 y 2023."
          },
         // ... (Añade más si es necesario) ...
    };

    // --- Funciones Auxiliares ---

    function createElement(tag, options = {}) {
        const element = document.createElement(tag);
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.textContent) element.textContent = options.textContent;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.src) element.src = options.src;
        if (options.alt) element.alt = options.alt;
        return element;
    }

    function parseDateString(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') { return null; }
        const months = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
            'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        const regex = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4}),(\d{1,2}):(\d{2})/;
        const match = dateStr.trim().toLowerCase().match(regex);
        if (match) {
            try {
                const day = parseInt(match[1], 10);
                const monthName = match[2];
                const year = parseInt(match[3], 10);
                const hours = parseInt(match[4], 10);
                const minutes = parseInt(match[5], 10);
                const monthNumber = months[monthName];
                if (monthNumber !== undefined && !isNaN(day) && day > 0 && day <= 31 && !isNaN(year) && year > 1900 && !isNaN(hours) && hours >= 0 && hours <= 23 && !isNaN(minutes) && minutes >= 0 && minutes <= 59) {
                    const date = new Date(Date.UTC(year, monthNumber, day, hours, minutes));
                    if (!isNaN(date.getTime()) && date.getUTCDate() === day && date.getUTCMonth() === monthNumber) { return date; }
                    else { console.warn(`Fecha inválida post-creación: "${dateStr}"`); return null; }
                } else { console.warn(`Componentes inválidos: "${dateStr}"`); return null; }
            } catch (e) { console.error(`Error parseando: "${dateStr}"`, e); return null; }
        }
        console.warn(`Formato no reconocido: "${dateStr}"`);
        return null;
    }

    function getWeekStartDate(d) {
        const date = new Date(d.getTime());
        const day = date.getUTCDay();
        const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setUTCDate(diff));
        return monday.toISOString().split('T')[0];
    }

    function stringToHslColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
        const h = hash % 360;
        const s = 70 + (hash % 10);
        const l = 45 + (hash % 10);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    // --- Funciones de Procesamiento y Gráficos (Series Temporales) ---

    function processDataForTimeSeries() {
        console.log("Procesando datos para series temporales...");
        processedTimeSeriesData = {};
        politicianTotalMentions = {};
        let minDate = null;
        let maxDate = new Date();

        allArticles.forEach(article => {
            const articleDate = parseDateString(article.fecha_hora);
            if (articleDate) {
                if (!minDate || articleDate < minDate) { minDate = articleDate; }
                const weekStart = getWeekStartDate(articleDate);
                (article.personas_detectadas_normalizadas || []).forEach(politician => {
                    if (!politician?.trim()) return;
                    if (!processedTimeSeriesData[politician]) {
                        processedTimeSeriesData[politician] = {};
                        politicianTotalMentions[politician] = 0;
                    }
                    processedTimeSeriesData[politician][weekStart] = (processedTimeSeriesData[politician][weekStart] || 0) + 1;
                    politicianTotalMentions[politician]++;
                });
            }
        });

        if (!minDate) {
            console.warn("No se encontraron fechas válidas. Usando último mes.");
            minDate = new Date(); minDate.setMonth(minDate.getMonth() - 1);
        }

        allTimeSeriesLabels = [];
        let currentDate = new Date(minDate.getTime());
        while (currentDate <= maxDate) {
            const weekLabel = getWeekStartDate(currentDate);
            if (allTimeSeriesLabels.length === 0 || allTimeSeriesLabels[allTimeSeriesLabels.length - 1] !== weekLabel) {
                allTimeSeriesLabels.push(weekLabel);
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        allTimeSeriesLabels.sort();

        timeSeriesDataProcessed = true;
        console.log(`Procesamiento TS completo. Rango: ${minDate.toISOString().split('T')[0]} a ${maxDate.toISOString().split('T')[0]}. ${allTimeSeriesLabels.length} semanas.`);
        console.log(`Políticos TS encontrados: ${Object.keys(politicianTotalMentions).length}`);
    }

    function createOrUpdateChartForPolitician(politician, labels, dataPoints) {
        if (!chartsContainer) return;
        const chartData = labels.map(label => dataPoints[label] || 0);
        const color = stringToHslColor(politician);
        const dataset = {
            label: politician, data: chartData, borderColor: color,
            backgroundColor: color.replace(')', ', 0.1)'), fill: true, tension: 0.1,
            pointRadius: 2, pointHoverRadius: 5
        };
        let chartContainer = document.getElementById(`chart-container-${politician.replace(/\s+/g, '-')}`);
        let canvas;

        if (chartContainer) {
            canvas = chartContainer.querySelector('canvas');
            const existingChart = activeChartInstances[politician];
            if (existingChart) {
                existingChart.data.labels = labels;
                existingChart.data.datasets[0] = dataset;
                existingChart.update();
                console.log(`Gráfico actualizado para ${politician}`);
            } else { console.warn(`Contenedor hallado para ${politician}, pero no instancia Chart.js.`); }
        } else {
            chartContainer = createElement('div', { className: 'chart-container', id: `chart-container-${politician.replace(/\s+/g, '-')}` });
            canvas = createElement('canvas');
            chartContainer.appendChild(canvas);
            chartsContainer.appendChild(chartContainer);
            try {
                const ctx = canvas.getContext('2d');
                const newChart = new Chart(ctx, {
                    type: 'line', data: { labels: labels, datasets: [dataset] },
                    options: {
                        responsive: true, maintainAspectRatio: true,
                        plugins: { legend: { position: 'top', labels: { font: { size: 14 } } },
                            title: { display: true, text: `Menciones Semanales: ${politician}`, font: { size: 16 } },
                            tooltip: { mode: 'index', intersect: false, } },
                        scales: { x: { type: 'time', time: { unit: 'week', tooltipFormat: 'DD MMM YYYY', displayFormats: { week: 'DD MMM' } }, title: { display: true, text: 'Semana de Inicio' } },
                            y: { beginAtZero: true, title: { display: true, text: 'Número de Menciones' }, ticks: { stepSize: 1, precision: 0 } } },
                        interaction: { mode: 'nearest', axis: 'x', intersect: false }
                    }
                });
                activeChartInstances[politician] = newChart;
                console.log(`Gráfico creado para ${politician}`);
            } catch (error) {
                console.error(`Error creando gráfico para ${politician}:`, error);
                chartContainer.innerHTML = `<p style="color: red;">Error al crear gráfico para ${politician}.</p>`;
            }
        }
    }

    function removeObsoleteCharts(politiciansToShow) {
        Object.keys(activeChartInstances).forEach(politician => {
            if (!politiciansToShow.includes(politician)) {
                activeChartInstances[politician]?.destroy();
                document.getElementById(`chart-container-${politician.replace(/\s+/g, '-')}`)?.remove();
                delete activeChartInstances[politician];
                console.log(`Gráfico eliminado para ${politician}`);
            }
        });
         // Limpiar también contenedores sin datos si ya no están seleccionados
         const noDataContainers = chartsContainer.querySelectorAll('.chart-no-data');
         noDataContainers.forEach(container => {
             const containerId = container.id;
             // Extraer nombre del político del ID (simplificado, asume formato 'chart-container-Nombre-Apellido')
             const politicianNameFromId = containerId.replace('chart-container-', '').replace(/-/g, ' ');
             if (!politiciansToShow.includes(politicianNameFromId)) {
                 container.remove();
             }
         });
    }

    function updateTimeSeriesCharts() {
        if (!timeSeriesDataProcessed) { processDataForTimeSeries(); }
        if (!politicianCheckboxesContainer || !chartsContainer) return;

        const selectedPoliticians = visiblePoliticians.filter(Boolean);

        console.log("Actualizando gráficos TS para:", selectedPoliticians);

        removeObsoleteCharts(selectedPoliticians);

        if (selectedPoliticians.length === 0) {
            if (chartsPlaceholder) {
                chartsPlaceholder.style.display = 'block';
                chartsPlaceholder.textContent = "Ningún político seleccionado. Por favor, selecciona uno o más de la lista.";
            }
            return;
        }

        if (chartsPlaceholder) { chartsPlaceholder.style.display = 'none'; }

        selectedPoliticians.forEach(politician => {
            if (processedTimeSeriesData[politician]) {
                createOrUpdateChartForPolitician(politician, allTimeSeriesLabels, processedTimeSeriesData[politician]);
            } else {
                console.warn(`No hay datos TS para ${politician}.`);
                let chartContainer = document.getElementById(`chart-container-${politician.replace(/\s+/g, '-')}`);
                 if (!chartContainer) { // Crear contenedor 'sin datos' solo si no existe
                     chartContainer = createElement('div', {
                         className: 'chart-container chart-no-data', // Añadir clase para posible estilo/limpieza
                         id: `chart-container-${politician.replace(/\s+/g, '-')}`
                     });
                     chartContainer.innerHTML = `<p style="text-align: center; font-weight: bold;">${politician}</p><p style="text-align: center; color: #888;">No se encontraron menciones en el período analizado.</p>`;
                     chartsContainer.appendChild(chartContainer);
                 }
            }
        });
    }

    function renderPoliticianSelectors() {
        const container = document.getElementById('politician-selectors');
        if (!container || !timeSeriesDataProcessed) return;
    
        container.innerHTML = ''; // limpiar anteriores
    
        for (let i = 0; i < 4; i++) {
            const selected = visiblePoliticians[i] || '';
    
            const div = document.createElement('div');
            div.style.flex = '1 1 45%';
    
            const label = document.createElement('label');
            label.textContent = `Político ${i + 1}:`;
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            div.appendChild(label);
    
            const select = document.createElement('select');
            select.style.width = '100%';
            select.dataset.index = i;
    
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Seleccionar --';
            select.appendChild(defaultOption);
    
            Object.keys(politicianTotalMentions)
                .sort((a, b) => (politicianTotalMentions[b] - politicianTotalMentions[a]))
                .forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = `${name} (${politicianTotalMentions[name]})`;
                    if (name === selected) option.selected = true;
                    select.appendChild(option);
                });
    
            select.addEventListener('change', () => {
                visiblePoliticians[i] = select.value || null;
                updateTimeSeriesCharts();
            });
    
            div.appendChild(select);
            container.appendChild(div);
        }
    }
    

    // --- Funciones de Display y Renderizado (Vista Noticias) ---

    function populatePoliticianFilter(articles) { // Para el select de la vista de noticias
        const politicianNames = new Set();
        articles.forEach(article => {
            (article.personas_detectadas_normalizadas || []).forEach(name => {
                if (name?.trim()) politicianNames.add(name.trim());
            });
        });
        const sortedNames = Array.from(politicianNames).sort();
        if (politicianSelect) {
            politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
            sortedNames.forEach(name => {
                politicianSelect.appendChild(createElement('option', { value: name, textContent: name }));
            });
            console.log(`Filtro Noticias poblado con ${sortedNames.length} políticos.`);
        } else { console.warn("Elemento 'politician-select' no encontrado."); }
    }

    function displayArticle(article, highlightedPolitician = null) {
        const articleDiv = createElement('div', { className: 'article' });
        articleDiv.appendChild(createElement('div', { className: 'article-meta', textContent: `Sección: ${article.seccion || 'N/A'}` }));
        articleDiv.appendChild(createElement('h2', { textContent: article.titulo || 'Sin Título' }));
        if (article.subtitulo) articleDiv.appendChild(createElement('h3', { textContent: article.subtitulo }));
        const metaDiv = createElement('div', { className: 'article-meta' });
        metaDiv.appendChild(createElement('span', { textContent: `Autor: ${article.autor || 'N/A'}` }));
        metaDiv.appendChild(createElement('span', { textContent: `Fecha: ${article.fecha_hora || 'N/A'}` }));
        articleDiv.appendChild(metaDiv);
        if (article.link_img) articleDiv.appendChild(createElement('img', { className: 'article-img', src: article.link_img, alt: article.titulo || 'Imagen' }));
        if (article.caption_img) articleDiv.appendChild(createElement('figcaption', { className: 'article-img-caption', textContent: article.caption_img }));
        const bodyDiv = createElement('div', { className: 'article-body' });
        const bodyContent = article.cuerpo || (Array.isArray(article.cuerpo_raw_html) ? article.cuerpo_raw_html.join('') : '');
        const paragraphs = bodyContent.split('\n').filter(p => p.trim() !== '');
        const normalizedPersonsInArticle = article.personas_detectadas_normalizadas || [];
        if (article.cuerpo_raw_html && !article.cuerpo) {
            let processedHTML = bodyContent;
            normalizedPersonsInArticle.forEach(normPersonName => {
                if (!normPersonName || typeof normPersonName !== 'string') return;
                const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                processedHTML = processedHTML.replace(regex, (match) => {
                    let spanClass = 'person-tooltip';
                    if (highlightedPolitician && normPersonName === highlightedPolitician) { spanClass += ' highlighted-person'; }
                    if (match.includes('<') || match.includes('>')) return match;
                    return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                });
            });
            bodyDiv.innerHTML = processedHTML;
        } else {
            paragraphs.forEach(pText => {
                let processedHTML = pText;
                normalizedPersonsInArticle.forEach(normPersonName => {
                     if (!normPersonName || typeof normPersonName !== 'string') return;
                     const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                     const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                     processedHTML = processedHTML.replace(regex, (match) => {
                        let spanClass = 'person-tooltip';
                        if (highlightedPolitician && normPersonName === highlightedPolitician) { spanClass += ' highlighted-person'; }
                         return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                    });
                });
                bodyDiv.appendChild(createElement('p', { innerHTML: processedHTML }));
            });
        }
        articleDiv.appendChild(bodyDiv);
        if (articlesContainer) articlesContainer.appendChild(articleDiv);
    }

    function setupTooltipListeners() {
        if (!articlesContainer || !tooltipPopup || !tooltipImg || !tooltipDesc) return;
        articlesContainer.addEventListener('mouseover', async (event) => {
            const targetSpan = event.target.closest('.person-tooltip');
            if (!targetSpan) return;
            const personKey = targetSpan.getAttribute('data-person-key');
            if (!personKey) return;
            tooltipPopup.style.display = 'block';
            tooltipImg.style.display = 'none'; tooltipImg.src = '';
            tooltipImg.alt = 'Cargando...'; tooltipDesc.textContent = 'Buscando info...';
            const manualData = personData[personKey];
            if (manualData) {
                tooltipDesc.textContent = manualData.desc || 'N/A';
                if (manualData.img) { tooltipImg.src = manualData.img; tooltipImg.alt = manualData.name || personKey; tooltipImg.style.display = 'block'; }
                return;
            }
            try { // Wikipedia fallback
                const wikiApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&titles=${encodeURIComponent(personKey)}&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=100&redirects=1`;
                const response = await fetch(wikiApiUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const wikiData = await response.json(); const pages = wikiData.query.pages; const pageId = Object.keys(pages)[0];
                if (pageId && pageId !== "-1" && pages[pageId]) {
                    const page = pages[pageId]; const description = page.extract; const imageUrl = page.thumbnail?.source;
                    tooltipDesc.textContent = description ? `${description.substring(0, 250)}${description.length > 250 ? '...' : ''}` : 'Info no encontrada.';
                    if (imageUrl) { tooltipImg.src = imageUrl; tooltipImg.alt = page.title || personKey; tooltipImg.style.display = 'block'; }
                } else { tooltipDesc.textContent = 'Info no encontrada.'; }
            } catch (error) { console.error(`Error Wiki API ${personKey}:`, error); tooltipDesc.textContent = 'Error buscando info.'; }
        });
        articlesContainer.addEventListener('mouseout', (event) => { if (event.target.closest('.person-tooltip')) { tooltipPopup.style.display = 'none'; } });
        document.addEventListener('mousemove', (event) => { // Mover tooltip
            if (tooltipPopup.style.display === 'block') {
                let newX = event.pageX + 15, newY = event.pageY + 10; const { offsetWidth: tipW, offsetHeight: tipH } = tooltipPopup; const { innerWidth: vpW, innerHeight: vpH, scrollX: sX, scrollY: sY } = window;
                if (newX + tipW > vpW + sX) newX = event.pageX - tipW - 15; if (newX < sX) newX = sX + 5; if (newY + tipH > vpH + sY) newY = event.pageY - tipH - 10; if (newY < sY) newY = sY + 5;
                tooltipPopup.style.left = `${newX}px`; tooltipPopup.style.top = `${newY}px`;
            }
        });
    }

    function renderArticles(articlesToDisplay, politicianToHighlight = null) {
        console.log(`Renderizando ${articlesToDisplay.length} artículos.`);
        if (!articlesContainer) return;
        articlesContainer.innerHTML = '';
        if (articlesToDisplay.length === 0) { articlesContainer.innerHTML = '<p>No se encontraron artículos.</p>'; return; }
        articlesToDisplay.forEach(article => displayArticle(article, politicianToHighlight));
    }

    // --- Lógica de Búsqueda, Filtro y Ordenación (Vista Noticias) ---

    function handleArticleSearch() {
        if (!articleSearchInput || !politicianSelect) return;
        const searchTerm = articleSearchInput.value.trim().toLowerCase();
        politicianSelect.value = "";
        const filteredArticles = !searchTerm ? allArticles : allArticles.filter(article =>
            (article.titulo || '').toLowerCase().includes(searchTerm) ||
            (article.subtitulo || '').toLowerCase().includes(searchTerm) ||
            (article.cuerpo || '').toLowerCase().includes(searchTerm)
        );
        renderArticles(filteredArticles);
    }

    function handlePoliticianFilter() {
        if (!politicianSelect || !articleSearchInput) return;
        const selectedPolitician = politicianSelect.value;
        articleSearchInput.value = "";
        const filteredArticles = !selectedPolitician ? allArticles : allArticles.filter(article =>
            (article.personas_detectadas_normalizadas || []).includes(selectedPolitician)
        );
        renderArticles(filteredArticles, selectedPolitician);
    }

    function resetView() { // Para vista de noticias
        if (articleSearchInput) articleSearchInput.value = '';
        if (politicianSelect) politicianSelect.value = '';
        renderArticles(allArticles);
    }

    function sortArticlesByDate(ascending = false) {
        console.log(`Ordenando artículos por fecha: ${ascending ? 'asc' : 'desc'}`);
        allArticles.sort((a, b) => {
            const dateA = parseDateString(a.fecha_hora);
            const dateB = parseDateString(b.fecha_hora);
            if (!dateA && !dateB) return 0; if (!dateA) return 1; if (!dateB) return -1; // Inválidas al final
            return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        if (articleSearchInput) articleSearchInput.value = ''; if (politicianSelect) politicianSelect.value = '';
        renderArticles(allArticles);
        articlesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Lógica de Sidebar y Navegación ---

    function openSidebar() { /* ... (código sin cambios) ... */ if (sidebar?.classList.contains('visible')) return; if (sidebar && body) { sidebar.classList.add('visible'); body.classList.add('sidebar-visible'); } }
    function closeSidebar() { /* ... (código sin cambios) ... */ if (sidebar && body) { sidebar.classList.remove('visible'); body.classList.remove('sidebar-visible'); } }

    function switchView(viewName) {
        if (!body || currentView === viewName) return;
        console.log(`Cambiando a vista: ${viewName}`);
        currentView = viewName;
        body.classList.remove('view-news', 'view-graph', 'view-timeseries');
        body.classList.add(`view-${viewName}`);
        navButtons.forEach(button => { button.classList.toggle('active', button.getAttribute('data-view') === viewName); });

        if (viewName === 'graph' && !graphInitialized) {
            loadAndDrawGraph();
        } else if (viewName === 'timeseries') {
            if (!timeSeriesDataProcessed) {
                processDataForTimeSeries();
            
                // Obtener los 4 más mencionados
                visiblePoliticians = Object.keys(politicianTotalMentions)
                    .sort((a, b) => politicianTotalMentions[b] - politicianTotalMentions[a])
                    .slice(0, 4);
            }
            
            renderPoliticianSelectors();
            updateTimeSeriesCharts();
            
            // No llamamos updateTimeSeriesCharts() aquí siempre,
            // se actualizará con el evento 'change' de los checkboxes.
        }
        closeSidebar();
    }

    // --- Lógica del Grafo ---

    function loadAndDrawGraph() { /* ... (código sin cambios significativos, asegúrate que las opciones y el fetch estén bien) ... */
        if (!graphNetworkContainer) { console.error("Contenedor '#mynetwork' no encontrado."); if (graphView) graphView.innerHTML = '<p>Error: Contenedor grafo no disponible.</p>'; graphInitialized = true; return; }
        graphNetworkContainer.innerHTML = '<p>Cargando grafo...</p>';
        const options = { /* ... Tus opciones de Vis.js ... */
             nodes: { shape: 'dot', scaling: { min: 10, max: 50, label: { enabled: true, min: 14, max: 30 } }, font: { size: 12, face: 'Tahoma' }, borderWidth: 1.5, color: { border: '#2B7CE9', background: '#D2E5FF', highlight: { border: '#2B7CE9', background: '#F0F8FF' }, hover: { border: '#2B7CE9', background: '#E0F0FF' } } },
             edges: { width: 0.15, scaling: { min: 0.5, max: 5 }, color:{ color:'#cccccc', highlight:'#888888', hover: '#aaaaaa', inherit: 'from', opacity:0.7 }, smooth: { type: "continuous", roundness: 0.3 } },
             physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -45, centralGravity: 0.006, springLength: 110, springConstant: 0.09, damping: 0.5, avoidOverlap: 0.4 }, minVelocity: 0.75, stabilization: { enabled: true, iterations: 400, updateInterval: 25, fit: true } },
             interaction: { hover: true, tooltipDelay: 300, navigationButtons: false, keyboard: true, hideEdgesOnDrag: true, dragNodes: true },
             layout:{ improvedLayout:true }
        };
        fetch('graph_data.json')
            .then(response => response.ok ? response.json() : Promise.reject(`Error HTTP: ${response.status}`))
            .then(graphData => {
                 if (!graphData?.nodes || !graphData?.edges) throw new Error('Formato grafo inválido.');
                 graphNetworkContainer.innerHTML = '';
                 const nodesDataSet = new vis.DataSet(graphData.nodes);
                 const edgesDataSet = new vis.DataSet(graphData.edges);
                 const network = new vis.Network(graphNetworkContainer, { nodes: nodesDataSet, edges: edgesDataSet }, options);
                 network.once("stabilizationIterationsDone", () => { console.log("Estabilización grafo ok."); network.fit(); });
                 network.on("click", function (params) { /* ... (lógica de clic en nodo/arista sin cambios) ... */
                    if (params.nodes.length > 0) { const nodeId = params.nodes[0]; const nodeData = nodesDataSet.get(nodeId); if (nodeData && nodeData.id && politicianSelect) { const opt = politicianSelect.querySelector(`option[value="${nodeData.id}"]`); if(opt){ switchView('news'); politicianSelect.value = nodeData.id; handlePoliticianFilter(); setTimeout(() => articlesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); } else { alert(`Clic en ${nodeData.id}, no hallado en filtro.`);}}} else if (params.edges.length > 0) { const edgeId = params.edges[0]; const edgeData = edgesDataSet.get(edgeId); if(edgeData){ const fromNode = nodesDataSet.get(edgeData.from); const toNode = nodesDataSet.get(edgeData.to); if(fromNode && toNode){ alert(`Relación: ${fromNode.label} - ${toNode.label}\nJuntos en ${edgeData.value} artículos.`);}}}
                 });
                 console.log("Grafo dibujado.");
                 graphInitialized = true;
             })
            .catch(error => { console.error('Error grafo:', error); graphNetworkContainer.innerHTML = `<p>Error grafo: ${error.message}.</p>`; graphInitialized = true; });
    }

    // --- Inicialización de la Aplicación ---
    function initializeApp() {
        if (!body || !pageContent || !newsFeedView || !graphView || !sidebar || !openSidebarBtn || !closeSidebarBtn || !articlesContainer) {
            console.error("DOM incompleto."); document.body.innerHTML = '<p>Error: Estructura página incompleta.</p>'; return;
        }

        // Listeners básicos (Sidebar, Navegación, Tooltips)
        openSidebarBtn?.addEventListener('click', openSidebar);
        closeSidebarBtn?.addEventListener('click', closeSidebar);
        navButtons.forEach(button => button.addEventListener('click', () => switchView(button.getAttribute('data-view'))));
        document.addEventListener('click', (event) => { // Cerrar sidebar al clicar fuera
            if (!sidebar?.classList.contains('visible')) return;
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnOpenBtn = openSidebarBtn?.contains(event.target);
            const isClickInsideTooltip = tooltipPopup?.contains(event.target);
            if (!isClickInsideSidebar && !isClickOnOpenBtn && !isClickInsideTooltip) { closeSidebar(); }
        });
        setupTooltipListeners(); // Configurar tooltips (ahora con delegación)

        // Cargar datos de noticias
        fetch('noticias_procesadas.json')
            .then(response => response.ok ? response.json() : Promise.reject(`Error HTTP ${response.status}`))
            .then(data => {
                if (!Array.isArray(data)) throw new Error('Datos noticias no son array.');
                allArticles = data;
                console.log(`Cargados ${allArticles.length} artículos.`);

                // Poblar filtro (vista noticias) y render inicial
                populatePoliticianFilter(allArticles);
                renderArticles(allArticles);

                // Listeners Vista Noticias
                articleSearchBtn?.addEventListener('click', handleArticleSearch);
                articleSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleArticleSearch(); });
                politicianSelect?.addEventListener('change', handlePoliticianFilter);
                resetFilterBtn?.addEventListener('click', resetView);
                sortNewestBtn?.addEventListener('click', () => sortArticlesByDate(false));
                sortOldestBtn?.addEventListener('click', () => sortArticlesByDate(true));

                // Listener para Checkboxes Vista Series Temporales (añadido aquí)
                if (politicianCheckboxesContainer) {
                    politicianCheckboxesContainer.addEventListener('change', (event) => {
                        if (event.target && event.target.type === 'checkbox') {
                            console.log(`Checkbox cambiado: ${event.target.value}, ${event.target.checked}`);
                            updateTimeSeriesCharts(); // <-- Actualiza al cambiar checkbox
                        }
                    });
                } else { console.warn("Contenedor checkboxes no encontrado."); }
                // El listener para el filtro de búsqueda de checkboxes se añade en populatePoliticianCheckboxes

                // Establecer la vista inicial
                switchView('news');

            })
            .catch(error => {
                console.error('Error inicializando app:', error);
                if (newsFeedView) newsFeedView.innerHTML = `<p>Error fatal: ${error.message}.</p>`;
                // Deshabilitar controles si falla la carga
                [articleSearchInput, articleSearchBtn, politicianSelect, resetFilterBtn, sortNewestBtn, sortOldestBtn].forEach(el => { if (el) el.disabled = true; });
            });
    }

    // --- Ejecutar Inicialización ---
    initializeApp();

}); // Fin del addEventListener('DOMContentLoaded')