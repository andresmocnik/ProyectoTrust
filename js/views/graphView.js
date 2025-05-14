// js/views/graphView.js - Lógica para la vista del Grafo de Relaciones con Modal

import * as DOM from '../ui/domElements.js';    // Contenedor del grafo #mynetwork
import { state } from '../state.js';           // Acceso a politiciansDB y allArticles
import { createElement } from '../utils.js'; // Para crear elementos de lista en el modal

let isInitialized = false;
let networkInstance = null;
let graphNodesData = null; // Dataset actualmente en uso por el grafo (puede ser filtrado)
let graphEdgesData = null; // Dataset actualmente en uso por el grafo (puede ser filtrado)

// Para almacenar los datos originales y poder resetear el filtro
let originalGraphNodesData = null;
let originalGraphEdgesData = null;

// --- Elementos del Modal ---
const modalOverlay = document.getElementById('politician-modal-overlay');
const modalContent = document.getElementById('politician-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalPoliticianImg = document.getElementById('modal-politician-img');
const modalPoliticianName = document.getElementById('modal-politician-name');
const modalArticleCount = document.getElementById('modal-article-count');
const modalArticleList = document.getElementById('modal-article-list');
const modalRelatedCount = document.getElementById('modal-related-count');
const modalRelatedList = document.getElementById('modal-related-list');

// --- Elementos de Filtro ---
const focusPoliticianSelect = document.getElementById('focus-politician-select');
const relationThresholdInput = document.getElementById('relation-threshold-input');
const applyFilterBtn = document.getElementById('apply-filter-btn');
// IMPORTANT: Make sure this ID matches your HTML for the graph reset button
const graphResetFilterBtn = document.getElementById('reset-graph-filter-btn');


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
        relatedArticles.slice(0, 25).forEach(article => { // Limitar a 25 artículos
            const li = createElement('li');
            const link = createElement('a', {
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
    // IMPORTANTE: Usar graphEdgesData (el actual, posiblemente filtrado) y graphNodesData
    if (graphEdgesData && graphNodesData) {
        graphEdgesData.forEach(edge => { // Iterar sobre las aristas actualmente mostradas
            let relatedName = null;
            let count = edge.value || 1;

            if (edge.from === politicianName && graphNodesData.get(edge.to)) {
                relatedName = edge.to;
            } else if (edge.to === politicianName && graphNodesData.get(edge.from)) {
                relatedName = edge.from;
            }

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
             const nameSpan = createElement('span', { textContent: name, style:"flex-grow: 1;" });
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
    // YOUR EXISTING CODE FOR THIS FUNCTION HERE
    // This is the function from your original graphView.js
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

// --- Manejadores de Eventos del Grafo ---
/**
 * Maneja el evento de clic en un nodo del grafo -> Muestra el modal.
 * @param {object} params - Objeto de evento de Vis.js.
 */
function _handleNodeClick(params) {
    // YOUR EXISTING CODE FOR THIS FUNCTION HERE
    if (!params || !params.nodes || params.nodes.length === 0) return;
    const nodeId = params.nodes[0];
    console.log(`[graphView] Clic en nodo: ${nodeId}. Mostrando modal...`);
    _showPoliticianModal(nodeId);
}

/**
 * Maneja el evento de clic en una arista del grafo (muestra alerta).
 * @param {object} params - Objeto de evento de Vis.js.
 * @param {vis.DataSet} edgesDataSet - Dataset de aristas.
 * @param {vis.DataSet} nodesDataSet - Dataset de nodos.
 */
function _handleEdgeClick(params, edgesDataSet, nodesDataSet) {
    // YOUR EXISTING CODE FOR THIS FUNCTION HERE
     if (!params || !params.edges || params.edges.length === 0) return;

     const edgeId = params.edges[0];
     const edgeData = edgesDataSet.get(edgeId);

     if (edgeData && nodesDataSet) {
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
        const response = await fetch('graph_data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status} al cargar graph_data.json`);
        const graphData = await response.json();
        if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) throw new Error("Formato graph_data.json inválido.");
        if (graphData.nodes.length === 0) {
             DOM.graphNetworkContainer.innerHTML = '<p class="error-placeholder">No hay datos para generar la red.</p>';
             return;
        }

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

        console.log("[graphView] Creando Datasets originales...");
        originalGraphNodesData = new vis.DataSet(nodesWithImages);
        originalGraphEdgesData = new vis.DataSet(graphData.edges);

        graphNodesData = new vis.DataSet(originalGraphNodesData.get());
        graphEdgesData = new vis.DataSet(originalGraphEdgesData.get());

        const options = _getVisOptions(hasImageNodes);
        console.log("[graphView] Creando instancia de vis.Network...");
        if (typeof vis === 'undefined' || !vis.Network) throw new Error("Vis.js no cargado.");
        DOM.graphNetworkContainer.innerHTML = '';
        networkInstance = new vis.Network(DOM.graphNetworkContainer, { nodes: graphNodesData, edges: graphEdgesData }, options);

        networkInstance.once("stabilizationIterationsDone", () => {
            console.log("[graphView] Estabilización completada. Deteniendo física.");
            networkInstance.setOptions({ physics: { enabled: false } });
        });
        networkInstance.on("click", (params) => {
            _handleNodeClick(params);
            _handleEdgeClick(params, graphEdgesData, graphNodesData);
        });

        console.log("[graphView] Grafo dibujado y listo.");
        _populatePoliticianSelector();

    } catch (error) {
        console.error("[graphView] ERROR FATAL durante carga/dibujo:", error);
        DOM.graphNetworkContainer.innerHTML = `<p class="error-placeholder" style="color: var(--color-danger);">Error al generar la red: ${error.message}</p>`;
        isInitialized = false;
    }
}

// --- FUNCIONES DE FILTRADO ---
function _populatePoliticianSelector() {
    if (!focusPoliticianSelect || !originalGraphNodesData) {
        console.warn("[graphView._populatePoliticianSelector] Selector o datos originales no disponibles.");
        return;
    }

    focusPoliticianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
    const politicians = originalGraphNodesData.get({
        fields: ['id', 'label'],
        filter: item => item.label
    });

    politicians.sort((a, b) => a.label.localeCompare(b.label));

    politicians.forEach(politician => {
        const option = createElement('option', {
            value: politician.id,
            textContent: politician.label
        });
        focusPoliticianSelect.appendChild(option);
    });
    console.log("[graphView] Selector de político para filtro poblado.");
}

function _applyGraphFilter() {
    if (!networkInstance || !originalGraphNodesData || !originalGraphEdgesData) {
        console.warn("[graphView._applyGraphFilter] Grafo o datos originales no listos.");
        return;
    }

    const focusPoliticianId = focusPoliticianSelect.value;
    const threshold = parseInt(relationThresholdInput.value, 10);

    if (!focusPoliticianId) {
        alert("Por favor, seleccione un político principal para filtrar.");
        return;
    }
    if (isNaN(threshold) || threshold < 1) {
        alert("Por favor, ingrese un umbral de relación válido (número mayor o igual a 1).");
        return;
    }

    console.log(`[graphView] Aplicando filtro: Político=${focusPoliticianId}, Umbral=${threshold}`);

    const filteredNodes = new vis.DataSet();
    const filteredEdges = new vis.DataSet();

    const focusNode = originalGraphNodesData.get(focusPoliticianId);
    if (focusNode) {
        filteredNodes.add(focusNode);
    } else {
        console.error(`[graphView._applyGraphFilter] Nodo de foco ${focusPoliticianId} no encontrado.`);
        _resetGraphFilter();
        return;
    }

    originalGraphEdgesData.forEach(edge => {
        if (edge.value >= threshold) {
            if (edge.from === focusPoliticianId) {
                const toNode = originalGraphNodesData.get(edge.to);
                if (toNode) {
                    if (!filteredNodes.get(edge.to)) filteredNodes.add(toNode);
                    filteredEdges.add(edge);
                }
            } else if (edge.to === focusPoliticianId) {
                const fromNode = originalGraphNodesData.get(edge.from);
                if (fromNode) {
                    if (!filteredNodes.get(edge.from)) filteredNodes.add(fromNode);
                    filteredEdges.add(edge);
                }
            }
        }
    });

    graphNodesData = filteredNodes;
    graphEdgesData = filteredEdges;

    networkInstance.setData({
        nodes: graphNodesData,
        edges: graphEdgesData
    });
    networkInstance.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
    console.log(`[graphView] Filtro aplicado. Nodos: ${graphNodesData.length}, Aristas: ${graphEdgesData.length}`);
}

function _resetGraphFilter() {
    if (!networkInstance || !originalGraphNodesData || !originalGraphEdgesData) {
        console.warn("[graphView._resetGraphFilter] Grafo o datos originales no listos.");
        return;
    }

    graphNodesData = new vis.DataSet(originalGraphNodesData.get());
    graphEdgesData = new vis.DataSet(originalGraphEdgesData.get());

    networkInstance.setData({
        nodes: graphNodesData,
        edges: graphEdgesData
    });
    networkInstance.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });

    if (focusPoliticianSelect) focusPoliticianSelect.value = "";
    if (relationThresholdInput) relationThresholdInput.value = "5"; // Default or desired value
    console.log("[graphView] Filtro reseteado. Mostrando grafo completo.");
}


/**
 * Función pública exportada para inicializar la vista del grafo.
 */
export function initializeGraph() {
    console.log(`[graphView.initializeGraph] Solicitud. ¿Inicializado?: ${isInitialized}`);
    if (!isInitialized && DOM.graphNetworkContainer) {
        if (Object.keys(state.politiciansDB).length === 0 || (state.allArticles && state.allArticles.length === 0) ) {
            console.warn("[graphView.initializeGraph] DB de políticos o artículos aún no cargada. Reintentando en 500ms...");
            setTimeout(initializeGraph, 500);
            return;
        }
        isInitialized = true;
        _loadAndDrawGraph();
    } else if (isInitialized) {
        console.log("[graphView.initializeGraph] Grafo ya inicializado.");
        // If re-initializing view, ensure selector is populated if data is available
        if (originalGraphNodesData && focusPoliticianSelect && focusPoliticianSelect.options.length <=1) {
            _populatePoliticianSelector();
        }
    } else {
        console.error("[graphView.initializeGraph] Contenedor #mynetwork no encontrado.");
    }
}

// --- Listeners del Modal y Filtro (DEFINIR AL FINAL) ---
function setupEventListeners() {
    // Modal
    if (closeModalBtn && !closeModalBtn.dataset.listenerAttached) {
        closeModalBtn.addEventListener('click', _hidePoliticianModal);
        closeModalBtn.dataset.listenerAttached = 'true';
    }
    if (modalOverlay && !modalOverlay.dataset.listenerAttached) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                _hidePoliticianModal();
            }
        });
        modalOverlay.dataset.listenerAttached = 'true';
    }

    // Filtros
    if (applyFilterBtn && !applyFilterBtn.dataset.listenerAttached) {
        applyFilterBtn.addEventListener('click', _applyGraphFilter);
        applyFilterBtn.dataset.listenerAttached = 'true';
    }

    // Uso de la constante graphResetFilterBtn definida arriba
    if (graphResetFilterBtn && !graphResetFilterBtn.dataset.listenerAttached) {
        graphResetFilterBtn.addEventListener('click', _resetGraphFilter);
        graphResetFilterBtn.dataset.listenerAttached = 'true';
    } else if (!graphResetFilterBtn) {
         console.warn("[graphView] Botón 'reset-graph-filter-btn' no encontrado para adjuntar listener.");
    }
}

// Llamar a la configuración de listeners DESPUÉS de que todas las funciones estén definidas.
setupEventListeners();