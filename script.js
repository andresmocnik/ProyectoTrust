// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a Elementos ---
    const articlesContainer = document.getElementById('articles-container');
    const tooltipPopup = document.getElementById('tooltip-popup');
    const tooltipImg = document.getElementById('tooltip-img');
    const tooltipDesc = document.getElementById('tooltip-desc');
    const toggleGraphBtn = document.getElementById('toggle-graph-btn');
    const graphContentDiv = document.getElementById('graph-content');
    // NUEVAS referencias para búsqueda/filtro
    const articleSearchInput = document.getElementById('article-search-input');
    const articleSearchBtn = document.getElementById('article-search-btn');
    const politicianSelect = document.getElementById('politician-select');
    const resetFilterBtn = document.getElementById('reset-filter-btn');

    let graphInitialized = false;
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
        politicianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';

        // Añadir cada político como una opción
        sortedNames.forEach(name => {
            const option = createElement('option', { value: name, textContent: name });
            politicianSelect.appendChild(option);
        });
        console.log(`Filtro poblado con ${sortedNames.length} políticos.`);
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
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi'); // 'g' global, 'i' case-insensitive

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
        articlesContainer.appendChild(articleDiv); // Añadir al contenedor principal
    }


    // --- setupTooltipListeners ---
    function setupTooltipListeners() {
        const personSpans = articlesContainer.querySelectorAll('.person-tooltip');

        personSpans.forEach(span => {
            span.addEventListener('mouseover', async (event) => {
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
                tooltipPopup.style.display = 'none';
            });

            span.addEventListener('mousemove', (event) => {
                 if (tooltipPopup.style.display === 'block') {
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
        articleSearchInput.value = ''; // Limpiar campo de búsqueda
        politicianSelect.value = '';   // Resetear selección del dropdown
        renderArticles(allArticles);   // Volver a mostrar todos los artículos sin resaltado
    }


    // --- Grafo Colapsable y Carga ---
    if (toggleGraphBtn && graphContentDiv) {
        toggleGraphBtn.addEventListener('click', () => {
            const isHidden = graphContentDiv.style.display === 'none';
            if (isHidden) {
                graphContentDiv.style.display = 'block';
                toggleGraphBtn.textContent = 'Mostrar/Ocultar Grafo de Relaciones ▲';
                if (!graphInitialized) {
                    loadAndDrawGraph(); // Llama a la función para dibujar el grafo SÓLO la primera vez
                    graphInitialized = true;
                }
            } else {
                graphContentDiv.style.display = 'none';
                toggleGraphBtn.textContent = 'Mostrar/Ocultar Grafo de Relaciones ▼';
            }
        });
    } else {
         if (document.getElementById('toggle-graph-btn') || document.getElementById('graph-content')) {
             console.error("No se encontró el botón (#toggle-graph-btn) o el contenido (#graph-content) del grafo colapsable.");
         }
    }

    function loadAndDrawGraph() {
        const container = document.getElementById('mynetwork');
        if (!container) {
            console.error("Contenedor del grafo 'mynetwork' no encontrado.");
            return;
        }

        const options = { // Opciones de Vis.js (ajusta según necesites)
             nodes: {
                shape: 'dot',
                scaling: { min: 10, max: 50 },
                font: { size: 12, face: 'Tahoma', color: '#333' },
                 borderWidth: 2,
                 color: { border: '#2B7CE9', background: '#97C2FC', highlight: { border: '#2B7CE9', background: '#D2E5FF' }, hover: { border: '#2B7CE9', background: '#D2E5FF' } }
            },
            edges: {
                width: 0.15,
                 scaling: { min: 1, max: 10 },
                color:{ color:'#848484', highlight:'#848484', hover: '#848484', inherit: 'from', opacity:1.0 },
                font: { size: 10, align: 'middle', color: '#666' },
                 smooth: { type: "continuous", roundness: 0.5 }
            },
            physics:{
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.08, springLength: 100, damping: 0.4, avoidOverlap: 0.5 },
                 stabilization: { enabled: true, iterations: 1000, updateInterval: 100, onlyDynamicEdges: false, fit: true }
            },
            interaction: { hover: true, tooltipDelay: 200 },
            layout:{ improvedLayout:true }
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
                const nodesDataSet = new vis.DataSet(graphData.nodes);
                const edgesDataSet = new vis.DataSet(graphData.edges);
                const data = { nodes: nodesDataSet, edges: edgesDataSet };
                const network = new vis.Network(container, data, options);

                network.on("stabilizationIterationsDone", function () {
                    console.log("Estabilización del grafo completada. Desactivando físicas.");
                    network.setOptions( { physics: false } );
                });

                network.on("click", function (params) {
                   if (params.edges.length > 0) {
                       const clickedEdgeId = params.edges[0];
                       const edgeData = edgesDataSet.get(clickedEdgeId);
                       if (edgeData) {
                           console.log("Clic en arista:", edgeData);
                           alert(`Personas ${edgeData.from} y ${edgeData.to} aparecen juntas en ${edgeData.value} artículos.`);
                           // Aquí podrías implementar la lógica para mostrar los artículos
                       }
                   } else if (params.nodes.length > 0) {
                       const clickedNodeId = params.nodes[0];
                       const nodeData = nodesDataSet.get(clickedNodeId);
                       if (nodeData) {
                           console.log("Clic en nodo:", nodeData);
                            // --- ACCIÓN AL CLICKEAR NODO DEL GRAFO ---
                           // Simular selección en el dropdown y filtrar
                           if (politicianSelect) {
                               politicianSelect.value = nodeData.id; // Selecciona el político en el dropdown
                               handlePoliticianFilter(); // Ejecuta el filtro
                               // Opcional: Hacer scroll hacia la sección de artículos
                               articlesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                           }
                       }
                   }
               });
                console.log("Grafo dibujado.");
            })
            .catch(error => {
                console.error('Error al cargar o dibujar el grafo:', error);
                container.innerHTML = `<p style="color: red; padding: 10px;">Error al cargar los datos del grafo: ${error.message}</p>`;
            });
    }


    // --- Carga Inicial de Datos y Renderizado ---
    fetch('noticias_procesadas.json') // Asegúrate que el nombre del archivo es correcto
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Los datos cargados no son un array de artículos.');
            }
            allArticles = data; // <-- Guardar los datos cargados globalmente

            populatePoliticianFilter(allArticles); // <-- Poblar el dropdown AHORA

            renderArticles(allArticles); // <-- Llamar a la función de renderizado inicial

            // Configurar listeners para los NUEVOS controles
            if(articleSearchBtn) articleSearchBtn.addEventListener('click', handleArticleSearch);
            if(articleSearchInput) articleSearchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    handleArticleSearch();
                }
            });
            if(politicianSelect) politicianSelect.addEventListener('change', handlePoliticianFilter);
            if(resetFilterBtn) resetFilterBtn.addEventListener('click', resetView);

        })
        .catch(error => {
            console.error('Error al cargar o procesar los datos de noticias:', error);
            articlesContainer.innerHTML = `<p style="color: red;">Error fatal al cargar las noticias: ${error.message}. Por favor, revise el archivo 'noticias_procesadas.json'.</p>`;
             // Deshabilitar controles si falla la carga
             if(articleSearchInput) articleSearchInput.disabled = true;
             if(articleSearchBtn) articleSearchBtn.disabled = true;
             if(politicianSelect) politicianSelect.disabled = true;
             if(resetFilterBtn) resetFilterBtn.disabled = true;
        });

}); // Fin del addEventListener('DOMContentLoaded')