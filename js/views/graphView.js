// js/views/graphView.js - Lógica para la vista del Grafo de Relaciones con Modal

import * as DOM from '../ui/domElements.js';    // Contenedor del grafo #mynetwork
import { state } from '../state.js';           // Acceso a politiciansDB y allArticles
// import { switchView } from '../ui/navigation.js'; // Ya no se usa directamente aquí
import { createElement } from '../utils.js'; // Para crear elementos de lista en el modal

let isInitialized = false;  // Control para inicializar el grafo solo una vez
let networkInstance = null; // Guardar la instancia de Vis.js
let graphNodesData = null; // Guardar datasets para buscar relaciones al mostrar modal
let graphEdgesData = null;

// --- Elementos del Modal (Obtener referencias una vez) ---
const modalOverlay = document.getElementById('politician-modal-overlay');
const modalContent = document.getElementById('politician-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalPoliticianImg = document.getElementById('modal-politician-img');
const modalPoliticianName = document.getElementById('modal-politician-name');
const modalArticleCount = document.getElementById('modal-article-count');
const modalArticleList = document.getElementById('modal-article-list');
const modalRelatedCount = document.getElementById('modal-related-count');
const modalRelatedList = document.getElementById('modal-related-list');

// --- Funciones del Modal ---

/**
 * Cierra el modal de detalles del político y limpia su contenido.
 */
function _hidePoliticianModal() {
    if (modalOverlay) {
        modalOverlay.classList.remove('visible');
        // Pequeño delay para limpiar después de que la transición de opacidad termine
        setTimeout(() => {
            if (modalArticleList) modalArticleList.innerHTML = '<li>Cargando...</li>';
            if (modalRelatedList) modalRelatedList.innerHTML = '<li>Cargando...</li>';
            if (modalPoliticianImg) modalPoliticianImg.src = '';
            if (modalPoliticianName) modalPoliticianName.textContent = '...';
            if (modalArticleCount) modalArticleCount.textContent = '0';
            if (modalRelatedCount) modalRelatedCount.textContent = '0';
        }, 300); // Debe coincidir con la duración de la transición CSS
    }
}

/**
 * Muestra el modal con información detallada del político seleccionado.
 * @param {string} politicianName - El nombre del político (ID del nodo).
 */
function _showPoliticianModal(politicianName) {
    // Verificar que los elementos del modal existan y que tengamos un nombre
    if (!modalOverlay || !modalContent || !closeModalBtn || !modalPoliticianImg ||
        !modalPoliticianName || !modalArticleCount || !modalArticleList ||
        !modalRelatedCount || !modalRelatedList || !politicianName)
    {
        console.error("[graphView._showPoliticianModal] Error: Faltan elementos del DOM del modal o el nombre del político.");
        return;
    }

    console.log(`[graphView] Mostrando modal para: ${politicianName}`);

    // 1. Llenar información básica (Nombre e Imagen)
    modalPoliticianName.textContent = politicianName;
    const politicianData = state.politiciansDB[politicianName];
    if (politicianData?.img) {
        modalPoliticianImg.src = politicianData.img;
        modalPoliticianImg.alt = politicianName;
        modalPoliticianImg.style.display = 'block';
    } else {
        modalPoliticianImg.src = '';
        modalPoliticianImg.style.display = 'none'; // Ocultar si no hay imagen
    }

    // 2. Llenar lista de Artículos Relacionados
    modalArticleList.innerHTML = '<li>Buscando artículos...</li>'; // Placeholder
    const relatedArticles = (state.allArticles || []).filter(article =>
        (article.personas_detectadas_normalizadas || []).includes(politicianName)
    );
    modalArticleCount.textContent = relatedArticles.length;
    modalArticleList.innerHTML = ''; // Limpiar antes de añadir
    if (relatedArticles.length > 0) {
        // Ordenar por fecha (más reciente primero) si tenemos fechas válidas
        // relatedArticles.sort((a, b) => (parseDateString(b.fecha_hora)?.getTime() || 0) - (parseDateString(a.fecha_hora)?.getTime() || 0));
        relatedArticles.slice(0, 25).forEach(article => { // Limitar a 25 artículos
            const li = createElement('li');
            const link = createElement('a', {
                // Usar título o un fragmento si no hay título
                textContent: article.titulo || article.cuerpo?.substring(0, 50) + '...' || 'Artículo sin título',
                href: article.link || '#',
                title: `Fuente: ${article.fuente || 'N/A'} - Fecha: ${article.fecha_hora || 'N/A'}`,
                target: article.link ? '_blank' : '_self',
                rel: 'noopener noreferrer'
            });
            li.appendChild(link);
            modalArticleList.appendChild(li);
        });
        if (relatedArticles.length > 25) {
             modalArticleList.appendChild(createElement('li', { textContent: `... y ${relatedArticles.length - 25} más.` , style: "font-style: italic; color: var(--text-muted);"}));
        }
    } else {
        modalArticleList.innerHTML = '<li>No se encontraron artículos asociados.</li>';
    }

    // 3. Llenar lista de Políticos Relacionados (Mencionados Juntos)
    modalRelatedList.innerHTML = '<li>Buscando relaciones...</li>'; // Placeholder
    const relatedPoliticians = new Map();
    if (graphEdgesData && graphNodesData) { // Asegurarse que los datasets del grafo estén listos
        graphEdgesData.forEach(edge => {
            let relatedName = null;
            let count = edge.value || 1; // 'value' de la arista = co-ocurrencias

            if (edge.from === politicianName && graphNodesData.get(edge.to)) { // Nodo 'to' existe?
                relatedName = edge.to;
            } else if (edge.to === politicianName && graphNodesData.get(edge.from)) { // Nodo 'from' existe?
                relatedName = edge.from;
            }

            // Acumular conteo si encontramos una relación válida
            if (relatedName) {
                relatedPoliticians.set(relatedName, (relatedPoliticians.get(relatedName) || 0) + count);
            }
        });
    } else {
         console.warn("[graphView._showPoliticianModal] No se pudieron calcular relaciones: graphEdgesData o graphNodesData no disponibles.");
    }

    const sortedRelated = Array.from(relatedPoliticians.entries())
                               .sort(([, countA], [, countB]) => countB - countA)
                               .slice(0, 20); // Limitar a 20 relaciones

    modalRelatedCount.textContent = sortedRelated.length;
    modalRelatedList.innerHTML = ''; // Limpiar
    if (sortedRelated.length > 0) {
        sortedRelated.forEach(([name, count]) => {
            const li = createElement('li');
            // Hacer clickeable para potencialmente abrir el modal de ESE político? (Recursivo)
             const nameSpan = createElement('span', { textContent: name, style:"flex-grow: 1;" }); // Nombre ocupa espacio disponible
             /* // Opcional: Hacer nombre clickeable
             nameSpan.style.cursor = 'pointer';
             nameSpan.style.textDecoration = 'underline dotted';
             nameSpan.onclick = () => {
                 console.log(`Clic en relacionado: ${name}`);
                 _showPoliticianModal(name); // Podría causar problemas si la estructura no lo maneja bien
             };
             */
            const countSpan = createElement('span', {
                 className: 'relation-count',
                 textContent: `${count} ${count === 1 ? 'vez' : 'veces'}`
            });
            li.appendChild(nameSpan);
            li.appendChild(countSpan);
            modalRelatedList.appendChild(li);
        });
         if (relatedPoliticians.size > 20) {
             modalRelatedList.appendChild(createElement('li', { textContent: `... y ${relatedPoliticians.size - 20} más.`, style: "font-style: italic; color: var(--text-muted);"}));
        }
    } else {
        modalRelatedList.innerHTML = '<li>No se encontraron menciones conjuntas frecuentes en el grafo.</li>';
    }

    // 4. Mostrar el modal (con la clase CSS)
    modalOverlay.classList.add('visible');
}


// --- Configuración y Dibujo del Grafo ---

/**
 * Define las opciones de configuración para Vis.js adaptadas al tema oscuro.
 * @param {boolean} [hasImageNodes=false] - Indica si se usarán nodos de imagen.
 * @returns {object} Objeto de opciones de Vis.js.
 */
function _getVisOptions(hasImageNodes = false) {
    const colors = {
        background: '#1a1d21', nodeBorder: '#8ab4f8', nodeBackground: '#2c3035',
        nodeHighlightBorder: '#a1c5ff', nodeHighlightBackground: '#3a3f44',
        edge: '#5f6368', edgeHighlight: '#8ab4f8', text: '#e8eaed',
    };

    const nodeOptions = {
        scaling: { min: hasImageNodes ? 20 : 12, max: hasImageNodes ? 70 : 60, label: { enabled: !hasImageNodes, min: 14, max: 30, drawThreshold: 8, color: colors.text } },
        font: { size: 16, color: colors.text, strokeWidth: 0, face: 'Inter, sans-serif' },
        borderWidth: hasImageNodes ? 3 : 2,
        color: { border: colors.nodeBorder, background: colors.nodeBackground, highlight: { border: colors.nodeHighlightBorder, background: colors.nodeHighlightBackground }, hover: { border: colors.nodeHighlightBorder, background: colors.nodeHighlightBackground } },
        labelHighlightBold: true,
        shadow: { enabled: !hasImageNodes } // Sombra solo para puntos
    };

    if (hasImageNodes) {
        nodeOptions.shape = 'circularImage';
        nodeOptions.imagePadding = 4;
        nodeOptions.brokenImage = "img/placeholder-person.png"; // Ruta a tu placeholder
    } else {
        nodeOptions.shape = 'dot';
    }

    return {
        nodes: nodeOptions,
        edges: { width: 1, scaling: { min: 0.5, max: 6 }, color: { color: colors.edge, highlight: colors.edgeHighlight, hover: colors.edgeHighlight, inherit: false, opacity: 0.4 }, smooth: { enabled: true, type: "continuous", roundness: 0.4 }, hoverWidth: 1.5 },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -55, centralGravity: 0.01, springLength: 110, springConstant: 0.08, damping: 0.6, avoidOverlap: 0.6 }, minVelocity: 0.75, stabilization: { enabled: true, iterations: 500, updateInterval: 50, fit: true } },
        interaction: { hover: true, tooltipDelay: 200, navigationButtons: false, keyboard: true, hideEdgesOnDrag: true, dragNodes: true, zoomView: true, dragView: true },
        layout: { improvedLayout: true }
    };
}


/**
 * Maneja el evento de clic en un nodo del grafo -> Muestra el modal.
 * @param {object} params - Objeto de evento de Vis.js.
 */
function _handleNodeClick(params) {
    if (!params || !params.nodes || params.nodes.length === 0) return;
    const nodeId = params.nodes[0];
    console.log(`[graphView] Clic en nodo: ${nodeId}. Mostrando modal...`);
    _showPoliticianModal(nodeId); // Llamar a la función que muestra el modal
}

/**
 * Maneja el evento de clic en una arista del grafo (muestra alerta).
 * @param {object} params - Objeto de evento de Vis.js.
 * @param {vis.DataSet} edgesDataSet - Dataset de aristas.
 * @param {vis.DataSet} nodesDataSet - Dataset de nodos.
 */
function _handleEdgeClick(params, edgesDataSet, nodesDataSet) {
     if (!params || !params.edges || params.edges.length === 0) return;

     const edgeId = params.edges[0];
     const edgeData = edgesDataSet.get(edgeId);

     if (edgeData && nodesDataSet) { // Verificar que nodesDataSet exista
         const fromNode = nodesDataSet.get(edgeData.from);
         const toNode = nodesDataSet.get(edgeData.to);
         if (fromNode && toNode) {
             const message = `Relación: ${fromNode.label} - ${toNode.label}\nMencionados juntos en ${edgeData.value || 'N/A'} artículos.`;
             // console.log(`[graphView] Clic en arista: ${fromNode.label} (${edgeData.value}) ${toNode.label}`);
              
         }
     }
}


/**
 * Carga los datos del grafo desde JSON y dibuja la red usando Vis.js.
 */
async function _loadAndDrawGraph() {
    console.log("[graphView._loadAndDrawGraph] Iniciando...");
    if (!DOM.graphNetworkContainer) { console.error("CRÍTICO: #mynetwork no encontrado."); return; }
    DOM.graphNetworkContainer.innerHTML = '<p class="loading-placeholder">Cargando red de influencia...</p>';

    try {
        // Carga de datos del grafo
        console.log("[graphView] Cargando graph_data.json...");
        const response = await fetch('graph_data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status} al cargar graph_data.json`);
        const graphData = await response.json();
        if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) throw new Error("Formato graph_data.json inválido.");
        if (graphData.nodes.length === 0) {
             DOM.graphNetworkContainer.innerHTML = '<p class="error-placeholder">No hay datos para generar la red.</p>';
             return;
        }

        // Preparación de nodos con imágenes (usando state.politiciansDB)
        console.log("[graphView] Preparando nodos con imágenes...");
        let nodesWithImages = [];
        let hasImageNodes = false;
        for (const node of graphData.nodes) {
            const politicianInfo = state.politiciansDB[node.id];
            const imageUrl = politicianInfo?.img;
            if (imageUrl) {
                nodesWithImages.push({ ...node, shape: 'circularImage', image: imageUrl, label: node.label, title: node.title });
                hasImageNodes = true;
            } else {
                nodesWithImages.push({ ...node, shape: 'dot', title: node.title });
            }
        }

        // Crear Datasets y guardar referencias
        console.log("[graphView] Creando Datasets...");
        graphNodesData = new vis.DataSet(nodesWithImages); // Guardar dataset de nodos
        graphEdgesData = new vis.DataSet(graphData.edges); // Guardar dataset de aristas

        // Obtener opciones y crear instancia de Vis.js
        const options = _getVisOptions(hasImageNodes);
        console.log("[graphView] Creando instancia de vis.Network...");
        if (typeof vis === 'undefined' || !vis.Network) throw new Error("Vis.js no cargado.");
        DOM.graphNetworkContainer.innerHTML = ''; // Limpiar placeholder de carga
        networkInstance = new vis.Network(DOM.graphNetworkContainer, { nodes: graphNodesData, edges: graphEdgesData }, options);

        // Configurar eventos
        networkInstance.once("stabilizationIterationsDone", () => {
            console.log("[graphView] Estabilización completada. Deteniendo física.");
            networkInstance.setOptions({ physics: { enabled: false } });
            // networkInstance.fit({ animation: ... }); // Opcional
        });
        networkInstance.on("click", (params) => {
            _handleNodeClick(params); // Llama a la versión que abre el modal
            _handleEdgeClick(params, graphEdgesData, graphNodesData); // Pasa los datasets guardados
        });

        console.log("[graphView] Grafo dibujado y listo.");

    } catch (error) {
        console.error("[graphView] ERROR FATAL durante carga/dibujo:", error);
        DOM.graphNetworkContainer.innerHTML = `<p class="error-placeholder" style="color: var(--color-danger);">Error al generar la red: ${error.message}</p>`;
        isInitialized = false; // Permitir reintentar?
    }
}

/**
 * Función pública exportada para inicializar la vista del grafo.
 * Se asegura de que el grafo se cargue y dibuje solo la primera vez.
 */
export function initializeGraph() {
    console.log(`[graphView.initializeGraph] Solicitud. ¿Inicializado?: ${isInitialized}`);
    if (!isInitialized && DOM.graphNetworkContainer) {
        // Verificar si los datos necesarios (state.politiciansDB) están listos
        if (Object.keys(state.politiciansDB).length === 0) {
            console.warn("[graphView.initializeGraph] DB de políticos aún no cargada. Reintentando en 500ms...");
            setTimeout(initializeGraph, 500); // Reintentar después de un delay
            return;
        }
        isInitialized = true;
        _loadAndDrawGraph();
    } else if (isInitialized) {
        console.log("[graphView.initializeGraph] Grafo ya inicializado.");
    } else {
        console.error("[graphView.initializeGraph] Contenedor #mynetwork no encontrado.");
    }
}

// --- Listeners del Modal (Asegurarse que se añadan una sola vez) ---
function setupModalListeners() {
    if (closeModalBtn && !closeModalBtn.dataset.listenerAttached) {
        closeModalBtn.addEventListener('click', _hidePoliticianModal);
        closeModalBtn.dataset.listenerAttached = 'true'; // Marcar como añadido
    }
    if (modalOverlay && !modalOverlay.dataset.listenerAttached) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) { // Clic solo en el fondo
                _hidePoliticianModal();
            }
        });
        modalOverlay.dataset.listenerAttached = 'true'; // Marcar como añadido
    }
}

// Llamar a la configuración de listeners del modal una vez que el script carga
setupModalListeners();