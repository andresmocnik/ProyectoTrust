// js/views/graphView.js - Lógica para la vista del Grafo de Relaciones

import * as DOM from '../ui/domElements.js'; // Importa los getters
import { state } from '../state.js';
import { switchView } from '../ui/navigation.js';
const vis = window.vis; // Acceder a vis global

let isInitialized = false;
let networkInstance = null;

/**
 * Define las opciones de configuración para Vis.js.
 * (Función interna)
 */
function _getVisOptions() {
    // Usar variables CSS o valores directos que coincidan con style.css
    const colors = {
        background: '#1a1d21', nodeBorder: '#8ab4f8', nodeBackground: '#2c3035',
        nodeHighlightBorder: '#a1c5ff', nodeHighlightBackground: '#3a3f44',
        edge: '#5f6368', edgeHighlight: '#8ab4f8', text: '#e8eaed',
    };
    return {
        nodes: {
            shape: 'dot', scaling: { min: 12, max: 60, label: { enabled: true, min: 14, max: 30, drawThreshold: 8 } },
            font: { size: 14, color: colors.text, strokeWidth: 0 }, borderWidth: 2,
            color: { border: colors.nodeBorder, background: colors.nodeBackground, highlight: { border: colors.nodeHighlightBorder, background: colors.nodeHighlightBackground }, hover: { border: colors.nodeHighlightBorder, background: colors.nodeHighlightBackground } },
            shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.5)', size: 5, x: 2, y: 2 }
        },
        edges: {
            width: 1, scaling: { min: 0.5, max: 8 },
            color: { color: colors.edge, highlight: colors.edgeHighlight, hover: colors.edgeHighlight, inherit: false, opacity: 0.5 },
            smooth: { enabled: true, type: "continuous", roundness: 0.4 }, hoverWidth: 1.5
        },
        physics: {
            enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 100, springConstant: 0.08, damping: 0.6, avoidOverlap: 0.5 },
            minVelocity: 0.75, stabilization: { enabled: true, iterations: 500, updateInterval: 50 }
        },
        interaction: { hover: true, tooltipDelay: 200, navigationButtons: false, keyboard: true, hideEdgesOnDrag: true, dragNodes: true },
        layout: { improvedLayout: true }
    };
}

/**
 * Maneja el evento de clic en un nodo del grafo.
 * (Usa getter para el select de políticos)
 */
function _handleNodeClick(params) {
    if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        console.log(`[graphView] Clic en nodo: ${nodeId}`);
        const politicianSelectElement = DOM.getNewsPoliticianSelect(); // Usa el getter

        if (politicianSelectElement) {
            const optionExists = Array.from(politicianSelectElement.options).some(opt => opt.value === nodeId);
            if (optionExists) {
                console.log(`[graphView] Navegando a 'news' y seleccionando ${nodeId}`);
                switchView('news');
                // Esperar un poco para que la otra vista se inicialice/renderice
                setTimeout(() => {
                    const selectAfter = DOM.getNewsPoliticianSelect(); // Re-obtener
                    if (selectAfter) {
                         selectAfter.value = nodeId;
                         selectAfter.dispatchEvent(new Event('change', { bubbles: true }));
                         console.log(`[graphView] Filtro para ${nodeId} aplicado.`);
                    } else { console.warn("[graphView] Select no encontrado DESPUÉS de navegar."); }
                }, 100); // Delay corto
            } else { console.warn(`[graphView] Político "${nodeId}" no en select.`); alert(`Sel: ${nodeId}\n(No en filtro)`); }
        } else { console.warn("[graphView] Select de políticos no encontrado."); alert(`Sel: ${nodeId}`); }
    }
}

/**
 * Maneja el evento de clic en una arista del grafo.
 */
function _handleEdgeClick(params, edgesDataSet, nodesDataSet) {
     if (params.edges.length > 0) {
         const edgeId = params.edges[0]; const edgeData = edgesDataSet.get(edgeId);
         if (edgeData) { const from=nodesDataSet.get(edgeData.from); const to=nodesDataSet.get(edgeData.to);
             if (from && to) { const msg=`Relación: ${from.label||from.id} - ${to.label||to.id}\nMenc. juntas ${edgeData.value||'N/A'} veces.`; console.log(`[graphView] Clic arista: ${from.label} - ${to.label}`); alert(msg); }
         }
     }
}

/**
 * Carga los datos del grafo y dibuja la red.
 * (Modificado para obtener contenedor al inicio de la función)
 */
async function _loadAndDrawGraph() {
    console.log("[_loadAndDrawGraph] Iniciando carga y dibujo...");

    // --- OBTENER CONTENEDOR AL INICIO DE LA FUNCIÓN ---
    const container = DOM.getGraphNetworkContainer();

    // --- VERIFICACIÓN INMEDIATA ---
    if (!container) {
        console.error("[_loadAndDrawGraph] Contenedor '#mynetwork' NO encontrado. Revisar ID en HTML y getter en domElements.js.");
        const graphViewElement = DOM.getGraphView();
        if(graphViewElement && !graphViewElement.querySelector('.error-placeholder')) {
             graphViewElement.innerHTML += '<p class="error-placeholder">Error: Área del grafo no disponible.</p>';
        }
        isInitialized = false; // Permitir reintentar si falla
        return; // No continuar
    }
    // --- FIN VERIFICACIÓN ---

    // Mostrar carga en el contenedor (que ahora sabemos existe)
    container.innerHTML = '<p class="loading-placeholder">Cargando red...</p>';

    try {
        console.log("[_loadAndDrawGraph] Cargando graph_data.json...");
        const response = await fetch('graph_data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const graphData = await response.json();
        console.log("[_loadAndDrawGraph] Datos cargados.");

        if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) throw new Error("Formato JSON inválido.");
        container.innerHTML = ''; // Limpiar carga

        if (typeof vis === 'undefined' || !vis.Network || !vis.DataSet) throw new Error("Vis.js no cargado.");

        const nodesDataSet = new vis.DataSet(graphData.nodes);
        const edgesDataSet = new vis.DataSet(graphData.edges);
        const options = _getVisOptions();

        console.log("[_loadAndDrawGraph] Creando instancia Vis.Network...");
        networkInstance = new vis.Network(container, { nodes: nodesDataSet, edges: edgesDataSet }, options);
        console.log("[_loadAndDrawGraph] Instancia creada.");

        networkInstance.once("stabilizationIterationsDone", () => console.log("[graphView] Estabilización OK."));
        networkInstance.on("click", (p) => { if (p.nodes.length > 0) _handleNodeClick(p); else if (p.edges.length > 0) _handleEdgeClick(p, edgesDataSet, nodesDataSet); });

    } catch (error) {
        console.error("[_loadAndDrawGraph] Error:", error);
        container.innerHTML = `<p class="error-placeholder">Error cargando red: ${error.message}</p>`;
        networkInstance = null;
        isInitialized = false; // Permitir reintentar
    }
}

/**
 * Función pública para inicializar la vista del grafo.
 * Llama a _loadAndDrawGraph solo la primera vez (SIN setTimeout).
 * (Exportada)
 */
export function initializeGraph() {
    console.log(`[graphView] Solicitud de inicialización. ¿Ya inicializado? ${isInitialized}`);
    if (!isInitialized) {
        isInitialized = true; // Marcar como inicializado ANTES de empezar la carga
        console.log("[graphView] Primera inicialización, llamando a _loadAndDrawGraph...");
        _loadAndDrawGraph(); // Llamar directamente a la función que carga y dibuja
    } else {
        console.log("[graphView] El grafo ya está inicializado.");
        // Opcional: Reajustar el grafo existente si la ventana cambió, etc.
        if (networkInstance && typeof networkInstance.fit === 'function') {
            console.log("[graphView] Reajustando grafo existente (fit)...");
            // Ejecutar fit directamente o con un pequeño delay si se prefiere
            // setTimeout(() => { networkInstance?.fit({ animation: false }); }, 50);
            networkInstance.fit({ animation: false });
        }
    }
}

console.log("[graphView.js] Módulo cargado.");