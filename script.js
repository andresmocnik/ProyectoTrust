// Espera a que toda la estructura HTML esté cargada antes de ejecutar el código
document.addEventListener('DOMContentLoaded', () => {

    // Obtenemos referencias a los elementos HTML que vamos a necesitar manipular
    const articlesContainer = document.getElementById('articles-container'); // Donde van las noticias
    const tooltipPopup = document.getElementById('tooltip-popup');       // El div del popup
    const tooltipImg = document.getElementById('tooltip-img');           // La imagen del popup
    const tooltipDesc = document.getElementById('tooltip-desc');         // El texto del popup

    // --- NUEVAS REFERENCIAS PARA EL GRAFO COLAPSABLE ---
    const toggleGraphBtn = document.getElementById('toggle-graph-btn');
    const graphContentDiv = document.getElementById('graph-content');
    let graphInitialized = false; // Bandera para saber si ya dibujamos el grafo

    // --- Información para los Tooltips ---
    // ¡CLAVES CORREGIDAS! Asegúrate que coincidan con lo detectado por spaCy
    const personData = {
        "Javier Milei": { // Clave corregida
            name: "Javier Milei",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Javier_Milei_%28cropped%29.jpg/440px-Javier_Milei_%28cropped%29.jpg",
            desc: "Economista y político argentino, actual Presidente de la Nación Argentina desde diciembre de 2023."
        },
        "Lionel Messi": { // Clave corregida
            name: "Lionel Messi",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/440px-Lionel_Messi_20180626.jpg",
            desc: "Futbolista argentino considerado uno de los mejores de todos los tiempos. Juega como delantero o centrocampista."
        },
        "Ricardo Zielinski": { // Clave corregida
            name: "Ricardo Zielinski",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg/440px-Ricardo_Zielinski_en_abril_de_2019_%28cropped%29.jpg",
            desc: "Exfutbolista y actual director técnico de fútbol argentino. Ha dirigido varios clubes importantes."
        },
         "Guillermo Coria": { // Clave corregida
            name: "Guillermo Coria",
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Guillermo_Coria_Roland_Garros_2005.jpg/440px-Guillermo_Coria_Roland_Garros_2005.jpg",
            desc: "Ex tenista profesional argentino y actual capitán del equipo argentino de Copa Davis."
        },
        "Diego Carballo": { // Clave corregida
            name: "Diego Carballo",
            img:"https://i0.wp.com/eldiariodelpueblo.com.ar/wp-content/uploads/2024/02/409558962_755350239946088_7615995329144555656_n.jpg?w=1000&ssl=1",
            desc: "​Diego Carballo es el actual intendente de la ciudad de Villa del Rosario, ubicada en la provincia de Córdoba, Argentina. Es contador público y pertenece al partido Juntos por el Cambio. Asumió el cargo tras las elecciones del 4 de junio de 2023."
        },
        "Martín Llaryora": { // Clave corregida
            name: "Martín Llaryora",
            img: "https://media.diariopopular.com.ar/p/4f463a3d2f84cd68a81f5e4cde1bac27/adjuntos/143/imagenes/008/093/0008093476/1140x0/smart/martin-llaryora-foto-2jpg.jpg",
            desc: "Político argentino, actual Gobernador de la Provincia de Córdoba desde diciembre de 2023."
        },
         // ----> AÑADE AQUÍ MÁS PERSONAS SI ES NECESARIO <----
         // "Nombre Exacto Detectado": { name: "...", img: "...", desc: "..." },
    };

    // Función para crear elementos HTML (sin cambios)
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

    // Función highlightPeople NO SE USA MÁS para el resaltado inicial
    /* function highlightPeople(text) { ... } // Puedes borrarla o comentarla */

    // Función para mostrar un artículo en la página (MODIFICADA para resaltar siempre)
    function displayArticle(article) {
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

        // ---> INICIO Bloque modificado para resaltar siempre <---
        const detectedPersonsInArticle = article.personas_detectadas || [];

        paragraphs.forEach(pText => {
            let processedHTML = pText;
            detectedPersonsInArticle.forEach(personName => {
                const escapedName = personName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
                 // SIEMPRE aplicar el span para que sea interactivo
                processedHTML = processedHTML.replace(
                    regex,
                    `<span class="person-tooltip" data-person-key="${personName}">$1</span>`
                );
            });
            const pElement = createElement('p', { innerHTML: processedHTML });
            bodyDiv.appendChild(pElement);
        });
         // ---> FIN Bloque modificado <---

        articleDiv.appendChild(section);
        articleDiv.appendChild(title);
        if (article.subtitulo) articleDiv.appendChild(subtitle);
        articleDiv.appendChild(metaDiv);
        if (article.link_img) articleDiv.appendChild(image);
        if (article.caption_img) articleDiv.appendChild(caption);
        articleDiv.appendChild(bodyDiv);
        articlesContainer.appendChild(articleDiv);
    }

    // --- Activación de los Tooltips (MODIFICADA CON API) ---
    function setupTooltipListeners() {
        const personSpans = articlesContainer.querySelectorAll('.person-tooltip');

        personSpans.forEach(span => {
            // ---> INICIO Listener mouseover MODIFICADO <---
            span.addEventListener('mouseover', async (event) => {
                const personKey = event.target.getAttribute('data-person-key');

                tooltipPopup.style.left = `${event.pageX + 15}px`;
                tooltipPopup.style.top = `${event.pageY + 10}px`;
                tooltipPopup.style.display = 'block';

                const manualData = personData[personKey]; // Usa la clave completa
                if (manualData) {
                    console.log(`Mostrando datos manuales para: ${personKey}`);
                    tooltipImg.src = manualData.img || '';
                    tooltipImg.alt = manualData.name;
                    tooltipDesc.textContent = manualData.desc;
                    return;
                }

                console.log(`Buscando en Wikipedia para: ${personKey}`);
                tooltipImg.src = '';
                tooltipImg.alt = 'Cargando...';
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
                        if (imageUrl) console.log(`Información encontrada para: ${personKey}`);

                    } else {
                        console.log(`No se encontró página en Wikipedia para: ${personKey}`);
                        tooltipDesc.textContent = 'Información no encontrada en Wikipedia.';
                        tooltipImg.src = '';
                        tooltipImg.alt = personKey;
                    }
                } catch (error) {
                    console.error(`Error al buscar en Wikipedia para ${personKey}:`, error);
                    tooltipDesc.textContent = 'Error al buscar información.';
                    tooltipImg.src = '';
                    tooltipImg.alt = personKey;
                }
            });
             // ---> FIN Listener mouseover MODIFICADO <---

            // Listener mouseout (sin cambios)
            span.addEventListener('mouseout', () => {
                tooltipPopup.style.display = 'none';
            });

            // Listener mousemove (sin cambios)
            span.addEventListener('mousemove', (event) => {
                if (tooltipPopup.style.display === 'block') {
                    tooltipPopup.style.left = `${event.pageX + 15}px`;
                    tooltipPopup.style.top = `${event.pageY + 10}px`;
                }
            });
        });
    }

    // --- NUEVO: Listener para el botón del grafo colapsable ---
    if (toggleGraphBtn && graphContentDiv) {
        toggleGraphBtn.addEventListener('click', () => {
            const isHidden = graphContentDiv.style.display === 'none';
            if (isHidden) {
                graphContentDiv.style.display = 'block';
                if (!graphInitialized) {
                    loadAndDrawGraph(); // Llama a la función para dibujar el grafo
                    graphInitialized = true;
                }
                 toggleGraphBtn.textContent = 'Mostrar/Ocultar Grafo de Relaciones ▲';
            } else {
                graphContentDiv.style.display = 'none';
                 toggleGraphBtn.textContent = 'Mostrar/Ocultar Grafo de Relaciones ▼';
            }
        });
    } else {
        // Solo muestra error si los elementos *deberían* existir (si añadiste el HTML)
         if (document.getElementById('toggle-graph-btn') || document.getElementById('graph-content')) {
             console.error("No se encontró el botón (#toggle-graph-btn) o el contenido (#graph-content) del grafo colapsable.");
         }
    }


    // --- NUEVO: Función para Cargar y Dibujar el Grafo ---
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
                        console.log("Clic en nodo:", nodeData);
                        // Aquí podrías implementar la lógica para mostrar los artículos de esa persona
                    }
                });
                console.log("Grafo dibujado.");
            })
            .catch(error => {
                console.error('Error al cargar o dibujar el grafo:', error);
                container.innerHTML = 'Error al cargar los datos del grafo.';
            });
    }


    // --- Cargar y Mostrar las Noticias ---
    fetch('noticias_procesadas.json') // Asegúrate que sea el archivo correcto
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const articlesToDisplay = data.slice(0, 15); // Muestra más artículos si quieres
            articlesToDisplay.forEach(article => {
                displayArticle(article);
            });

            setupTooltipListeners();

            // La llamada a loadAndDrawGraph() se quitó de aquí.
        })
        .catch(error => {
            console.error('Error al cargar o procesar los datos de noticias:', error);
            articlesContainer.textContent = 'Error al cargar las noticias.';
        });
}); // Fin del addEventListener('DOMContentLoaded')