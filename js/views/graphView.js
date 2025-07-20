// js/views/graphView.js - Lógica para la vista del Grafo de Relaciones con Modal

import * as DOM from '../ui/domElements.js';
import { state } from '../state.js';
import { createElement } from '../utils.js';

let isInitialized = false;
let networkInstance = null;
let graphNodesData = null;
let graphEdgesData = null;
let originalGraphNodesData = null;
let originalGraphEdgesData = null;

// --- Elementos del DOM (IDs deben coincidir con tu HTML) ---
const modalOverlay = document.getElementById('politician-modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalPoliticianImg = document.getElementById('modal-politician-img');
const modalPoliticianName = document.getElementById('modal-politician-name');
const modalArticleCount = document.getElementById('modal-article-count');
const modalArticleList = document.getElementById('modal-article-list');
const modalRelatedCount = document.getElementById('modal-related-count');
const modalRelatedList = document.getElementById('modal-related-list');

const focusPoliticianSelect = document.getElementById('focus-politician-select');
const relationThresholdInput = document.getElementById('relation-threshold-input');
const applyFilterBtn = document.getElementById('apply-filter-btn');
const graphResetFilterBtn = document.getElementById('reset-graph-filter-btn');

/**
 * Cierra el modal de detalles del político.
 */
function _hidePoliticianModal() {
    if (modalOverlay) {
        modalOverlay.classList.remove('visible');
    }
}

/**
 * Muestra el modal con información detallada del político seleccionado.
 * @param {string} politicianName - El nombre del político (ID del nodo).
 */
function _showPoliticianModal(politicianName) {
    if (!modalOverlay || !politicianName) {
        console.error("Modal o nombre de político no disponible.");
        return;
    }

    // 1. Llenar información básica (Nombre e Imagen)
    modalPoliticianName.textContent = politicianName;
    const politicianData = state.politiciansDB[politicianName];
    modalPoliticianImg.src = politicianData?.img || 'img/placeholder-person.png'; // Placeholder por defecto
    modalPoliticianImg.alt = politicianName;

    // 2. Llenar lista de Artículos Relacionados
    modalArticleList.innerHTML = '<li>Buscando artículos...</li>';

    // --- ¡CORRECCIÓN CLAVE! ---
    // Esta es la lógica correcta y definitiva. Filtra todos los artículos (`state.allArticles`)
    // y para cada uno, verifica si en su lista `entities_in_article` existe AL MENOS UNO (`.some`)
    // cuya propiedad `nombre_normalizado` sea igual al del político clickeado.
    const relatedArticles = (state.allArticles || []).filter(article =>
        (article.entities_in_article || []).some(entity => entity.nombre_normalizado === politicianName)
    );
    // --- FIN DE LA CORRECCIÓN ---

    modalArticleCount.textContent = relatedArticles.length;
    modalArticleList.innerHTML = ''; // Limpiar lista anterior

    if (relatedArticles.length > 0) {
        relatedArticles.slice(0, 25).forEach(article => {
            const li = createElement('li');
            // Los artículos son clickeables y abren en una nueva pestaña
            const link = createElement('a', {
                textContent: article.titulo || 'Artículo sin título',
                href: article.link || '#',
                title: `Fuente: ${article.fuente || 'N/A'} - Fecha: ${article.fecha || 'N/A'}`,
                target: '_blank', // Abrir en nueva pestaña
                rel: 'noopener noreferrer'
            });
            li.appendChild(link);
            modalArticleList.appendChild(li);
        });
        if (relatedArticles.length > 25) {
             modalArticleList.appendChild(createElement('li', { textContent: `... y ${relatedArticles.length - 25} más.`, style: "font-style: italic; color: var(--text-muted);" }));
        }
    } else {
        modalArticleList.innerHTML = '<li>No se encontraron artículos asociados.</li>';
    }

    // 3. Llenar lista de "Mencionado Junto Con"
    const relatedPoliticians = new Map();
    if (graphEdgesData && graphNodesData) {
        graphEdgesData.forEach(edge => {
            let relatedName = null;
            if (edge.from === politicianName && graphNodesData.get(edge.to)) {
                relatedName = edge.to;
            } else if (edge.to === politicianName && graphNodesData.get(edge.from)) {
                relatedName = edge.from;
            }
            if (relatedName) {
                relatedPoliticians.set(relatedName, (relatedPoliticians.get(relatedName) || 0) + (edge.value || 1));
            }
        });
    }

    const sortedRelated = Array.from(relatedPoliticians.entries()).sort(([, a], [, b]) => b - a).slice(0, 20);
    modalRelatedCount.textContent = sortedRelated.length;
    modalRelatedList.innerHTML = '';
    if (sortedRelated.length > 0) {
        sortedRelated.forEach(([name, count]) => {
            const li = createElement('li');
            li.appendChild(createElement('span', { textContent: name, style: "flex-grow: 1;" }));
            li.appendChild(createElement('span', { className: 'relation-count', textContent: `${count} ${count === 1 ? 'vez' : 'veces'}` }));
            modalRelatedList.appendChild(li);
        });
    } else {
        modalRelatedList.innerHTML = '<li>No se encontraron menciones conjuntas en el grafo.</li>';
    }

    // 4. Mostrar el modal
    modalOverlay.classList.add('visible');
}

/**
 * Define las opciones de configuración para Vis.js.
 */
function _getVisOptions() {
    const colors = { background: '#1a1d21', nodeBorder: '#8ab4f8', nodeBackground: '#2c3035', edge: '#5f6368', edgeHighlight: '#8ab4f8', text: '#e8eaed' };
    return {
        nodes: {
            shape: 'circularImage',
            borderWidth: 3,
            scaling: { min: 20, max: 70 },
            font: { size: 16, color: colors.text, face: 'Inter, sans-serif' },
            color: { border: colors.nodeBorder, background: colors.nodeBackground, highlight: { border: '#a1c5ff', background: '#3a3f44' }, hover: { border: '#a1c5ff', background: '#3a3f44' } },
            imagePadding: 4,
            brokenImage: "img/placeholder-person.png"
        },
        edges: { width: 1, scaling: { min: 0.5, max: 6 }, color: { color: colors.edge, highlight: colors.edgeHighlight, hover: colors.edgeHighlight, inherit: false, opacity: 0.4 }, smooth: { enabled: true, type: "continuous", roundness: 0.4 } },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -55, centralGravity: 0.01, springLength: 110, springConstant: 0.08, damping: 0.6, avoidOverlap: 0.6 }, minVelocity: 0.75 },
        interaction: { hover: true, tooltipDelay: 200, hideEdgesOnDrag: true }
    };
}

/**
 * Carga los datos y dibuja el grafo.
 */
async function _loadAndDrawGraph() {
    if (!DOM.graphNetworkContainer) return;
    DOM.graphNetworkContainer.innerHTML = '<p class="loading-placeholder">Cargando red de influencia...</p>';
    try {
        // --- CORRECCIÓN DE RUTA ---
        // Asumimos que graph_data.json está en la raíz del proyecto. Si está en otra carpeta, ajusta la ruta.
        const response = await fetch('./graph_data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status} al cargar graph_data.json`);
        const graphData = await response.json();
        
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            throw new Error("No hay datos de nodos para generar la red.");
        }

        const nodesWithImages = graphData.nodes.map(node => ({
            ...node,
            image: state.politiciansDB[node.id]?.img || 'img/placeholder-person.png',
        }));

        originalGraphNodesData = new vis.DataSet(nodesWithImages);
        originalGraphEdgesData = new vis.DataSet(graphData.edges);
        graphNodesData = new vis.DataSet(originalGraphNodesData.get());
        graphEdgesData = new vis.DataSet(originalGraphEdgesData.get());

        const options = _getVisOptions();
        DOM.graphNetworkContainer.innerHTML = '';
        networkInstance = new vis.Network(DOM.graphNetworkContainer, { nodes: graphNodesData, edges: graphEdgesData }, options);
        networkInstance.once("stabilizationIterationsDone", () => networkInstance.setOptions({ physics: { enabled: false } }));
        networkInstance.on("click", (params) => { if (params.nodes.length > 0) _showPoliticianModal(params.nodes[0]); });
        
        _populatePoliticianSelector();

    } catch (error) {
        console.error("ERROR FATAL al cargar/dibujar el grafo:", error);
        DOM.graphNetworkContainer.innerHTML = `<p class="error-placeholder">Error al generar la red: ${error.message}</p>`;
        isInitialized = false;
    }
}

function _populatePoliticianSelector() {
    if (!focusPoliticianSelect || !originalGraphNodesData) return;
    focusPoliticianSelect.innerHTML = '<option value="">-- Seleccionar Político --</option>';
    const politicians = originalGraphNodesData.get({ fields: ['id', 'label'] }).sort((a, b) => a.label.localeCompare(b.label));
    politicians.forEach(p => focusPoliticianSelect.appendChild(createElement('option', { value: p.id, textContent: p.label })));
}

function _applyGraphFilter() {
    if (!networkInstance) return;
    const focusId = focusPoliticianSelect.value;
    const threshold = parseInt(relationThresholdInput.value, 10);
    if (!focusId || isNaN(threshold)) { alert("Por favor, seleccione un político y un umbral válido."); return; }

    const connectedNodeIds = new Set([focusId]);
    const filteredEdges = originalGraphEdgesData.get({
        filter: edge => edge.value >= threshold && (edge.from === focusId || edge.to === focusId)
    });
    filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
    });

    const filteredNodes = originalGraphNodesData.get({
        filter: node => connectedNodeIds.has(node.id)
    });

    graphNodesData.clear();
    graphEdgesData.clear();
    graphNodesData.add(filteredNodes);
    graphEdgesData.add(filteredEdges);
    networkInstance.fit({ animation: true });
}

function _resetGraphFilter() {
    if (!networkInstance || !originalGraphNodesData || !originalGraphEdgesData) return;
    graphNodesData.clear();
    graphEdgesData.clear();
    graphNodesData.add(originalGraphNodesData.get());
    graphEdgesData.add(originalGraphEdgesData.get());
    focusPoliticianSelect.value = "";
    relationThresholdInput.value = "5";
    networkInstance.fit({ animation: true });
}

/**
 * Función pública para inicializar la vista. Se asegura de que los datos estén listos.
 */
export function initializeGraph() {
    if (isInitialized) return;
    if (DOM.graphNetworkContainer && state.allArticles && state.allArticles.length > 0) {
        isInitialized = true;
        _loadAndDrawGraph();
        setupEventListeners();
    } else {
        // Reintentar si los datos necesarios (state.allArticles) aún no se han cargado
        setTimeout(initializeGraph, 300); 
    }
}

function setupEventListeners() {
    if (closeModalBtn) closeModalBtn.addEventListener('click', _hidePoliticianModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) _hidePoliticianModal(); });
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', _applyGraphFilter);
    if (graphResetFilterBtn) graphResetFilterBtn.addEventListener('click', _resetGraphFilter);
}