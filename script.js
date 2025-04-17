// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos ---
    const articlesContainer = document.getElementById('articles-container');
    const tooltipPopup = document.getElementById('tooltip-popup');
    const tooltipImg = document.getElementById('tooltip-img');
    const tooltipDesc = document.getElementById('tooltip-desc');
    // Controles de búsqueda/filtro
    const articleSearchInput = document.getElementById('article-search-input');
    const articleSearchBtn = document.getElementById('article-search-btn');
    const politicianSelect = document.getElementById('politician-select');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    // Sidebar y sus controles
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    // NUEVO: Botones de navegación de la Sidebar
    const navButtons = document.querySelectorAll('.sidebar-nav .nav-button');
    // Contenedor principal y Body
    const pageContent = document.getElementById('page-content');
    const body = document.body;
    // NUEVO: Contenedores de Vistas Principales
    const newsFeedView = document.getElementById('news-feed-view');
    const graphView = document.getElementById('graph-view');
    // Contenedor del grafo (ahora dentro de graph-view)
    const graphNetworkContainer = document.getElementById('mynetwork');

    let graphInitialized = false; // Para cargar el grafo solo una vez
    let allArticles = []; // Almacenar todos los artículos cargados
    let currentView = 'news'; // Mantener estado de la vista actual ('news' o 'graph')

    // --- Información para los Tooltips (personData) ---
    // ¡ASEGÚRATE QUE LAS CLAVES COINCIDAN CON LOS NOMBRES NORMALIZADOS DE PYTHON!
    const personData = {
        "Javier Milei": {
            name: "Javier Milei",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Javier_Milei_%28cropped%29.jpg/440px-Javier_Milei_%28cropped%29.jpg",
            desc: "Economista y político argentino, actual Presidente de la Nación Argentina desde diciembre de 2023."
        },
        "Lionel Messi": {
            name: "Lionel Messi",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/440px-Lionel_Messi_20180626.jpg",
            desc: "Futbolista argentino considerado uno de los mejores de todos los tiempos. Juega como delantero o centrocampista."
        },
        "Ricardo Zielinski": {
            name: "Ricardo Zielinski",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg/440px-Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg",
            desc: "Exfutbolista y actual director técnico de fútbol argentino. Ha dirigido varios clubes importantes."
        },
         "Guillermo Coria": {
            name: "Guillermo Coria",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Guillermo_Coria_Roland_Garros_2005.jpg/440px-Guillermo_Coria_Roland_Garros_2005.jpg",
            desc: "Ex tenista profesional argentino y actual capitán del equipo argentino de Copa Davis."
        },
        "Diego Carballo": {
            name: "Diego Carballo",
            img:"https://i0.wp.com/eldiariodelpueblo.com.ar/wp-content/uploads/2024/02/409558962_755350239946088_7615995329144555656_n.jpg?w=1000&ssl=1",
            desc: "​Diego Carballo es el actual intendente de la ciudad de Villa del Rosario, ubicada en la provincia de Córdoba, Argentina. Es contador público y pertenece al partido Juntos por el Cambio. Asumió el cargo tras las elecciones del 4 de junio de 2023."
        },
        "Martín Llaryora": {
            name: "Martín Llaryora",
            img: "https://media.diariopopular.com.ar/p/4f463a3d2f84cd68a81f5e4cde1bac27/adjuntos/143/imagenes/008/093/0008093476/1140x0/smart/martin-llaryora-foto-2jpg.jpg",
            desc: "Político argentino, actual Gobernador de la Provincia de Córdoba desde diciembre de 2023."
        },
        // ----> AÑADE AQUÍ MÁS PERSONAS CON CLAVES EXACTAS A LOS NOMBRES NORMALIZADOS <----
        // "Nombre Normalizado": { name: "...", img: "...", desc: "..." },
    };

    // --- Funciones Auxiliares (createElement) ---
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

    // --- Función para poblar el filtro de políticos ---
    function populatePoliticianFilter(articles) {
        const politicianNames = new Set();
        articles.forEach(article => {
            (article.personas_detectadas_normalizadas || []).forEach(name => {
                if (name?.trim()) politicianNames.add(name.trim());
            });
        });
        const sortedNames = Array.from(politicianNames).sort();

        if(politicianSelect) {
            politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
            sortedNames.forEach(name => {
                politicianSelect.appendChild(createElement('option', { value: name, textContent: name }));
            });
            console.log(`Filtro poblado con ${sortedNames.length} políticos.`);
        } else {
            console.warn("Elemento 'politician-select' no encontrado.");
        }
    }

    // --- displayArticle: Muestra un artículo individual ---
    function displayArticle(article, highlightedPolitician = null) {
        const articleDiv = createElement('div', { className: 'article' });
        articleDiv.appendChild(createElement('div', { className: 'article-meta', textContent: `Sección: ${article.seccion || 'N/A'}` }));
        articleDiv.appendChild(createElement('h2', { textContent: article.titulo || 'Sin Título' }));
        if (article.subtitulo) articleDiv.appendChild(createElement('h3', { textContent: article.subtitulo }));
        const metaDiv = createElement('div', { className: 'article-meta' });
        metaDiv.appendChild(createElement('span', { textContent: `Autor: ${article.autor || 'N/A'}` }));
        metaDiv.appendChild(createElement('span', { textContent: `Fecha: ${article.fecha_hora || 'N/A'}` }));
        articleDiv.appendChild(metaDiv);
        if (article.link_img) articleDiv.appendChild(createElement('img', { className: 'article-img', src: article.link_img, alt: article.titulo || 'Imagen de noticia' }));
        if (article.caption_img) articleDiv.appendChild(createElement('figcaption', { className: 'article-img-caption', textContent: article.caption_img }));

        const bodyDiv = createElement('div', { className: 'article-body' });
        const paragraphs = (article.cuerpo || '').split('\n').filter(p => p.trim() !== '');
        const normalizedPersonsInArticle = article.personas_detectadas_normalizadas || [];

        paragraphs.forEach(pText => {
            let processedHTML = pText;
            normalizedPersonsInArticle.forEach(normPersonName => {
                const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                processedHTML = processedHTML.replace(regex, (match) => {
                    let spanClass = 'person-tooltip';
                    if (highlightedPolitician && normPersonName === highlightedPolitician) {
                        spanClass += ' highlighted-person';
                    }
                    return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                });
            });
            bodyDiv.appendChild(createElement('p', { innerHTML: processedHTML }));
        });
        articleDiv.appendChild(bodyDiv);

        if (articlesContainer) articlesContainer.appendChild(articleDiv);
    }

    // --- setupTooltipListeners: Configura los popups de información ---
    function setupTooltipListeners() {
        if (!articlesContainer || !tooltipPopup || !tooltipImg || !tooltipDesc) return;

        const personSpans = articlesContainer.querySelectorAll('.person-tooltip');
        personSpans.forEach(span => {
            span.addEventListener('mouseover', async (event) => {
                const personKey = event.target.getAttribute('data-person-key');
                tooltipPopup.style.display = 'block';
                tooltipImg.style.display = 'none'; // Ocultar img por defecto
                tooltipImg.src = '';
                tooltipImg.alt = 'Cargando...';
                tooltipDesc.textContent = 'Buscando información...';

                const manualData = personData[personKey];
                if (manualData) {
                    tooltipDesc.textContent = manualData.desc;
                    if(manualData.img) {
                        tooltipImg.src = manualData.img;
                        tooltipImg.alt = manualData.name;
                        tooltipImg.style.display = 'block';
                    }
                    return;
                }

                try {
                    const wikiApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&titles=${encodeURIComponent(personKey)}&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=100&redirects=1`;
                    const response = await fetch(wikiApiUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const wikiData = await response.json();
                    const pages = wikiData.query.pages;
                    const pageId = Object.keys(pages)[0];

                    if (pageId && pageId !== "-1" && pages[pageId]) {
                        const page = pages[pageId];
                        const description = page.extract;
                        const imageUrl = page.thumbnail?.source;
                        tooltipDesc.textContent = description ? `${description.substring(0, 250)}${description.length > 250 ? '...' : ''}` : 'No se encontró descripción.';
                        if (imageUrl) {
                            tooltipImg.src = imageUrl;
                            tooltipImg.alt = page.title || personKey;
                            tooltipImg.style.display = 'block';
                        }
                    } else {
                        tooltipDesc.textContent = 'Información no encontrada.';
                    }
                } catch (error) {
                    console.error(`Error Wikipedia API para ${personKey}:`, error);
                    tooltipDesc.textContent = 'Error al buscar info.';
                }
            });

            span.addEventListener('mouseout', () => { tooltipPopup.style.display = 'none'; });

            span.addEventListener('mousemove', (event) => {
                if (tooltipPopup.style.display === 'block') {
                    let newX = event.pageX + 15, newY = event.pageY + 10;
                    const { offsetWidth: tipW, offsetHeight: tipH } = tooltipPopup;
                    const { innerWidth: vpW, innerHeight: vpH, scrollX: sX, scrollY: sY } = window;
                    if (newX + tipW > vpW + sX) newX = event.pageX - tipW - 15;
                    if (newX < sX) newX = sX + 5;
                    if (newY + tipH > vpH + sY) newY = event.pageY - tipH - 10;
                    if (newY < sY) newY = sY + 5;
                    tooltipPopup.style.left = `${newX}px`;
                    tooltipPopup.style.top = `${newY}px`;
                }
            });
        });
    }

    // --- Función central para renderizar artículos ---
    function renderArticles(articlesToDisplay, politicianToHighlight = null) {
        console.log(`Renderizando ${articlesToDisplay.length} artículos.`);
        if (!articlesContainer) return;
        articlesContainer.innerHTML = '';
        if (articlesToDisplay.length === 0) {
            articlesContainer.innerHTML = '<p>No se encontraron artículos que coincidan.</p>';
            return;
        }
        articlesToDisplay.forEach(article => displayArticle(article, politicianToHighlight));
        setupTooltipListeners();
    }

    // --- Lógica para el Buscador de Artículos ---
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

    // --- Lógica para el Filtro de Políticos ---
    function handlePoliticianFilter() {
        if (!politicianSelect || !articleSearchInput) return;
        const selectedPolitician = politicianSelect.value;
        articleSearchInput.value = "";
        const filteredArticles = !selectedPolitician ? allArticles : allArticles.filter(article =>
            (article.personas_detectadas_normalizadas || []).includes(selectedPolitician)
        );
        renderArticles(filteredArticles, selectedPolitician);
    }

    // --- Lógica para Resetear la Vista de Noticias ---
    function resetView() {
        if(articleSearchInput) articleSearchInput.value = '';
        if(politicianSelect) politicianSelect.value = '';
        renderArticles(allArticles);
    }

    // --- Lógica para Abrir/Cerrar Barra Lateral ---
    function openSidebar() {
        if (sidebar?.classList.contains('visible')) return; // Ya está abierta
        if (sidebar && body) {
            sidebar.classList.add('visible');
            body.classList.add('sidebar-visible');
        }
    }
    function closeSidebar() {
        if (sidebar && body) {
            sidebar.classList.remove('visible');
            body.classList.remove('sidebar-visible');
        }
    }

    // --- Función para Cambiar de Vista Principal ---
    function switchView(viewName) {
        if (!body || currentView === viewName) return;
        console.log(`Cambiando a vista: ${viewName}`);
        currentView = viewName;

        body.classList.remove('view-news', 'view-graph'); // Limpiar clases anteriores
        body.classList.add(`view-${viewName}`); // Añadir clase de la nueva vista

        navButtons.forEach(button => { // Actualizar botones de navegación
            button.classList.toggle('active', button.getAttribute('data-view') === viewName);
        });

        // Cargar el grafo si es necesario
        if (viewName === 'graph' && !graphInitialized) {
            loadAndDrawGraph();
            graphInitialized = true; // Marcar como inicializado (incluso si falla)
        }
        closeSidebar(); // Cerrar sidebar al cambiar de vista
    }

    // --- loadAndDrawGraph: Carga y dibuja el grafo de relaciones ---
    function loadAndDrawGraph() {
        if (!graphNetworkContainer) {
            console.error("Contenedor '#mynetwork' no encontrado.");
            if(graphView) graphView.innerHTML = '<p style="color:red;padding:20px;">Error: Contenedor del grafo no disponible.</p>';
            return;
        }
        graphNetworkContainer.innerHTML = '<p style="padding:20px;text-align:center;">Cargando grafo...</p>';

        const options = { /* ... Opciones de Vis.js (puedes usar las de la respuesta anterior) ... */
             nodes: { shape: 'dot', scaling: { min: 10, max: 50 }, font: { size: 12, face: 'Tahoma' }, borderWidth: 1.5, color: { border: '#2B7CE9', background: '#D2E5FF', highlight: { border: '#2B7CE9', background: '#F0F8FF' }, hover: { border: '#2B7CE9', background: '#E0F0FF' } } },
             edges: { width: 0.15, scaling: { min: 0.5, max: 5 }, color:{ color:'#cccccc', highlight:'#888888', hover: '#aaaaaa', inherit: 'from', opacity:0.7 }, smooth: { type: "continuous", roundness: 0.3 } },
             physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -40, centralGravity: 0.005, springLength: 100, springConstant: 0.08, damping: 0.6, avoidOverlap: 0.3 }, minVelocity: 0.75, stabilization: { enabled: true, iterations: 500, updateInterval: 50, fit: true } },
             interaction: { hover: true, tooltipDelay: 300, navigationButtons: false, keyboard: true, hideEdgesOnDrag: true },
             layout:{ improvedLayout:true }
        };

        fetch('graph_data.json')
            .then(response => response.ok ? response.json() : Promise.reject(`Error HTTP: ${response.status}`))
            .then(graphData => {
                 if (!graphData?.nodes || !graphData?.edges) throw new Error('Formato inválido.');
                 graphNetworkContainer.innerHTML = ''; // Limpiar

                 const nodesDataSet = new vis.DataSet(graphData.nodes);
                 const edgesDataSet = new vis.DataSet(graphData.edges);
                 const network = new vis.Network(graphNetworkContainer, { nodes: nodesDataSet, edges: edgesDataSet }, options);

                 network.once("stabilizationIterationsDone", () => console.log("Estabilización grafo completa."));

                 network.on("click", function (params) {
                     if (params.nodes.length > 0) { // Clic en Nodo
                         const nodeId = params.nodes[0];
                         const nodeData = nodesDataSet.get(nodeId);
                         if (nodeData && politicianSelect) {
                             console.log("Clic nodo grafo -> vista noticias:", nodeData.id);
                             switchView('news'); // Cambiar a vista noticias
                             politicianSelect.value = nodeData.id; // Seleccionar político
                             handlePoliticianFilter(); // Aplicar filtro
                             setTimeout(() => articlesContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); // Scroll
                         }
                     } else if (params.edges.length > 0) { // Clic en Arista
                         const edgeId = params.edges[0];
                         const edgeData = edgesDataSet.get(edgeId);
                         if(edgeData) alert(`Relación: ${edgeData.from} - ${edgeData.to}\nJuntos en ${edgeData.value} artículos.`);
                     }
                 });
                 console.log("Grafo dibujado.");
             })
            .catch(error => {
                console.error('Error cargando/dibujando grafo:', error);
                graphNetworkContainer.innerHTML = `<p style="color:red;padding:10px;">Error grafo: ${error.message}</p>`;
            });
    }


    // --- Carga Inicial de Datos y Configuración General ---
    function initializeApp() {
        // Verificar elementos estructurales básicos
        if (!body || !pageContent || !newsFeedView || !graphView || !sidebar || !openSidebarBtn || !closeSidebarBtn) {
            console.error("Error crítico: Faltan elementos estructurales del DOM.");
            document.body.innerHTML = '<p style="color:red;font-weight:bold;padding:20px;">Error: Estructura página incompleta.</p>';
            return;
        }

        fetch('noticias_procesadas.json')
            .then(response => response.ok ? response.json() : Promise.reject(`Error HTTP: ${response.status}`))
            .then(data => {
                if (!Array.isArray(data)) throw new Error('Datos no son un array.');
                allArticles = data;
                populatePoliticianFilter(allArticles);
                renderArticles(allArticles); // Render inicial de noticias

                // Listeners búsqueda/filtro (con chequeo de existencia)
                articleSearchBtn?.addEventListener('click', handleArticleSearch);
                articleSearchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleArticleSearch(); });
                politicianSelect?.addEventListener('change', handlePoliticianFilter);
                resetFilterBtn?.addEventListener('click', resetView);

                // Listeners sidebar open/close
                openSidebarBtn?.addEventListener('click', openSidebar);
                closeSidebarBtn?.addEventListener('click', closeSidebar);

                // Listeners botones de navegación de vistas
                navButtons.forEach(button => {
                    button.addEventListener('click', () => switchView(button.getAttribute('data-view')));
                });

                // Listener para cerrar sidebar al hacer clic fuera
                document.addEventListener('click', (event) => {
                    if (!sidebar?.classList.contains('visible')) return;
                    const clickedInsideSidebar = sidebar.contains(event.target);
                    const clickedOnOpenBtn = openSidebarBtn?.contains(event.target);
                    const clickedInsideTooltip = tooltipPopup?.contains(event.target);
                    if (!clickedInsideSidebar && !clickedOnOpenBtn && !clickedInsideTooltip) {
                        closeSidebar();
                    }
                });

                // Establecer la vista inicial explícitamente
                 switchView('news');


            })
            .catch(error => {
                console.error('Error inicializando la aplicación:', error);
                if(newsFeedView) newsFeedView.innerHTML = `<p style="color:red;">Error fatal: ${error.message}.</p>`;
                // Deshabilitar controles
                [articleSearchInput, articleSearchBtn, politicianSelect, resetFilterBtn, openSidebarBtn].forEach(el => {
                    if(el) el.disabled = true;
                });
            });
    }

    initializeApp(); // Ejecutar la inicialización

}); // Fin del addEventListener('DOMContentLoaded')