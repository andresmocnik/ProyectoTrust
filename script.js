// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos ---
    const articlesContainer = document.getElementById('articles-container');
    const tooltipPopup = document.getElementById('tooltip-popup');
    const tooltipImg = document.getElementById('tooltip-img');
    const tooltipDesc = document.getElementById('tooltip-desc');
    // NUEVAS referencias para búsqueda/filtro
    const articleSearchInput = document.getElementById('article-search-input');
    const articleSearchBtn = document.getElementById('article-search-btn');
    const politicianSelect = document.getElementById('politician-select');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    // NUEVAS referencias para la sidebar
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const pageContent = document.getElementById('page-content'); // Referencia al contenedor principal
    const body = document.body; // Referencia al body

    let graphInitialized = false; // Sigue siendo útil para cargar el grafo solo una vez
    let allArticles = []; // <-- Variable para almacenar todos los artículos cargados

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
        const politicianNames = new Set(); // Usamos Set para obtener nombres únicos

        articles.forEach(article => {
            // Asegúrate de usar la lista NORMALIZADA de personas
            (article.personas_detectadas_normalizadas || []).forEach(name => {
                if (name && name.trim() !== '') { // Evitar nombres vacíos
                    politicianNames.add(name.trim());
                }
            });
        });

        // Convertir Set a Array, ordenar alfabéticamente
        const sortedNames = Array.from(politicianNames).sort();

        // Limpiar opciones previas (excepto la primera por defecto)
        if(politicianSelect) { // Verificar que el elemento existe
            politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';

            // Añadir cada político como una opción
            sortedNames.forEach(name => {
                const option = createElement('option', { value: name, textContent: name });
                politicianSelect.appendChild(option);
            });
            console.log(`Filtro poblado con ${sortedNames.length} políticos.`);
        } else {
            console.warn("Elemento 'politician-select' no encontrado para poblar.");
        }
    }

    // --- displayArticle MODIFICADA para aceptar highlightedPolitician ---
    function displayArticle(article, highlightedPolitician = null) {
        const articleDiv = createElement('div', { className: 'article' });
        const section = createElement('div', { className: 'article-meta', textContent: `Sección: ${article.seccion || 'N/A'}` });
        const title = createElement('h2', { textContent: article.titulo || 'Sin Título' });
        const subtitle = createElement('h3', { textContent: article.subtitulo || '' });
        const metaDiv = createElement('div', { className: 'article-meta' });
        metaDiv.appendChild(createElement('span', { textContent: `Autor: ${article.autor || 'N/A'}` }));
        metaDiv.appendChild(createElement('span', { textContent: `Fecha: ${article.fecha_hora || 'N/A'}` }));
        const image = createElement('img', { className: 'article-img', src: article.link_img || '', alt: article.titulo || 'Imagen de noticia' });
        const caption = createElement('figcaption', { className: 'article-img-caption', textContent: article.caption_img || '' });
        const bodyDiv = createElement('div', { className: 'article-body' });
        const paragraphs = (article.cuerpo || '').split('\n').filter(p => p.trim() !== '');

        const normalizedPersonsInArticle = article.personas_detectadas_normalizadas || [];

        paragraphs.forEach(pText => {
            let processedHTML = pText;
            // Iteramos sobre los nombres NORMALIZADOS que sabemos que están en este artículo
            normalizedPersonsInArticle.forEach(normPersonName => {
                // Creamos un Regex seguro para buscar este nombre específico (como palabra completa)
                const escapedName = normPersonName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                // Añadimos lookarounds para evitar coincidencias parciales si es posible (más seguro)
                // Esto ayuda a no marcar 'Milei' dentro de 'Mileista', por ejemplo.
                // Nota: \b ya hace gran parte de esto, pero esto es más explícito.
                // const regex = new RegExp(`(?<!\\w)(${escapedName})(?!\\w)`, 'gi'); // Con lookarounds (más avanzado)
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi'); // 'g' global, 'i' case-insensitive (más simple y usualmente suficiente)


                 // Aplicar el span para tooltip y posible resaltado
                processedHTML = processedHTML.replace(
                    regex,
                    (match) => { // Usamos una función de reemplazo para añadir la clase condicionalmente
                        let spanClass = 'person-tooltip';
                        // Si se está filtrando por este político, añadir la clase de resaltado
                        if (highlightedPolitician && normPersonName === highlightedPolitician) {
                            spanClass += ' highlighted-person'; // Añade la clase de resaltado
                        }
                        // Usamos normPersonName como data-person-key para consistencia con tooltips y grafo
                        return `<span class="${spanClass}" data-person-key="${normPersonName}">${match}</span>`;
                    }
                );
            });
            const pElement = createElement('p', { innerHTML: processedHTML });
            bodyDiv.appendChild(pElement);
        });

        articleDiv.appendChild(section);
        articleDiv.appendChild(title);
        if (article.subtitulo) articleDiv.appendChild(subtitle);
        articleDiv.appendChild(metaDiv);
        if (article.link_img) articleDiv.appendChild(image);
        if (article.caption_img) articleDiv.appendChild(caption);
        articleDiv.appendChild(bodyDiv);
        // Verificar si articlesContainer existe antes de añadir
        if (articlesContainer) {
            articlesContainer.appendChild(articleDiv);
        }
    }


    // --- setupTooltipListeners ---
    function setupTooltipListeners() {
        // Verificar si el contenedor existe
        if (!articlesContainer) return;

        const personSpans = articlesContainer.querySelectorAll('.person-tooltip');

        personSpans.forEach(span => {
            span.addEventListener('mouseover', async (event) => {
                if (!tooltipPopup || !tooltipImg || !tooltipDesc) return; // Verificar elementos del tooltip

                const personKey = event.target.getAttribute('data-person-key'); // Usa la clave normalizada

                tooltipPopup.style.left = `${event.pageX + 15}px`;
                tooltipPopup.style.top = `${event.pageY + 10}px`;
                tooltipPopup.style.display = 'block';

                // Intenta buscar en datos manuales PRIMERO
                const manualData = personData[personKey];
                if (manualData) {
                    //console.log(`Mostrando datos manuales para: ${personKey}`);
                    tooltipImg.src = manualData.img || '';
                    tooltipImg.alt = manualData.name;
                    tooltipDesc.textContent = manualData.desc;
                    tooltipImg.style.display = manualData.img ? 'block' : 'none'; // Ocultar si no hay img
                    return; // Importante salir si encontramos datos manuales
                }

                // Si no hay datos manuales, busca en Wikipedia
                //console.log(`Buscando en Wikipedia para: ${personKey}`);
                tooltipImg.src = ''; // Limpiar imagen anterior
                tooltipImg.alt = 'Cargando...';
                tooltipImg.style.display = 'block'; // Mostrar aunque esté vacía al principio
                tooltipDesc.textContent = 'Buscando información...';

                try {
                    const wikiApiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&titles=${encodeURIComponent(personKey)}&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=100&redirects=1`;
                    const response = await fetch(wikiApiUrl);
                    if (!response.ok) throw new Error(`Error HTTP de Wikipedia: ${response.status}`);
                    const wikiData = await response.json();
                    const pages = wikiData.query.pages;
                    const pageId = Object.keys(pages)[0];

                    if (pageId && pageId !== "-1" && pages[pageId]) {
                        const page = pages[pageId];
                        const description = page.extract;
                        const imageUrl = page.thumbnail ? page.thumbnail.source : '';

                        tooltipDesc.textContent = description
                            ? description.substring(0, 250) + (description.length > 250 ? '...' : '')
                            : 'No se encontró descripción breve.';

                        tooltipImg.src = imageUrl || '';
                        tooltipImg.alt = page.title || personKey;
                        tooltipImg.style.display = imageUrl ? 'block' : 'none'; // Ocultar si no hay imagen

                        //if (imageUrl) console.log(`Información encontrada para: ${personKey}`);

                    } else {
                        //console.log(`No se encontró página en Wikipedia para: ${personKey}`);
                        tooltipDesc.textContent = 'Información no encontrada.';
                        tooltipImg.src = '';
                         tooltipImg.style.display = 'none'; // Ocultar si no hay imagen
                        tooltipImg.alt = personKey;
                    }
                } catch (error) {
                    console.error(`Error al buscar en Wikipedia para ${personKey}:`, error);
                    tooltipDesc.textContent = 'Error al buscar información.';
                    tooltipImg.src = '';
                    tooltipImg.style.display = 'none'; // Ocultar en caso de error
                    tooltipImg.alt = personKey;
                }
            });

            span.addEventListener('mouseout', () => {
                 if (tooltipPopup) tooltipPopup.style.display = 'none';
            });

            span.addEventListener('mousemove', (event) => {
                 if (tooltipPopup && tooltipPopup.style.display === 'block') {
                    // Lógica para evitar que el tooltip se solape o salga de pantalla
                    let newX = event.pageX + 15;
                    let newY = event.pageY + 10;
                    const tooltipWidth = tooltipPopup.offsetWidth;
                    const tooltipHeight = tooltipPopup.offsetHeight;
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    const scrollX = window.scrollX;
                    const scrollY = window.scrollY;

                    // Ajustar posición horizontal
                    if (newX + tooltipWidth > viewportWidth + scrollX) {
                        newX = event.pageX - tooltipWidth - 15; // Mover a la izquierda del cursor
                    }
                    if (newX < scrollX) { // Evitar que se salga por la izquierda
                        newX = scrollX + 5;
                    }

                    // Ajustar posición vertical
                    if (newY + tooltipHeight > viewportHeight + scrollY) {
                        newY = event.pageY - tooltipHeight - 10; // Mover arriba del cursor
                    }
                     if (newY < scrollY) { // Evitar que se salga por arriba
                        newY = scrollY + 5;
                    }

                    tooltipPopup.style.left = `${newX}px`;
                    tooltipPopup.style.top = `${newY}px`;
                }
            });
        });
    }

    // --- Función central para renderizar artículos ---
    function renderArticles(articlesToDisplay, politicianToHighlight = null) {
        console.log(`Renderizando ${articlesToDisplay.length} artículos.`);
        if (!articlesContainer) {
            console.error("El contenedor 'articles-container' no existe en el DOM.");
            return;
        }

        articlesContainer.innerHTML = ''; // Limpiar contenedor

        if (articlesToDisplay.length === 0) {
            articlesContainer.innerHTML = '<p>No se encontraron artículos que coincidan con la búsqueda o filtro.</p>';
            return;
        }

        articlesToDisplay.forEach(article => {
            displayArticle(article, politicianToHighlight); // Pasar el político a resaltar
        });

        setupTooltipListeners(); // <-- Importante: configurar tooltips DESPUÉS de añadir los artículos al DOM
    }

    // --- Lógica para el Buscador de Artículos ---
    function handleArticleSearch() {
        if (!articleSearchInput || !politicianSelect) return; // Verificar elementos

        const searchTerm = articleSearchInput.value.trim().toLowerCase();
        politicianSelect.value = ""; // Resetea el filtro de político si se busca por texto

        if (!searchTerm) {
            renderArticles(allArticles); // Si no hay término, mostrar todo
            return;
        }

        console.log(`Buscando artículos con término: "${searchTerm}"`);
        const filteredArticles = allArticles.filter(article => {
            const titleMatch = (article.titulo || '').toLowerCase().includes(searchTerm);
            const subtitleMatch = (article.subtitulo || '').toLowerCase().includes(searchTerm);
            const bodyMatch = (article.cuerpo || '').toLowerCase().includes(searchTerm);
            return titleMatch || subtitleMatch || bodyMatch;
        });

        renderArticles(filteredArticles); // Mostrar solo los artículos filtrados
    }

    // --- Lógica para el Filtro de Políticos ---
    function handlePoliticianFilter() {
        if (!politicianSelect || !articleSearchInput) return; // Verificar elementos

        const selectedPolitician = politicianSelect.value;
        articleSearchInput.value = ""; // Resetea la búsqueda por texto si se filtra por político

        if (!selectedPolitician) {
            renderArticles(allArticles); // Si no hay selección, mostrar todo
            return;
        }

        console.log(`Filtrando artículos por político: "${selectedPolitician}"`);
        const filteredArticles = allArticles.filter(article => {
            // Comprobar si el político seleccionado está en la lista NORMALIZADA del artículo
            return (article.personas_detectadas_normalizadas || []).includes(selectedPolitician);
        });

        // Renderizar los artículos filtrados Y pasar el nombre para resaltarlo
        renderArticles(filteredArticles, selectedPolitician);
    }

    // --- Lógica para Resetear la Vista ---
    function resetView() {
        console.log("Reseteando vista a todos los artículos.");
        if(articleSearchInput) articleSearchInput.value = ''; // Limpiar campo de búsqueda
        if(politicianSelect) politicianSelect.value = '';   // Resetear selección del dropdown
        renderArticles(allArticles);   // Volver a mostrar todos los artículos sin resaltado
    }


    // --- Lógica para Abrir/Cerrar Barra Lateral ---
    function openSidebar() {
        if (!sidebar || !body) return;
        sidebar.classList.add('visible');
        body.classList.add('sidebar-visible'); // Añade clase al body para empujar contenido o aplicar overlay

        // Cargar el grafo si es la primera vez que se abre la sidebar
        if (!graphInitialized) {
            loadAndDrawGraph();
            graphInitialized = true; // Marcar como inicializado incluso si falla la carga (para no reintentar infinitamente)
        }
    }

    function closeSidebar() {
        if (!sidebar || !body) return;
        sidebar.classList.remove('visible');
        body.classList.remove('sidebar-visible'); // Quita clase del body
    }


    // --- loadAndDrawGraph ---
    function loadAndDrawGraph() {
        const container = document.getElementById('mynetwork'); // Sigue buscando el mismo ID
        if (!container) {
            console.error("Contenedor del grafo 'mynetwork' no encontrado DENTRO de la sidebar.");
             const graphContainer = document.getElementById('graph-container-sidebar');
             if (graphContainer) {
                 graphContainer.innerHTML = '<p style="color: red;">Error: No se encontró el elemento del grafo (#mynetwork).</p>';
             }
            return;
        }

        // Mensaje de carga
        container.innerHTML = '<p style="padding: 20px; text-align: center;">Cargando grafo...</p>';

        const options = { // Opciones de Vis.js (ajusta según necesites)
             nodes: {
                shape: 'dot',
                scaling: { min: 10, max: 50, label: { enabled: false, min: 14, max: 30 } }, // Escala de nodos
                font: { size: 12, face: 'Tahoma', color: '#333' },
                 borderWidth: 1.5, // Borde más delgado
                 color: { border: '#2B7CE9', background: '#D2E5FF', highlight: { border: '#2B7CE9', background: '#F0F8FF' }, hover: { border: '#2B7CE9', background: '#E0F0FF' } } // Colores más suaves
            },
            edges: {
                width: 0.15, // Ancho base fino
                 scaling: { min: 0.5, max: 5 }, // Escala de ancho de arista más sutil
                color:{ color:'#cccccc', highlight:'#888888', hover: '#aaaaaa', inherit: 'from', opacity:0.7 }, // Colores más tenues
                //font: { size: 10, align: 'middle', color: '#666' }, // Opcional: quitar labels de aristas si son muchos
                 smooth: { type: "continuous", roundness: 0.3 } // Menos curvo
            },
            physics:{
                enabled: true,
                solver: 'forceAtlas2Based', // Buen solver para redes sociales
                forceAtlas2Based: { gravitationalConstant: -40, centralGravity: 0.005, springLength: 100, springConstant: 0.08, damping: 0.6, avoidOverlap: 0.3 }, // Ajustes para dispersar un poco más
                 minVelocity: 0.75, // Detener antes si se mueve poco
                 stabilization: { enabled: true, iterations: 500, updateInterval: 50, onlyDynamicEdges: false, fit: true } // Menos iteraciones para carga inicial más rápida
            },
            interaction: {
                hover: true, // Activar hover
                tooltipDelay: 300, // Retraso tooltip
                navigationButtons: false, // Ocultar botones de zoom/navegación si prefieres
                keyboard: true, // Permitir navegación por teclado
                hideEdgesOnDrag: true, // Ocultar aristas al arrastrar nodo (mejora rendimiento)
            },
            layout:{
                improvedLayout:true // Usar layout mejorado
            }
        };

        fetch('graph_data.json')
            .then(response => {
                if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
                return response.json();
            })
            .then(graphData => {
                 if (!graphData || !graphData.nodes || !graphData.edges) {
                     throw new Error('El archivo graph_data.json no tiene el formato esperado.');
                 }
                 // Limpiar mensaje de carga antes de dibujar
                 container.innerHTML = '';

                 const nodesDataSet = new vis.DataSet(graphData.nodes);
                 const edgesDataSet = new vis.DataSet(graphData.edges);
                 const data = { nodes: nodesDataSet, edges: edgesDataSet };
                 const network = new vis.Network(container, data, options);

                 // Evento después de la estabilización inicial (más rápido con menos iteraciones)
                 network.once("stabilizationIterationsDone", function () {
                     console.log("Estabilización inicial del grafo completada.");
                     // Opcional: Desactivar físicas completamente después de un tiempo o dejarlo así
                     // network.setOptions( { physics: false } );
                 });

                  // Evento general de clic
                 network.on("click", function (params) {
                    // Priorizar clic en nodo
                    if (params.nodes.length > 0) {
                        const clickedNodeId = params.nodes[0];
                        const nodeData = nodesDataSet.get(clickedNodeId);
                        if (nodeData && politicianSelect) {
                            console.log("Clic en nodo del grafo:", nodeData);
                            politicianSelect.value = nodeData.id; // Selecciona el político en el dropdown
                            handlePoliticianFilter(); // Ejecuta el filtro
                            // Opcional: cerrar sidebar después de seleccionar?
                            // closeSidebar();
                            // Opcional: Hacer scroll hacia la sección de artículos si el contenedor existe
                            if(articlesContainer) {
                                articlesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    // Si no hay nodo, verificar clic en arista
                    } else if (params.edges.length > 0) {
                         const clickedEdgeId = params.edges[0];
                         const edgeData = edgesDataSet.get(clickedEdgeId);
                         if (edgeData) {
                           console.log("Clic en arista:", edgeData);
                           // Mostrar información más detallada si es necesario
                           alert(`Relación: ${edgeData.from} y ${edgeData.to}\nMencionados juntos en ${edgeData.title.split(' ')[2]} artículos.`);
                         }
                    }
                    // Si no es nodo ni arista, no hacer nada (clic en el fondo)
                 });
                 console.log("Grafo dibujado en la sidebar.");
             })
            .catch(error => {
                console.error('Error al cargar o dibujar el grafo en la sidebar:', error);
                container.innerHTML = `<p style="color: red; padding: 10px;">Error al cargar datos del grafo: ${error.message}</p>`;
            });
    }


    // --- Carga Inicial de Datos y Configuración de Listeners ---
    // Verificar que los elementos básicos existen antes de hacer fetch
    if (!articlesContainer || !sidebar || !openSidebarBtn || !closeSidebarBtn || !pageContent || !body) {
        console.error("Error crítico: Faltan elementos esenciales del DOM (contenedor de artículos, sidebar, botones o body). La aplicación no puede inicializar correctamente.");
        // Podrías mostrar un mensaje al usuario aquí
        document.body.innerHTML = '<p style="color: red; font-weight: bold; padding: 20px;">Error: La estructura de la página no se cargó correctamente. Por favor, recargue o contacte al administrador.</p>';
        return; // Detener ejecución si falta algo esencial
    }


    fetch('noticias_procesadas.json')
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Los datos cargados no son un array de artículos.');
            }
            allArticles = data;
            populatePoliticianFilter(allArticles);
            renderArticles(allArticles);

            // Configurar listeners para búsqueda y filtro (con verificación de existencia)
            if(articleSearchBtn) articleSearchBtn.addEventListener('click', handleArticleSearch);
            if(articleSearchInput) articleSearchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') handleArticleSearch();
            });
            if(politicianSelect) politicianSelect.addEventListener('change', handlePoliticianFilter);
            if(resetFilterBtn) resetFilterBtn.addEventListener('click', resetView);

            // Configurar listeners para la sidebar
            if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
            if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);

            // Cerrar la sidebar si se hace clic fuera de ella
            document.addEventListener('click', (event) => {
                if (!sidebar || !openSidebarBtn) return;
                // Si la sidebar está visible y el clic NO fue dentro de la sidebar NI en el botón de abrir
                if (sidebar.classList.contains('visible') &&
                    !sidebar.contains(event.target) &&
                    event.target !== openSidebarBtn &&
                    !openSidebarBtn.contains(event.target)) {
                    // Asegurarse de no cerrar si se hace clic en un elemento del tooltip (que está fuera)
                    if(!tooltipPopup || !tooltipPopup.contains(event.target)) {
                        closeSidebar();
                    }
                }
            });


        })
        .catch(error => {
            console.error('Error al cargar o procesar los datos de noticias:', error);
            articlesContainer.innerHTML = `<p style="color: red;">Error fatal al cargar las noticias: ${error.message}. Por favor, revise el archivo 'noticias_procesadas.json'.</p>`;
            // Deshabilitar controles si falla la carga
             if(articleSearchInput) articleSearchInput.disabled = true;
             if(articleSearchBtn) articleSearchBtn.disabled = true;
             if(politicianSelect) politicianSelect.disabled = true;
             if(resetFilterBtn) resetFilterBtn.disabled = true;
             if(openSidebarBtn) openSidebarBtn.disabled = true; // Deshabilitar también el botón de la sidebar
        });

}); // Fin del addEventListener('DOMContentLoaded')